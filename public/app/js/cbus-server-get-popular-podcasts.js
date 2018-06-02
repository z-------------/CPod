if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
  cbus.server.getPopularPodcasts = function(callback) {
    localforageGetMulti(["cbus_popular_podcasts_cache", "cbus_popular_podcasts_cache_time"], (r) => {
      if (
        r.cbus_popular_podcasts_cache &&
        r.cbus_popular_podcasts_cache_time &&
        new Date() - r.cbus_popular_podcasts_cache_time < 86400000 // 1 day
      ) {
        callback(r.cbus_popular_podcasts_cache)
      } else {
        xhr("https://rss.itunes.apple.com/api/v1/us/podcasts/top-podcasts/all/10/explicit.json", function(err, status, r) {
          let result = []

          let popularPodcasts = JSON.parse(r).feed.results
          var doneCount = 0

          for (let i = 0, l = popularPodcasts.length; i < l; i++) {
            xhr("https://itunes.apple.com/lookup?id=" + popularPodcasts[i].id, function(err, status, r) {
              let showInfo = JSON.parse(r).results[0]
              cbus.server.getPodcastInfo(showInfo.feedUrl, function(podcastInfo) {
                doneCount += 1
                if (podcastInfo !== null) {
                  podcastInfo.url = showInfo.feedUrl
                  result.push(podcastInfo)
                }
                if (doneCount === popularPodcasts.length) {
                  callback(result)
                  localforage.setItem("cbus_popular_podcasts_cache", result)
                  localforage.setItem("cbus_popular_podcasts_cache_time", new Date().getTime())
                }
              })
            })
          }
        })
      }
    })
  }
}())
