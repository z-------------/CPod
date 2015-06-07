var storage = chrome.storage;

var xhr = function(url, callback) {
    var oReq = new XMLHttpRequest();
    oReq.onload = function(e){
        callback(this.responseText, e);
    };
    oReq.open("get", url, true);
    oReq.send();
};

var ALARM_NAME = "feed_updater";

var feedContents;

chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: 30/60
});

chrome.alarms.onAlarm.addListener(function(alarm) {
    console.log("onAlarm fired on " + alarm.name);
    if (alarm.name === ALARM_NAME) {
        feedContents = {};

        console.log("starting feeds update");
        storage.sync.get("feeds", function(r) {
            var feeds = r.feeds || [];
            feeds.forEach(function(feed) {
                console.log("starting update of feed '" + feed.title +  "'");
                xhr(feed.url, function(res) {
                    var xmlDoc = $.parseXML(res);
                    var $xml = $(xmlDoc);

                    var items = $xml.find("item");
                    console.log(items);

                    feedContents[feed.url] = { items: [] };
                    var feedContent = feedContents[feed.url];

                    [].slice.call(items).forEach(function(elem) {
                        feedContent.items.push({
                            title: elem.querySelector("title").textContent,
                            date: new Date(elem.querySelector("pubDate").textContent) || null,
                            url: elem.querySelector("enclosure[url]").getAttribute("url")
                        });
                    });

                    console.log("done updating feed '" + feed.title +  "'");
                });
            });
        });
    }
});
