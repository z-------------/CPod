const $ = jQuery = require("jquery")
const localforage = require("localforage")
const path = require("path")
const fs = require("fs")
const Jimp = require("jimp")
const remote = require("electron").remote
const sha1 = require("sha1")
const twttr = { txt: require("twitter-text") }
const tippy = require("tippy.js")
const request = require("request")
const x2j = require("xml2js")
const i18n = require("../../lib/i18n.js")
const moment = require("moment")
let systemLocale = i18n.getSystemLocale();
if (i18n.getAvailableLocales().indexOf(systemLocale) !== -1) {
  moment.locale(systemLocale);
}
