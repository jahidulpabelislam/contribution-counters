"use strict";

const axios = require("axios");

class API {

    constructor(options = {}) {
        const defaultOptions = {
            username: "",
            accessToken: "",
            userEmailAddresses: [],
            userNames: [],
            fromDate: "",
        };

        for (let option in defaultOptions) {
            if (defaultOptions.hasOwnProperty(option)) {
                let value = defaultOptions[option];
                if (options.hasOwnProperty(option) && typeof options[option] === typeof value) {
                    value = options[option];
                }
                this[option] = value;
            }
        }

        // The general settings all API's will uses but not configurable per instance
        this.itemsPerPage = 100;
        this.reposEndpoint = "";
        this.reposParams = {};
    }

    log(...messages) {
        messages.unshift(`   ${this.constructor.name} -`);
        console.log(...messages);
    }

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
            return res.data;
        }
        catch (err) {
            this.log(`Failed call to ${endpoint} with error:`, (err.response.data || ""));
            return false;
        }
    }

    /*
     * Each API will return the repo name in a different format, so this is just the base.
     * And the real function will be extended & defined in the actual specific API class
     */
    getRepoName(repo) {
        return "";
    }

    /*
     * Each API will need different functions to calculate its commits, so this is just the base.
     * And the real function will be extended & defined in the actual specific API class
     */
    getAllRepoCommits(repo) {
        return 0;
    }

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

    async getAllRepos() {
        const endpoint = this.reposEndpoint;
        const params = this.reposParams;
        return this.getRepos(endpoint, params);
    }

    async getCounters() {
        let repos = await this.getAllRepos();

        let projects = [];
        let usersProjects = [];
        let totalCommits = 0;

        for (let i = 0; i < repos.length; i++) {
            const repo = repos[i];
            const repoName = this.getRepoName(repo);

            if (projects.indexOf(repoName) !== -1) {
                continue;
            }

            projects.push(repoName);

            const repoCommits = await this.getAllRepoCommits(repo);

            if (repoCommits > 0) {
                usersProjects.push(repoName);
                totalCommits += repoCommits;
            }

            this.log(`${repoCommits} commits on ${repoName} by user`);
        }

        return {
            projects: usersProjects.length,
            commits: totalCommits,
        };
    }
}

module.exports = API;
