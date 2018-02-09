if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
  cbus.server.getPodcastInfo = function(podcastUrl, callback) {
    var podcastData = {};

    request({
      url: podcastUrl,
      headers: REQUEST_HEADERS
    }, function(err, result, body) {
      x2j.parseString(body, function(err, result) {
        if (err) {
          console.log("error parsing xml", err);
          callback(null)
        } else {
          var channel = result.rss.channel[0];
          // console.log(channel);

          // title
          if (existsRecursive(channel, ["title", 0])) {
            podcastData.title = channel.title[0].trim();
          }
          // publisher
          if (existsRecursive(channel, ["itunes:author", 0])) {
            podcastData.publisher = channel["itunes:author"][0];
          }
          // description
          if (channel.description && channel.description[0]) {
            podcastData.description = channel.description[0];
          }
          // image
          if (existsRecursive(channel, ["image", 0, "url", 0])) {
            podcastData.image = channel["image"][0]["url"][0];
          } else if (existsRecursive(channel, ["itunes:image", 0])) {
            podcastData.image = channel["itunes:image"][0].$.href;
          }

          callback(podcastData);
        }
      });
    });
  }
}());
