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
            cbus.audio.updatePlayerTime(true);
        };
        cbus.audio.element.onended = function() {
            cbus.audio.playQueueItem(0);
        };

        var episodeData = cbus.data.getEpisodeData({
            audioElement: elem
        });

        $(".player_time--total").text(colonSeparateDuration(cbus.audio.element.duration));

        document.querySelector("cbus-queue-item").title = episodeData.title;
        document.querySelector("cbus-queue-item").feedTitle = episodeData.feed.title;
        document.querySelector("cbus-queue-item").image = episodeData.feed.image;

        /* extract accent color of feed image and apply to player */

        var colorThiefImage = document.createElement("img");
        colorThiefImage.src = "/app/proxy?url=" + encodeURIComponent(episodeData.feed.image);
        colorThiefImage.onload = function() {
            var colorThief = new ColorThief();
            var colorRGB = colorThief.getColor(colorThiefImage);
            var colorRGBStr = "rgb(" + colorRGB.join(",") + ")";
            var colorL = 0.2126 * colorRGB[0] + 0.7152 * colorRGB[1] + 0.0722 * colorRGB[2];

            $(".player").css({ backgroundColor: colorRGBStr });
            if (colorL < 158) {
                $(".player").addClass("light-colors");
            } else {
                $(".player").removeClass("light-colors");
            }
        };
        if (colorThiefImage.complete) {
            colorThiefImage.onload();
        }

        /* populate player details section */

        $(".player_detail_image").css({ backgroundImage: "url(" + episodeData.feed.image + ")" });
        $(".player_detail_title").text(episodeData.title);
        $(".player_detail_feed-title").text(episodeData.feed.title);
        $(".player_detail_date").text(moment(episodeData.date).calendar());
        $(".player_detail_description").html(episodeData.description);
    },

    updatePlayerTime: function(updateTotalLength) {
        if (cbus.audio.element && !cbus.audio.element.paused) {
            var currentTime = cbus.audio.element.currentTime;
            /* slider */
            var percentage = currentTime / cbus.audio.element.duration;
            $(".player_slider").val(Math.round(1000 * percentage) || 0);

            /* time indicator */
            $(".player_time--now").text(colonSeparateDuration(currentTime));
            if (updateTotalLength === true) {
                $(".player_time--total").text(colonSeparateDuration(cbus.audio.element.duration));
            }
        }
    },
    sliderUpdateInterval: null,

    playQueueItem: function(index) {
        if (cbus.audio.queue[index]) {
            cbus.audio.setElement(cbus.audio.queue[index]);

            $("cbus-queue-item").eq(index + 1).remove();

            cbus.audio.updatePlayerTime(true);
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
