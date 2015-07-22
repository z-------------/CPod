var express = require("express");
var app = express();

var debug = (process.env.DEBUG === "true");

app.use(express.static("public"));

app.get("/", function(req, res) {
    res.sendFile("/public/index.html");
});

if (debug) {
    app.get("/debug/env", function(req, res) {
        res.send(JSON.stringify(process.env));
    });
}

app.get("/app/feedinfo", function(req, res) {
    if (debug) {
        res.send("in debug mode, no requests sent");
    } else {
        var request = require("request");

        var searchTerm = req.query.term;
        var itunesApiUrl = "https://itunes.apple.com/search?media=podcast&term=" + encodeURIComponent(searchTerm);

        request(itunesApiUrl, function(err, result, body) {
            if (!err) {
                var json = JSON.parse(body);
                var results = json.results;
                resultsMapped = results.map(function(result) {
                    return {
                        title: result.collectionName,
                        url: result.feedUrl,
                        image: result.artworkUrl600
                    }
                });
                res.send(resultsMapped);
            }
        });
    }
});

app.get("/app/update", function(req, res) {
    if (debug) {
        res.sendFile(__dirname + "/debug/update");
    } else {
        var request = require("request");
        var x2j = require("xml2js");

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
                    url: feed.url,
                    headers: {
                        "User-Agent": "Cumulonimbus v0.0.1 (github.com/z-------------)"
                    }
                }, function(err, result, body) {
                    if (!err) {
                        x2j.parseString(body, function(err, result) {
                            if (!err) {
                                // console.dir(result.rss.channel[0].item);
                                var items = result.rss.channel[0].item;

                                feedContents[feed.url] = { items: [] };
                                var feedContent = feedContents[feed.url];

                                [].slice.call(items).forEach(function(item) {
                                    var itemURL = null;
                                    if (item.enclosure && item.enclosure[0].$ && item.enclosure[0].$.url) {
                                        itemURL = item.enclosure[0].$.url;
                                    } else if (item.link) {
                                        itemURL = (typeof item.link === "string" ? item.link : item.link._);
                                    }

                                    var itemDescription = null;
                                    if (item.description) {
                                        itemDescription = item.description[0];
                                    }

                                    feedContent.items.push({
                                        title: item.title,
                                        date: item.pubDate || null,
                                        url: itemURL,
                                        description: itemDescription
                                    });
                                });

                                updatedCount += 1;
                                checkUpdatedCount();
                                console.log("done updating feed '" + feed.title +  "'");
                            } else {
                                console.log(err);
                            }
                        });
                    } else {
                        console.log("error updating feed '" + feed.title + "'");
                        console.dir(err || result.status);
                    }
                });
            });
        } else {
            console.log("no feeds to update");
        }
    }
});

var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log("cbus listening on *:%s", port);
});
