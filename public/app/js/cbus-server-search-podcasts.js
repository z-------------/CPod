if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
  cbus.server.searchPodcasts = function(options, callback) {
    let region = options.region || cbus.const.DEFAULT_REGION;
    xhr({
      url: `https://itunes.apple.com/search?media=podcast&term=${encodeURIComponent(options.query)}&country=${region}`
    }, function(err, result, body) {
      if (!err) {
        var json = JSON.parse(body)
        var results = json.results
        resultsMapped = results.map(function(result) {
          return {
            title: result.collectionName,
            url: result.feedUrl,
            image: result.artworkUrl600
          }
        })
        callback(resultsMapped)
      } else {
        callback(false);
      }
    })
  }

}())
