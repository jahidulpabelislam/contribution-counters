# Contribution Counters

[![NPM](https://nodei.co/npm/contribution-counters.png?downloads=true&downloadRank=true&stars=true)](https://npmjs.org/package/contribution-counters)

[![CodeFactor](https://www.codefactor.io/repository/github/jahidulpabelislam/contribution-counters/badge?style=flat-square)](https://www.codefactor.io/repository/github/jahidulpabelislam/contribution-counters)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/b6f7e38aec0c4a8999cd763f73e55a45)](https://app.codacy.com/app/jahidulpabelislam/counters.js?utm_source=github.com&utm_medium=referral&utm_content=jahidulpabelislam/counters.js&utm_campaign=Badge_Grade_Settings)
![npm](https://img.shields.io/npm/v/contribution-counters.svg)
![npm](https://img.shields.io/npm/dm/contribution-counters.svg)
![GitHub last commit (branch)](https://img.shields.io/github/last-commit/jahidulpabelislam/contribution-counters/master.svg?label=last%20activity)
![npm bundle size](https://img.shields.io/bundlephobia/min/contribution-counters.svg)
![NPM](https://img.shields.io/npm/l/contribution-counters.svg)

Have you ever wanted to find out how many repos/projects you've contributed to and with how many commits?
Well, now you can easily do so with this simple to use module!

This contribution counter is for 3 VCSs: GitHub, Bitbucket &amp; GitLab and is achieved via each of their API's and access tokens.

## Instructions

### Installing

1.  To install locally: `npm install contribution-counters --save`
2.  To install globally: `npm install contribution-counters --global`

### Using module

1.  Import the necessary counter like below:

    `const { GitHub } = require("contribution-counters");`

2.  Set up the configuration for the selected counter

    The config is an object with the following properties (all available on all counters unless specified):

    -   `username`: Your username (string:required)
    -   `accessToken`: A access token for the user used above (string:required)

    The below two are only used if a commit doesn't have a real user attached

    -   `userEmailAddresses`: An array of your email addresses which may be associated with a commit (array)
    -   `userNames`: An array of your name's which may be associated with a commit (array)

    If you only want to get repos or commits after a particular date (Also can be used to minimise API requests if you know you haven't contributed to any repos before this date)

    -   `fromDate`: A datetime string used to only return repos and/or commits after this date (ISO-8601 Date/timestamp (YYYY-MM-DDTHH:mm:ss.sssZ))

    Only for GitLab

    -   `minRepoAccessLevel`: An enum value used to only get repos with this access level or greater, see [here](https://docs.gitlab.com/ee/api/members.html) (int:default=30)[10, 20, 30, 40,50]

    Only for Bitbucket

    -   `repoRole`: An enum value used to only get repos with this role level or greater, see [here](https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Busername%7D) (string:default=contributor)[admin, contributor, member, owner]

3.  Start the counter with the following:

    ```javascript
    const api = new GitHub(config);

    const counters = await api.getCounters();
    ```

4.  The returned result (`counters`) is a object with two properties:

    -   `commits` is your total commits
    -   `projects` is the number of projects you've contributed to

`GitHub` in the above example can be replaced with `Bitbucket` or `GitLab`.

### Creating access tokens

-   [GitHub](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line)
-   [GitLab](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html#creating-a-personal-access-token)
-   [Bitbucket](https://confluence.atlassian.com/bitbucketserver/personal-access-tokens-939515499.html)


## Authors

-   [Jahidul Pabel Islam](https://jahidulpabelislam.com/) <me@jahidulpabelislam.com>

## License

This module is licensed under the General Public License - see the [License](LICENSE.md) file for details
