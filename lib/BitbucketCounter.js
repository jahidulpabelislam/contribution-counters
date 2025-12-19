;/**
 * The API wrapper to generate contributions data for Bitbucket, extending/overwriting the base BaseCounter class/functions.
 *
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2024 JPI
 * @license: GPL-3.0
 */

const BaseCounter = require("./BaseCounter");

class BitbucketCounter extends BaseCounter {

    constructor(config) {
        super(config);

        // Define the endpoint and params to use in the getAllRepos function in BaseCounter
        this.reposEndpoint = "https://api.bitbucket.org/2.0/repositories/";
        this.reposParams = {
            role: config.minRepoRole || config.repoRole || "contributor",
            pagelen: this.itemsPerPage,
            page: 1,
        };

        if (!config.minRepoRole && config.repoRole) {
            console.warn('`repoRole` is now deprecated and will be removed in a future release, please use `minRepoRole`');
        }

        const query = [];

        if (this.fromDate) {
            query.push(`updated_on>=${this.fromDate}`);
        }

        if (this.untilDate) {
            query.push(`created_on<=${this.untilDate}`);
        }

        this.reposParams.q = query.join(" AND ");
    }

    async getUserUUID() {
        if (this.userUUID) {
            return this.userUUID;
        }

        const userData = await this.getFromAPI("https://api.bitbucket.org/2.0/user/");

        this.userUUID = userData.uuid;

        return this.userUUID;
    }

    getFormattedCommitData(commit) {
        return {
            sha: commit.hash,
            shortSha: '',
            title: '',
            message: commit.message,
            authorName: commit.author.user.display_name,
            authorEmail: '',
            committerName: '',
            committerEmail: '',
            parentIds: commit.parents[0].hash,
            authoredAt: new Date(commit.date),
            committedAt: new Date(commit.date),
            createdAt: new Date(commit.date),
        };
    }

    getFormattedRepoData(repo) {
        return {
            id: repo.uuid,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            owner: repo.workspace.slug,
            url: repo.links.html.href,
            isPrivate: repo.is_private,
            createdAt: new Date(repo.created_on),
            updatedAt: new Date(repo.updated_on),
        };
    }

    /**
     * A recursive function to get an array of ALL pull requests created by user in a repo.
     * (so loop until there is no next page)
     */
    async getUsersRepoPullRequests(endpoint, params, allPullRequests) {
        const pullRequestsData = await this.getFromAPI(endpoint, params);
        if (!pullRequestsData || !pullRequestsData.values || !pullRequestsData.values.length) {
            return;
        }

        const userUUID = await this.getUserUUID();

        const self = this;

        pullRequestsData.values.forEach((pullRequest) => {
            if (pullRequest.state !== "DECLINED" && pullRequest.author && pullRequest.author.uuid === userUUID) {
                allPullRequests.push(self.getFormattedPullRequestData(pullRequest));
            }
        });

        // If this response has a 'next' page get the next page, but using initial url but page param updated instead, as using Bitbucket's returned 'next' value fails
        if (pullRequestsData.next) {
            params.page++;
            await this.getUsersRepoPullRequests(endpoint, params, allPullRequests);
        }
    }

    /**
     * Wrapper function around getUsersRepoPullRequests to trigger the first recursive pull requests GET call
     */
    async getUsersRepoPullRequestsAll(repo) {
        const params = {
            state: "all",
            pagelen: 50,
            page: 1,
        };

        const query = [];

        if (this.fromDate) {
            query.push(`created_on>=${this.fromDate}`);
        }

        if (this.untilDate) {
            query.push(`created_on<=${this.untilDate}`);
        }

        params.q = query.join(" AND ");

        const pullRequests = [];
        await this.getUsersRepoPullRequests(repo.links.pullrequests.href, params, pullRequests);
        return pullRequests;
    }

    /**
     * Return whether or not the author of the commit is the requested user
     */
    isCommitter(commit) {
        return (
            commit && commit.author && (
                (
                    commit.author.user && (
                        commit.author.user.username === this.username ||
                        this.userEmailAddresses.indexOf(commit.author.user.email) !== -1
                    )
                ) ||
                commit.author.raw.includes(this.username) ||
                BaseCounter.hasArrayValue(commit.author.raw, this.userEmailAddresses) ||
                BaseCounter.hasArrayValue(commit.author.raw, this.userNames)
            )
        );
    }

    shouldAddCommit(commit) {
        // Assume if commit message start with `Close branch ` (New) OR `Closed branch ` (Old) it's a commit we can ignore
        if (commit.message.startsWith("Close branch ") || commit.message.startsWith("Closed branch ")) {
            return false;
        }

        // If this commit has more than one parent commit, assume it's a merge commit
        if (commit.parents && commit.parents.length > 1) {
            return false;
        }

        return this.isCommitter(commit);
    }

    /**
     * A recursive function to get ALL the users commits in a particular repo,
     * so loop until there is no next page
     */
    async getUsersRepoCommits(endpoint, params, usersCommits) {
        if (!this.requiresAllCommits() && usersCommits.length >= this.minCommits) {
            return;
        }

        const commitsData = await this.getFromAPI(endpoint, params);
        if (!commitsData || !commitsData.values || !commitsData.values.length) {
            return;
        }

        const commits = commitsData.values;
        for (const commitKey in commits) {
            if (!{}.hasOwnProperty.call(commits, commitKey)) {
                continue;
            }

            const commit = commits[commitKey];

            let commitDate;
            if (this.fromDateObj || this.untilDateObj) {
                commitDate = new Date(commit.date);
            }

            /**
             * Here we do our own date filtering on commits.
             * This kind of filtering is done because Bitbucket doesn't allow filtering by date on commits.
             */

            /*
             * If this commit was before the minFromDate user requested bail very early
             * As any further commits will be before this date.
             */
            if (this.fromDateObj && commitDate < this.fromDateObj) {
                return;
            }

            // If this commit is after the maxUntilDate user requested skip this commit
            if (this.untilDateObj && commitDate > this.untilDateObj) {
                continue;
            }

            if (this.shouldAddCommit(commit)) {
                usersCommits[commit.hash] = this.getFormattedCommitData(commit);
            }
        }

        // If this response has a 'next' page get the next page, but using initial url but page param updated instead, as using Bitbucket's returned 'next' value fails
        if (commitsData.next) {
            params.page++;
            await this.getUsersRepoCommitsCount(endpoint, params, usersCommits);
        }
    }

    /**
     * Wrapper function around getUsersRepoCommits to trigger the first recursive repo commits GET call
     */
    async getUsersRepoCommitsAll(repo) {
        const usersCommits = {};

        const params = {
            pagelen: this.itemsPerPage,
            page: 1,
        };
        await this.getUsersRepoCommits(repo.links.commits.href, params, usersCommits);
        return usersCommits;
    }

    /**
     * Always return true as Bitbucket is filtered at API level
     */
    isRepoWithinDate(repo, type) {
        return true;
    }

    /**
     * Overrides the base getRepos function as Bitbucket has a different format of response than generic
     */
    async getRepos(endpoint, params = {}) {
        const reposData = await this.getFromAPI(endpoint, params);
        if (!reposData || !reposData.values || !reposData.values.length) {
            return [];
        }

        let repos = reposData.values;

        // If this response has a 'next' page get the next page, using provided URL (including get params)
        if (reposData.next) {
            const newRepos = await this.getRepos(reposData.next);
            repos = repos.concat(newRepos);
        }

        return repos;
    }

    /**
     * Extends the base function to reverse the list to get newest first.
     * As filtering + sorting doesn't seem to work via the Bitbucket API
     */
    async getAllRepos() {
        const repos = await super.getAllRepos();
        return repos.reverse();
    }
}

module.exports = BitbucketCounter;
