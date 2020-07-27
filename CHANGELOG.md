# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

-   Different result formats

## [2.2.0] - 2020-07-27

### Updated

-   Made user names & email addresses optional for GitHub and filter by username in API calls for commits if no values

## [2.1.6] - 2020-07-16

### Removed

-   Removed extra (dev) files from package

## [2.1.5] - 2020-07-15

### Updated

-   Stop/remove unnecessary API calls when repo isn't within dates specified (from & until dates)

## [2.1.4] - 2020-02-10

### Updated

-   Updated internal logic/handling around dates (from & until dates)

## [2.1.3] - 2020-02-09

### Added

-   Added a changelog

## [2.1.2] - 2020-02-06

### Added

-   Added Eslint & prettier configs using my [codestyles package](https://www.npmjs.com/package/@jahidulpabelislam/codestyles)

## [2.1.1] - 2020-01-14

### Fixed

-   Fixed bug where commits were being counted as a contribution even when below 'minimum commits'

## [2.1.0] - 2019-12-15

### Added

-   Added support for self-hosted GitLab instances via new `url` option

## [2.0.0] - 2019-11-26

### Updated

-   Refactored how users call the counters (only expose the 'get' functions instead of whole classes)

## [1.7.3] - 2020-02-08

### Added

-   Added a changelog

## [1.7.2] - 2020-02-07

### Added

-   Added Eslint & prettier configs using my [codestyles package](https://www.npmjs.com/package/@jahidulpabelislam/codestyles)

## [1.7.1] - 2020-02-06

### Fixed

-   Fixed bug where commits were being counted as a contribution even when below 'minimum commits'

## [1.7.0] - 2020-02-06

### Added

-   Added support for self-hosted GitLab instances via new `url` option

## [1.6.0] - 2019-11-12

### Fixed

-   Removed hardcoded GitLab API endpoint of a private self-hosted instance and update to the public endpoint

## [1.5.4] - 2019-11-12

### Fixed

-   Fixed another illegal offset error when using `fromDate` for GitHub or GitLab, when no repos are found

## [1.5.3] - 2019-11-12

### Fixed

-   Fixed an illegal offset error when using `fromDate` for GitHub or GitLab (caused after refactor in [1.5.1])

## [1.5.2] - 2019-11-12

### Fixed

-   Fixed a missed renaming of a variable after refactoring in last release ([1.5.1])

## [1.5.1] - 2019-11-12

### Updated

-   Refactored/tidied up codebase

## [1.5.0] - 2019-09-25

### Added

-   Added support for `minRepoRole` option for GitHub

## [1.4.2] - 2019-09-25

### Updated

-   Updated functionality so any commits for closing a branch for Bitbucket (Mercurial) aren't counted

## [1.4.1] - 2019-08-01

### Fixed

-   Fixed invalid API calls to Bitbucket if no `fromDate` value set

## [1.4.0] - 2019-07-24

### Added

-   Added new `minCommits` option, to set a minimum number of commits a project needs to count as a contribution

## [1.3.0] - 2019-07-04

### Added

-   Added new `untilDate` option, to filter commits up to a certain date and time

## [1.2.0] - 2019-06-28

### Added

-   Added support for `fromDate` option for Bitbucket, to filter commits from a certain date and time

### Changed

-   Renamed `repoRole` option for Bitbucket to `minRepoRole` (but still allow `repoRole`)
-   Updated documentation

## [1.1.0] - 2019-06-16

### Added

-   Added new `minRepoAccessLevel` option for GitLab, to limit repos where user has this role
-   Added new `repoRole` option for Bitbucket, to limit repos where user has this role

## [1.0.1] - 2019-06-05

### Changed

-   Updated documentation

## [1.0.0] - 2019-06-02

First release! :fire:

[unreleased]: https://github.com/jahidulpabelislam/contribution-counters/compare/v2.2.0...HEAD

[2.2.0]: https://github.com/jahidulpabelislam/contribution-counters/compare/v2.1.6...v2.2.0
[2.1.6]: https://github.com/jahidulpabelislam/contribution-counters/compare/v2.1.5...v2.1.6
[2.1.5]: https://github.com/jahidulpabelislam/contribution-counters/compare/v2.1.4...v2.1.5
[2.1.4]: https://github.com/jahidulpabelislam/contribution-counters/compare/v2.1.3...v2.1.4
[2.1.3]: https://github.com/jahidulpabelislam/contribution-counters/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/jahidulpabelislam/contribution-counters/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/jahidulpabelislam/contribution-counters/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/jahidulpabelislam/contribution-counters/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.6.0...v2.0.0
[1.7.3]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.7.2...v1.7.3
[1.7.2]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.5.4...v1.6.0
[1.5.4]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.5.3...v1.5.4
[1.5.3]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.5.2...v1.5.3
[1.5.2]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.5.1...v1.5.2
[1.5.1]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.4.2...v1.5.0
[1.4.2]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.4.1...v1.4.2
[1.4.1]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/jahidulpabelislam/contribution-counters/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/jahidulpabelislam/contribution-counters/releases/tag/v1.0.0
