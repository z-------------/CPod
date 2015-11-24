cbus.audio = {
    DEFAULT_JUMP_AMOUNT_BACKWARD: -10,
    DEFAULT_JUMP_AMOUNT_FORWARD: 30,

    element: null,

    setElement: function(elem) {
        if (cbus.audio.element) {
            cbus.audio.pause();
            cbus.audio.element.onseeked = null;
            cbus.audio.element.onloadedmetadata = null;
            cbus.audio.element.onended = null;
        }

        if (cbus.audio.queue.indexOf(elem) !== -1) {
            cbus.audio.queue.splice(cbus.audio.queue.indexOf(elem), 1);
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
    },

    updatePlayerTime: function() {
        if (cbus.audio.element && !cbus.audio.element.paused) {
            cbus.broadcast.send("audioTick", {
                currentTime: cbus.audio.element.currentTime,
                duration: cbus.audio.element.duration
            });
        }
    },
    sliderUpdateInterval: null,

    playQueueItem: function(index) {
        if (cbus.audio.queue[index]) {
            cbus.audio.setElement(cbus.audio.queue[index]);

            $("cbus-queue-item").eq(index + 1).remove();

            cbus.audio.updatePlayerTime();
            cbus.audio.play();
        }
    },

    play: function() {
        cbus.audio.element.play();
        $(".player_button--play").html("pause");
        $(".player_time--total")
    },
    pause: function() {
        cbus.audio.element.pause();
        $(".player_button--play").html("play_arrow");
    },
    stop: function() {
        cbus.audio.element.pause();
        cbus.audio.element.currentTime = 0;
    },
    jump: function(amount) {
        cbus.audio.element.currentTime += amount;
    },

    queue: [],
    enqueue: function(elem) {
        cbus.audio.queue.push(elem);

        var episodeData = cbus.data.getEpisodeData({
            audioElement: elem
        });

        var queueItemElem = document.createElement("cbus-queue-item");

        queueItemElem.title = episodeData.title;
        queueItemElem.feedTitle = episodeData.feed.title;
        queueItemElem.image = episodeData.feed.image;

        $(queueItemElem).on("click", function() {
            var index = $("cbus-queue-item").index(this) - 1;
            console.log("click", index, this);
            cbus.audio.playQueueItem(index);
        });

        $(".player_queue").append(queueItemElem);
    }
};

cbus.audio.sliderUpdateInterval = setInterval(cbus.audio.updatePlayerTime, 500);
