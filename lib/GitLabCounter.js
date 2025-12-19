;/**
 * The API wrapper to generate contributions data for GitLab, extending/overwriting the base BaseCounter class/functions.
 *
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2024 JPI
 * @license: GPL-3.0
 */

const BaseCounter = require("./BaseCounter");

class GitLabCounter extends BaseCounter {

    constructor(config) {
        super(config);

        // Define the endpoint and params to use in the getAllRepos function in BaseCounter

        this.relativeAPIEndpoint = "api/v4";

        let apiEndpoint = `https://gitlab.com/${this.relativeAPIEndpoint}`;
        if ({}.hasOwnProperty.call(config, "url")) {
            apiEndpoint = this.buildAPIEndpoint(config.url);
        }
        this.reposEndpoint = `${apiEndpoint}/projects`;

        this.reposParams = {
            min_access_level: config.minRepoAccessLevel || 30,
            simple: false,
            per_page: this.itemsPerPage,
            page: 1,
            order_by: "updated_at",
            direction: "desc",
        };
        this.repoUpdatedAtField = "last_activity_at";
        this.repoCreatedAtField = "created_at";

        this.repoIdField = "path_with_namespace";
    }

    buildAPIEndpoint(baseURL) {
        const relativeEndpoint = this.relativeAPIEndpoint;

        baseURL = BaseCounter.removeSlashes(baseURL);

        // If base URL already has the API part of the URL remove to format it the way we want
        if (baseURL.substr(-relativeEndpoint.length) === relativeEndpoint) {
            baseURL = baseURL.substr(0, baseURL.length - relativeEndpoint.length);
            baseURL = BaseCounter.removeSlashes(baseURL);
        }

        // Make sure the protocol is included
        if (!baseURL.startsWith("https://") && !baseURL.startsWith("http://")) {
            baseURL = `http://${baseURL}`;
        }

        return `${baseURL}/${relativeEndpoint}`;
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

    getFormattedCommitData(commit, repo) {
        return {
            sha: commit.id,
            title: commit.title,
            message: commit.message,
            authorName: commit.author_name,
            authorEmail: commit.author_email,
            committerName: commit.committer_name,
            committerEmail: commit.committer_email,
            parentIds: commit.parent_ids,
            authoredAt: new Date(commit.authored_date),
            committedAt: new Date(commit.committed_date),
            createdAt: new Date(commit.created_at),
            url: `${repo.web_url}/commit/${commit.id}`,
        };
    }

    getFormattedRepoData(repo) {
        return {
            id: repo.id,
            name: repo.path,
            fullName: repo.path_with_namespace,
            description: repo.description,
            owner: (repo.owner ? repo.owner.name : repo.namespace.path) || "",
            url: repo.web_url,
            isPrivate: repo.visibility === "private",
            createdAt: new Date(repo.created_at),
            updatedAt: new Date(repo.last_activity_at),
        };
    }

    /**
     * A recursive function to get an array of ALL pull requests created by user in a repo.
     * (so loop until there is no next page)
     */
    async getUsersRepoPullRequests(endpoint, params, allPullRequests) {
        const pullRequests = await this.getFromAPI(endpoint, params);
        if (!pullRequests || !pullRequests.length) {
            return;
        }

        const self = this;
        pullRequests.forEach((pullRequest) => {
            if (
                pullRequest.state !== "closed" &&
                pullRequest.author &&
                pullRequest.author.username === self.username
            ) {
                allPullRequests.push(self.getFormattedPullRequestData(pullRequest));
            }
        });

        // If this response has the max try next page
        if (pullRequests.length === this.itemsPerPage) {
            params.page++;
            await this.getUsersRepoPullRequests(endpoint, params, allPullRequests);
        }
    }

    async getUsersRepoPullRequestsAll(repo) {
        const endpoint = `${this.reposEndpoint}/${repo.id}/merge_requests`;
        const params = {
            per_page: this.itemsPerPage,
            page: 1,
        };

        // Only add since/from values if dates are set
        if (this.fromDate) {
            params.created_after = this.fromDate;
        }
        if (this.untilDate) {
            params.created_before = this.untilDate;
        }

        const pullRequests = [];
        await this.getUsersRepoPullRequests(endpoint, params, pullRequests);
        return pullRequests;
    }

    /**
     * Return whether the author of the commit is the requested user
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
     * A recursive function to get ALL the user commits in a particular repo,
     * so loop until there is no next page
     */
    async getUsersRepoCommits(endpoint, params, usersCommits, repo) {
        if (!this.requiresAllCommits() && usersCommits.length >= this.minCommits) {
            return;
        }

        const commits = await this.getFromAPI(endpoint, params);
        if (!commits || !commits.length) {
            return;
        }

        const self = this;
        commits.forEach((commit) => {
            if (self.shouldAddCommit(commit)) {
                usersCommits[commit.id] = self.getFormattedCommitData(commit, repo);
            }
        });

        // If this response has the max items try next page
        if (commits.length === this.itemsPerPage) {
            params.page++;
            await this.getUsersRepoCommits(endpoint, params, usersCommits, repo);
        }
    }

    /**
     * Wrapper function around getUsersRepoCommits to trigger the first recursive repo commits GET call
     */
    async getUsersRepoCommitsAll(repo) {
        const usersCommits = {};
        const endpoint = `${this.reposEndpoint}/${repo.id}/repository/commits`;
        const params = {
            all: true,
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

        await this.getUsersRepoCommits(endpoint, params, usersCommits, repo);

        return usersCommits;
    }
}

module.exports = GitLabCounter;
