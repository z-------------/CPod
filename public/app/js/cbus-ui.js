cbus.ui = {};

cbus.ui.display = function(thing, data) {
    switch (thing) {
        case "feeds":
            $(".podcasts_feeds--subscribed").html("");
            cbus.data.feeds.forEach(function(feed, index) {
                $(".podcasts_feeds--subscribed").append(cbus.data.makeFeedElem(feed, index));
            });
            break;
        case "episodes":
            $(".list--episodes").html("");

            for (var i = 0; i < Math.min(112, cbus.data.episodes.length); i++) {
                var episode = cbus.data.episodes[i];

                var episodeElem = document.createElement("cbus-episode");
                episodeElem.title = episode.title;
                episodeElem.date = moment(episode.date).calendar();
                episodeElem.image = episode.feed.image;
                episodeElem.feedTitle = episode.feed.title;
                episodeElem.description = decodeHTML(episode.description);
                episodeElem.url = episode.url;
                episodeElem.dataset.id = episode.id;

                $(".list--episodes").append(episodeElem);
            };

            break;
        case "player":
            $(".player_detail_image").css({ backgroundImage: "url(" + data.feed.image + ")" });
            $(".player_detail_title").text(data.title);
            $(".player_detail_feed-title").text(data.feed.title);
            $(".player_detail_date").text(moment(data.date).calendar());
            $(".player_detail_description").html(data.description);

            // description links open in new tab
            $(".player_detail_description a").attr("target", "_blank");
    }
};

cbus.ui.showSnackbar = function(content, type, buttons) {
    var n;

    if (!type) {
        var type = "notification";
    }

    n = noty({
        text: content,
        type: type,

        animation: {
            open: { height: "toggle" },
            close: { height: "toggle" },
            easing: "swing",
            speed: 300
        },
        timeout: 5000,
        layout: "bottomLeft",
        theme: "material"
    });

    n.$bar.css({ transform: "translateY(-58px)" });

    if (buttons && Array.isArray(buttons)) {
        n.$message.append("<div class='snackbar_buttons'></div>");
        for (button of buttons) {
            n.$message.find(".snackbar_buttons").append(
                $("<button class='snackbar_button'></button>").text(button.text).on("click", function() {
                    button.onClick();
                })
            );
        }
    }

    return n;
};

cbus.ui.tabs = {};
cbus.ui.tabs.switch = function(options) {
    if (options.id || !Number.isNaN(options.index)) {
        var $target, $origin;

        if (options.id) {
            $target = $(".content#" + options.id);
            $origin = $("header nav a[data-target='" + options.id + "']");
        } else { // options.index
            $target = $(".content").eq(options.index);
            $origin = $("header nav a").eq(options.index);
        }

        /* show/hide contents */

        $(".content").removeClass("current"); // remove 'current' class from all tabs

        $target.removeClass("left");
        $target.removeClass("right");
        $target.addClass("current");

        var targetIndex = $target.parent().children().index($target);

        for (var i = 0; i < targetIndex; i++) {
            $target.parent().children().eq(i).removeClass("right");
            $target.parent().children().eq(i).addClass("left");
        }

        for (var i = targetIndex + 1; i < $target.parent().children().length; i++) {
            $target.parent().children().eq(i).removeClass("left");
            $target.parent().children().eq(i).addClass("right");
        }

        /* highlight/unhighlight nav buttons */

        $("header nav a").removeClass("current");
        $origin.addClass("current");

        /* show/hide header buttons */

        var scopeButtons = $("[data-scope='" + $target.attr("id") + "']");
        scopeButtons.addClass("visible");
        $(".header_action").not(scopeButtons).removeClass("visible");

        return;
    }
    return false;
};

cbus.ui.colorify = function(options) {
    var element = $(options.element);

    var colorThiefImage = document.createElement("img");
    colorThiefImage.src = "/app/proxy?url=" + encodeURIComponent(options.image);
    colorThiefImage.onload = function() {
        var colorThief = new ColorThief();
        var colorRGB = colorThief.getColor(colorThiefImage);
        var colorRGBStr = "rgb(" + colorRGB.join(",") + ")";
        var colorL = 0.2126 * colorRGB[0] + 0.7152 * colorRGB[1] + 0.0722 * colorRGB[2];

        element.css({ backgroundColor: colorRGBStr });
        if (colorL < 158) {
            element.addClass("light-colors");
        } else {
            element.removeClass("light-colors");
        }
    };
    if (colorThiefImage.complete) {
        colorThiefImage.onload();
    }
};

/* moving parts */

cbus.broadcast.listen("showPodcastDetail", function(e) {
    $("body").addClass("podcast-detail-visible"); // open sidebar without data

    // display
    $(".podcast-detail_header").css({ backgroundColor: "" });
    $(".podcast-detail_header_image").css({ backgroundImage: "" });
    $(".podcast-detail_header_title").empty();
    $(".podcast-detail_header_publisher").empty();
    $(".podcast-detail_control--toggle-subscribe").removeClass("subscribed").off("click");
    $(".podcast-detail_episodes").empty();
    $(".podcast-detail_header_description").empty();

    setTimeout(function() {
        $(".content-container").on("click", function() {
            document.body.classList.remove("podcast-detail-visible");
            cbus.data.state.podcastDetailCurrentData = { url: null };
            $(".content-container").off("click");
        });
    }, 10); // needs a timeout to work, for some reason

    $(".podcast-detail_header").removeClass("light-colors");
});

cbus.broadcast.listen("gotPodcastData", function(e) {
    $(".podcast-detail_header_image").css({ backgroundImage: "url(proxy?url=" + encodeURIComponent(e.data.image) + ")" });
    $(".podcast-detail_header_title").text(e.data.title);
    $(".podcast-detail_header_publisher").text(e.data.publisher);
    if (e.data.description) {
        $(".podcast-detail_header_description").text(removeHTMLTags(e.data.description));
    }

    if (cbus.data.feedIsSubscribed({ url: cbus.data.state.podcastDetailCurrentData.url })) {
        $(".podcast-detail_control--toggle-subscribe").addClass("subscribed");
    }
    $(".podcast-detail_control--toggle-subscribe").on("click", function() {
        var broadcastData = {
            url: cbus.data.state.podcastDetailCurrentData.url,
            image: e.data.image,
            title: e.data.title
        };

        cbus.broadcast.send("toggleSubscribe", broadcastData);
    });

    // colorify

    cbus.ui.colorify({
        image: e.data.image,
        element: $(".podcast-detail_header")
    });
});

cbus.broadcast.listen("gotPodcastEpisodes", function(e) {
    for (episode of e.data.episodes) {
        var elem = document.createElement("cbus-podcast-detail-episode");

        var description = decodeHTML(episode.description);
        var descriptionWords = description.split(" ");
        if (descriptionWords.length > 50) {
            descriptionWords.length = 50;
            description = descriptionWords.join(" ") + "…";
        }

        $(elem).attr("title", episode.title);
        $(elem).attr("date", moment(episode.date).calendar());
        $(elem).attr("description", description);
        $(elem).attr("id", episode.id);
        $(".podcast-detail_episodes").append(elem);
    }
});

/* listen for queue change */
cbus.broadcast.listen("queueChanged", function() {
    if (cbus.audio.queue.length === 0) {
        $(document.body).addClass("queue-empty");
    } else {
        $(document.body).removeClass("queue-empty");
    }

    $(".list--queue").html("");
    for (queueItem of cbus.audio.queue) {
        var data = cbus.data.getEpisodeData({ audioElement: queueItem });

        var queueItemElem = document.createElement("cbus-episode");

        queueItemElem.title = data.title;
        queueItemElem.feedTitle = data.feed.title;
        queueItemElem.image = data.feed.image;
        queueItemElem.isQueueItem = true;
        queueItemElem.url = data.url;
        queueItemElem.description = data.description;

        $(queueItemElem).on("click", function(e) {
            var $target = $(e.target);
            if ($target.hasClass("episode_button--play")) {
                var index = $(".list--queue cbus-episode").index(this);
                console.log("click", index, this);
                cbus.audio.playQueueItem(index);
            }
        });

        $(".list--queue").append(queueItemElem);
    }
}, true);

/* listen for J and L keyboard shortcuts */
$(document).on("keypress", function(e) {
    if (e.keyCode === KEYCODES.j || e.keyCode === KEYCODES.J) {
        cbus.audio.jump(cbus.audio.DEFAULT_JUMP_AMOUNT_BACKWARD);
    } else if (e.keyCode === KEYCODES.l || e.keyCode === KEYCODES.L) {
        cbus.audio.jump(cbus.audio.DEFAULT_JUMP_AMOUNT_FORWARD);
    } else if (e.keyCode === KEYCODES.k || e.keyCode === KEYCODES.K) {
        if (cbus.audio.element.paused) {
            cbus.audio.play();
        } else {
            cbus.audio.pause();
        }
    }
});

// $(".settings_button--remove-duplicate-feeds").on("click", function() {
//     cbus.broadcast.send("removeDuplicateFeeds");
// });
//
// $(".settings_button--update-feed-artworks").on("click", function() {
//     cbus.broadcast.send("updateFeedArtworks");
// });

$(".settings_button--generate-opml").on("click", function() {
    cbus.broadcast.send("makeFeedsBackup");
});

$(".settings_button--update-feed-artworks").on("click", function() {
    cbus.broadcast.send("updateFeedArtworks");
});

/* waveform */

(function(){
    console.log("waveform");

    var canvas = document.querySelector("#player_waveform");
    var ctx = canvas.getContext("2d");

    var playerDimens = document.querySelector(".player").getClientRects()[0];

    canvas.width = playerDimens.width;
    canvas.height = 300; // arbitrary constant

    var CANVAS_BASELINE = canvas.height;
    var initTimeout;

    var audioStream;
    var leftchannel = [];
    var rightchannel = [];
    var recordingLength = 0;
    var sampleRate;
    var audioVolume = 0;
    var audioInput;
    var volume;
    var recorder;
    var columnWidth;
    var streamData;

    var context = new AudioContext();

    function calculateCanvasDimens() {
        canvas.width = playerDimens.width;
        columnWidth = canvas.width / streamData.length;
    }

    function startAnalyzing(audioInput, element) {
        // retrieve sample rate to be used for wav packaging
        sampleRate = context.sampleRate;

        // create gain node and analyser
        volume = context.createGain();

        var analyser = context.createAnalyser();
        analyser.fftSize = 256;

        // connect nodes
        audioInput.connect(volume);
        volume.connect(analyser);

        streamData = new Uint8Array(analyser.fftSize / 2);

        // lower values -> lower latency.
        // higher values -> avoid audio breakup and glitches
        var bufferSize = Math.pow(2, 8);
        recorder = context.createScriptProcessor(bufferSize, 2, 2);

        recorder.onaudioprocess = function(e) {
            // console.log("audioprocess");

            if (!element.paused) {
                var left = e.inputBuffer.getChannelData(0);
                var right = e.inputBuffer.getChannelData(1);
                // clone samples
                leftchannel.push(new Float32Array(left));
                rightchannel.push(new Float32Array(right));
                recordingLength += bufferSize;

                // get volume
                analyser.getByteFrequencyData(streamData);

                // console.log(streamData[0], streamData[Math.floor(bufferSize / 2)], streamData[bufferSize - 1]);
            }
        };

        // draw function
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            var SKIP = 5;

            for (var i = 0; i < streamData.length; i += SKIP) {
                var columnHeight = streamData[i] / 250 * canvas.height;

                // ctx.fillStyle = "hsl(" + [angle, "100%", "50%"].join(",") + ")";
                ctx.fillStyle = "rgba(255, 255, 255, 0.3)";

                ctx.fillRect(i * columnWidth, CANVAS_BASELINE - columnHeight / 2, columnWidth * SKIP, columnHeight);
            }

            window.requestAnimationFrame(draw);
        }

        calculateCanvasDimens();
        window.requestAnimationFrame(draw);

        // connect recorder
        volume.connect(recorder);
        recorder.connect(context.destination);

        audioInput.connect(context.destination);
    }

    function initWaveform() {
        console.log("initWaveform");

        try {
            audioInput = context.createMediaElementSource(cbus.audio.element);
        } catch (e) {
            console.log("media already connected");
        }

        startAnalyzing(audioInput, cbus.audio.element);
    }

    function stopWaveform() {
        console.log("stopWaveform");

        // if (context) {
        //     context.close();
        // }

        // audioStream.getAudioTracks().forEach(function(track) {
        //     track.stop();
        // });

        // recorder.onaudioprocess = null;
    }

    // window.onblur = function() {
    //     console.log("blur");
    //
    //     stopWaveform();
    // };
    //
    // window.onfocus = function() {
    //     console.log("focus");
    //     initWaveform();
    // };

    window.addEventListener("resize", calculateCanvasDimens);

    // cbus.broadcast.listen("audio-play", initWaveform);
    // cbus.broadcast.listen("audio-pause", stopWaveform);
    // cbus.broadcast.listen("audio-stop", stopWaveform);
    cbus.broadcast.listen("audioChange", function() {
        stopWaveform();
        initWaveform();
    });
}());

/* make radios in the same .filter have the same name attr */

$(".filter").each(function(i, filter) {
    var $filter = $(filter);
    var name = filter.dataset.name;
    $filter.find("input[type=radio]").attr("name", name);
});

$(".filter input[type=radio]").on("change", function() {
    var $this = $(this);

    // remove selected class from all labels in this .filter
    $($this.parents(".filter")[0]).find("label").removeClass("selected");

    // add selected class to this label (if appropriate)
    if (this.checked) {
        $($this.parents("label")[0]).addClass("selected");
    } else {
        $($this.parents("label")[0]).removeClass("selected");
    }
});

$(".filter label:first-child").addClass("selected");
