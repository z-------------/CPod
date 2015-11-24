$(document).ready(function() {
    cbus.data.feeds = (localStorage.getItem("cbus_feeds") ?
        JSON.parse(localStorage.getItem("cbus_feeds")).sort(cbus.const.podcastSort)
        : []);

    for (feed of cbus.data.feeds) {
        cbus.data.knownFeeds.push(feed);
    }

    cbus.ui.display("feeds");

    $(".list--episodes").on("click", function(e) {
        var classList = e.target.classList;

        if (classList.contains("episode_button")) {
            var id = e.target.parentElement.parentElement.dataset.id;
            var audioElem = document.querySelector(".audios audio[data-id='" + id + "']");

            if (classList.contains("episode_button--play")) {
                cbus.audio.setElement(audioElem);
                cbus.audio.play();
            } else if (classList.contains("episode_button--enqueue")) {
                cbus.audio.enqueue(audioElem);
            }
        } else if (classList.contains("episode_feed-title")) {
            var id = cbus.data.getEpisodeData({ index: $(".episode_feed-title").index($(e.target)) }).feed.id;
            cbus.broadcast.send("showPodcastDetail", {
                id: id
            });
        }
    });

    /* search */

    var searchTypingTimeout;
    $(".filters_search input").on("change input", function() {
        var query = $(this).val();
        clearTimeout(searchTypingTimeout);

        if (query && query.length > 0) {
            searchTypingTimeout = setTimeout(function() {
                $(".filters_feeds--search-results").html(null);

                xhr("/app/search?term=" + encodeURIComponent(query), function(res) {
                    if (res) {
                        var data = JSON.parse(res);

                        for (var i = 0; i < data.length; i++) {
                            $(".filters_feeds--search-results").append(cbus.data.makeFeedElem(data[i], i, true));
                            cbus.data.knownFeeds.push(data[i]);
                        }
                    }
                });

                $(".filters_feeds--search-results").addClass("visible");
            }, 1000);
        } else {
            $(".filters_feeds--search-results").removeClass("visible");
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

    /* player right buttons */

    $(".player_right-buttons").on("click", function(e) {
        var classList = e.target.classList;
        if (classList.contains("player_button")) {
            if (classList.contains("player_button--expand")) {
                var icons = ["arrow_drop_up", "arrow_drop_down"];
                document.body.classList.toggle("player-expanded");
                if (document.body.classList.contains("player-expanded")) {
                    $(e.target).text(icons[1]);
                } else {
                    $(e.target).text(icons[0]);
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

    if (
        !localStorage.getItem("cbus_cache_episodes") ||
        new Date().getTime() - Number(localStorage.getItem("cbus_cache_episodes_time")) > 1800000 // 30 minutes
    ) {
        console.log("fetching fresh episodes data");

        cbus.data.update();
    } else {
        console.log("using cached episode data");

        cbus.data.episodes = JSON.parse(localStorage.getItem("cbus_cache_episodes"));
        for (episode of cbus.data.episodes) {
            var audioElem = document.createElement("audio");
            audioElem.src = episode.url;
            audioElem.dataset.id = episode.id;
            audioElem.preload = "none";
            $(".audios").append(audioElem);
        }

        cbus.ui.display("episodes");
    }

    /* switch to zeroth tab */

    cbus.ui.tabs.switch({ index: 0 });

    /* initialize generic tooltipster */

    $(".tooltip").tooltipster({
        theme: "tooltipster-cbus",
        animation: "fadeup",
        speed: 300
    });

    /* podcast detail sidebar */

    cbus.broadcast.listen("showPodcastDetail", function(e) {
        console.log(e);

        cbus.ui.display("podcastDetail");
        document.body.classList.add("podcast-detail-visible");

        xhr("info?id=" + encodeURIComponent(e.data.id), function(res, err) {
            var data = JSON.parse(res);
            console.log(data);

            cbus.ui.display("podcastDetail", data);
        });

        setTimeout(function() {
            document.querySelector(".content-container").onclick = function() {
                if (document.body.classList.contains("podcast-detail-visible")) {
                    document.body.classList.remove("podcast-detail-visible");
                    cbus.ui.state.podcastDetailCurrentData = { id: null };
                    this.onclick = null;
                }
            };
        }, 10);
    });

    cbus.broadcast.listen("toggleSubscribe", function(e) {
        console.log(e);

        var completeData = arrayFindByKey(cbus.data.knownFeeds, { id: e.data.id })[0];

        var direction;
        if (e.data.direction) {
            direction = e.data.direction;
        } else {
            if (completeData) { // already subscribed
                direction = -1;
            } else { // not subscribed
                direction = 1;
            }
        }

        if (direction === -1) {
            cbus.data.unsubscribeFeed({ id: e.data.id }, true);
        } else {
            // complete required data
            var requiredKeys = ["id", "image", "title", "url"];

            for (key of requiredKeys) {
                if (!e.data.hasOwnProperty(key)) {
                    e.data[key] = completeData[key];
                }
            }

            cbus.data.subscribeFeed(e.data, true);
        }

        if (cbus.ui.state.podcastDetailCurrentData.id === e.data.id) {
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

        $(".player_time--total").text(colonSeparateDuration(element.duration));

        document.querySelector("cbus-queue-item").title = e.data.title;
        document.querySelector("cbus-queue-item").feedTitle = e.data.feed.title;
        document.querySelector("cbus-queue-item").image = e.data.feed.image;

        /* extract accent color of feed image and apply to player */

        cbus.ui.colorify({
            image: e.data.feed.image,
            element: $(".player")
        });

        /* populate player details section */

        $(".player_detail_image").css({ backgroundImage: "url(" + e.data.feed.image + ")" });
        $(".player_detail_title").text(e.data.title);
        $(".player_detail_feed-title").text(e.data.feed.title);
        $(".player_detail_date").text(moment(e.data.date).calendar());
        $(".player_detail_description").html(e.data.description);

        /* show player if not already visible */

        $(".player").addClass("visible");
    });

    /* update audio time */

    cbus.broadcast.listen("audioTick", function(e) {
        /* slider */
        var percentage = e.data.currentTime / e.data.duration;
        $(".player_slider").val(Math.round(1000 * percentage) || 0);

        /* time indicator */
        $(".player_time--now").text(colonSeparateDuration(e.data.currentTime));
        $(".player_time--total").text(colonSeparateDuration(e.data.duration));
    })
});
