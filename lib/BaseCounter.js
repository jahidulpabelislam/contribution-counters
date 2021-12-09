;/**
 * The base/main wrapper around all APIs which will execute all the necessary functions to generate the counts.
 * The counters for each (Bitbucket, GitHub & GitLab) will extend this and overwrite or extend these functions.
 *
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2022 JPI
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
        this.repoUpdatedAtField = "";
        this.repoCreatedAtField = "";

        this.formatDate("from");
        this.formatDate("until");
    }

    static getConfigValue(config, key, defaultValue) {
        // If value was passed by user, use this value if `valid`
        if ({}.hasOwnProperty.call(config, key) && typeof config[key] === typeof defaultValue) {
            return config[key];
        }

        return defaultValue;
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

    static getDefaultConfig() {
        return {
            username: "",
            accessToken: "",
            userEmailAddresses: [],
            userNames: [],
            fromDate: "",
            untilDate: "",
            minCommits: 1,
        };
    }

    /**
     * A helper function to wrap all console.logs to log what the class is
     */
    log(...messages) {
        messages.unshift(`   ${this.constructor.name} -`);
        console.log(...messages);
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
     * Each counter will need different functions to calculate its pull requests, so this is just the base.
     * And the real function will be extended & defined in the actual specific Counter class
     */
    getUsersRepoPullRequestsCountAll(repo) {
        return 0;
    }

    /**
     * Each counter will need different functions to calculate its commits, so this is just the base.
     * And the real function will be extended & defined in the actual specific Counter class
     */
    getUsersRepoCommitsCountAll(repo) {
        return 0;
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
        let usersProjectsCount = 0;
        let usersCommitsCount = 0;
        let usersPullRequestsCount = 0;

        const repos = await this.getAllRepos();
        for (let i = 0; i < repos.length; i++) {
            const repo = repos[i];
            if (!this.isRepoWithinDate(repo, "from") || !this.isRepoWithinDate(repo, "until")) {
                continue;
            }

            const repoCommitsCount = await this.getUsersRepoCommitsCountAll(repo);
            if (repoCommitsCount >= this.minCommits) {
                usersProjectsCount++;
                usersCommitsCount += repoCommitsCount;
            }

            usersPullRequestsCount += await this.getUsersRepoPullRequestsCountAll(repo);
        }

        return {
            projects: usersProjectsCount,
            commits: usersCommitsCount,
            pull_requests: usersPullRequestsCount,
        };
    }
}

module.exports = BaseCounter;
