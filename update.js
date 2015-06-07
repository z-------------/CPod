var storage = chrome.storage.sync;

var xhr = function(url, callback) {
    var oReq = new XMLHttpRequest();
    oReq.onload = function(e){
        callback(this.responseText, e);
    };
    oReq.open("get", url, true);
    oReq.send();
};

var ALARM_NAME = "feed_updater";

chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: 6/60
});

chrome.alarms.onAlarm.addListener(function(alarm) {
    console.log("onAlarm fired on " + alarm.name);
    if (alarm.name === ALARM_NAME) {
        console.log("starting feeds update");
        storage.get("feeds", function(r) {
            var feeds = r.feeds || [];
            feeds.forEach(function(feed) {
                console.log("starting update of feed '" + feed.title +  "'");
                xhr(feed.url, function(res) {
                    console.log("xhr'd feed '" + feed.title +  "'\n", res);
                });
            })
        });
    }
});
