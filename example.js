;/**
 * Just an example of all the counters in action.
 */

"use strict";

const { getBitbucketCounts, getGitHubCounts, getGitLabCounts } = require("contribution-counters");

// Luckily as my username and email addresses will be consistent throughout all 3 counters, use the same global variables
const username = "jahidulpabelislam";
const userEmailAddresses = [
    "jahidul.pabel.islam@hotmail.com",
    "me@jahidulpabelislam.com",
    "jahidul@jahidulpabelislam.com",
];
const userNames = ["Jahidul Pabel Islam", "Jahidul Islam"];

// Keep count of all commits and projects throughout all 3 counters
let totalCommits = 0;
let totalProjects = 0;

// A generic wrapper function as all 3 counters are called the same way
const getCounts = async function(counterFunction, extraConfig = {}) {
    const allConfig = {
        username: username,
        userEmailAddresses: userEmailAddresses,
        userNames: userNames,
        ...extraConfig,
    };
    const counts = await counterFunction(allConfig);

    // Here just update the total counts
    totalCommits += counts.commits;
    totalProjects += counts.projects;
};

const run = async function() {
    await getCounts(getBitbucketCounts, {
        accessToken: "hidden",
        fromDate: "2019-06-02",
    });

    await getCounts(getGitHubCounts, {
        accessToken: "hidden",
        fromDate: "2019-06-02",
    });

    await getCounts(getGitLabCounts, {
        accessToken: "hidden",
        fromDate: "2019-06-02",
    });

    const counts = {
        projects: totalProjects,
        commits: totalCommits,
    };

    console.log("Total:", counts);
};

run();
