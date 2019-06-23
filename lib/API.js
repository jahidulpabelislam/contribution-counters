;/*
 * The base/main wrapper around all APIs which will execute all the necessary functions to generate the counters.
 * The APIs for each (Bitbucket, GitHub & GitLab) will extend this and overwrite or extend these functions.
 *
 * @version 1.0.2
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2019 JPI
 * @license: GPL-3.0
 */

"use strict";

const axios = require("axios");

class API {

    /*
     * Sets the user chosen configs/options as well as set configs
     * @param {object} options - object of user chosen options/config
     */
    constructor(options = {}) {
        const defaultOptions = API.getDefaultOptions();
        for (let option in defaultOptions) {
            if (defaultOptions.hasOwnProperty(option)) {
                // Extract the default option value
                this[option] = API.getOptionValue(defaultOptions[option], option, options);
            }
        }

        /*
         * The general settings all API's will use but not user configurable per instance
         * And may be overridden in the extended classes
         */
        this.itemsPerPage = 100;
        this.reposEndpoint = "";
        this.reposParams = {};
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
        };
    }

    /*
     * A helper function to wrap all console.logs to log what the class is
     */
    log(...messages) {
        messages.unshift(`   ${this.constructor.name} -`);
        console.log(...messages);
    }

    /*
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
            this.log(`Failed call to ${endpoint} with error:`, (err.response.data || ""));
            return false;
        }
    }

    /*
     * Each API will need different functions to calculate its commits, so this is just the base.
     * And the real function will be extended & defined in the actual specific API class
     */
    getAllRepoCommits(repo) {
        return 0;
    }

    /*
     * A recursive function to get an array of ALL repos available,
     * so loop until there is no next page
     */
    async getRepos(endpoint, params = {}) {
        let repos = await this.getFromAPI(endpoint, params);

        if (!repos) {
            return [];
        }

        // If this response has the max items try next page
        if (repos.length === this.itemsPerPage) {
            params.page++;
            const newRepos = await this.getRepos(endpoint, params);
            repos = repos.concat(newRepos);
        }

        return repos;
    }

    /*
     * Wrapper function around getRepos to trigger the first repos GET call
     */
    async getAllRepos() {
        const endpoint = this.reposEndpoint;
        const params = this.reposParams;
        return this.getRepos(endpoint, params);
    }

    /*
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
                totalUsersProjects++;
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
