var router = function(req, res) {
  if (require("./debug.js").debug) {
    res.sendFile(__dirname + "/debug/update");
  } else {
    var request = require("request");
    var x2j = require("xml2js");

    var feedsStr = req.query.feeds;
    var feeds = JSON.parse(feedsStr);

    console.log(feeds);

    var feedContents = {};
    var updatedCount;

    function checkUpdatedCount() {
      console.log(updatedCount + "/" + feeds.length);
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
          headers: require("./REQUEST_HEADERS.js").REQUEST_HEADERS,
          timeout: 60 * 1000
        }, function(err, result, body) {
          if (!err && result.statusCode.toString()[0] === "2") {
            x2j.parseString(body, function(err, result) {
              if (!err && result) {
                feedContents[feed.url] = { items: [] };
                var feedContent = feedContents[feed.url];

                var items = result.rss.channel[0].item;

                items.forEach(function(item) {
                  var episodeTitle = null;
                  if (item.title && item.title[0]) {
                    episodeTitle = item.title[0];
                  }

                  var episodeURL = null;
                  if (item["enclosure"] && item["enclosure"][0] &&
                    item["enclosure"][0].$ && item["enclosure"][0].$.url) {
                    episodeURL = item["enclosure"][0].$.url;
                  } else if (item["media:content"] && item["media:content"][0] &&
                    item["media:content"][0].$ && item["media:content"][0].$.url) {
                    episodeURL = item["media:content"][0].$.url;
                  }

                  var description = null;
                  if (item["itunes:summary"] && item["itunes:summary"][0]) {
                    description = item["itunes:summary"][0];
                  } else if (item.description && item.description[0]) {
                    description = item.description[0];
                  }

                  var pubDate = null;
                  if (item.pubDate && item.pubDate[0]) {
                    pubDate = item.pubDate[0];
                  }

                  var length = null;
                  if (item["itunes:duration"] && item["itunes:duration"][0]) {
                    var lengthStr = item["itunes:duration"][0];
                    var lengthArr = lengthStr.split(":")
                      .map(function(val) {
                        return Number(val);
                      })
                      .reverse(); // seconds, minutes, hours
                    length = 0;
                    for (var i = 0; i < lengthArr.length; i++) {
                      if (i === 0) length += lengthArr[i]; // seconds
                      if (i === 1) length += lengthArr[i] * 60 // minutes
                      if (i === 2) length += lengthArr[i] * 60 * 60 // hours
                    }
                  }

                  var episodeArt = null;
                  if (item["itunes:image"] && item["itunes:image"] &&
                    item["itunes:image"][0].$ && item["itunes:image"][0].$.href) {
                    episodeArt = item["itunes:image"][0].$.href;
                  } else if (item["media:content"] && item["media:content"][0] &&
                    item["media:content"][0].$ && item["media:content"][0].$.url &&
                    item["media:content"][0].$.type && item["media:content"][0].$.type.indexOf("image/") === 0) {
                    episodeArt = item["media:content"][0].$.url;
                  }

                  feedContent.items.push({
                    title: item.title,
                    url: episodeURL,
                    description: description,
                    date: pubDate,
                    length: length,
                    id: episodeURL,
                    episodeArt: episodeArt
                  });
                });
              } else {
                console.log("error updating feed '" + feed.title + "'");
                console.log(err);
              }

              updatedCount += 1;
              checkUpdatedCount();
            });
          } else {
            console.log("error updating feed '" + feed.title + "'");
            console.dir(err || result.status);

            updatedCount += 1;
            checkUpdatedCount();
          }
        });
      });
    } else {
      console.log("no feeds to update");
    }
  }
};

module.exports.router = router;
