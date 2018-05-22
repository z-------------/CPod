const $ = jQuery = require("jquery")
const localforage = require("localforage")
const path = require("path")
const fs = require("fs")
const Jimp = require("jimp")
const remote = require("electron").remote
const nodeCrypto = require("crypto")
const tippy = require("tippy.js")
const request = require("request")
const i18n = require("../../lib/i18n.js")
const moment = require("moment")
const sortable = require(
  path.join(__dirname, "..", "..", "node_modules", "html5sortable", "dist", "html5sortable.cjs.js")
)
const Mousetrap = require("mousetrap")

const Autolinker = require("autolinker")
let autolinker = new Autolinker({
  mention: "twitter",
  hashtag: "twitter",
  stripPrefix: false,
  stripTrailingSlash: false
})

var MPRISPlayer;
try {
  MPRISPlayer = require("mpris-service")
} catch (e) {
  MPRISPlayer = null
}
