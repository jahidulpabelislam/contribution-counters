;/*
 * The API wrapper to generate counters for GitHub, extending/overwriting the base API class/functions.
 *
 * @version 1.0.0
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2019 JPI
 * @license: GPL-3.0
 */

"use strict";

const API = require("./API");

class GitHub extends API {

    constructor(options) {
        super(options);

        // Define the endpoint and params to use in the getAllRepos function in API
        this.reposEndpoint = "https://api.github.com/user/repos";
        this.reposParams = {
            per_page: this.itemsPerPage,
            page: 1,
            sort: "updated",
            direction: "desc",
        };
    }

    /*
     * A recursive function to get an array of ALL open branches in a repos,
     * so loop until there is no next page
     */
    async getRepoBranches(endpoint, params = {}) {
        let branches = await this.getFromAPI(endpoint, params);

        if (!branches) {
            return [];
        }

        // If this response has the max try next page
        if (branches.length === this.itemsPerPage) {
            params.page++;
            const newRepos = await this.getRepoBranches(endpoint, params);
            branches = branches.concat(newRepos);
        }

        return branches;
    }

    /*
     * Return whether or not the author of the commit is the requested user
     */
    isCommitter(commit) {
        return (
            commit && (
                (commit.author && commit.author.login === this.username) ||
                (commit.commit && commit.commit.author && (
                        this.userEmailAddresses.indexOf(commit.commit.author.email) !== -1 ||
                        this.userNames.indexOf(commit.commit.author.name) !== -1
                    )
                )
            )
        );
    }

    /*
     * A recursive function to get a array ALL commits by a user in a branch for a particular repo,
     * so loop until there is no next page
     */
    async getRepoCommits(endpoint, params = {}, usersCommits = []) {

        // If since/fromDate is empty remove from params
        if (params.since != null && params.since.trim() === "") {
            delete params.since;
        }

        const commits = await this.getFromAPI(endpoint, params);

        if (!commits) {
            return usersCommits;
        }

        const totalFoundCommits = commits.length;

        for (let i = 0; i < totalFoundCommits; i++) {
            const commit = commits[i];

            // Because for GitHub we get commits per branch,
            // keep track of sha's in case a commit is returned in multiple branches
            if (usersCommits.indexOf(commit.sha) !== -1) {
                continue;
            }

            // If this commit has more than one parent commit, assume it's a merge commit
            if (commit.parents && commit.parents.length > 1) {
                continue;
            }

            if (this.isCommitter(commit)) {
                usersCommits.push(commit.sha);
            }
        }

        // If this response has the max items try next page
        if (totalFoundCommits === this.itemsPerPage) {
            params.page++;
            usersCommits = await this.getRepoCommits(endpoint, params, usersCommits);
        }

        return usersCommits;
    }

    /*
     * Get ALL commits in a particular repo by a particular user
     * Firstly from the default branch, then per branch and then add together to make total
     */
    async getAllRepoCommits(repo) {
        // Get ALL the commits on the 'default' branch on this repo
        const commitsEndpoint = repo.commits_url.replace("{/sha}", "");
        const commitsParams = {
            since: this.fromDate,
            per_page: this.itemsPerPage,
            page: 1,
        };
        let usersCommits = await this.getRepoCommits(commitsEndpoint, commitsParams);

        /*
         * Get ALL commit's from ALL other open non-default branches
         */

        const defaultBranch = repo.default_branch;

        const branchesEndpoint = repo.branches_url.replace("{/branch}", "");
        const branchesParams = {
            per_page: this.itemsPerPage,
            page: 1,
        };
        const branches = await this.getRepoBranches(branchesEndpoint, branchesParams);

        for (let i = 0; i < branches.length; i++) {
            const branch = branches[i];

            if (branch.name === defaultBranch) {
                continue;
            }

            const commitsParams = {
                sha: branch.name,
                since: this.fromDate,
                per_page: this.itemsPerPage,
                page: 1,
            };
            usersCommits = await this.getRepoCommits(commitsEndpoint, commitsParams, usersCommits);
        }

        return usersCommits.length;
    }
}

module.exports = GitHub;
