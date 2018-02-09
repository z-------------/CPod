const $ = jQuery = require("jquery")
const localforage = require("localforage")
const moment = require("moment")
const path = require("path")
const fs = require("fs")
const Jimp = require("jimp")
const remote = require("electron").remote
const sha1 = require("sha1")
const twttr = { txt: require("twitter-text") }
const tippy = require("tippy.js")
const request = require("request")
