const path = require("path")
const fs = require("fs")
const nodeCrypto = require("crypto")
const os = require("os")
const package = require(path.join(__dirname, "../..", "package.json"))

const electron = require("electron")
const remote = electron.remote
const ipcRenderer = electron.ipcRenderer

const $ = jQuery = require("jquery")
const localforage = require("localforage")
const Request = require("request")
const i18n = require("../../lib/i18n.js")
const sanitizeFilename = require("sanitize-filename")
const fileUrl = require("file-url")
const moment = require("moment")
const countries = require("i18n-iso-countries")
const Mousetrap = require("mousetrap")

const Jimp = require("jimp")
const tippy = require("tippy.js")
const sortable = require(
  path.join(__dirname, "..", "..", "node_modules", "html5sortable", "dist", "html5sortable.cjs.js")
)
const Autolinker = require("autolinker");
let autolinker = new Autolinker({
  mention: "twitter",
  hashtag: false,
  stripPrefix: false,
  stripTrailingSlash: false
})

const sanitizeHTML = require("sanitize-html")
sanitizeHTML.defaults.allowedTags = [
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "p", "a", "ul", "ol", "nl",
  "li", "b", "i", "strong", "em", "strike", "code", "hr", "br", "div",  "table",
  "thead", "caption", "tbody", "tr", "th", "td", "pre", "img"
]

var MPRISPlayer;
try {
  MPRISPlayer = require("mpris-service")
} catch (e) {
  MPRISPlayer = null
}
