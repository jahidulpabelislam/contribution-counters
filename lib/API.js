;/**
 * The base/main wrapper around all APIs which will execute all the necessary functions to generate the counters.
 * The APIs for each (Bitbucket, GitHub & GitLab) will extend this and overwrite or extend these functions.
 *
 * @version 1.3.1
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2019 JPI
 * @license: GPL-3.0
 */

"use strict";

const axios = require("axios");

class API {

    /**
     * Sets the user chosen configs/options as well as set configs
     * @param {object} options - object of user chosen options/config
     */
    constructor(options = {}) {
        const defaultOptions = API.getDefaultOptions();
        for (const option in defaultOptions) {
            if (defaultOptions.hasOwnProperty(option)) {
                // Extract the default option value
                this[option] = API.getOptionValue(defaultOptions[option], option, options);
            }
        }

        /**
         * The general settings all API's will use but not user configurable per instance
         * And may be overridden in the extended classes
         */
        this.itemsPerPage = 100;
        this.reposEndpoint = "";
        this.reposParams = {};
        this.repoUpdatedDateField = "";
    }

    static getOptionValue(value, option, options) {
        // If option was passed by user, use this value if `valid`
        if (options.hasOwnProperty(option) && typeof options[option] === typeof value) {
            value = options[option];
        }

        return value;
    }

    static getDefaultOptions() {
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

    /**
     * A generic API GET caller
     *
     * @param {string} endpoint - The full URL to call
     * @param {object} params - object of any query params/data to send
     * @param {object} options - object of any call options overrides
     */
    async getFromAPI(endpoint, params = {}, options = {}) {
        const allOptions = {
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
            ...options,
        };

        try {
            const res = await axios(allOptions);
            return res.data || false;
        }
        catch (err) {
            const errMsg = err && err.response && err.response.data ? err.response.data : "";
            this.log(`Failed call to ${endpoint} with error:`, errMsg);
            return false;
        }
    }

    /**
     * Each API will need different functions to calculate its commits, so this is just the base.
     * And the real function will be extended & defined in the actual specific API class
     */
    getAllRepoCommits(repo) {
        return 0;
    }

    /**
     * A recursive function to get an array of ALL repos available,
     * so loop until there is no next page
     */
    async getRepos(endpoint, params = {}, minDate = null) {
        let repos = await this.getFromAPI(endpoint, params);

        if (!repos) {
            return [];
        }

        const itemsFound = repos.length;

        if (minDate) {
            /**
             * If the last repo was last updated before the minFromDate user requested bail very early and return the current repos.
             * As any further repos will be before this date.
             * This kind of filtering is done because these APIs don't allow filtering by date on repos so we filter on own end
             * so it minimises further API requests.
             */
            const lastRepo = repos[itemsFound - 1];
            const repoUpdatedDate = new Date(lastRepo[this.repoUpdatedDateField]);
            if (repoUpdatedDate < minDate) {
                return repos;
            }
        }

        // If this response has the max items try next page
        if (itemsFound === this.itemsPerPage) {
            params.page++;
            const newRepos = await this.getRepos(endpoint, params, minDate);
            repos = repos.concat(newRepos);
        }

        return repos;
    }

    /**
     * Wrapper function around getRepos to trigger the first repos GET call
     */
    async getAllRepos() {
        let fromDateObj;
        if (this.fromDate != null && this.fromDate.trim() !== "") {
            fromDateObj = new Date(this.fromDate);
        }

        const endpoint = this.reposEndpoint;
        const params = this.reposParams;
        return this.getRepos(endpoint, params, fromDateObj);
    }

    /**
     * The actual main counter function, which will run necessary functions
     */
    async getCounters() {
        const repos = await this.getAllRepos();

        let totalUsersProjects = 0;
        let totalCommits = 0;

        for (let i = 0; i < repos.length; i++) {
            const repo = repos[i];

            const repoCommits = await this.getAllRepoCommits(repo);
            if (repoCommits > 0) {
                if (repoCommits >= this.minCommits) {
                    totalUsersProjects++;
                }
                totalCommits += repoCommits;
            }
        }

        return {
            projects: totalUsersProjects,
            commits: totalCommits,
        };
    }
}

module.exports = API;
