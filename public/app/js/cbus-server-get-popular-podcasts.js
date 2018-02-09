if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
  cbus.server.getPopularPodcasts = function(callback) {
    console.log("getPopularPodcasts")
    xhr("https://rss.itunes.apple.com/api/v1/us/podcasts/top-podcasts/all/10/explicit.json", function(r) {
      let result = []

      let popularPodcasts = JSON.parse(r).feed.results
      var doneCount = 0

      for (let i = 0, l = popularPodcasts.length; i < l; i++) {
        xhr("https://itunes.apple.com/lookup?id=" + popularPodcasts[i].id, function(r) {
          let showInfo = JSON.parse(r).results[0]
          cbus.server.getPodcastInfo(showInfo.feedUrl, function(podcastInfo) {
            doneCount += 1
            if (podcastInfo !== null) {
              podcastInfo.url = showInfo.feedUrl
              result.push(podcastInfo)
              console.log(`getPopularPodcasts done ${doneCount}/${popularPodcasts.length}`)
            } else {
              console.log(`getPopularPodcasts FAIL ${doneCount}/${popularPodcasts.length}`)
            }
            if (doneCount === popularPodcasts.length) {
              callback(result)
            }
          })
        })
      }
    })
  }
}())
