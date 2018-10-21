// based on Electron's getting started guide

const { app, BrowserWindow, dialog, shell, globalShortcut } = require("electron")
const path = require("path")
const url = require("url")
const autoUpdater = require("electron-updater").autoUpdater
const fs = require("fs")
const i18n = require("./lib/i18n.js")
const request = require("request")

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

app.setPath(
  "userData",
  path.join(
    path.parse(app.getPath("userData")).dir,
    "cumulonimbus"
  )
)

const WINDOW_SIZE_FILE = path.join(app.getPath("userData"), "window_size")

let windowOptions = {
  title: "CPod"
}

if (process.platform === "win32") {
  windowOptions.icon = path.join(__dirname, "build/icon.ico")
} else {
  windowOptions.icon = path.join(__dirname, "build/icon.png")
}

function createWindow(width, height, maximize) {
  // Create the browser window.
  if (maximize) {
    win = new BrowserWindow(windowOptions)
    win.maximize()
  } else if (width && height) {
    win = new BrowserWindow(Object.assign(windowOptions, {
      width: width,
      height: height
    }))
  }

  //win.setMenu(null)

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, "public/app/index.html"),
    protocol: "file:",
    slashes: true
  }))

  // Emitted when the window is closing.
  win.on("close", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    let dimens = win.getSize()
    fs.writeFile(WINDOW_SIZE_FILE, JSON.stringify({
      width: dimens[0],
      height: dimens[1],
      maximized: win.isMaximized()
    }) + "\n", {
      encoding: "utf8"
    }, (err) => {
      if (err) {
        console.log("error writing to window size file")
      }
      win = null
    })
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", function() {
  fs.readFile(WINDOW_SIZE_FILE, {
    encoding: "utf8"
  }, (err, data) => {
    if (err) {
      console.log("no window size file")
      createWindow(null, null, true)
    } else {
      try {
        let sizeInfo = JSON.parse(data)
        createWindow(sizeInfo.width, sizeInfo.height, sizeInfo.maximized)
      } catch (e) {
        console.log("no valid window size data")
        createWindow(null, null, true)
      }
    }
  })

  for (let accelerator of ["mediaplaypause", "medianexttrack", "mediaprevioustrack"]) {
    globalShortcut.register(accelerator, function() {
      win.webContents.send("globalShortcut", accelerator)
    })
  }
})

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

try {
  let settingsFilePath = path.join(app.getPath("userData"), "user_settings.json")
  userSettingsFile = fs.readFileSync(settingsFilePath, {
    encoding: "utf8"
  })
  if (JSON.parse(userSettingsFile).autoUpdaterAllowPrerelease) {
    autoUpdater.allowPrerelease = true
  }
} catch (e) {
  console.log("no user settings file")
}

// autoUpdater.fullChangelog = true
autoUpdater.autoDownload = false

var currentVersion

autoUpdater.checkForUpdates().then((updateCheckResult) => {
  let info = updateCheckResult.updateInfo
  console.log(info, info.releaseNotes)

  var isNewer = false;
  currentVersion = require("./package.json").version
  let cvs = currentVersion.split(".").map(s => Number(s))
  let uvs = info.version.split(".").map(s => Number(s))
  if (
    uvs[0] > cvs[0] ||
    uvs[0] === cvs[0] && uvs[1] > cvs[1] ||
    uvs[0] === cvs[0] && uvs[1] === cvs[1] && uvs[2] > cvs[2]
  ) {
    isNewer = true;
  }

  if (isNewer) {
    fs.readFile(path.join(app.getPath("userData"), "skip_version"), {
      encoding: "utf8"
    }, (err, data) => {
      if (err) {
        console.log("error reading skip_version file")
        data = "";
      }
      if (info.version !== data.trim()) {
        request({
          url: "https://api.github.com/repos/z-------------/cumulonimbus/releases/latest",
          headers: { "User-Agent": "cumulonimbus" }
        }, (err, response, body) => {
          try {
            var isPrerelease = true;
            if (JSON.parse(body).tag_name.substring(1) === info.version) {
              isPrerelease = false;
            }
            let messageBoxOptions = {
              type: "question",
              buttons: [
                i18n.__("dialog_update-available_button_download"),
                i18n.__("dialog_update-available_button_skip")
              ],
              defaultId: 0,
              cancelId: -1,
              title: i18n.__("dialog_update-available_title"),
              message: i18n.__(
                "dialog_update-available_body-" + (isPrerelease ? "prerelease" : "stable"),
                info.version, currentVersion
              )
            }

            dialog.showMessageBox(win, messageBoxOptions, (responseIndex) => {
              if (responseIndex === messageBoxOptions.defaultId) {
                autoUpdater.downloadUpdate(updateCheckResult.cancellationToken)
              } else if (responseIndex !== -1) {
                fs.writeFile(
                  path.join(app.getPath("userData"), "skip_version"),
                  info.version.toString(),
                  (err) => {
                    if (err) {
                      console.log("error writing to skip_version file")
                    } else {
                      console.log("wrote to skip_version file")
                    }
                  }
                )
              }
            })
          } catch (e) {
            console.log("exception in update check", e)
          }
        })
      } else {
        console.log("version " + info.version + " is skipped")
      }
    })
  } else {
    console.log("update is not newer than current version, ignoring")
  }
})

autoUpdater.on("update-downloaded", (info) => {
  console.log(info)

  let messageBoxOptions = {
    type: "question",
    buttons: [
      i18n.__("dialog_update-downloaded_button_install"),
      i18n.__("dialog_update-downloaded_button_cancel")
    ],
    defaultId: 0,
    cancelId: 1,
    title: i18n.__("dialog_update-downloaded_title"),
    message: i18n.__("dialog_update-downloaded_body", info.version, currentVersion)
  }

  dialog.showMessageBox(win, messageBoxOptions, (responseIndex) => {
    if (responseIndex === messageBoxOptions.defaultId) {
      autoUpdater.quitAndInstall()
    }
  })
})

autoUpdater.on("error", (message) => {
  console.log('There was a problem updating the application')
  console.log(message)
})

// flags
// disable smooth scrolling
app.commandLine.appendSwitch("disable-smooth-scrolling")

// app.on("ready", function() {
//   autoUpdater.checkForUpdates();
// });
