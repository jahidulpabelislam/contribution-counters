;/**
 * The API wrapper to generate counts for GitLab, extending/overwriting the base BaseCounter class/functions.
 *
 * @version 1.4.0
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2019 JPI
 * @license: GPL-3.0
 */

"use strict";

const BaseCounter = require("./BaseCounter");

class GitLabCounter extends BaseCounter {

    constructor(options) {
        super(options);

        // Define the endpoint and params to use in the getAllRepos function in BaseCounter
        this.reposEndpoint = "https://gitlab.com/api/v4/projects";
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
    async getFromAPI(endpoint, params = {}, extraOptions = {}) {
        const options = {
            headers: {
                "Private-Token": this.accessToken,
            },
            auth: {},
            ...extraOptions,
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
    async getUsersRepoCommitsCount(endpoint, params = {}) {
        const commits = await this.getFromAPI(endpoint, params);
        if (!commits) {
            return 0;
        }

        const self = this;
        let usersCommitsCount = 0;
        commits.forEach(function(commit){
            if (self.shouldAddCommit(commit)) {
                usersCommitsCount++;
            }
        });

        // If this response has the max items try next page
        if (commits.length === this.itemsPerPage) {
            params.page++;
            usersCommitsCount += await this.getUsersRepoCommitsCount(endpoint, params);
        }

        return usersCommitsCount;
    }

    /**
     * Wrapper function around getUsersRepoCommitsCount to trigger the first recursive repo commits GET call
     */
    async getUsersRepoCommitsCountAll(repo) {
        const endpoint = `${this.reposEndpoint}/${repo.id}/repository/commits`;
        const params = {
            since: this.fromDate,
            until: this.untilDate,
            all: true,
            per_page: this.itemsPerPage,
            page: 1,
        };
        return await this.getUsersRepoCommitsCount(endpoint, params);
    }
}

module.exports = GitLabCounter;
