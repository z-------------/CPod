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
            if (data) {
                $(".podcast-detail_header_image").css({ backgroundImage: "url(proxy?url=" + encodeURIComponent(data.image) + ")" });
                $(".podcast-detail_header_title").text(data.title);
                $(".podcast-detail_header_publisher").text(data.publisher);

                if (cbus.data.feedIsSubscribed({ id: data.id })) {
                    $(".podcast-detail_control--toggle-subscribe").addClass("subscribed");
                }
                $(".podcast-detail_control--toggle-subscribe").on("click", function() {
                    var broadcastData = {
                        id: data.id,
                        image: data.image,
                        title: data.title,
                        url: data.url
                    };

                    if (cbus.data.feedIsSubscribed({ id: data.id })) {
                        broadcastData.direction = -1;
                        this.classList.remove("subscribed");
                    } else {
                        broadcastData.direction = 1;
                        this.classList.add("subscribed");
                    }

                    cbus.broadcast.send("toggleSubscribe", broadcastData);
                });

                // extract color

                var colorThiefImage = document.createElement("img");
                colorThiefImage.src = "/app/proxy?url=" + encodeURIComponent(data.image);
                colorThiefImage.onload = function() {
                    var colorThief = new ColorThief();
                    var colorRGB = colorThief.getColor(colorThiefImage);
                    var colorRGBStr = "rgb(" + colorRGB.join(",") + ")";
                    var colorL = 0.2126 * colorRGB[0] + 0.7152 * colorRGB[1] + 0.0722 * colorRGB[2];

                    $(".podcast-detail_header").css({ backgroundColor: colorRGBStr });
                    if (colorL < 158) {
                        $(".podcast-detail_header").addClass("light-colors");
                    } else {
                        $(".podcast-detail_header").removeClass("light-colors");
                    }
                };
                if (colorThiefImage.complete) {
                    colorThiefImage.onload();
                }
            } else {
                $(".podcast-detail_header").css({ backgroundColor: "" });
                $(".podcast-detail_header_image").css({ backgroundImage: "" });
                $(".podcast-detail_header_title").empty();
                $(".podcast-detail_header_publisher").empty();
                $(".podcast-detail_control--toggle-subscribe").removeClass("subscribed").off("click");
            }
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
