cbus.audio = {
    DEFAULT_JUMP_AMOUNT_BACKWARD: -10,
    DEFAULT_JUMP_AMOUNT_FORWARD: 30,

    element: null,

    setElement: function(elem) {
        console.log("setElement", elem);

        if (cbus.audio.element) {
            cbus.audio.pause();
            cbus.audio.element.onseeked = null;
            cbus.audio.element.onloadedmetadata = null;
            cbus.audio.element.onended = null;
        }

        cbus.audio.element = elem;
        cbus.audio.element.currentTime = 0;

        cbus.audio.element.onseeked = function() {
            cbus.audio.updatePlayerTime();
        };
        cbus.audio.element.onloadedmetadata = function() {
            cbus.audio.updatePlayerTime();
        };
        cbus.audio.element.onended = function() {
            cbus.audio.playQueueItem(0);
        };

        var episodeData = cbus.data.getEpisodeData({
            audioElement: elem
        });

        cbus.broadcast.send("audioChange", episodeData);

        localforage.setItem("cbus-last-audio-url", elem.src);
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
    enqueue: function(audioElement) {
        cbus.audio.queue.push(audioElement);

        var episodeData = cbus.data.getEpisodeData({
            audioElement: audioElement
        });

        cbus.broadcast.send("episodeEnqueue", episodeData);
        cbus.broadcast.send("queueChanged");
    }
};

cbus.audio.sliderUpdateInterval = setInterval(cbus.audio.updatePlayerTime, 500);
