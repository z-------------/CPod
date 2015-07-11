xml2js = require 'xml2js'
fs = require 'fs'

fs.readFile 'bork.xml', (err, data) ->
  xml2js.parseString data, (err, parsed) ->
    console.log(parsed)
    console.log(err)
