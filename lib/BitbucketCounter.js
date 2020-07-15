;/**
 * The API wrapper to generate counts for Bitbucket, extending/overwriting the base BaseCounter class/functions.
 *
 * @version 2.0.2
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2019 JPI
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

        const query = [];

        if (this.fromDate) {
            query.push(`updated_on>=${this.fromDate}`);
        }

        this.reposParams.q = query.join("AND");

        if (this.untilDate) {
            this.reposParams.after = `created_on<=${this.untilDate}`;
        }
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
     * A recursive function to get total count of ALL user commits in a repo,
     * so loop until there is no next page
     */
    async getUsersRepoCommitsCount(endpoint, params) {
        const commitsData = await this.getFromAPI(endpoint, params);
        if (!commitsData || !commitsData.values || !commitsData.values.length) {
            return 0;
        }

        let usersCommitsCount = 0;

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
             * If this commit was before the minFromDate user requested bail very early and return current count.
             * As any further commits will be before this date.
             */
            if (this.fromDateObj && commitDate < this.fromDateObj) {
                return usersCommitsCount;
            }

            // If this commit is after the maxUntilDate user requested skip this commit
            if (this.untilDateObj && commitDate > this.untilDateObj) {
                continue;
            }

            if (this.shouldAddCommit(commit)) {
                usersCommitsCount++;
            }
        }

        // If this response has a 'next' page get the next page, but using initial url but page param updated instead, as using Bitbucket's returned 'next' value fails
        if (commitsData.next) {
            params.page++;
            usersCommitsCount += await this.getUsersRepoCommitsCount(endpoint, params);
        }

        return usersCommitsCount;
    }

    /**
     * Wrapper function around getUsersRepoCommitsCount to trigger the first recursive repo commits GET call
     */
    async getUsersRepoCommitsCountAll(repo) {
        const params = {
            pagelen: this.itemsPerPage,
            page: 1,
        };
        return this.getUsersRepoCommitsCount(repo.links.commits.href, params);
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
