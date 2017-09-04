if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
  const request = require("request");
  const x2j = require("xml2js");
  const path = require("path");

  cbus.server.getPodcastInfo = function(podcastUrl, callback) {
    var podcastData = {};

    request({
      url: podcastUrl,
      headers: require(path.join(__dirname, "../../request-headers.js")).REQUEST_HEADERS
    }, function(err, result, body) {
      x2j.parseString(body, function(err, result) {
        if (err) {
          console.log("error parsing xml", err);
          callback(null)
        } else {
          var channel = result.rss.channel[0];
          // console.log(channel);

          // title
          if (channel.title && channel.title[0]) {
            podcastData.title = channel.title[0];
          }
          // publisher
          if (channel["itunes:author"] && channel["itunes:author"][0]) {
            podcastData.publisher = channel["itunes:author"][0];
          }
          // description
          if (channel.description && channel.description[0]) {
            podcastData.description = channel.description[0];
          }
          // image
          if (channel["itunes:image"] && channel["itunes:image"][0]) {
            podcastData.image = channel["itunes:image"][0].$.href;
          }
          if (channel["image"] && channel["image"][0] &&
            channel["image"][0]["url"] && channel["image"][0]["url"][0]) {
            podcastData.image = channel["image"][0]["url"][0];
          }

          callback(podcastData);
        }
      });
    });
  }
}());
