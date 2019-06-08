;/*
 * The API wrapper to generate counters for GitLab, extending/overwriting the base API class/functions.
 *
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2019 JPI
 * @license: GPL-3.0
 * @version 1.0.0
 */

"use strict";

const API = require("./API");

class GitLab extends API {

    constructor(options) {
        super(options);
        this.reposEndpoint = "https://gitlab.projects-abroad.net/api/v4/projects";
        this.reposParams = {
            min_access_level: 30,
            simple: true,
            per_page: this.itemsPerPage,
            page: 1,
            order_by: "updated_at",
            direction: "desc",
        };
    }

    /*
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

    isCommitter(commit) {
        return (
            commit &&
            (
                this.userEmailAddresses.indexOf(commit.author_email) !== -1 ||
                this.userNames.indexOf(commit.author_name) !== -1
            )
        );
    }

    async getRepoCommits(url, params = {}) {
        const commits = await this.getFromAPI(url, params);

        if (!commits) {
            return 0;
        }

        const totalNumCommits = commits.length;

        let userTotalNumCommits = 0;
        for (let i = 0; i < totalNumCommits; i++) {
            const commit = commits[i];

            // If this commit has more than one parent commit, assume it's a merge commit
            if (commit.parent_ids && commit.parent_ids.length > 1) {
                continue;
            }

            if (this.isCommitter(commit)) {
                userTotalNumCommits++;
            }
        }

        // If this response has the max items try next page
        if (totalNumCommits === this.itemsPerPage) {
            params.page++;
            const newNumCommits = await this.getRepoCommits(url, params);
            userTotalNumCommits += newNumCommits;
        }

        return userTotalNumCommits;
    }

    async getAllRepoCommits(repo) {
        const commitsEndpoint = `https://gitlab.projects-abroad.net/api/v4/projects/${repo.id}/repository/commits`;
        const commitsParams = {
            since: this.fromDate,
            all: true,
            per_page: this.itemsPerPage,
            page: 1,
        };
        return await this.getRepoCommits(commitsEndpoint, commitsParams);
    }

    getRepoName(repo) {
        return repo.path_with_namespace;
    }
}

module.exports = GitLab;
