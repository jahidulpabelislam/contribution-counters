/**
 * A Node.js module to get commits and repos counts/data from Bitbucket, GitHub & GitLab
 *
 * The main file where the all the public functions are exported
 *
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2024 JPI
 * @license: GPL-3.0
 */

const BitbucketCounter = require("./lib/BitbucketCounter");
const GitHubCounter = require("./lib/GitHubCounter");
const GitLabCounter = require("./lib/GitLabCounter");

// Wrapper function to only expose main getter function to public use!
const exposer = function(counterClass) {
    return function(config) {
        const counter = new counterClass(config);
        return counter.get();
    };
};

module.exports = {
    getBitbucketContributions: exposer(BitbucketCounter),
    getGitHubContributions: exposer(GitHubCounter),
    getGitLabContributions: exposer(GitLabCounter),
};
