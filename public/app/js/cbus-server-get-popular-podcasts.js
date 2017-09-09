if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
  cbus.server.getPopularPodcasts = function(callback) {
    console.log("getPopularPodcasts")
    audiosearch.get("/chart_daily/").then((result) => {
      console.log("got /chart_daily/")
      var popularPodcasts = []

      var showsKeys = Object.keys(result.shows)
      var doneCount = 0

      for (let i = 0; i < showsKeys.length; i++) {
        audiosearch.getShow(result.shows[showsKeys[i]].id).then((showInfo) => {
          //console.log(showInfo.rss_url)
          cbus.server.getPodcastInfo(showInfo.rss_url, function(podcastInfo) {
            doneCount += 1
            if (podcastInfo !== null) {
              podcastInfo.url = showInfo.rss_url
              popularPodcasts.push(podcastInfo)
              //console.log(`getPopularPodcasts done ${doneCount}/${showsKeys.length}`)
            } else {
              console.log(`getPopularPodcasts FAIL ${doneCount}/${showsKeys.length}`)
            }
            if (doneCount === showsKeys.length) {
              callback(popularPodcasts)
            }
          })
        })
      }
    })
  }
}())
