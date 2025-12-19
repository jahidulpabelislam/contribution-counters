;/**
 * The API wrapper to generate contributions data for GitHub, extending/overwriting the base BaseCounter class/functions.
 *
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2024 JPI
 * @license: GPL-3.0
 */

const BaseCounter = require("./BaseCounter");

class GitHubCounter extends BaseCounter {

    constructor(config) {
        super(config);

        // Define the endpoint and params to use in the getAllRepos function in BaseCounter
        this.reposEndpoint = "https://api.github.com/user/repos";
        this.reposParams = {
            affiliation: config.minRepoRole || "owner,collaborator,organization_member",
            per_page: this.itemsPerPage,
            page: 1,
            sort: "pushed",
            direction: "desc",
        };
        this.repoUpdatedAtField = "pushed_at";
        this.repoCreatedAtField = "created_at";

        this.filteredByAuthorInAPI = !this.userEmailAddresses.length && !this.userNames.length;
    }

    getFormattedCommitData(commit) {
        return {
            sha: commit.sha,
            message: commit.commit.message,
            user: {
                name: commit.commit.author.name,
                email: commit.commit.author.email,
            },
        };
    }

    getFormattedRepoData(repo) {
        return {
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            owner: repo.owner.login,
            apiURL: repo.url,
            webURL: repo.html_url,
            isPrivate: repo.private,
            createdAt: new Date(repo.created_at),
            updatedAt: new Date(repo.updated_at),
        };
    }

    /**
     * A recursive function to get an array of ALL open branches in a repos,
     * so loop until there is no next page
     */
    async getRepoBranches(endpoint, params = {}) {
        let branches = await this.getFromAPI(endpoint, params);
        if (!branches || !branches.length) {
            return [];
        }

        // If this response has the max try next page
        if (branches.length === this.itemsPerPage) {
            params.page++;
            const newBranches = await this.getRepoBranches(endpoint, params);
            branches = branches.concat(newBranches);
        }

        return branches;
    }

    async getAllRepoBranches(repo) {
        const endpoint = repo.branches_url.replace("{/branch}", "");
        const params = {
            per_page: this.itemsPerPage,
            page: 1,
        };
        return this.getRepoBranches(endpoint, params);
    }

    /**
     * A recursive function to get an array of ALL pull requests created by user in a repo.
     * (so loop until there is no next page)
     */
    async getUsersRepoPullRequests(endpoint, params = {}, allPullRequests = []) {
        let pullRequests = await this.getFromAPI(endpoint, params);
        if (!pullRequests || !pullRequests.length) {
            return;
        }

        const self = this;
        for (const pullRequestKey in pullRequests) {
            const pullRequest = pullRequests[pullRequestKey];

            if (pullRequest.state === 'closed' && pullRequest.merged_at === null) {
                continue;
            }

            let pullRequestDate;
            if (this.fromDateObj || this.untilDateObj) {
                pullRequestDate = new Date(pullRequest.created_at);
            }

            // Because GitHub doesn't allow filtering by date on pulls we do our own filtering.

            /*
             * If this pull request was before the min from date user requested bail early.
             * As any further pull requests will be before this date.
             */
            if (this.fromDateObj && pullRequestDate < this.fromDateObj) {
                return;
            }

            // If this pull request is after the max until date user requested skip this.
            if (this.untilDateObj && pullRequestDate > this.untilDateObj) {
                continue;
            }

            if (pullRequest.user && pullRequest.user.login === self.username) {
                allPullRequests.push(this.getFormattedPullRequestData(pullRequest));
            }
        }

        // If this response has the max try next page
        if (pullRequests.length === this.itemsPerPage) {
            params.page++;
            await this.getUsersRepoPullRequests(endpoint, params, allPullRequests);
        }
    }

    async getUsersRepoPullRequestsAll(repo) {


        const endpoint = repo.pulls_url.replace("{/number}", "");
        const params = {
            state: "all",
            per_page: this.itemsPerPage,
            page: 1,
        };

        const pullRequests = [];
        await this.getUsersRepoPullRequests(endpoint, params, pullRequests);
        return pullRequests;
    }

    /**
     * Return whether the author of the commit is the requested user
     */
    isCommitter(commit) {
        return (
            commit && (
                (commit.author && commit.author.login === this.username) ||
                (
                    commit.commit && commit.commit.author && (
                        this.userEmailAddresses.indexOf(commit.commit.author.email) !== -1 ||
                        this.userNames.indexOf(commit.commit.author.name) !== -1
                    )
                )
            )
        );
    }

    shouldAddCommit(commit, usersCommits) {

        /*
         * Because for GitHub we get commits per branch,
         * keep track of sha's in case a commit is returned in multiple branches
         */
        if (usersCommits[commit.sha]) {
            return false;
        }

        // If this commit has more than one parent commit, assume it's a merge commit
        if (commit.parents && commit.parents.length > 1) {
            return false;
        }

        return this.filteredByAuthorInAPI || this.isCommitter(commit);
    }

    /**
     * A recursive function to get an array ALL commits by a user in a branch for a particular repo,
     * so loop until there is no next page
     */
    async getUsersRepoCommits(endpoint, params, usersCommits) {
        if (!this.requiresAllCommits() && Object.values(usersCommits).length >= this.minCommits) {
            return;
        }

        const commits = await this.getFromAPI(endpoint, params);
        if (!commits || !commits.length) {
            return;
        }

        const self = this;
        commits.forEach((commit) => {
            if (self.shouldAddCommit(commit, usersCommits)) {
                usersCommits[commit.sha] = self.getFormattedCommitData(commit);
            }
        });

        // If this response has the max items try next page
        if (commits.length === this.itemsPerPage) {
            params.page++;
            await this.getUsersRepoCommits(endpoint, params, usersCommits);
        }
    }

    async getUsersBranchCommits(endpoint, branch, usersCommits) {
        const params = {
            sha: branch,
            per_page: this.itemsPerPage,
            page: 1,
        };

        // Only add since/from values if dates are set
        if (this.fromDate) {
            params.since = this.fromDate;
        }
        if (this.untilDate) {
            params.until = this.untilDate;
        }

        if (this.filteredByAuthorInAPI) {
            params.author = this.username;
        }

        await this.getUsersRepoCommits(endpoint, params, usersCommits);
    }

    async getCommitsFromCompare(endpoint, params = {}, usersCommits = []) {
        if (!this.requiresAllCommits() && Object.values(usersCommits).length >= this.minCommits) {
            return;
        }

        const data = await this.getFromAPI(endpoint, params);
        if (!data || !data.commits.length) {
            return;
        }

        const { commits } = data;

        const count = commits.length;

        for (let i = 0; i < count; i++) {
            const commit = commits[i];

            if (this.fromDateObj || this.untilDateObj) {
                const committed = new Date(commit.commit.author.date);

                // If past the until date bail
                if (this.untilDateObj && committed > this.untilDateObj) {
                    return;
                }

                // If before the from date just skip this one commit
                if (this.fromDateObj && committed < this.fromDateObj) {
                    continue;
                }
            }

            if (this.shouldAddCommit(commit, usersCommits)) {
                usersCommits[commit.sha] = this.getFormattedCommitData(commit);
            }
        }

        // If this response has the max items try next page
        if (count === 1000) {
            params.page++;
            await this.getCommitsFromCompare(endpoint, params, usersCommits);
        }
    }

    /**
     * Get ALL commits in a particular repo by a particular user
     */
    async getUsersRepoCommitsAll(repo) {
        const usersCommits = {};

        const defaultBranch = repo.default_branch;

        // First get commits from default branch
        await this.getUsersBranchCommits(
            repo.commits_url.replace("{/sha}", ""),
            defaultBranch,
            usersCommits
        );

        if (!this.requiresAllCommits() && Object.values(usersCommits).length >= this.minCommits) {
            return usersCommits;
        }

        // Now using 'compare' endpoint to only get new commits in each branch.
        const branches = await this.getAllRepoBranches(repo);
        const filteredByAuthorInAPIOrig = this.filteredByAuthorInAPI;
        this.filteredByAuthorInAPI = false; // Compare endpoint doesn't allow to filter by commit author

        for (const branch of branches) {
            if (branch.name === defaultBranch) {
                continue;
            }

            await this.getCommitsFromCompare(
                repo.compare_url.replace("{base}", defaultBranch).replace("{head}", branch.name),
                {
                    per_page: 1000,
                    page: 1,
                },
                usersCommits
            );
        }

        // Reset for the next repo
        this.filteredByAuthorInAPI = filteredByAuthorInAPIOrig;

        return usersCommits;
    }
}

module.exports = GitHubCounter;
