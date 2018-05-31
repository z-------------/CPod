cbus.settings = {
  data: {
    // default settings to be overwritten from user settings file
    locale: i18n.getLocale(),
    skipAmountForward: 30,
    skipAmountBackward: 10,
    enableWaveformVisualization: true,
    autoUpdaterAllowPrerelease: false,
    keyboardShortcuts: {
      "alt+left": "skip-backward",
      "alt+right": "skip-forward"
    },
    homeDateSeparatorInterval: "none",
    syncEnable: false,
    syncUsername: "",
    syncPassword: "",
    syncDeviceID: os.hostname() + "-CPod"
  },
  SETTINGS_FILE_PATH: path.join(cbus.const.USERDATA_PATH, "user_settings.json"),
  writeSetting: function(key, value, callback) {
    cbus.settings.data[key] = value;
    fs.writeFile(cbus.settings.SETTINGS_FILE_PATH, JSON.stringify(cbus.settings.data), callback);
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
