cbus.settings = {
  data: {
    // default settings to be overwritten from user settings file
    locale: i18n.getLocale(),
    skipAmountForwardShort: 10,
    skipAmountForward: 30,
    skipAmountForwardLong: 45,
    skipAmountBackwardShort: 5,
    skipAmountBackward: 10,
    skipAmountBackwardLong: 20,
    enableWaveformVisualization: true,
    autoUpdaterAllowPrerelease: false,
    keyboardShortcuts: {
      "alt+left": "skip-backward",
      "alt+right": "skip-forward",
      "j": "skip-backward",
      "k": "playpause",
      "l": "skip-forward"
    },
    homeDateSeparatorInterval: "none",
    syncEnable: false,
    syncUsername: "",
    syncPassword: "",
    syncDeviceID: os.hostname() + "-CPod",
    downloadDirectory: path.join(cbus.const.USERDATA_PATH, "offline_episodes"),
    queueAlwaysRemoveUponFinish: false,
    queueAutoDownload: false
  },
  SETTINGS_FILE_PATH: path.join(cbus.const.USERDATA_PATH, "user_settings.json"),
  writeSetting: function(key, value, callback) {
    let oldValue = cbus.settings.data[key];
    cbus.settings.data[key] = value;
    fs.writeFile(cbus.settings.SETTINGS_FILE_PATH, JSON.stringify(cbus.settings.data), callback);
    cbus.broadcast.send("settingChanged", {
      key: key,
      value: value,
      oldValue: oldValue
    });
  }
};

(function() {
  try {
    userSettingsFile = fs.readFileSync(cbus.settings.SETTINGS_FILE_PATH, {
      encoding: "utf8"
    });
    let userSettings = JSON.parse(userSettingsFile);
    for (let key in userSettings) {
      cbus.settings.data[key] = userSettings[key];
    }
  } catch (e) {
    console.log("no user settings file");
  }
}());

i18n.setLocale(cbus.settings.data.locale);
moment.locale(i18n.getLocale());
