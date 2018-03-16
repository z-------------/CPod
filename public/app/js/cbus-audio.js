cbus.audio = {
  DEFAULT_JUMP_AMOUNT_BACKWARD: -10,
  DEFAULT_JUMP_AMOUNT_FORWARD: 30,

  PLAYBACK_RATE_MIN: 0.5,
  PLAYBACK_RATE_MAX: 4,

  element: null,
  videoCanvasAnimationFrameID: null,
  state: {},

  tryRestoreProgress: function() {
    let episodeID = cbus.audio.element.dataset.id;
    if (cbus.data.episodeProgresses.hasOwnProperty(episodeID)) {
      cbus.audio.element.currentTime = Math.max(cbus.data.episodeProgresses[episodeID] - 5, 0);
    }
  },

  setElement: function(elem, disableAutomaticProgressRestore) {
    if (cbus.audio.element) {
      cbus.audio.pause();
      cbus.audio.element.onseeked = null;
      cbus.audio.element.onloadedmetadata = null;
      cbus.audio.element.onended = null;
    }

    cbus.audio.element = elem;
    if (disableAutomaticProgressRestore === true) {
      cbus.audio.element.currentTime = 0;
    } else {
      cbus.audio.tryRestoreProgress();
    }

    cbus.audio.element.onerror = function() {
      if (this.error === MediaError.MEDIA_ERR_ABORTED) {
        // cbus.ui.showSnackbar("The user canceled the audio.", "error");
      } else if (this.error === MediaError.MEDIA_ERR_NETWORK) {
        cbus.ui.showSnackbar(i18n.__("snackbar_error-media-network"), "error");
      } else if (this.error === MediaError.MEDIA_ERR_DECODE) {
        cbus.ui.showSnackbar(i18n.__("snackbar_error-media-decode"), "error");
      } else if (this.error === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        cbus.ui.showSnackbar(i18n.__("snackbar_error-media-unsupported"), "error");
      } else {
        cbus.ui.showSnackbar(i18n.__("snackbar_error-media-unknown"), "error");
      }
    };

    cbus.audio.element.onseeked = function() {
      cbus.audio.updatePlayerTime();
      if (cbus.audio.mprisPlayer) {
        cbus.audio.mprisPlayer.seeked(0);
        // MPRIS spec says argument of Seeked() should be new position, but
        // mpris-service adds argument of seeked() to position then passes
        // new position to Seeked()
      }
    };
    cbus.audio.element.onloadedmetadata = function() {
      if (disableAutomaticProgressRestore === true) {
        cbus.audio.element.currentTime = 0;
      } else {
        cbus.audio.tryRestoreProgress();
      }
      cbus.audio.updatePlayerTime();
    };
    cbus.audio.element.onended = function() {
      cbus.audio.playQueueItem(0);
    };

    cbus.audio.state.episode = cbus.data.getEpisodeData({
      audioElement: elem
    });
    cbus.audio.state.episode.urlSha1 = sha1(cbus.audio.state.episode.url);
    cbus.audio.state.feed = cbus.data.getFeedData({
      url: cbus.audio.state.episode.feedURL
    });

    if (cbus.audio.state.episode.isVideo) {
      let draw = function() {
        cbus.ui.videoCanvasContext.drawImage(
          cbus.audio.element,
          0, 0,
          cbus.ui.videoCanvasElement.width, cbus.ui.videoCanvasElement.height
        );
        cbus.audio.videoCanvasAnimationFrameID = requestAnimationFrame(draw);
      }
      cbus.audio.videoCanvasAnimationFrameID = requestAnimationFrame(draw);
    } else if (cbus.audio.videoCanvasAnimationFrameID) {
      cancelAnimationFrame(cbus.audio.videoCanvasAnimationFrameID);
    }

    cbus.broadcast.send("audioChange", cbus.audio.state.episode);

    localforage.setItem("cbus-last-audio-url", elem.dataset.id);
  },

  updatePlayerTime: function(options) {
    if (cbus.audio.element && !cbus.audio.element.paused) {
      cbus.broadcast.send("audioTick", {
        currentTime: cbus.audio.element.currentTime,
        duration: cbus.audio.element.duration
      });
      if (cbus.audio.mprisPlayer) {
        let trackID = cbus.audio.mprisPlayer.objectPath("track/" + cbus.audio.state.episode.urlSha1);
        if (
          !Number.isNaN(cbus.audio.element.duration) &&
          (
            !cbus.audio.mprisPlayer.metadata ||
            cbus.audio.mprisPlayer.metadata["mpris:trackid"] !== trackID
          )
        ) {
          cbus.audio.mprisPlayer.metadata = {
            "mpris:trackid": trackID,
            "mpris:length": cbus.audio.element.duration * 1000000,
            "mpris:artUrl": cbus.data.getPodcastImageURI(cbus.audio.state.feed),
            "xesam:title": cbus.audio.state.episode.title,
            // "xesam:album": cbus.audio.state.feed.title
            "xesam:artist": cbus.audio.state.feed.title
          };
          cbus.audio.mprisPlayer.position = cbus.audio.element.currentTime * 1000000;
        }
      }
    }
  },
  sliderUpdateInterval: null,

  playQueueItem: function(index) {
    console.log("playQueueItem", index);
    if (cbus.audio.queue[index]) {
      cbus.audio.setElement(cbus.audio.queue[index]);

      cbus.audio.removeQueueItem(index);

      cbus.audio.updatePlayerTime();
      cbus.audio.play();

      cbus.broadcast.send("queueChanged");
    }
  },

  removeQueueItem: function(index) {
    console.log("removeQueueItem", index);
    if (cbus.audio.queue[index]) {
      cbus.audio.queue.splice(index, 1);
      $(".list--queue .episode").eq(index).remove();
      cbus.broadcast.send("queueChanged");
    }
  },

  play: function() {
    cbus.audio.element.play();
    $(".player_button--play").html("pause");
    cbus.broadcast.send("audio-play");
    if (cbus.audio.mprisPlayer) {
      cbus.audio.mprisPlayer.playbackStatus = "Playing";
    }
  },
  pause: function() {
    cbus.audio.element.pause();
    $(".player_button--play").html("play_arrow");
    cbus.broadcast.send("audio-pause");
    if (cbus.audio.mprisPlayer) {
      cbus.audio.mprisPlayer.playbackStatus = "Paused";
    }
  },
  stop: function() {
    cbus.audio.element.pause();
    cbus.audio.element.currentTime = 0;
    cbus.broadcast.send("audio-stop");
    if (cbus.audio.mprisPlayer) {
      cbus.audio.mprisPlayer.playbackStatus = "Stopped";
    }
  },
  jump: function(amount) {
    cbus.audio.element.currentTime += amount;
  },

  setPlaybackRate: function(rate) {
    cbus.audio.element.playbackRate = rate ? clamp(rate, cbus.audio.PLAYBACK_RATE_MIN, cbus.audio.PLAYBACK_RATE_MAX) : 1;
    if (cbus.audio.mprisPlayer) {
      cbus.audio.mprisPlayer.rate = cbus.audio.element.playbackRate;
    }
    cbus.broadcast.send("playbackRateChanged", cbus.audio.element.playbackRate);
  },

  queue: [],
  enqueue: function(audioElement, hiddenEnqueue) {
    cbus.audio.queue.push(audioElement);

    var episodeData = cbus.data.getEpisodeData({
        audioElement: audioElement
    });

    cbus.broadcast.send("episodeEnqueue", {
      episodeData: episodeData,
      hiddenEnqueue: (hiddenEnqueue === true ? true : false)
    });
    cbus.broadcast.send("queueChanged");
  },

  mprisPlayer: null
};

cbus.audio.sliderUpdateInterval = setInterval(cbus.audio.updatePlayerTime, 500);

if (MPRISPlayer) {
  cbus.audio.mprisPlayer = MPRISPlayer({
    name: "cumulonimbus",
    identity: "CPod",
    supportedUriSchemes: [ "file", "http", "https" ],
    supportedMimeTypes: [ "audio/*" ],
    supportedInterfaces: [ "player" ]
  });

  cbus.audio.mprisPlayer.canGoNext = false;
  cbus.audio.mprisPlayer.canGoPrevious = false;
  cbus.audio.mprisPlayer.playbackStatus = "Paused";
  cbus.audio.mprisPlayer.minimumRate = cbus.audio.PLAYBACK_RATE_MIN;
  cbus.audio.mprisPlayer.maximumRate = cbus.audio.PLAYBACK_RATE_MAX;

  cbus.audio.mprisPlayer.on("play", () => {
    cbus.audio.play();
  });
  cbus.audio.mprisPlayer.on("pause", () => {
    cbus.audio.pause();
  });
  cbus.audio.mprisPlayer.on("stop", () => {
    cbus.audio.pause();
  });
  cbus.audio.mprisPlayer.on("playpause", () => {
    if (cbus.audio.element.paused) {
      cbus.audio.play();
    } else {
      cbus.audio.pause();
    }
  });
  cbus.audio.mprisPlayer.on("next", () => {
    cbus.audio.playQueueItem(0);
  });
  cbus.audio.mprisPlayer.on("seek", (data) => {
    if (cbus.audio.element) {
      cbus.audio.element.currentTime = data.position / 1000000;
    }
  });
  cbus.audio.mprisPlayer.on("position", (data) => {
    if (cbus.audio.element) {
      cbus.audio.element.currentTime = data.position / 1000000;
    }
  });
  cbus.audio.mprisPlayer.on("volume", (data) => {
    if (cbus.audio.element) {
      cbus.audio.element.volume = clamp(data.volume, 0, 1);
    }
  });
  cbus.audio.mprisPlayer.on("rate", (data) => {
    if (cbus.audio.element) {
      cbus.audio.setPlaybackRate(data.rate);
    }
  });

  cbus.broadcast.listen("queueChanged", () => {
    if (cbus.audio.queue.length) {
      cbus.audio.mprisPlayer.canGoNext = true;
    } else {
      cbus.audio.mprisPlayer.canGoNext = false;
    }
  });
}
