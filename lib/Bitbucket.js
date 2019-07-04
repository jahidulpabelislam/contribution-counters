;/**
 * The API wrapper to generate counters for Bitbucket, extending/overwriting the base API class/functions.
 *
 * @version 1.3.0
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2019 JPI
 * @license: GPL-3.0
 */

"use strict";

const API = require("./API");

class Bitbucket extends API {

    constructor(options) {
        super(options);

        // Define the endpoint and params to use in the getAllRepos function in API
        this.reposEndpoint = "https://api.bitbucket.org/2.0/repositories/";
        this.reposParams = {
            role: options.minRepoRole || options.repoRole || "contributor",
            q: `updated_on>=${this.fromDate}`,
            pagelen: this.itemsPerPage,
            page: 1,
        };
    }

    /**
     * Return whether or not the author of the commit is the requested user
     */
    isCommitter(commit) {
        return (
            commit && commit.author && ((
                    commit.author.user && (
                        commit.author.user.username === this.username ||
                        this.userEmailAddresses.indexOf(commit.author.user.email) !== -1
                    )
                ) ||
                commit.author.raw.includes(this.username) ||
                this.userEmailAddresses.some((emailAddress) => commit.author.raw.includes(emailAddress)) ||
                this.userNames.some((name) => commit.author.raw.includes(name))
            )
        );
    }

    shouldAddCommit(commit) {
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
    async getRepoCommits(endpoint, params, minDate, maxDate) {
        const commitsData = await this.getFromAPI(endpoint, params);

        if (!commitsData || !commitsData.values) {
            return 0;
        }

        let totalUsersCommits = 0;

        const commits = commitsData.values;

        const commitKeys = Object.keys(commits);
        const totalCommits = commitKeys.length;

        for (let i = 0; i < totalCommits; i++) {
            const commit = commits[commitKeys[i]];

            let commitFromDate;
            if (minDate || maxDate) {
                commitFromDate = new Date(commit.date);
            }

            /**
             * Here we do our own date filtering on commits.
             * This kind of filtering is done because Bitbucket doesn't allow filtering by date on commits.
             */

            // If this commit was before the minFromDate user requested bail very early and return current count.
            // As any further commits will be before this date.
            if (minDate && commitFromDate < minDate) {
                return totalUsersCommits;
            }

            // If this commit is after the maxUntilDate user requested skip this commit
            if (maxDate && commitFromDate > maxDate) {
                continue;
            }

            if (this.shouldAddCommit(commit)) {
                totalUsersCommits++;
            }
        }

        // If this response has a 'next' page get the next page, but using initial url but page param updated instead, as using Bitbucket's returned 'next' value fails
        if (commitsData.next) {
            params.page++;
            totalUsersCommits += await this.getRepoCommits(endpoint, params, minDate, maxDate);
        }

        return totalUsersCommits;
    }

    /**
     * Wrapper function around getRepoCommits to trigger the first repo commits GET call
     */
    async getAllRepoCommits(repo) {
        let fromDateObj;
        if (this.fromDate != null && this.fromDate.trim() !== "") {
            fromDateObj = new Date(this.fromDate);
        }

        let untilDateObj;
        if (this.untilDate != null && this.untilDate.trim() !== "") {
            untilDateObj = new Date(this.untilDate);
        }

        const params = {
            pagelen: this.itemsPerPage,
            page: 1,
        };
        return await this.getRepoCommits(repo.links.commits.href, params, fromDateObj, untilDateObj);
    }

    /**
     * Overrides the base getRepos function as Bitbucket has a different format of response than generic
     */
    async getRepos(endpoint, params = {}) {
        const reposData = await this.getFromAPI(endpoint, params);

        if (!reposData || !reposData.values) {
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

module.exports = Bitbucket;
