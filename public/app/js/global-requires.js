const $ = jQuery = require("jquery")
const localforage = require("localforage")
const moment = require("moment")
const path = require("path")

const Audiosearch = require("audiosearch-client-node")
const audiosearch = new Audiosearch(
  process.env.CBUS_AUDIOSEARCH_APPLICATION_ID,
  process.env.CBUS_AUDIOSEARCH_SECRET
)
