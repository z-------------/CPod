$(document).ready(function() {
  localforage.getItem("cbus_feeds").then(function(r) {
    if (r) {
      cbus.data.feeds = r.sort(cbus.const.podcastSort);
    } else {
      cbus.data.feeds = [];
    }

    for (feed of cbus.data.feeds) {
      cbus.data.feedsCache.push(feed);
    }

    cbus.ui.display("feeds");
  });

  $(".list--episodes, .list--queue").on("click", function(e) {
    var classList = e.target.classList;

    if (classList.contains("episode_button")) {
      var id = e.target.parentElement.parentElement.parentElement.dataset.id;
      var audioElem = document.querySelector(".audios audio[data-id='" + id + "']");

      if (classList.contains("episode_button--play")) {
        var $episodeElem = $(e.target).closest("cbus-episode");
        var $closestList = $(e.target).closest(".list");
        if ($closestList.hasClass("list--episodes")) { // from stream
          cbus.audio.setElement(audioElem);
          cbus.audio.play();
        } else { // from queue
          cbus.audio.playQueueItem($episodeElem.index());
        }
      } else if (classList.contains("episode_button--enqueue")) {
        cbus.audio.enqueue(audioElem);
      } else if (classList.contains("episode_button--remove-from-queue")) {
        cbus.audio.removeQueueItem($(e.target).closest("cbus-episode").index());
      } else if (classList.contains("episode_button--download")) {
        cbus.data.downloadEpisode(audioElem);
      }
    } else if (classList.contains("episode_feed-title")) {
      var url = cbus.data.getEpisodeData({ id: $(e.target).closest("cbus-episode").attr("data-id") }).feedURL;
      cbus.broadcast.send("showPodcastDetail", {
        url: url
      });
    } else if (classList.contains("episode_info-button")) {
      var $episodeElem = $(e.target).closest("cbus-episode");
      console.log($episodeElem);
      if ($episodeElem.hasClass("info-open")) {
        console.log("has");
        $episodeElem.removeClass("info-open");
      } else {
        console.log("no has");
        $("cbus-episode").removeClass("info-open");
        $episodeElem.find(".episode_bottom").scrollTop(0);
        $episodeElem.addClass("info-open");
      }
    }
  });

  /* search */

  let searchResultsElem = document.getElementsByClassName("explore_feeds--search-results")[0];
  document.querySelector(".explore_search input").addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      let query = this.value;

      if (query.length > 0) {
        searchResultsElem.innerHTML = "";

        if (validUrl.isWebUri(query)) {
          cbus.broadcast.send("showPodcastDetail", {
            url: query
          });
        } else {
          cbus.server.searchPodcasts(query, function(data) {
            if (data) {
              cbus.broadcast.send("got-search-results")
              for (let i = 0, l = data.length; i < l; i++) {
                searchResultsElem.appendChild(cbus.data.makeFeedElem(data[i], i, true));
                cbus.data.feedsCache.push(data[i]);
              }
            }
          });

          searchResultsElem.classList.add("visible");
        }
      } else {
        searchResultsElem.classList.add("visible");
      }
    }
  });

  /* player controls */

  $(".player").on("click", function(e) {
    var classList = e.target.classList;
    if (classList.contains("player_button")) {
      if (classList.contains("player_button--backward")) {
        cbus.audio.jump(cbus.audio.DEFAULT_JUMP_AMOUNT_BACKWARD);
      } else if (classList.contains("player_button--forward")) {
        cbus.audio.jump(cbus.audio.DEFAULT_JUMP_AMOUNT_FORWARD);
      } else if (classList.contains("player_button--play")) {
        if (!cbus.audio.element) {
          if (cbus.audio.queue.length > 0) {
            cbus.audio.setElement(cbus.audio.queue[0]);
          } else {
            cbus.audio.setElement($(".episode_audio_player")[0]);
          }
          cbus.audio.play();
        } else if (cbus.audio.element.paused) {
          cbus.audio.play();
        } else {
          cbus.audio.pause();
        }
      } else if (classList.contains("player_button--next")) {
        cbus.audio.playQueueItem(0);
      }
    }
  });

  $(".player_button--next").on("mouseenter click", function(e) {
    var episodeData = cbus.data.getEpisodeData({
      audioElement: cbus.audio.queue[0]
    });

    var nextEpisodeString = "Nothing in queue.";
    if (cbus.audio.queue.length !== 0) {
      nextEpisodeString = $("<span><strong>" + episodeData.title + "</strong><br>" + episodeData.feed.title + "</span>");
    }

    $(this).tooltipster("content", nextEpisodeString);
  });

  $(".player_slider").on("input change", function() {
    var proportion = this.value / this.max;
    cbus.audio.element.currentTime = cbus.audio.element.duration * proportion;
  });

  /* header actions */

  $(".header_actions").on("click", function(e) {
    var classList = e.target.classList;
    if (classList.contains("header_action")) {
      if (classList.contains("header_action--refresh-episodes")) {
        cbus.data.update();
      }
    }
  });

  /* tabs */

  $("header nav a").on("click", function() {
    var targetId = this.dataset.target;
    cbus.ui.tabs.switch({ id: targetId });
  });

  /* update stream or load from cache */

  var feedsUnsubscribed, storedEpisodes, lastAudioInfo, lastQueueInfos;

  localforage.getItem("cbus_feeds_qnp").then(function(r) {
    feedsUnsubscribed = r
    localforage.getItem("cbus_cache_episodes").then(function(r) {
      storedEpisodes = r
      localforage.getItem("cbus_episodes_offline").then(function(r) {
        cbus.data.episodesOffline = r || []

        fs.readdir(path.join(cbus.data.USERDATA_PATH, "offline_episodes"), function(err, files) {
          for (let i = 0, l = cbus.data.episodesOffline.length; i < l; i++) {
            if (files.indexOf(sha1(cbus.data.episodesOffline[i])) === -1) { // both are arrays of strings
              let episodeURL = cbus.data.episodesOffline[i];
              cbus.data.episodesOffline.splice(i, 1)
              cbus.broadcast.send("offline_episodes_changed", {
                episodeURL: episodeURL
              });
            } else {
              console.log(files)
            }
          }
          cbus.data.syncOffline()
        })

        localforage.getItem("cbus-last-audio-info").then(function(r) {
          lastAudioInfo = r
          localforage.getItem("cbus-last-queue-infos").then(function(r) {
            lastQueueInfos = r

            if (feedsUnsubscribed) {
              cbus.data.feedsQNP = feedsUnsubscribed
            } else {
              cbus.data.feedsQNP = []
            }

            cbus.data.episodesUnsubbed = []
            if (storedEpisodes) {
              // store globally
              cbus.data.episodes = storedEpisodes.filter(function(episodeInfo) {
                var feedInfo = cbus.data.getFeedData({ url: episodeInfo.feedURL });
                if (!feedInfo || feedInfo.isUnsubscribed) { return false; }
                return true;
              });
              if (lastAudioInfo) {
                cbus.data.episodesUnsubbed.push(lastAudioInfo)
              }
              if (lastQueueInfos) {
                for (let episodeInfo of lastQueueInfos) {
                  cbus.data.episodesUnsubbed.push(episodeInfo)
                }
              }
              cbus.data.updateAudios(); // make audio elems and add to DOM
              cbus.ui.display("episodes"); // display the episodes we already have

              localforage.getItem("cbus-last-audio-url").then((url) => {
                if (url) {
                  var elem = document.querySelector(`.audios audio[data-id='${url}']`);
                  if (elem) {
                    cbus.audio.setElement(elem);
                    localforage.getItem("cbus-last-audio-time").then((time) => {
                      if (time) {
                        cbus.audio.element.currentTime = time;
                        cbus.broadcast.send("audioTick", {
                          currentTime: time,
                          duration: cbus.data.getEpisodeData({ audioElement: cbus.audio.element }).length
                        })
                      }
                    });
                  }
                }
              })

              localforage.getItem("cbus-last-queue-urls").then((urls) => {
                if (urls) {
                  let l = urls.length
                  for (let i = 0; i < l; i++) {
                    cbus.audio.enqueue(document.querySelector(`.audios audio[data-id="${urls[i]}"]`))
                  }
                }
              })
            }

            cbus.data.update(); // look for any new episodes (takes care of displaying and updateAudios-ing)
          })
        })
      })
    })
  })

  /* start loading popular podcasts */

  cbus.server.getPopularPodcasts((popularPodcastInfos) => {
    console.log(popularPodcastInfos)
    for (let i = 0; i < popularPodcastInfos.length; i++) {
      $(".explore_feeds--popular").append(cbus.data.makeFeedElem(popularPodcastInfos[i], i, true));
      cbus.data.feedsCache.push(popularPodcastInfos[i]);
    }
  })

  /* switch to startup tab */

  localforage.getItem("cbus_feeds").then((r) => {
    if (r && r.length > 0) { // there are subscribed feeds
      cbus.ui.tabs.switch({ index: 0 }); // Home tab
    } else { // no subscribed feeds
      cbus.ui.tabs.switch({ index: 3 }); // Explore tab
    }
  })

  /* initialize generic tooltipster */

  $(".tooltip").tooltipster({
    theme: "tooltipster-cbus",
    animation: "fadeup",
    speed: 300
  });

  cbus.broadcast.listen("toggleSubscribe", function(e) {
    console.log(e);

    var completeData = arrayFindByKey(cbus.data.feedsCache, { url: e.data.url })[0];
    var subscribed = !!arrayFindByKey(cbus.data.feeds, { url: e.data.url })[0]

    var direction;
    if (e.data.direction) {
      direction = e.data.direction;
    } else {
      if (subscribed) { // already subscribed
        direction = -1;
      } else { // not subscribed
        direction = 1;
      }
    }

    if (direction === -1) {
      cbus.data.unsubscribeFeed({ url: e.data.url }, true);
    } else {
      // complete required data
      var requiredKeys = ["image", "title", "url"];

      for (key of requiredKeys) {
        if (!e.data.hasOwnProperty(key)) {
          e.data[key] = completeData[key];
        }
      }

      cbus.data.subscribeFeed(e.data, true);
    }

    if (cbus.data.state.podcastDetailCurrentData.url === e.data.url) {
      if (direction === -1) {
        $(".podcast-detail_control--toggle-subscribe").removeClass("subscribed");
        console.log("removed subscribed class");
      } else {
        $(".podcast-detail_control--toggle-subscribe").addClass("subscribed");
        console.log("added subscribed class");
      }
    }
  });

  /* listen for audio change */

  cbus.broadcast.listen("audioChange", function(e) {
    var element = $("audio audio[data-id='" + e.data.id + "']");

    cbus.broadcast.send("audioTick", {
      currentTime: 0,
      duration: element.duration
    });

    cbus.ui.display("player", e.data);

    // /* extract accent color of feed image and apply to player */
    //
    // cbus.ui.colorify({
    //   image: e.data.feed.image,
    //   element: $(".player")
    // });
    $(".player").addClass("light-colors");
  });

  /* update audio time */

  var playerTimeNow = document.querySelector(".player_time--now");

  cbus.broadcast.listen("audioTick", function(e) {
    /* slider */
    var percentage = e.data.currentTime / e.data.duration;
    $(".player_slider").val(Math.round(1000 * percentage) || 0);

    /* time indicator */
    $(".player_time--now").html(colonSeparateDuration(e.data.currentTime));
    $(".player_time--total").html(colonSeparateDuration(e.data.duration));

    /* record in localforage so we can resume next time */
    localforage.setItem("cbus-last-audio-time", e.data.currentTime);
  });

  /* open podcast detail when podcast name clicked in episode data */

  $(".player_detail_feed-title").on("click", function() {
    cbus.broadcast.send("showPodcastDetail", {
      url: cbus.data.getEpisodeData({ audioElement: cbus.audio.element }).feedURL
    });
  });
});

/* shortly after startup, remove from episodesUnsubbed and feedsQNP episodes/feeds not in queue or now playing */
// setTimeout(function() {
//   var episodesStillNeededURLs = []
//   if (cbus.audio.element) {
//     episodesStillNeededURLs.push(cbus.data.getEpisodeData({audioElement: cbus.audio.element}).url)
//   }
// }, 10000)
