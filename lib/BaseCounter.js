;/**
 * The base/main wrapper around all APIs which will execute all the necessary functions to generate the counts.
 * The counters for each (Bitbucket, GitHub & GitLab) will extend this and overwrite or extend these functions.
 *
 * @version 2.1.1
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2019 JPI
 * @license: GPL-3.0
 */

"use strict";

const axios = require("axios");

class BaseCounter {

    /**
     * Sets the user chosen config/options as well as set config
     * @param {object} config - object of user chosen config/options
     */
    constructor(config = {}) {
        const defaultConfig = BaseCounter.getDefaultConfig();
        for (const key in defaultConfig) {
            if (defaultConfig.hasOwnProperty(key)) {
                // Extract the chosen config or default value
                this[key] = BaseCounter.getConfigValue(config, key, defaultConfig[key],);
            }
        }

        /**
         * The general settings all counter's will use but not user configurable per instance
         * And may be overridden in the extended classes
         */
        this.itemsPerPage = 100;
        this.reposEndpoint = "";
        this.reposParams = {};
        this.repoUpdatedDateField = "";
    }

    static getConfigValue(config, key, defaultValue) {
        // If value was passed by user, use this value if `valid`
        if (config.hasOwnProperty(key) && typeof config[key] === typeof defaultValue) {
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
     * Each counter will need different functions to calculate its commits, so this is just the base.
     * And the real function will be extended & defined in the actual specific Counter class
     */
    getUsersRepoCommitsCountAll(repo) {
        return 0;
    }

    /**
     * A recursive function to get an array of ALL repos available,
     * so loop until there is no next page
     */
    async getRepos(endpoint, params = {}, fromDate = null) {
        let repos = await this.getFromAPI(endpoint, params);
        if (!repos || !repos.length) {
            return [];
        }

        const count = repos.length;

        if (fromDate) {
            /**
             * If the last repo was last updated before the minFromDate user requested bail very early and return the current repos.
             * As any further repos will be before this date.
             * This kind of filtering is done because these APIs don't allow filtering by date on repos so we filter on own end
             * so it minimises further API requests.
             */
            const lastRepo = repos[count - 1];
            const repoUpdatedDate = new Date(lastRepo[this.repoUpdatedDateField]);
            if (repoUpdatedDate < fromDate) {
                return repos;
            }
        }

        // If this response has the max items try next page
        if (count === this.itemsPerPage) {
            params.page++;
            const newRepos = await this.getRepos(endpoint, params, fromDate);
            repos = repos.concat(newRepos);
        }

        return repos;
    }

    /**
     * Wrapper function around getRepos to trigger the first recursive repos GET call
     */
    async getAllRepos() {
        let fromDateObj;
        if (this.fromDate != null && this.fromDate.trim() !== "") {
            fromDateObj = new Date(this.fromDate);
        }

        return this.getRepos(this.reposEndpoint, this.reposParams, fromDateObj);
    }

    /**
     * The actual main counter function, which will run necessary functions
     */
    async get() {
        const repos = await this.getAllRepos();

        let usersProjectsCount = 0;
        let usersCommitsCount = 0;

        for (let i = 0; i < repos.length; i++) {
            const repo = repos[i];

            const repoCommitsCount = await this.getUsersRepoCommitsCountAll(repo);
            if (repoCommitsCount >= this.minCommits) {
                usersProjectsCount++;
                usersCommitsCount += repoCommitsCount;
            }
        }

        return {
            projects: usersProjectsCount,
            commits: usersCommitsCount,
        };
    }
}

module.exports = BaseCounter;
