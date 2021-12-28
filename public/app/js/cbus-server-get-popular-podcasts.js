if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
  cbus.server.getPopularPodcasts = function(options, callback) {
    let region = options.region || cbus.const.DEFAULT_REGION;
    let ignoreCache = options.ignoreCache || false;

    localforageGetMulti(["cbus_popular_podcasts_cache", "cbus_popular_podcasts_cache_time"], (r) => {
      if (
        !ignoreCache &&
        (r.cbus_popular_podcasts_cache &&
        r.cbus_popular_podcasts_cache_time &&
        new Date() - r.cbus_popular_podcasts_cache_time < 86400000) // 1 day
      ) {
        callback(r.cbus_popular_podcasts_cache)
      } else {
	popularPodcastsURL = `https://rss.applemarketingtools.com/api/v2/${region}/podcasts/top/10/podcast-episodes.json`;
        xhr(popularPodcastsURL, function(err, status, r) {
          if (statusCodeNotOK(status.statusCode)) {
            callback(false);
          } else {
            let result = []

            let popularPodcasts = JSON.parse(r).feed.results;
            var doneCount = 0

            for (let i = 0, l = popularPodcasts.length; i < l; i++) {
              let showInfo = popularPodcasts[i]
              cbus.server.getPodcastInfo(showInfo.url, function(podcastInfo) {
                doneCount += 1
                if (podcastInfo !== null) {
                  podcastInfo.url = showInfo.url
                  result.push(podcastInfo)
                }
                if (doneCount === popularPodcasts.length) {
                  callback(result)
                  localforage.setItem("cbus_popular_podcasts_cache", result)
                  localforage.setItem("cbus_popular_podcasts_cache_time", new Date().getTime())
                }
              })
            }
          }
        })
      }
    })
  }
}())
