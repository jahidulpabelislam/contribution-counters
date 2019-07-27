;/**
 * The API wrapper to generate counters for GitLab, extending/overwriting the base API class/functions.
 *
 * @version 1.3.0
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2019 JPI
 * @license: GPL-3.0
 */

"use strict";

const API = require("./API");

class GitLab extends API {

    constructor(options) {
        super(options);

        // Define the endpoint and params to use in the getAllRepos function in API
        this.reposEndpoint = "https://gitlab.projects-abroad.net/api/v4/projects";
        this.reposParams = {
            min_access_level: options.minRepoAccessLevel || 30,
            simple: true,
            per_page: this.itemsPerPage,
            page: 1,
            order_by: "updated_at",
            direction: "desc",
        };
        this.repoUpdatedDateField = "last_activity_at";
    }

    /**
     * Extend the base function to override the auth property as GitLab doesn't use Auth
     * Instead done via a 'Private Token' in the headers
     */
    async getFromAPI(endpoint, params = {}) {
        const options = {
            headers: {
                "Private-Token": this.accessToken,
            },
            auth: {},
        };
        return super.getFromAPI(endpoint, params, options);
    }

    /**
     * Return whether or not the author of the commit is the requested user
     */
    isCommitter(commit) {
        return (
            commit && (
                this.userEmailAddresses.indexOf(commit.author_email) !== -1 ||
                this.userNames.indexOf(commit.author_name) !== -1
            )
        );
    }

    shouldAddCommit(commit) {
        // If this commit has more than one parent commit, assume it's a merge commit
        if (commit.parent_ids && commit.parent_ids.length > 1) {
            return false;
        }

        return this.isCommitter(commit);
    }

    /**
     * A recursive function to get total count of ALL commits by a user in a particular repo,
     * so loop until there is no next page
     */
    async getRepoCommits(endpoint, params = {}) {
        const commits = await this.getFromAPI(endpoint, params);

        if (!commits) {
            return 0;
        }

        const totalCommits = commits.length;

        let totalUsersCommits = 0;
        for (let i = 0; i < totalCommits; i++) {
            const commit = commits[i];

            if (this.shouldAddCommit(commit)) {
                totalUsersCommits++;
            }
        }

        // If this response has the max items try next page
        if (totalCommits === this.itemsPerPage) {
            params.page++;
            totalUsersCommits += await this.getRepoCommits(endpoint, params);
        }

        return totalUsersCommits;
    }

    /**
     * Wrapper function around getRepoCommits to trigger the first repo commits GET call
     */
    async getAllRepoCommits(repo) {
        const commitsEndpoint = `https://gitlab.projects-abroad.net/api/v4/projects/${repo.id}/repository/commits`;
        const commitsParams = {
            since: this.fromDate,
            until: this.untilDate,
            all: true,
            per_page: this.itemsPerPage,
            page: 1,
        };
        return await this.getRepoCommits(commitsEndpoint, commitsParams);
    }
}

module.exports = GitLab;
