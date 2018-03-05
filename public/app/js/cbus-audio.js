cbus.audio = {
  DEFAULT_JUMP_AMOUNT_BACKWARD: -10,
  DEFAULT_JUMP_AMOUNT_FORWARD: 30,

  element: null,
  videoCanvasAnimationFrameID: null,

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
        cbus.ui.showSnackbar("A network error occurred while downloading the media.", "error");
      } else if (this.error === MediaError.MEDIA_ERR_DECODE) {
        cbus.ui.showSnackbar("An error occurred while decoding the media.", "error");
      } else if (this.error === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        cbus.ui.showSnackbar("The media is missing or in an unsupported format.", "error");
      } else {
        // cbus.ui.showSnackbar("An unknown error occurred.", "error");
      }
    };

    cbus.audio.element.onseeked = function() {
      cbus.audio.updatePlayerTime();
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

    let episodeData = cbus.data.getEpisodeData({
      audioElement: elem
    });

    if (episodeData.isVideo) {
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

    cbus.broadcast.send("audioChange", episodeData);

    localforage.setItem("cbus-last-audio-url", elem.dataset.id);
  },

  updatePlayerTime: function(options) {
    if (cbus.audio.element && !cbus.audio.element.paused) {
      cbus.broadcast.send("audioTick", {
        currentTime: cbus.audio.element.currentTime,
        duration: cbus.audio.element.duration
      });
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
      $(".list--queue cbus-episode").eq(index).remove();
      cbus.broadcast.send("queueChanged");
    }
  },

  play: function() {
    cbus.audio.element.play();
    $(".player_button--play").html("pause");
    cbus.broadcast.send("audio-play");
  },
  pause: function() {
    cbus.audio.element.pause();
    $(".player_button--play").html("play_arrow");
    cbus.broadcast.send("audio-pause");
  },
  stop: function() {
    cbus.audio.element.pause();
    cbus.audio.element.currentTime = 0;
    cbus.broadcast.send("audio-stop");
  },
  jump: function(amount) {
    cbus.audio.element.currentTime += amount;
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
  }
};

cbus.audio.sliderUpdateInterval = setInterval(cbus.audio.updatePlayerTime, 500);
