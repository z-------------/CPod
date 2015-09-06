var router = function(req, res) {
    if (require("./debug.js").debug) {
        res.sendFile(__dirname + "/debug/update");
    } else {
        var request = require("request");

        var feedsStr = req.query.feeds;
        var feeds = JSON.parse(feedsStr);

        var feedContents = {};
        var updatedCount;

        function checkUpdatedCount() {
            if (updatedCount === feeds.length) {
                res.send(JSON.stringify(feedContents));
            }
        }

        console.log("starting feeds update");
        updatedCount = 0;

        if (feeds.length > 0) {
            feeds.forEach(function(feed) {
                console.log("starting update of feed '" + feed.title +  "'");
                request({
                    url: "https://cloud.feedly.com/v3/streams/" + encodeURIComponent("feed/" + feed.url) + "/contents?count=500",
                    headers: require("./REQUEST_HEADERS.js").REQUEST_HEADERS
                }, function(err, result, body) {
                    if (!err && result.statusCode.toString()[0] === "2") {
                        var data = JSON.parse(body);
                        var items = data.items || [];

                        feedContents[feed.url] = { items: [] };
                        var feedContent = feedContents[feed.url];

                        items.forEach(function(item) {
                            var itemURL = null;
                            if (item.enclosure && item.enclosure[0] && item.enclosure[0].href) {
                                itemURL = item.enclosure[0].href;
                            }

                            var itemDescription = null;
                            if (item.summary && item.summary.content) {
                                itemDescription = item.summary.content;
                            }

                            var itemPubDate = null;
                            if (item.published) {
                                itemPubDate = item.published;
                            }

                            feedContent.items.push({
                                title: item.title,
                                date: itemPubDate,
                                url: itemURL,
                                description: itemDescription
                            });
                        });

                        console.log("done updating feed '" + feed.title +  "'");
                    } else {
                        console.log("error updating feed '" + feed.title + "'");
                        console.dir(err || result.status);
                    }

                    updatedCount += 1;
                    checkUpdatedCount();
                });
            });
        } else {
            console.log("no feeds to update");
        }
    }
};

module.exports.router = router;
