cbus.settings = {
  data: {
    locale: i18n.getLocale()
  },
  SETTINGS_FILE_PATH: path.join(cbus.const.USERDATA_PATH, "user_settings.json"),
  writeSetting: function(key, value, callback) {
    cbus.settings.data[key] = value;
    fs.writeFile(cbus.settings.SETTINGS_FILE_PATH, JSON.stringify(cbus.settings.data), callback);
  }
};

(function() {
  var userSettingsFile;
  try {
    userSettingsFile = fs.readFileSync(cbus.settings.SETTINGS_FILE_PATH, {
      encoding: "utf8"
    });
  } catch (e) {
    console.log("no user settings file");
  }
  if (userSettingsFile) {
    let userSettings = JSON.parse(userSettingsFile);
    for (let key in userSettings) {
      cbus.settings.data[key] = userSettings[key];
    }
  }
}());

i18n.setLocale(cbus.settings.data.locale);
moment.locale(i18n.getLocale());
