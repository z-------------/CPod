// most/all of this code is from Electron's getting started guide

const { app, BrowserWindow, dialog } = require("electron")
const path = require("path")
const url = require("url")
const autoUpdater = require("electron-updater").autoUpdater
const fs = require("fs")
const i18n = require("./lib/i18n.js")

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

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

// autoUpdater stuff

autoUpdater.on("update-available", function() {
  console.log(arguments)
})

autoUpdater.on("update-downloaded", (info) => {
  console.log(info)

  let currentVersion = require("./package.json").version
  let releaseNotesFormatted = info.releaseNotes
    .replace(/<br>/gi, "\n")
    .replace(/(<([^>]+)>)/gi, "") // https://css-tricks.com/snippets/javascript/strip-html-tags-in-javascript/

  let messageBoxOptions = {
    type: "question",
    buttons: ["Quit and install", "Cancel"],
    defaultId: 0,
    cancelId: 1,
    title: "Update downloaded",
    message: i18n.__("update-downloaded", info.releaseName, currentVersion),
    detail: releaseNotesFormatted
  }

  dialog.showMessageBox(win, messageBoxOptions, (responseIndex) => {
    if (responseIndex === 0) {
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

app.on("ready", function() {
  autoUpdater.checkForUpdates();
});
