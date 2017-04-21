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

  $(".list--episodes").on("click", function(e) {
    var classList = e.target.classList;

    if (classList.contains("episode_button")) {
      var id = e.target.parentElement.parentElement.parentElement.dataset.id;
      var audioElem = document.querySelector(".audios audio[data-id='" + id + "']");

      if (classList.contains("episode_button--play")) {
        cbus.audio.setElement(audioElem);
        cbus.audio.play();
      } else if (classList.contains("episode_button--enqueue")) {
        cbus.audio.enqueue(audioElem);
      }
    } else if (classList.contains("episode_feed-title")) {
      var url = cbus.data.getEpisodeData({ index: $(".episode_feed-title").index($(e.target)) }).feed.url;
      cbus.broadcast.send("showPodcastDetail", {
        url: url
      });
    }
  });

  /* search */

  var searchTypingTimeout;
  $(".podcasts_search input").on("change input", function() {
    var query = $(this).val();
    clearTimeout(searchTypingTimeout);

    if (query && query.length > 0) {
      searchTypingTimeout = setTimeout(function() {
        $(".podcasts_feeds--search-results").html(null);

        request("/app/search?term=" + encodeURIComponent(query), function(res) {
          if (res) {
            var data = JSON.parse(res);

            for (var i = 0; i < data.length; i++) {
              $(".podcasts_feeds--search-results").append(cbus.data.makeFeedElem(data[i], i, true));
              cbus.data.feedsCache.push(data[i]);
            }
          }
        });

        $(".podcasts_feeds--search-results").addClass("visible");
      }, 1000);
    } else {
      $(".podcasts_feeds--search-results").removeClass("visible");
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

  localforage.getItem("cbus_cache_episodes").then(function(storedEpisodes) {
    cbus.data.episodes = storedEpisodes; // store as global
    cbus.data.updateAudios(); // make audio elems and add to DOM
    cbus.ui.display("episodes"); // display the episodes we already have
    cbus.data.update(); // look for any new episodes (takes care of displaying and updateAudios-ing)
  });

  /* switch to zeroth tab */

  cbus.ui.tabs.switch({ index: 0 });

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
  });

  /* open podcast detail when podcast name clicked in episode data */

  $(".player_detail_feed-title").on("click", function() {
    cbus.broadcast.send("showPodcastDetail", {
      url: cbus.data.getEpisodeData({ audioElement: cbus.audio.element }).feed.url
    });
  });

  /* show episode info on click */

  $(".list--episodes, .list--queue").on("click", function(e) {
    var $target = $(e.target);
    if ($target.hasClass("episode_info-button")) {
      console.log("click");
      var $episodeElem = $target.parent().parent();
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
});
