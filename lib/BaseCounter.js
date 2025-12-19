;/**
 * The base/main wrapper around all APIs which will execute all the necessary functions to generate the contributions data.
 * The counters for each (Bitbucket, GitHub & GitLab) will extend this and overwrite or extend these functions.
 *
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2024 JPI
 * @license: GPL-3.0
 */

const axios = require("axios");

class BaseCounter {

    /**
     * Sets the user chosen config/options as well as set config
     * @param {object} config - object of user chosen config/options
     */
    constructor(config = {}) {
        const defaultConfig = BaseCounter.getDefaultConfig();
        for (const key in defaultConfig) {
            if ({}.hasOwnProperty.call(defaultConfig, key)) {
                // Extract the chosen config or default value
                this[key] = BaseCounter.getConfigValue(config, key, defaultConfig[key]);
            }
        }

        /**
         * The general settings all counter's will use but not user configurable per instance
         * And may be overridden in the extended classes
         */
        this.itemsPerPage = 100;
        this.reposEndpoint = "";
        this.reposParams = {};
        this.repoIdField = "full_name";
        this.repoUpdatedAtField = "";
        this.repoCreatedAtField = "";

        this.formatDate("from");
        this.formatDate("until");

        this.formats = this.format.split(",");
    }

    static getConfigValue(config, key, defaultValue) {
        // If value was passed by user, use this value if `valid`
        if ({}.hasOwnProperty.call(config, key) && typeof config[key] === typeof defaultValue) {
            return config[key];
        }

        return defaultValue;
    }

    static getDefaultConfig() {
        return {
            username: "",
            accessToken: "",
            userEmailAddresses: [],
            userNames: [],
            fromDate: "",
            untilDate: "",
            minCommits: 1,
            format: "total_counts",
            repoWhitelist: [],
            repoBlacklist: [],
        }
    }

    static removeSlashes(url) {
        url = url.trim();
        url = url.replace(/^\/+|\/+$/g, "");
        return url;
    }

    static hasArrayValue(string, array) {
        return array.some((value) => {
            return string.includes(value);
        });
    }

    formatDate(key) {
        const dateKey = `${key}Date`;
        const objKey = `${dateKey}Obj`;

        const dateString = this[dateKey];

        this[dateKey] = null;
        this[objKey] = null;

        if (dateString !== null && dateString.trim() !== "") {
            this[objKey] = new Date(dateString);
            this[dateKey] = this[objKey].toISOString();
        }
    }

    /**
     * A helper function to wrap all console.logs to log what the class is
     */
    log(...messages) {
        messages.unshift(`   ${this.constructor.name} -`);
        console.log(...messages);
    }

    /**
     * A generic API GET caller
     *
     * @param {string} endpoint - The full URL to call
     * @param {object} params - object of any query params/data to send
     * @param {object} extraOptions - object of any call options overrides/extras
     */
    async getFromAPI(endpoint, params = {}, extraOptions = {}) {
        const options = {
            method: "GET",
            url: endpoint,
            params: params,
            headers: {
                "Content-Type": "application/json",
            },
            auth: {
                username: this.username,
                password: this.accessToken,
            },
            ...extraOptions,
        };

        try {
            const response = await axios(options);
            return (response.data || false);
        }
        catch (error) {
            const errorString = error && error.response && error.response.data ? error.response.data : "";
            this.log(`Failed call to ${endpoint} with error:`, errorString);
            return false;
        }
    }

    /**
     * Abstract functions
     *
     * The real function will be extended & defined in the actual specific Counter class
     */
    getUsersRepoPullRequestsAll(repo) { return []; }
    getUsersRepoCommitsAll(repo) { return []; }
    getFormattedRepoData(repo) { return repo; }
    getFormattedCommitData(commit) { return commit; }
    getFormattedPullRequestData(pullRequest) { return {"id": pullRequest.id}; }

    hasFormat(format) {
        if (this.formats.indexOf("all") !== -1) {
            return true;
        }

        return (this.formats.indexOf(format) !== -1);
    }

    requiresAllCommits() {
        return this.hasFormat("total_counts") ||
            this.hasFormat("total_commits") ||
            this.hasFormat("count_per_project") ||
            this.hasFormat("projects_with_commits") ||
            this.hasFormat("commits")
        ;
    }

    shouldSkipRepo(repo) {
        if (this.repoWhitelist.length) {
            for (let i = 0; i < this.repoWhitelist.length; i++) {
                const regex = this.repoWhitelist[i];

                if (regex.test(repo.name)) {
                    return false;
                }
            }

            return true;
        }

        if (this.repoBlacklist.length) {
            for (let i = 0; i < this.repoBlacklist.length; i++) {
                const regex = this.repoBlacklist[i];

                if (regex.test(repo.name)) {
                    return true;
                }
            }
        }

        return false;
    }

    isRepoWithinDate(repo, type) {
        if (type === "from" && this.fromDateObj) {
            const repoUpdatedAt = new Date(repo[this.repoUpdatedAtField]);
            return repoUpdatedAt >= this.fromDateObj;
        }
        else if (type === "until" && this.untilDateObj) {
            const repoCreatedAt = new Date(repo[this.repoCreatedAtField]);
            return repoCreatedAt <= this.untilDateObj;
        }

        return true;
    }

    /**
     * A recursive function to get an array of ALL repos available,
     * so loop until there is no next page
     */
    async getRepos(endpoint, params = {}) {
        let repos = await this.getFromAPI(endpoint, params);
        if (!repos || !repos.length) {
            return [];
        }

        const count = repos.length;

        // If this response has the max items try next page
        if (count === this.itemsPerPage) {
            if (this.fromDateObj) {

                /**
                 * If the last repo was last updated before the minFromDate user requested bail very early and return the current repos.
                 * As any further repos will be before this date.
                 * This kind of filtering is done because these APIs don't allow filtering by date on repos so we filter on own end
                 * so it minimises further API requests.
                 */
                if (!this.isRepoWithinDate(repos[count - 1], "from")) {
                    return repos;
                }
            }

            params.page++;
            const newRepos = await this.getRepos(endpoint, params);
            repos = repos.concat(newRepos);
        }

        return repos;
    }

    /**
     * Wrapper function around getRepos to trigger the first recursive repos GET call
     */
    async getAllRepos() {
        return this.getRepos(this.reposEndpoint, this.reposParams);
    }

    /**
     * The actual main counter function, which will run necessary functions
     */
    async get() {
        const result = {};

        if (this.hasFormat("projects") || this.hasFormat("projects_with_commits")) {
            result.projects = [];
        }

        if (this.hasFormat("commits")) {
            result.commits = [];
        }

        if (this.hasFormat("pull_requests")) {
            result.pullRequests = [];
        }

        if (this.hasFormat("count_per_project")) {
            result.counts = {};
        }

        if (this.hasFormat("total_counts")) {
            result.totalProjects = 0;
            result.totalCommits = 0;
            result.totalPullRequests = 0;
        } else {
            if (this.hasFormat("total_projects")) {
                result.totalProjects = 0;
            }

            if (this.hasFormat("total_commits")) {
                result.totalCommits = 0;
            }

            if (this.hasFormat("total_pull_requests")) {
                result.totalPullRequests = 0;
            }
        }

        const getCommits = this.hasFormat("projects") ||
            this.hasFormat("projects_with_commits") ||
            this.hasFormat("commits") ||
            this.hasFormat("count_per_project") ||
            this.hasFormat("total_counts") ||
            this.hasFormat("total_projects") ||
            this.hasFormat("total_commits")
        ;

        const getPullRequests = this.hasFormat("pull_requests") ||
            this.hasFormat("total_counts") ||
            this.hasFormat("total_pull_requests") ||
            this.hasFormat("count_per_project")
        ;

        const repos = await this.getAllRepos();
        for (const repo of repos) {
            if (
                this.shouldSkipRepo(repo) ||
                !this.isRepoWithinDate(repo, "from") ||
                !this.isRepoWithinDate(repo, "until")
            ) {
                continue;
            }

            if (this.hasFormat("count_per_project")) {
                result.counts[repo[this.repoIdField]] = {
                    "commits": 0,
                    "pullRequests": 0,
                };
            }

            if (getCommits) {
                let usersRepoCommits = await this.getUsersRepoCommitsAll(repo);
                usersRepoCommits = Object.values(usersRepoCommits);
                const repoCommitsCount = usersRepoCommits.length;

                if (repoCommitsCount >= this.minCommits) {
                    if (this.hasFormat("projects") || this.hasFormat("projects_with_commits")) {
                        const formattedRepo = this.getFormattedRepoData(repo);

                        if (this.hasFormat("projects_with_commits")) {
                            formattedRepo.commits = usersRepoCommits;
                        }

                        result.projects.push(formattedRepo);
                    }

                    if (this.hasFormat("commits")) {
                        result.commits = result.commits.concat(usersRepoCommits);
                    }

                    if (this.hasFormat("count_per_project")) {
                        result.counts[repo[this.repoIdField]]["commits"] = repoCommitsCount;
                    }

                    if (this.hasFormat("total_counts") || this.hasFormat("total_projects")) {
                        result.totalProjects++;
                    }

                    if (this.hasFormat("total_counts") || this.hasFormat("total_commits")) {
                        result.totalCommits += repoCommitsCount;
                    }
                }
            }

            if (getPullRequests) {
                const pullRequests = await this.getUsersRepoPullRequestsAll(repo);

                if (this.hasFormat("pull_requests")) {
                    result.pullRequests = result.pullRequests.concat(pullRequests);
                }

                if (this.hasFormat("total_counts") || this.hasFormat("total_pull_requests")) {
                    result.totalPullRequests += pullRequests.length;
                }

                if (this.hasFormat("count_per_project")) {
                    result.counts[repo[this.repoIdField]]["pullRequests"] = pullRequests.length;
                }
            }
        }

        return result;
    }
}

module.exports = BaseCounter;
