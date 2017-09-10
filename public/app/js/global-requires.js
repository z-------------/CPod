const $ = jQuery = require("jquery")
const localforage = require("localforage")
const moment = require("moment")
const path = require("path")

const Audiosearch = require("audiosearch-client-node")
const audiosearch = new Audiosearch(
  require("../../audiosearch_config.json").application_id,
  require("../../audiosearch_config.json").secret
)
