cbus.settings = {
  data: {},
  SETTINGS_FILE_PATH: path.join(cbus.const.USERDATA_PATH, "user_settings.json"),
  DEFAULT_SETTINGS_FILE_PATH: path.join(remote.app.getAppPath(), "public", "default_settings.json"),
  writeSetting: function(key, value, callback) {
    let oldValue = cbus.settings.data[key];
    cbus.settings.data[key] = value;
    fs.writeFile(cbus.settings.SETTINGS_FILE_PATH, JSON.stringify(cbus.settings.data), callback);
    let messageContents = {
      key: key,
      value: value,
      oldValue: oldValue
    };
    cbus.broadcast.send("settingChanged", messageContents);
    ipcRenderer.send("settingChanged", messageContents);
  }
};

// load static default settings
try {
  Object.assign(cbus.settings.data, getSettingsFromFile(cbus.settings.DEFAULT_SETTINGS_FILE_PATH));
} catch (e) {
  console.log("error reading default settings file");
}

// set dynamic default settings
cbus.settings.data.locale = i18n.getLocale();
cbus.settings.data.syncDeviceID = os.hostname() + "-CPod";
cbus.settings.data.downloadDirectory = path.join(cbus.const.USERDATA_PATH, "offline_episodes");

// load user settings
try {
  Object.assign(cbus.settings.data, getSettingsFromFile(cbus.settings.SETTINGS_FILE_PATH));
} catch (e) {
  console.log("error reading user settings file");
}

i18n.setLocale(cbus.settings.data.locale);
moment.locale(i18n.getLocale());

function getSettingsFromFile(filepath) {
  const data = {};
  let settingsData = fs.readFileSync(filepath, {
    encoding: "utf8"
  });
  let settings = JSON.parse(settingsData);
  for (let key in settings) {
    data[key] = settings[key];
  }
  return data;
}
