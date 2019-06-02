# Contribution Counters

[![CodeFactor](https://www.codefactor.io/repository/github/jahidulpabelislam/contribution-counters/badge?style=flat-square)](https://www.codefactor.io/repository/github/jahidulpabelislam/contribution-counters)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/b6f7e38aec0c4a8999cd763f73e55a45)](https://app.codacy.com/app/jahidulpabelislam/counters.js?utm_source=github.com&utm_medium=referral&utm_content=jahidulpabelislam/counters.js&utm_campaign=Badge_Grade_Settings)

A Node module to get the total commit's and repo's a user has contributed to.
 
This contribution counter is for 3 VCS's: GitHub, Bitbucket &amp; GitLab.

## Using module

1. Import the necessary counter like so: 

    `const { GitHub } = require("contribution-counters");`

2. Set up configuration for the selected counter

    The configuration for all is an object with the following properties (all available on all API's):

    * `username`: Your username (string:required)
    * `accessToken`: A access token for the user used above (string:required)

    The below two are only used if a commit doesn't have a real user attached
    * `userEmailAddresses`: An array of your email addresses which may be associated with a commit (array)
    * `userNames`: An array of your name's which may be associated with a commit (array)

    If you only want to get repos or commits after a particular date (Also can be used to minimise API requests if you know you haven't contributed to any repo's before this date)
    * `fromDate`: A datetime string used to only return repos and/or commit's after this date  (ISO-8601 Date/timestamp (YYYY-MM-DDTHH:mm:ss.sssZ))

3. Start the counter with the following:

    ```
    const api = new GitHub(config);
    
    const counters = await api.getCounters();
    ``` 

4. The returned value (`counters`) will have two properties:

   1. `commits` which is your total commits
   2. `projects` is the number of project's you've contributed to.


`GitHub` in above examples can be replace with `Bitbucket` and `GitLab`.

### Creating access tokens

* [GitHub](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line)
* [GitLab](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html#creating-a-personal-access-token)
* [Bitbucket](https://confluence.atlassian.com/bitbucketserver/personal-access-tokens-939515499.html)
