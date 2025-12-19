;/**
 * Just an example of all the counters in action.
 */

const {
    getBitbucketContributions,
    getGitHubContributions,
    getGitLabContributions
} = require("contribution-counters");

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
const getCounts = async function(functionName, extraConfig = {}) {
    const allConfig = {
        username: username,
        userEmailAddresses: userEmailAddresses,
        userNames: userNames,
        ...extraConfig,
    };
    const contributions = await functionName(allConfig);

    // Here just update the total counts
    totalCommits += contributions.totalCommits;
    totalProjects += contributions.totalProjects;
};

const run = async function() {
    await getCounts(getBitbucketContributions, {
        accessToken: "hidden",
        fromDate: "2019-06-02T00:00:00Z",
    });

    await getCounts(getGitHubContributions, {
        accessToken: "hidden",
        fromDate: "2019-06-02T00:00:00Z",
    });

    await getCounts(getGitLabContributions, {
        accessToken: "hidden",
        fromDate: "2019-06-02T00:00:00Z",
    });

    const counts = {
        projects: totalProjects,
        commits: totalCommits,
    };

    console.log("Total:", counts);
};

run();
