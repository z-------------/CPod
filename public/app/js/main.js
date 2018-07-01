$(document).ready(function() {
  $(".list--episodes, .list--queue").on("click", function(e) {
    var classList = e.target.classList;
    let $target = $(e.target);

    if (classList.contains("episode_button")) {
      var id = e.target.parentElement.parentElement.parentElement.dataset.id;
      var audioElem = document.querySelector(".audios [data-id='" + id + "']");

      if (classList.contains("episode_button--play")) {
        var $episodeElem = $target.closest(".episode");
        var $closestList = $target.closest(".list");
        if ($closestList.hasClass("list--episodes")) { // from stream
          cbus.audio.setElement(audioElem);
          cbus.audio.play();
        } else { // from queue
          cbus.audio.playQueueItem($episodeElem.index());
        }
      } else if (classList.contains("episode_button--enqueue")) {
        cbus.audio.enqueue(audioElem);
      } else if (classList.contains("episode_button--remove-from-queue")) {
        cbus.audio.removeQueueItem($(e.target).closest(".episode").index());
      } else if (classList.contains("episode_button--download")) {
        cbus.data.downloadEpisode(audioElem);
      } else if (classList.contains("episode_button--completed")) {
        cbus.data.toggleCompleted(audioElem.dataset.id);
      }
    } else if (classList.contains("episode_feed-title")) {
      var url = cbus.data.getEpisodeData({ id: $target.closest(".episode").attr("data-id") }).feedURL;
      cbus.broadcast.send("showPodcastDetail", {
        url: url
      });
    } else if (classList.contains("episode_info-button")) {
      var $episodeElem = $target.closest(".episode");
      if ($episodeElem.hasClass("info-open")) {
        $episodeElem.removeClass("info-open");
      } else {
        $(".episode").removeClass("info-open");
        $episodeElem.find(".episode_bottom").scrollTop(0);
        $episodeElem.addClass("info-open");
      }
    } else if (e.target.tagName === "A") {
      e.preventDefault();
      remote.shell.openExternal(e.target.href);
    } else if (classList.contains("list_date-separator_mark-played-button")) {
      let dateSeparatorElem = $target.closest(".list_date-separator")[0];
      let endDate = new Date(dateSeparatorElem.dataset.dateSeparatorDate);
      let startDate = moment(endDate).startOf(dateSeparatorElem.dataset.dateSeparatorInterval);

      let episodeIDs = []; // array of ids of episodes to mark as played

      for (let i = 0, l = cbus.data.episodes.length; i < l; i++) {
        let episode = cbus.data.episodes[i];
        if (episode.date >= startDate && episode.date <= endDate) {
          episodeIDs.push(episode.url);
        } else if (episode.date < startDate) {
          break;
        }
      }

      cbus.data.batchMarkAsPlayed(episodeIDs);
    }
  });

  /* search */

  let searchResultsElem = document.getElementsByClassName("explore_feeds--search-results")[0];
  document.querySelector(".explore_search input").addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      let query = this.value;

      if (query.length > 0) {
        searchResultsElem.innerHTML = "";

        if (cbus.const.youtubeChannelRegexLoose.test(query)) {
          // YT channel in channel/<ID> or user/<username> format
          request.post("https://podsync.net/api/create", {
            json: {
              url: query,
              format: "video",
              quality: "high",
              page_size: 50
            }
          }, (err, res, body) => {
            if (err || res.statusCode < 200 && res.statusCode >= 300) {
              cbus.ui.showSnackbar(i18n.__("snackbar_error-podcast-detail"), "error");
            } else {
              cbus.broadcast.send("showPodcastDetail", {
                url: "https://podsync.net/" + body.id
              });
            }
          });
        } else if (cbus.const.urlRegex.test(query)) {
          // URL
          cbus.broadcast.send("showPodcastDetail", {
            url: query
          });
        } else {
          // search query
          cbus.server.searchPodcasts(query, data => {
            if (data) {
              cbus.broadcast.send("got-search-results");
              searchResultsElem.classList.remove("load-failed");
              if (data.length) {
                searchResultsElem.classList.remove("search-no-results");
                for (let i = 0, l = data.length; i < l; i++) {
                  searchResultsElem.appendChild(cbus.ui.makeFeedElem(data[i], i, true));
                  cbus.data.feedsCache.push(data[i]);
                }
              } else {
                searchResultsElem.classList.add("search-no-results");
              }
            } else {
              searchResultsElem.classList.add("load-failed");
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
    if (classList.contains("player_button") && e.detail !== 0) { // ignore activation by spacebar
      if (classList.contains("player_button--backward")) {
        cbus.audio.jump(- cbus.settings.data.skipAmountBackward);
      } else if (classList.contains("player_button--forward")) {
        cbus.audio.jump(cbus.settings.data.skipAmountForward);
      } else if (classList.contains("player_button--play")) {
        if (!cbus.audio.element) {
          if (cbus.audio.queue.length > 0) {
            cbus.audio.setElement(cbus.audio.queue[0]);
            cbus.audio.play();
          }
        } else if (cbus.audio.element.paused) {
          cbus.audio.play();
        } else {
          cbus.audio.pause();
        }
      } else if (classList.contains("player_button--next")) {
        cbus.audio.playQueueItem(0);
      } else if (classList.contains("player_button--openclose")) {
        document.body.classList.toggle("player-expanded");
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

  cbus.ui.videoCanvasElement.addEventListener("dblclick", (e) => {
    cbus.ui.setFullscreen(!cbus.ui.browserWindow.isFullScreen());
  });

  /* header actions */

  $(".header_actions").on("click", function(e) {
    var classList = e.target.classList;
    if (classList.contains("header_action")) {
      if (classList.contains("header_action--refresh-episodes")) {
        if (navigator.onLine) {
          if (!cbus.data.state.updatingHome) {
            cbus.data.state.updatingHome = true;
            cbus.data.update(null, null, function() {
              cbus.data.state.updatingHome = false;
            });
          }
        } else {
          cbus.ui.showSnackbar(i18n.__("snackbar_no_internet"));
        }
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
    "cbus_feeds_qnp", "cbus_cache_episodes", "cbus_episodes_offline", "cbus_episodes_offline_map",
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
    if (r.hasOwnProperty("cbus_episodes_offline_map")) {
      cbus.data.episodesOfflineMap = r["cbus_episodes_offline_map"] || {};
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

    // remove from downloaded list if file missing
    fs.readdir(path.join(cbus.const.USERDATA_PATH, "offline_episodes"), function(err, files) {
      for (let i = 0, l = cbus.data.episodesOffline.length; i < l; i++) {
        let filename = cbus.data.getEpisodeDownloadedPath(cbus.data.episodesOffline[i], {
          filenameOnly: true
        });
        if (files.indexOf(filename) === -1) {
          let episodeURL = cbus.data.episodesOffline[i];

          cbus.data.episodesOffline.splice(i, 1);
          if (cbus.data.episodesOfflineMap.hasOwnProperty(episodeURL)) {
            delete cbus.data.episodesOfflineMap[episodeURL];
          }

          cbus.broadcast.send("offline_episodes_changed", {
            episodeURL: episodeURL
          });
        }
      }
      localforage.setItem("cbus_episodes_offline", cbus.data.episodesOffline);
      localforage.setItem("cbus_episodes_offline_map", cbus.data.episodesOfflineMap);
    });

    cbus.data.episodesUnsubbed = []

    if (!storedEpisodes && !lastAudioURL) {
      cbus.ui.firstrunContainerElem.classList.add("visible");
    }

    // store globally
    if (storedEpisodes) {
      cbus.data.episodes = storedEpisodes.filter(function(episodeInfo) {
        var feedInfo = cbus.data.getFeedData({ url: episodeInfo.feedURL });
        if (!feedInfo || feedInfo.isUnsubscribed) { return false; }
        return true;
      });
    } else {
      cbus.data.episodes = [];
    }
    if (lastAudioInfo) {
      cbus.data.episodesUnsubbed.push(lastAudioInfo)
    }
    if (lastQueueInfos) {
      for (let i = 0, l = lastQueueInfos.length; i < l; i++) {
        cbus.data.episodesUnsubbed.push(lastQueueInfos[i])
      }
    }
    cbus.data.updateMedias(); // make audio elems and add to DOM
    cbus.ui.display("episodes"); // display the episodes we already have

    if (lastAudioURL) {
      let elem = document.querySelector(`.audios [data-id='${lastAudioURL}']`);
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
        cbus.audio.enqueue(document.querySelector(`.audios [data-id="${ lastQueueURLs[i] }"]`), true)
      }
    }

    if (navigator.onLine) {
      cbus.data.update(); // look for any new episodes (takes care of displaying and updateMedias-ing)
    } else {
      cbus.ui.showSnackbar(i18n.__("snackbar_no_internet"));
    }

    /* sync stuff */

    if (cbus.settings.data.syncEnable) {
      cbus.sync.auth.authenticate(success => {
        if (!success) {
          cbus.ui.showSnackbar(i18n.__("snackbar_sync-login-failed"), "error");
        } else {
          cbus.sync.subscriptions.pushPull((success, failedPart) => {
            if (!success) {
              cbus.ui.showSnackbar(i18n.__(`snackbar_sync-subs-${failedPart}-failed`), "error");
            }
          });
        }
      });

      setInterval(function() {
        if (document.hasFocus()) {
          if (!cbus.data.state.syncSubsPullWaitingForFocus) {
            cbus.sync.subscriptions.pullAllDevices(success => {
              if (!success) {
                cbus.ui.showSnackbar(i18n.__("snackbar_sync-subs-pull-failed"), "error");
              }
            });
          }
        } else {
          cbus.data.state.syncSubsPullWaitingForFocus = true;
        }
      }, 15 * 60 * 1000);

      window.addEventListener("focus", e => {
        if (cbus.data.state.syncSubsPullWaitingForFocus) {
          cbus.data.state.syncSubsPullWaitingForFocus = false;
          cbus.sync.subscriptions.pullAllDevices(success => {
            if (!success) {
              cbus.ui.showSnackbar(i18n.__("snackbar_sync-subs-pull-failed"), "error");
            }
          });
        }
      });
    }

    /* end sync stuff */
  });

  cbus.server.getPopularPodcasts(popularPodcastInfos => {
    let popularPodcastsElem = document.getElementsByClassName("explore_feeds--popular")[0];

    if (!popularPodcastInfos) {
      popularPodcastsElem.classList.add("load-failed");
    } else {
      for (let i = 0, l = popularPodcastInfos.length; i < l; i++) {
        popularPodcastsElem.appendChild(
          cbus.ui.makeFeedElem(popularPodcastInfos[i], i, true)
        );
        cbus.data.feedsCache.push(popularPodcastInfos[i]);
      }
    }
  });

  cbus.broadcast.listen("toggleSubscribe", function(e) {
    var completeData = arrayFindByKeySingle(cbus.data.feedsCache, "url", e.data.url);
    var subscribed = !!arrayFindByKeySingle(cbus.data.feeds, "url", e.data.url);

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
      // required keys: image, title, url

      cbus.server.getPodcastInfo(e.data.url, (podcastInfo) => {
        if (podcastInfo) {
          e.data.image = podcastInfo.image;
          e.data.title = podcastInfo.title;
          cbus.data.subscribeFeeds([e.data], {
            showModal: true
          });
        }
      });
    }

    if (cbus.data.state.podcastDetailCurrentData.url === e.data.url) {
      if (direction === -1) {
        $(".podcast-detail_control--toggle-subscribe").removeClass("subscribed");
      } else {
        $(".podcast-detail_control--toggle-subscribe").addClass("subscribed");
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

  let playerTimeNowElem = document.getElementsByClassName("player_time--now")[0];
  let playerTimeTotalElem = document.getElementsByClassName("player_time--total")[0];
  let playerSliderElem = document.getElementsByClassName("player_slider")[0];

  cbus.broadcast.listen("audioTick", function(e) {
    /* slider */
    playerSliderElem.value = Math.round(1000 * e.data.currentTime / e.data.duration) || 0;

    /* time indicator */
    playerTimeNowElem.innerHTML = colonSeparateDuration(e.data.currentTime);
    playerTimeTotalElem.innerHTML = colonSeparateDuration(e.data.duration);

    /* record in localforage so we can resume next time */
    localforage.setItem("cbus-last-audio-time", e.data.currentTime);
  });

  /* open podcast detail when podcast name clicked in episode data */

  document.getElementsByClassName("player_detail_feed-title")[0].onclick = function() {
    cbus.broadcast.send("showPodcastDetail", {
      url: cbus.data.getEpisodeData({ audioElement: cbus.audio.element }).feedURL
    });
  };
});

const cookieJar = Request.jar();
const request = Request.defaults({
  jar: cookieJar,
  headers: cbus.const.REQUEST_HEADERS
});

cbus.ui.browserWindow.webContents.setUserAgent(cbus.const.REQUEST_HEADERS["User-Agent"]);

/* shortly after startup, remove from episodesUnsubbed and feedsQNP episodes/feeds not in queue or now playing */
// setTimeout(function() {
//   var episodesStillNeededURLs = []
//   if (cbus.audio.element) {
//     episodesStillNeededURLs.push(cbus.data.getEpisodeData({audioElement: cbus.audio.element}).url)
//   }
// }, 10000)
