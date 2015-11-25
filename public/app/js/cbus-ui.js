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
                episodeElem.image = episode.feed.image;
                episodeElem.feedTitle = episode.feed.title;
                episodeElem.description = episode.description;
                episodeElem.dataset.id = episode.id;

                $(".list--episodes").append(episodeElem);
            };

            break;
        case "podcastDetailEpisodes":
            for (episode of data.episodes) {
                var elem = document.createElement("cbus-podcast-detail-episode");
                $(elem).attr("title", episode.title);
                $(elem).attr("description", episode.description);
                $(".podcast-detail_episodes").append(elem);
            }
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

        $(".content").removeClass("visible");
        $target.addClass("visible");

        $("header nav a").removeClass("current");
        $origin.addClass("current");

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
    cbus.ui.display("podcastDetail"); // open sidebar without data
    $("body").removeClass("player-expanded");

    // write to state
    cbus.data.state.podcastDetailCurrentData = {
        id: null
    };

    // display
    $(".podcast-detail_header").css({ backgroundColor: "" });
    $(".podcast-detail_header_image").css({ backgroundImage: "" });
    $(".podcast-detail_header_title").empty();
    $(".podcast-detail_header_publisher").empty();
    $(".podcast-detail_control--toggle-subscribe").removeClass("subscribed").off("click");
    $(".podcast-detail_episodes").empty();

    setTimeout(function() {
        $(".content-container").on("click", function() {
            document.body.classList.remove("podcast-detail-visible");
            cbus.data.state.podcastDetailCurrentData = { id: null };
            $(".content-container").off("click");
        });
    }, 10); // needs a timeout to work, for some reason
});

cbus.broadcast.listen("gotPodcastData", function(e) {
    document.body.classList.add("podcast-detail-visible");

    $(".podcast-detail_header_image").css({ backgroundImage: "url(proxy?url=" + encodeURIComponent(e.data.image) + ")" });
    $(".podcast-detail_header_title").text(e.data.title);
    $(".podcast-detail_header_publisher").text(e.data.publisher);

    if (cbus.data.feedIsSubscribed({ id: cbus.data.state.podcastDetailCurrentData.id })) {
        $(".podcast-detail_control--toggle-subscribe").addClass("subscribed");
    }
    $(".podcast-detail_control--toggle-subscribe").on("click", function() {
        var broadcastData = {
            id: cbus.data.state.podcastDetailCurrentData.id,
            image: e.data.image,
            title: e.data.title,
            url: e.data.url
        };

        cbus.broadcast.send("toggleSubscribe", broadcastData);
    });

    // colorify

    cbus.ui.colorify({
        image: e.data.image,
        element: $(".podcast-detail_header")
    });
});
