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
      let time;
      if (cbus.data.episodeCompletedStatuses[episodeID] === true) {
        time = 0;
      } else {
        time = Math.max(cbus.data.episodeProgresses[episodeID] - 5, 0);
      }
      cbus.audio.element.currentTime = time;
    }
  },

  setElement: function(elem, disableAutomaticProgressRestore) {
    var prevPlaybackRate;
    var prevVolume;

    if (cbus.audio.element) {
      cbus.audio.pause();
      cbus.audio.element.oncanplay = null;
      cbus.audio.element.onseeking = null;
      cbus.audio.element.onseeked = null;
      cbus.audio.element.onloadedmetadata = null;
      cbus.audio.element.onended = null;

      prevPlaybackRate = cbus.audio.element.playbackRate;
      prevVolume = cbus.audio.element.volume;
    }

    cbus.audio.element = elem;

    if (prevPlaybackRate) {
      cbus.audio.element.playbackRate = prevPlaybackRate;
      cbus.audio.element.volume = prevVolume
    }

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

    cbus.audio.element.oncanplay = function() {
      cbus.broadcast.send("audioBufferEnd");
    };
    cbus.audio.element.onseeking = function() {
      cbus.broadcast.send("audioBufferStart");
    };
    cbus.audio.element.onseeked = function() {
      cbus.broadcast.send("audioBufferEnd");
      cbus.audio.updatePlayerTime();
      if (cbus.audio.mprisPlayer) {
        cbus.audio.mprisPlayer.interfaces.player.emitSignal("Seeked", cbus.audio.element.currentTime * 1e6);
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
      if (cbus.audio.queue.length && cbus.audio.queue[0].src !== cbus.audio.element.src) {
        cbus.audio.playQueueItem(0);
      } else {
        // up next
        if (existsRecursive(cbus.data.state, ["upNext", "source"])) {
          let upNextState = cbus.data.state.upNext;
          let currentEpisode = cbus.data.getEpisodeData({ audioElement: cbus.audio.element });
          let currentPodcast = cbus.data.getFeedData({ url: currentEpisode.feedURL });
          if (upNextState.source === "home") {
            var currentIndex = -1;
            let l = cbus.data.episodes.length;
            for (let i = 0; i < l; i++) {
              if (
                currentIndex === -1 &&
                cbus.data.episodes[i].url === currentEpisode.url &&
                cbus.data.episodes[i].feedURL === currentEpisode.feedURL
              ) {
                currentIndex = i;
                break;
              }
            }
            for (let i = currentIndex + 1; i < l; i++) {
              if (!cbus.data.getEpisodeProgress(cbus.data.episodes[i].url).completed) {
                cbus.audio.setElement(getElem(".audios").querySelector(`[data-id="${cbus.data.episodes[i].url}"]`));
                cbus.audio.play();
                break;
              }
            }
          } else if (upNextState.source === "podcast") {
            // TODO
          }
        }
      }
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
    cbus.ui.updateThumbarButtons();

    localforage.setItem("cbus-last-audio-url", elem.dataset.id);

    cbus.audio.updatePlayerTime();
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
          if (cbus.audio.state.feed.image instanceof Blob && cbus.audio.state.updatingArtFor !== cbus.audio.state.feed.url) {
            cbus.audio.state.updatingArtFor = cbus.audio.state.feed.url;
            cbus.broadcast.send("updateFeedArtworks", {
              feedUrl: cbus.audio.state.feed.url,
              callback: function(updatedFeeds) {
                if (updatedFeeds[0].url === cbus.audio.state.feed.url) {
                  cbus.audio.state.feed.image = cbus.const.IMAGE_ON_DISK_PLACEHOLDER;
                  cbus.audio.mprisSetMetadata(trackID);
                  cbus.audio.state.updatingArtFor = null;
                }
              }
            });
          } else if (cbus.audio.state.updatingArtFor !== cbus.audio.state.feed.url) {
            cbus.audio.mprisSetMetadata(trackID);
          }
        }
      }
    }
  },
  sliderUpdateInterval: null,

  playQueueItem: function(index) {
    if (cbus.audio.queue[index]) {
      cbus.audio.setElement(cbus.audio.queue[index]);
      cbus.audio.removeQueueItem(index);
      cbus.audio.play();

      cbus.broadcast.send("queueChanged");

      return true;
    } else {
      return false;
    }
  },

  removeQueueItem: function(index) {
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
    cbus.broadcast.send("audioBufferStart");
    if (cbus.audio.mprisPlayer) {
      cbus.audio.mprisPlayer.playbackStatus = "Playing";
    }
    cbus.ui.updateThumbarButtons();
  },
  pause: function() {
    cbus.audio.element.pause();
    $(".player_button--play").html("play_arrow");
    cbus.broadcast.send("audio-pause");
    if (cbus.audio.mprisPlayer) {
      cbus.audio.mprisPlayer.playbackStatus = "Paused";
    }
    cbus.ui.updateThumbarButtons();
  },
  playpause: function() {
    if (cbus.audio.element.paused) {
      cbus.audio.play();
    } else {
      cbus.audio.pause();
    }
  },
  stop: function() {
    cbus.audio.element.pause();
    cbus.audio.element.currentTime = 0;
    cbus.broadcast.send("audio-stop");
    if (cbus.audio.mprisPlayer) {
      cbus.audio.mprisPlayer.playbackStatus = "Stopped";
    }
    cbus.ui.updateThumbarButtons();
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
  setVolume: function(volume) {
    cbus.audio.element.volume = volume / 100;

    // TODO send broadcast after adding keyboard shortcut
  },

  queue: [],
  enqueue: function(audioElement, hiddenEnqueue) {
    cbus.audio.queue.push(audioElement);

    let episodeData = cbus.data.getEpisodeData({
      audioElement: audioElement
    });

    cbus.broadcast.send("episodeEnqueue", {
      episodeData: episodeData,
      hiddenEnqueue: (hiddenEnqueue === true ? true : false)
    });
    cbus.broadcast.send("queueChanged");
    cbus.ui.updateThumbarButtons();

    if (!hiddenEnqueue && cbus.settings.data.queueAutoDownload) {
      if (cbus.data.episodesOffline.indexOf(episodeData.id) === -1) {
        cbus.data.downloadEpisode(audioElement);
      }
    }
  },

  mprisPlayer: null,
  mprisSetMetadata: function(trackID) {
    cbus.audio.mprisPlayer.metadata = {
      "mpris:trackid": trackID,
      "mpris:length": cbus.audio.element.duration * 1000000,
      "mpris:artUrl": cbus.data.getPodcastImageURI(cbus.audio.state.feed),
      "xesam:title": cbus.audio.state.episode.title,
      "xesam:album": cbus.audio.state.feed.title,
      "xesam:artist": [ cbus.audio.state.feed.title ]
    };
    cbus.audio.mprisPlayer.position = cbus.audio.element.currentTime * 1000000;
    console.log("metadata set", cbus.audio.mprisPlayer.metadata)
  }
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
