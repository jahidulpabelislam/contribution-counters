"use strict";

const API = require("./API");

class GitHub extends API {

    constructor(options) {
        super(options);
        this.reposEndpoint = "https://api.github.com/user/repos";
        this.reposParams = {
            per_page: this.itemsPerPage,
            page: 1,
            sort: "updated",
            direction: "desc",
        };
    }

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

    isCommitter(commit) {
        return (
            commit &&
            (
                (commit.author && commit.author.login === this.username) ||
                (commit.commit && commit.commit.author &&
                    (
                        this.userEmailAddresses.indexOf(commit.commit.author.email) !== -1 ||
                        this.userNames.indexOf(commit.commit.author.name) !== -1
                    )
                )
            )
        );
    }

    async getRepoCommits(url, params = {}, repoCommits = []) {
        const commits = await this.getFromAPI(url, params);

        if (!commits) {
            return repoCommits;
        }

        const totalFoundCommits = commits.length;

        for (let i = 0; i < totalFoundCommits; i++) {
            const commit = commits[i];

            // Because for GitHub we get commits per branch, keep track of sha's in case a commit is returned in multiple branches
            if (repoCommits.indexOf(commit.sha) !== -1) {
                continue;
            }

            // If this commit has more than one parent commit, assume it's a merge commit
            if (commit.parents && commit.parents.length > 1) {
                continue;
            }

            if (this.isCommitter(commit)) {
                repoCommits.push(commit.sha);
            }
        }

        // If this response has the max items try next page
        if (totalFoundCommits === this.itemsPerPage) {
            params.page++;
            repoCommits = await this.getRepoCommits(url, params, repoCommits);
        }

        return repoCommits;
    }

    async getAllRepoCommits(repo) {
        // Get all the commits on the 'default' branch on this repo
        const commitsURL = repo.commits_url.replace("{/sha}", "");
        const commitsParams = {
            per_page: this.itemsPerPage,
            page: 1,
        };
        let repoCommits = await this.getRepoCommits(commitsURL, commitsParams, []);

        // Get all commit's from all other open non-default branches
        const defaultBranch = repo.default_branch;

        const branchesUrl = repo.branches_url.replace("{/branch}", "");
        const branchesParams = {
            per_page: this.itemsPerPage,
            page: 1,
        };
        const branches = await this.getRepoBranches(branchesUrl, branchesParams);

        for (let i = 0; i < branches.length; i++) {
            const branch = branches[i];

            if (branch.name === defaultBranch) {
                continue;
            }

            const commitsParams = {
                sha: branch.name,
                per_page: this.itemsPerPage,
                page: 1,
            };
            repoCommits = await this.getRepoCommits(commitsURL, commitsParams, repoCommits);
        }

        return repoCommits.length;
    }

    getRepoName(repo) {
        return repo.full_name;
    }
}

module.exports = GitHub;
