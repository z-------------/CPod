if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
  const request = require("request");
  const x2j = require("xml2js");
  const path = require("path");

  cbus.server.update = function(feeds, callback) {
    console.log(feeds);

    var feedContents = {};
    var updatedCount;

    function checkUpdatedCount() {
      console.log(updatedCount + "/" + feeds.length);
      if (updatedCount === feeds.length) {
        callback(feedContents);
      }
    }

    console.log("starting feeds update");
    updatedCount = 0;

    if (feeds.length > 0) {
      feeds.forEach(function(feed) {
        console.log("starting update of feed '" + feed.title +  "'");
        request({
          url: feed.url,
          headers: REQUEST_HEADERS,
          timeout: 60 * 1000
        }, function(err, result, body) {
          if (!err && result.statusCode.toString()[0] === "2") {
            x2j.parseString(body, function(err, result) {
              if (!err && result) {
                feedContents[feed.url] = { items: [] };
                var feedContent = feedContents[feed.url];

                var items = result.rss.channel[0].item;

                items.forEach(function(item) {
                  var episodeInfo = {};

                  episodeInfo.title = item.title;

                  var episodeURL = null;
                  if (item["enclosure"] && item["enclosure"][0] &&
                    item["enclosure"][0].$ && item["enclosure"][0].$.url) {
                    episodeURL = item["enclosure"][0].$.url;
                  } else if (item["media:content"] && item["media:content"][0] &&
                    item["media:content"][0].$ && item["media:content"][0].$.url) {
                    episodeURL = item["media:content"][0].$.url;
                  }
                  if (episodeURL) {
                    episodeInfo.url = episodeURL;
                    episodeInfo.id = episodeURL;
                  }

                  var description = null;
                  if (item["itunes:summary"] && item["itunes:summary"][0]) {
                    description = item["itunes:summary"][0];
                  } else if (item.description && item.description[0]) {
                    description = item.description[0];
                  }
                  if (description) { episodeInfo.description = description; }

                  if (item.pubDate && item.pubDate[0]) {
                    episodeInfo.date = item.pubDate[0];
                  }

                  if (item["itunes:duration"] && item["itunes:duration"][0]) {
                    var length = 0;
                    var lengthStr = item["itunes:duration"][0];
                    var lengthArr = lengthStr.split(":")
                      .map(function(val) {
                        return Number(val);
                      })
                      .reverse(); // seconds, minutes, hours
                    for (var i = 0; i < lengthArr.length; i++) {
                      if (i === 0) length += lengthArr[i]; // seconds
                      if (i === 1) length += lengthArr[i] * 60 // minutes
                      if (i === 2) length += lengthArr[i] * 60 * 60 // hours
                    }

                    episodeInfo.length = length;
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
                  if (episodeArt) { episodeInfo.episodeArt = episodeArt; }

                  feedContent.items.push(episodeInfo);
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
            console.log(err || result.status);

            updatedCount += 1;
            checkUpdatedCount();
          }
        });
      });
    } else {
      console.log("no feeds to update");
    }
  };

}());
