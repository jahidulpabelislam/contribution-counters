;/**
 * Just an example of all the counters in action.
 */

"use strict";

const { getBitbucketCounters, getGitHubCounters, getGitLabCounters } = require("contribution-counters");

// Luckily as my username and email addresses will be consistent throughout all 3 counters, use the same global variables
const username = "jahidulpabelislam";
const userEmailAddresses = [
    "jahidul.pabel.islam@hotmail.com",
    "me@jahidulpabelislam.com",
    "jahidul@jahidulpabelislam.com",
];
const userNames = ["Jahidul Pabel Islam", "Jahidul Islam"];

// Keep counts of all commits and projects throughout all 3 counters
let totalCommits = 0;
let totalProjects = 0;

// A generic wrapper function as all 3 counters are called the same way
const getCounters = async function(counterFunction, extraConfig = {}) {
    const allConfig = {
        username: username,
        userEmailAddresses: userEmailAddresses,
        userNames: userNames,
        ...extraConfig,
    };
    const counters = await counterFunction(allConfig);

    // Here just update the total counts
    totalCommits += counters.commits;
    totalProjects += counters.projects;
};

const init = async function() {
    await getCounters(getBitbucketCounters, {
        accessToken: "hidden",
        fromDate: "2019-06-02",
    });

    await getCounters(getGitHubCounters, {
        accessToken: "hidden",
        fromDate: "2019-06-02",
    });

    await getCounters(getGitLabCounters, {
        accessToken: "hidden",
        fromDate: "2019-06-02",
    });

    const counters = {
        projects: totalProjects,
        commits: totalCommits,
    };

    console.log("Total:", counters);
};

init();
