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
      for (let i = 0, l = feeds.length; i < l; i++) {
        let feed = feeds[i];
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
                let feedContent = feedContents[feed.url];

                let items = result.rss.channel[0].item;

                for (let i = 0, l = items.length; i < l; i++) {
                  let item = items[i];
                  let episodeInfo = {};

                  /* episode title */
                  episodeInfo.title = item.title;

                  /* episode audio url */
                  var episodeURL = null;
                  if (existsRecursive(item, ["enclosure", 0, "$", "url"])) {
                    episodeURL = item["enclosure"][0].$.url;
                  } else if (existsRecursive(item, ["media:content", 0, "$", "url"])) {
                    episodeURL = item["media:content"][0].$.url;
                  }
                  if (episodeURL) {
                    episodeInfo.url = episodeURL;
                    episodeInfo.id = episodeURL;
                  }

                  /* episode description */
                  var description = null;
                  if (item["itunes:summary"] && item["itunes:summary"][0]) {
                    description = item["itunes:summary"][0];
                  } else if (item.description && item.description[0]) {
                    description = item.description[0];
                  }
                  if (description) { episodeInfo.description = description; }

                  /* episode publish date */
                  if (item.pubDate && item.pubDate[0]) {
                    episodeInfo.date = item.pubDate[0];
                  }

                  /* episode duration */
                  if (item["itunes:duration"] && item["itunes:duration"][0]) {
                    var length = 0;
                    var lengthStr = item["itunes:duration"][0];
                    var lengthArr = lengthStr.split(":")
                      .map(Number)
                      .reverse(); // seconds, minutes, hours
                    for (let i = 0, l = lengthArr.length; i < l; i++) {
                      if (i === 0) length += lengthArr[i]; // seconds
                      if (i === 1) length += lengthArr[i] * 60 // minutes
                      if (i === 2) length += lengthArr[i] * 60 * 60 // hours
                    }

                    episodeInfo.length = length;
                  }

                  /* episode art */
                  var episodeArt = null;
                  if (existsRecursive(item, ["itunes:image"], 0, "$", "href")) {
                    episodeArt = item["itunes:image"][0].$.href;
                  } else if (item["media:content"] && item["media:content"][0] &&
                    item["media:content"][0].$ && item["media:content"][0].$.url &&
                    item["media:content"][0].$.type && item["media:content"][0].$.type.indexOf("image/") === 0) {
                    episodeArt = item["media:content"][0].$.url;
                  }
                  if (episodeArt) { episodeInfo.episodeArt = episodeArt; }

                  /* episode chapters (podlove.org/simple-chapters) */
                  var episodeChapters = [];
                  if (existsRecursive(item, ["psc:chapters", 0, "psc:chapter", 0])) {
                    let chaptersRaw = item["psc:chapters"][0]["psc:chapter"];
                    for (let i = 0, l = chaptersRaw.length; i < l; i++) {
                      let timeStringSplit = chaptersRaw[i].$.start.split(":").reverse();
                      var time = 0;
                      for (let i = 0, l = Math.min(timeStringSplit.length - 1, 2); i <= l; i++) {
                        time += Number(timeStringSplit[i]) * (60 ** i);
                      }

                      episodeChapters.push({
                        title: chaptersRaw[i].$.title,
                        time: time
                      });
                    }
                  }
                  episodeInfo.chapters = episodeChapters;

                  feedContent.items.push(episodeInfo);
                }
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
      }
    } else {
      console.log("no feeds to update");
    }
  };

}());
