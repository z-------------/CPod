$(document).ready(function() {
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
      } else if (classList.contains("episode_button--completed")) {
        cbus.data.toggleCompleted(audioElem.dataset.id);
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
    } else if (classList.contains("player_detail_tab")) {
      if (classList.contains("player_detail_tab--description")) {
          cbus.ui.setPlayerTab(0);
      } else if (classList.contains("player_detail_tab--chapters")) {
        cbus.ui.setPlayerTab(1);
      }
    } else if (classList.contains("player_detail_chapter")) {
      let chapters = cbus.data.getEpisodeData({ audioElement: cbus.audio.element }).chapters;
      cbus.audio.element.currentTime = chapters[Number(e.target.dataset.index)].time;
    } else if (classList.contains("player_detail_description_timelink")) {
      cbus.audio.element.currentTime = cbus.data.parseTimeString(e.target.textContent);
    }
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

  var storedEpisodes, lastAudioInfo, lastQueueInfos,
      lastAudioURL, lastAudioTime;

  localforageGetMulti([
    "cbus_feeds_qnp", "cbus_cache_episodes", "cbus_episodes_offline",
    "cbus-last-audio-info", "cbus-last-queue-infos", "cbus-last-audio-url",
    "cbus-last-audio-time", "cbus-last-queue-urls", "cbus_episode_progresses",
    "cbus_feeds", "cbus_episode_completed_statuses"
  ], function(r) {
    if (r.hasOwnProperty("cbus_cache_episodes")) {
      storedEpisodes = r["cbus_cache_episodes"];
    }
    if (r.hasOwnProperty("cbus_episodes_offline")) {
      cbus.data.episodesOffline = r["cbus_episodes_offline"] || [];
    }
    if (r.hasOwnProperty("cbus-last-audio-info")) {
      lastAudioInfo = r["cbus-last-audio-info"];
    }
    if (r.hasOwnProperty("cbus-last-queue-infos")) {
      lastQueueInfos = r["cbus-last-queue-infos"];
    }
    if (r.hasOwnProperty("cbus-last-audio-url")) {
      lastAudioURL = r["cbus-last-audio-url"];
    }
    if (r.hasOwnProperty("cbus-last-audio-time")) {
      lastAudioTime = r["cbus-last-audio-time"];
    }
    if (r.hasOwnProperty("cbus-last-queue-urls")) {
      lastQueueURLs = r["cbus-last-queue-urls"];
    }

    cbus.data.episodeProgresses = r["cbus_episode_progresses"] || [];
    cbus.data.episodeCompletedStatuses = r["cbus_episode_completed_statuses"] || [];
    cbus.data.feedsQNP = r["cbus_feeds_qnp"] || [];

    if (r["cbus_feeds"]) {
      cbus.data.feeds = r["cbus_feeds"].sort(cbus.const.podcastSort);
    } else {
      cbus.data.feeds = [];
    }
    for (let i = 0, l = cbus.data.feeds.length; i < l; i++) {
      cbus.data.feedsCache.push(cbus.data.feeds[i]);
    }
    if (cbus.data.feeds.length > 0) { // there are subscribed feeds
      cbus.ui.tabs.switch({ index: 0 }); // Home tab
    } else { // no subscribed feeds
      cbus.ui.tabs.switch({ index: 3 }); // Explore tab
    }
    cbus.ui.display("feeds");

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
      localforage.setItem("cbus_episodes_offline", cbus.data.episodesOffline)
    })

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

      if (lastAudioURL) {
        let elem = document.querySelector(`.audios audio[data-id='${lastAudioURL}']`);
        if (elem) {
          // cbus.audio.setElement(elem, true);
          cbus.audio.setElement(elem);
          if (lastAudioTime) {
            cbus.audio.element.currentTime = lastAudioTime;
            cbus.broadcast.send("audioTick", {
              currentTime: lastAudioTime,
              duration: cbus.data.getEpisodeData({ audioElement: cbus.audio.element }).length
            })
          }
        }
      }

      if (lastQueueURLs) {
        for (let i = 0, l = lastQueueURLs.length; i < l; i++) {
          cbus.audio.enqueue(document.querySelector(`.audios audio[data-id="${ lastQueueURLs[i] }"]`), true)
        }
      }
    }

    cbus.data.update(); // look for any new episodes (takes care of displaying and updateAudios-ing)
  });

  /* start loading popular podcasts */

  cbus.server.getPopularPodcasts((popularPodcastInfos) => {
    console.log(popularPodcastInfos)
    let popularPodcastsElem = document.getElementsByClassName("explore_feeds--popular")[0];
    for (let i = 0, l = popularPodcastInfos.length; i < l; i++) {
      popularPodcastsElem.appendChild(
        cbus.data.makeFeedElem(popularPodcastInfos[i], i, true)
      );
      cbus.data.feedsCache.push(popularPodcastInfos[i]);
    }
  })

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
    // $(".player").addClass("light-colors");
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
