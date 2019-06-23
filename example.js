;/**
 * Just an example of all the counters in action.
 */

"use strict";

const { Bitbucket, GitHub, GitLab } = require("contribution-counters");

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

// A generic function as all 3 counters will do the same functions
const getAPICounter = async function(apiClass, extraConfig = {}) {
    const allConfig = {
        username: username,
        userEmailAddresses: userEmailAddresses,
        userNames: userNames,
        ...extraConfig,
    };
    const api = new apiClass(allConfig);
    const counters = await api.getCounters();
    api.log(counters);

    // Here just update the total counts
    totalCommits += counters.commits;
    totalProjects += counters.projects;
};

const getCounters = async function() {
    await getAPICounter(Bitbucket, {
        accessToken: "hidden",
        fromDate: "2019-06-02",
    });

    await getAPICounter(GitHub, {
        accessToken: "hidden",
        fromDate: "2019-06-02",
    });

    await getAPICounter(GitLab, {
        accessToken: "hidden",
        fromDate: "2019-06-02",
    });

    const counters = {
        projects: totalProjects,
        commits: totalCommits,
    };

    console.log("Total:", counters);
};

getCounters();
