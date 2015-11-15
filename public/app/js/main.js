$(document).ready(function() {
    cbus.data.feeds = (localStorage.getItem("cbus_feeds") ?
        JSON.parse(localStorage.getItem("cbus_feeds")).sort(cbus.const.podcastSort)
        : []);

    cbus.ui.display("feeds");

    $(".list--episodes").on("click", function(e) {
        var classList = e.target.classList;
        var audioElem = e.target.parentElement.parentElement.querySelector(".episode_audio_player");
        if (classList.contains("episode_button--play")) {
            cbus.audio.setElement(audioElem);
            cbus.audio.play();
        } else if (classList.contains("episode_button--enqueue")) {
            cbus.audio.enqueue(audioElem);
        }
    });

    var searchTypingTimeout;
    $(".filters_search input").on("change input", function() {
        var query = $(this).val();
        clearTimeout(searchTypingTimeout);

        if (query && query.length > 0) {
            searchTypingTimeout = setTimeout(function() {
                $(".filters_feeds--search-results").html(null);

                xhr("/app/searchPodcasts?term=" + encodeURIComponent(query), function(res) {
                    if (res) {
                        var data = JSON.parse(res);

                        for (var i = 0; i < data.length; i++) {
                            $(".filters_feeds--search-results").append(cbus.data.makeFeedElem(data[i], i, true));
                        }
                    }
                });

                $(".filters_feeds--search-results").addClass("visible");
            }, 1000);
        } else {
            $(".filters_feeds--search-results").removeClass("visible");
        }
    });

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

    $(".filter--time").on("change", function() {
        var timeCategory = this.value;
        $(".episode").each(function(i, elem) {
            var matchableTimes = elem.dataset.time.split(",");
            if (matchableTimes.indexOf(timeCategory) !== -1) {
                elem.classList.remove("hidden");
            } else {
                elem.classList.add("hidden");
            }
        });
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

    /* do the thing */

    cbus.data.update();
    cbus.ui.tabs.switch({ index: 0 });

    /* initialize generic tooltipster */

    $(".tooltip").tooltipster({
        theme: "tooltipster-cbus",
        animation: "fadeup",
        speed: 300
    });
});
