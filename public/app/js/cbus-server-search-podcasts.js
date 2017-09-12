if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
  const path = require("path")
  const request = require("request")

  cbus.server.searchPodcasts = function(searchTerm, callback) {
    request({
      url: "https://itunes.apple.com/search?media=podcast&term=" + encodeURIComponent(searchTerm),
      headers: REQUEST_HEADERS
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
      }
    })
  }

}())
