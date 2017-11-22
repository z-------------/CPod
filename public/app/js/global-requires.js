const $ = jQuery = require("jquery")
const localforage = require("localforage")
const moment = require("moment")
const path = require("path")
const fs = require("fs")

const Jimp = require("jimp")

const Audiosearch = require("audiosearch-client-node")
const audiosearch = new Audiosearch(
  require("../../audiosearch_config.json").applicationId,
  require("../../audiosearch_config.json").secret
)

const REQUEST_HEADERS = require(path.join(__dirname, "../../request-headers.js")).REQUEST_HEADERS
