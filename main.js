// based on Electron's getting started guide

const { app, dialog, shell, globalShortcut, ipcMain, BrowserWindow, Menu, Tray } = require("electron")
const path = require("path")
const url = require("url")
const autoUpdater = require("electron-updater").autoUpdater
const fs = require("fs")
const i18n = require("./lib/i18n.js")
const request = require("request")

let win, tray // keep globals to avoid garbage collection

const configDirName = "cumulonimbus"
const configDirPath = path.join( path.parse(app.getPath("userData")).dir, configDirName )
try {
  fs.mkdirSync(configDirPath)
} catch (exp) {
  console.log("Looks like config dir already exists, continuing")
}
app.setPath("userData", configDirPath)

const APP_NAME = "CPod" // only used in this file

const USERDATA_DIR = app.getPath("userData")
const WINDOW_SIZE_FILE = path.join(USERDATA_DIR, "window_size")
const SETTINGS_FILE = path.join(USERDATA_DIR, "user_settings.json")
const ICON_WIN = path.join(__dirname, "build/icon.ico")
const ICON_OTHER = path.join(__dirname, "build/icon.png")

let settings = {}
let size = {}

var beforeQuit = false

/* get settings and watch for changes */

console.log(`Using settings file: ${SETTINGS_FILE}`)

function updateSettings(json) {
  for (let key in json) {
    if (settings[key] != json[key]) console.log(`Updating setting in main: ${key}: ${settings[key]} --> ${json[key]}`);
    settings[key] = json[key]
  }
}

try {
  updateSettings(JSON.parse(fs.readFileSync(SETTINGS_FILE)));
} catch (exp) {
  // do nothing.
}

ipcMain.on("settingChanged", (e, message) => {
  let obj = {};
  obj[message.key] = message.value;
  updateSettings(obj);
});

/* create and handle window */

let windowOptions = {
  title: APP_NAME
}

function mergeObjects() {
  let finalObj = {}
  for (let obj of arguments) {
    for (let key in obj) {
      finalObj[key] = obj[key]
    }
  }
  return finalObj
}

function getIconPath() {
  return process.platform === "win32" ? ICON_WIN : ICON_OTHER;
}

function writeWindowSize(win, cb) {
  let dimens = win.getSize()

  size.width = dimens[0]
  size.height = dimens[1]
  size.maximized = win.isMaximized()

  fs.writeFile(WINDOW_SIZE_FILE, JSON.stringify(size) + "\n", {
    encoding: "utf8"
  }, (err) => {
    cb(err)
  })
}

function sizeWindow() {
  win.setSize(size.width, size.height, false)
  if (size.maximized) win.maximize()
}

function createWindow(width, height, maximize) {
  windowOptions.icon = getIconPath()

  if (maximize) {
    win = new BrowserWindow(windowOptions)
    win.maximize()
  } else if (width && height) {
    win = new BrowserWindow(mergeObjects(windowOptions, {
      width: width,
      height: height
    }))
  }

  win.loadURL(url.format({
    pathname: path.join(__dirname, "public/app/index.html"),
    protocol: "file:",
    slashes: true
  }))

  /* taskbar item */
  tray = new Tray(getIconPath())
  const menu = Menu.buildFromTemplate([/*{
    id: "nowplaying",
    enabled: true
  }, */{
    label: i18n.__("button_playback_playpause"),
    click: function() {
      win.webContents.send("playbackControl", "playpause")
    }
  }, {
    label: i18n.__("button_playback-next"),
    click: function() {
      win.webContents.send("playbackControl", "next")
    }
  }, {
    type: "separator"
  }, {
    label: i18n.__("label_quit"),
    click: app.quit
  }])
  tray.setToolTip(APP_NAME)
  tray.setContextMenu(menu)
  tray.on("click", e => {
    win.show()
    sizeWindow()
  })
  ipcMain.on("nowPlayingInfo", (e, arg) => {
    tray.setToolTip(
`${APP_NAME} - ${i18n.__("label_now_playing")}
${i18n.__("punc_quote_open")}${arg.episodeTitle}${i18n.__("punc_quote_close")}
${arg.podcastTitle}`)
  })

  win.on("close", e => {
    if (settings.taskbarClose && !beforeQuit) {
      e.preventDefault()
      win.hide()
    }

    writeWindowSize(win, err => {
      if (err) {
        console.log("Error writing to window size file")
      }
      if (!settings.taskbarClose) {
        win = null
      }
    })
  })

  win.on("minimize", e => {
    if (settings.taskbarMinimize && !beforeQuit) {
      e.preventDefault()
      win.hide()
    }

    writeWindowSize(win, err => {
      if (err) {
        console.log("Error writing to window size file")
      }
    })
  })
}

app.on("ready", function() {
  fs.readFile(WINDOW_SIZE_FILE, {
    encoding: "utf8"
  }, (err, data) => {
    if (err) {
      console.log("Error reading window size file")
      createWindow(null, null, true)
    } else {
      try {
        data = JSON.parse(data)
        size.width = data.width
        size.height = data.height
        size.maximized = data.maximized
        createWindow(size.width, size.height, size.maximized)
      } catch (e) {
        console.log("Invalid window size file")
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

app.on("before-quit", () => {
  beforeQuit = true
  tray.destroy()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (win === null) {
    createWindow()
  }
})

/* auto-update */

if (settings.autoUpdaterAllowPrerelease) {
  autoUpdater.allowPrerelease = true
}

// autoUpdater.fullChangelog = true
autoUpdater.autoDownload = false

var currentVersion

autoUpdater.checkForUpdates()
.then((updateCheckResult) => {
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
        console.log("Error reading skip_version file")
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
                      console.log("Error writing to skip_version file")
                    } else {
                      console.log("Wrote to skip_version file")
                    }
                  }
                )
              }
            })
          } catch (e) {
            console.log("Exception in update check", e)
          }
        })
      } else {
        console.log("Version " + info.version + " is skipped")
      }
    })
  } else {
    console.log("Update is not newer than current version, ignoring")
  }
})
.catch(e => {
  console.error("Auto-update error:")
  console.error(e)
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

/* chromium flags */

if (!settings.smoothScrolling) {
  app.commandLine.appendSwitch("disable-smooth-scrolling")
}
