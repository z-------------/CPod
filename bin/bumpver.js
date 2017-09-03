#!/usr/bin/env node

const path = require("path")
const fs = require("fs")

const usageString = "Usage: <int major> <int minor> <int patch>"

if (process.argv.length === 5) {
  let major = Number(process.argv[2])
  let minor = Number(process.argv[3])
  let patch = Number(process.argv[4])
  if (!Number.isNaN(major) && !Number.isNaN(minor) && !Number.isNaN(patch)) {
    var packageJSONFilename = path.join(__dirname, "..", "package.json")
    var packageJSON = require(packageJSONFilename)
    var versionArray = packageJSON.version.split(".").map(val => Number(val))
    versionArray[0] += major
    versionArray[1] += minor
    versionArray[2] += patch
    var versionString = versionArray.join(".")
    packageJSON.version = versionString
    fs.writeFile(packageJSONFilename, JSON.stringify(packageJSON), err => {
      if (err) throw err
      console.log(`Success. Version bumped to ${versionString}.`)
      process.exit(0)
    })
  } else {
    console.log(usageString)
  }
} else {
  console.log(`Not enough arguments. ${usageString}`)
  process.exit(1)
}
