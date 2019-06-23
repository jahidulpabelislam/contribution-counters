;/**
 * A Node.js module to get commits and repos counts from Bitbucket, GitHub & GitLab
 *
 * The main file where the all the public functions are exported
 *
 * @version 1.0.0
 * @author Jahidul Pabel Islam <me@jahidulpabelislam.com>
 * @copyright (c) 2010 - 2019 JPI
 * @license: GPL-3.0
 */

"use strict";

const Bitbucket = require("./lib/Bitbucket");
const GitHub = require("./lib/GitHub");
const GitLab = require("./lib/GitLab");

module.exports = {
    Bitbucket,
    GitHub,
    GitLab,
};
