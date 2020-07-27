;/**
 * The API wrapper to generate contributions data for GitHub, extending/overwriting the base BaseCounter class/functions.
 *
 * @version 3.1.0
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2019 JPI
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
     * Return whether or not the author of the commit is the requested user
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
        const commits = await this.getFromAPI(endpoint, params);
        if (!commits || !commits.length) {
            return;
        }

        const self = this;
        commits.forEach(function(commit) {
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

    /**
     * Get ALL commits in a particular repo by a particular user
     */
    async getUsersRepoCommitsAll(repo) {
        const usersCommits = {};
        const endpoint = repo.commits_url.replace("{/sha}", "");

        /**
         * For GitHub we have to call commits endpoint per branch
         */
        const branches = await this.getAllRepoBranches(repo);
        for (let i = 0; i < branches.length; i++) {
            await this.getUsersBranchCommits(endpoint, branches[i].name, usersCommits);
        }

        return usersCommits;
    }
}

module.exports = GitHubCounter;
