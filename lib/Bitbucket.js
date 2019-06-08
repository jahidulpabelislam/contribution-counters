;/*
 * The API wrapper to generate counters for Bitbucket, extending/overwriting the base API class/functions.
 *
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2019 JPI
 * @license: GPL-3.0
 * @version 1.0.0
 */

"use strict";

const API = require("./API");

class Bitbucket extends API {

    constructor(options) {
        super(options);
        this.reposEndpoint = "https://api.bitbucket.org/2.0/repositories/";
        this.reposParams = {
            role: options.repoRole || "contributor",
            q: `updated_on>=${this.fromDate}`,
            pagelen: this.itemsPerPage,
            page: 1,
        };
    }

    isCommitter(commit) {
        return (
            commit &&
            commit.author && (
                (
                    commit.author.user && (commit.author.user.username === this.username ||
                    this.userEmailAddresses.indexOf(commit.author.user.email) !== -1)
                ) ||
                commit.author.raw.includes(this.username) ||
                this.userEmailAddresses.some((emailAddress) => commit.author.raw.includes(emailAddress)) ||
                this.userNames.some((name) => commit.author.raw.includes(name))
            )
        );
    }

    async getRepoCommits(url, params = {}) {
        const commitsData = await this.getFromAPI(url, params);

        if (!commitsData || !commitsData.values) {
            return 0;
        }

        let totalNumCommits = 0;

        const commitKeys = Object.keys(commitsData.values);
        const numCommits = commitKeys.length;

        for (let i = 0; i < numCommits; i++) {
            const commit = commitsData.values[commitKeys[i]];

            // If this commit has more than one parent commit, assume it's a merge commit
            if (commit.parents && commit.parents.length > 1) {
                continue;
            }

            if (this.isCommitter(commit)) {
                totalNumCommits++;
            }
        }

        // If this response has a 'next' page get the next page, but using initial url but page param updated instead, as using Bitbucket's returned 'next' value fails
        if (commitsData.next) {
            params.page++;
            const newCommits = await this.getRepoCommits(url, params);
            totalNumCommits += newCommits;
        }

        return totalNumCommits;
    }

    async getAllRepoCommits(repo) {
        const params = {
            pagelen: this.itemsPerPage,
            page: 1,
        };
        return await this.getRepoCommits(`${repo.links.commits.href}/`, params);
    }

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

    /*
     * Extends the base function to reverse the list to get newest first.
     * As filtering + sorting doesn't seem to work via the Bitbucket API
     */
    async getAllRepos() {
        let repos = await super.getAllRepos();
        return repos.reverse();
    }
}

module.exports = Bitbucket;
