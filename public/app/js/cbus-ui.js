cbus.ui = {};

cbus.ui.display = function(thing, data) {
    switch (thing) {
        case "feeds":
            $(".filters_feeds--subscribed").html("");
            cbus.data.feeds.forEach(function(feed, index) {
                $(".filters_feeds--subscribed").append(cbus.data.makeFeedElem(feed, index));
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
                episodeElem.dataset.id = episode.id;

                $(".list--episodes").append(episodeElem);
            };

            break;
        case "player":
            document.querySelector("cbus-queue-item").title = data.title;
            document.querySelector("cbus-queue-item").feedTitle = data.feed.title;
            document.querySelector("cbus-queue-item").image = data.feed.image;

            $(".player_detail_image").css({ backgroundImage: "url(" + data.feed.image + ")" });
            $(".player_detail_title").text(data.title);
            $(".player_detail_feed-title").text(data.feed.title);
            $(".player_detail_date").text(moment(data.date).calendar());
            $(".player_detail_description").html(data.description);

            $(".player").addClass("visible");
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

        $(".content").removeClass("visible");
        $target.addClass("visible");

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
    cbus.broadcast.send("playerToggleExpand", { direction: -1 });  // collapse player

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

cbus.broadcast.listen("playerToggleExpand", function(e) {
    var icons = ["arrow_drop_up", "arrow_drop_down"];

    var method = "toggle";
    if (e.data.direction === 1) {
        method = "add";
    } else if (e.data.direction === -1) {
        method = "remove";
    }
    document.body.classList[method]("player-expanded");
    console.log(method);

    var $expandButton = $(".player_button.player_button--expand");

    if (document.body.classList.contains("player-expanded")) {
        $expandButton.text(icons[1]);
    } else {
        $expandButton.text(icons[0]);
    }
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

cbus.broadcast.listen("queueChanged", function() {
    if (cbus.audio.queue.length === 0) {
        $(".player_queue").addClass("player_queue--empty");
    } else {
        $(".player_queue").removeClass("player_queue--empty");
    }
}, true);

// listen for J and L keyboard shortcuts
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
