const $ = jQuery = require("jquery")
const localforage = require("localforage")
const path = require("path")
const fs = require("fs")
const Jimp = require("jimp")
const remote = require("electron").remote
const nodeCrypto = require("crypto")
const tippy = require("tippy.js")
const Request = require("request")
const i18n = require("../../lib/i18n.js")
const moment = require("moment")
const sortable = require(
  path.join(__dirname, "..", "..", "node_modules", "html5sortable", "dist", "html5sortable.cjs.js")
)
const Mousetrap = require("mousetrap")
const os = require("os")
const package = require(path.join(__dirname, "../..", "package.json"))
const sanitizeFilename = require("sanitize-filename")
const countries = require("i18n-iso-countries")

const Autolinker = require("autolinker")
let autolinker = new Autolinker({
  mention: "twitter",
  hashtag: false,
  stripPrefix: false,
  stripTrailingSlash: false
})

var MPRISPlayer;
try {
  MPRISPlayer = require("mpris-service")
} catch (e) {
  MPRISPlayer = null
}
