var ALARM_NAME = "feed_updater";

chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: 1/60
});

chrome.alarms.onAlarm.addListener(function(alarm) {
    console.log("onAlarm fired on " + alarm.name);
    if (alarm.name === ALARM_NAME) {
        console.log("this is the updater alarm");
    }
});
