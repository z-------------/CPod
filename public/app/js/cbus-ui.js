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
        case "podcastDetail":
            if (!data) {
                var data = {};
            }
            $(".podcast-detail_header_image").css({ backgroundImage: "url(proxy?url=" + encodeURIComponent(data.image) + ")" });
            $(".podcast-detail_header_name").text(data.title);
            $(".podcast-detail_header_publisher").text(data.publisher);
            $(".podcast-detail_header_tags").text(data.tags ? data.tags.join(", ") : "");
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
