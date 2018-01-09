const $ = jQuery = require("jquery")
const localforage = require("localforage")
const moment = require("moment")
const path = require("path")
const fs = require("fs")

const Jimp = require("jimp")

const REQUEST_HEADERS = require(path.join(__dirname, "../../request-headers.js")).REQUEST_HEADERS

const remote = require("electron").remote

const sha1 = require("sha1")

const validUrl = require("valid-url")
