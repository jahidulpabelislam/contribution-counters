;/**
 * A Node.js module to get commits and repos counts from Bitbucket, GitHub & GitLab
 *
 * The main file where the all the public functions are exported
 *
 * @version 2.0.0
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2019 JPI
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
    getBitbucketCounts: exposer(BitbucketCounter),
    getGitHubCounts: exposer(GitHubCounter),
    getGitLabCounts: exposer(GitLabCounter),
};
