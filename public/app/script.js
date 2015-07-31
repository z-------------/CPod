var xhr = function(url, callback) {
    var oReq = new XMLHttpRequest();
    oReq.onload = function(e){
        callback(this.responseText, e);
    };
    oReq.open("get", url, true);
    oReq.send();
};

var colonSeparateDuration = function(num) { // in seconds
    var minutes = Math.floor(num / 60);
    var seconds = Math.floor(num % 60);
    return "" + minutes + ":" + zpad(seconds, 2);
};

var zpad = function pad(n, width, z) { // by user Pointy on SO: stackoverflow.com/a/10073788
    z = z || "0";
    n = n + "";
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

window.AudioContext = window.AudioContext || window.webkitAudioContext;

var cbus = {};

cbus.audio = {
    DEFAULT_JUMP_AMOUNT_BACKWARD: -10,
    DEFAULT_JUMP_AMOUNT_FORWARD: 30,

    element: null,

    setElement: function(elem) {
        if (cbus.audio.element) {
            cbus.audio.pause();
            cbus.audio.element.onseeked = null;
        }

        cbus.audio.element = elem;
        cbus.audio.element.onseeked = function() {
            cbus.audio.updatePlayerTime();
        };

        var innardsContainer = elem.parentElement.parentElement.parentElement.parentElement;
        $(".player_time--total").text(colonSeparateDuration(cbus.audio.element.duration));
        $(".player_episode_image").css({
            backgroundImage: innardsContainer.style.backgroundImage
        });
        $(".player_episode_title").text(innardsContainer.querySelector(".episode_title").textContent);
        $(".player_episode_feed-title").text(innardsContainer.querySelector(".episode_feed-title").textContent);
    },

    updatePlayerTime: function() {
        if (cbus.audio.element) {
            var currentTime = cbus.audio.element.currentTime;
            /* slider */
            var percentage = currentTime / cbus.audio.element.duration;
            $(".player_slider").val(Math.round(1000 * percentage));

            /* time indicator */
            $(".player_time--now").text(colonSeparateDuration(currentTime));
        }
    },
    sliderUpdateInterval: null,

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
    }
};

cbus.audio.sliderUpdateInterval = setInterval(cbus.audio.updatePlayerTime, 500);

cbus.display = function(thing) {
    switch (thing) {
        case "feeds":
            $(".list--podcasts").html("");
            cbus.feeds.forEach(function(feed) {
                $(".list--podcasts").append("<li>\
                <img src='" + feed.image + "' class='podcast_image'>\
                <h3>" + feed.title + " (" + feed.url + ")</h3>\
                </li>");
            });
            break;
        case "episodes":
            $(".list--episodes").html("");

            for (var i = 0; i < Math.min(50, cbus.episodes.length); i++) {
                var episode = cbus.episodes[i];
            //
            //     var timeCategories = {
            //         3600000: "hour",
            //         86400000: "day",
            //         604800000: "week",
            //         2629743830: "month",
            //         Infinity: "all-time"
            //     };
            //     var timeKeys = Object.keys(timeCategories);
            //     var timeCategory = [];
            //
            //     var delta = new Date() - new Date(item.date[0]);
            //
            //     for (var t = 0; t < timeKeys.length; t++) {
            //         var timeKey = Number(timeKeys[t]);
            //         if (timeKey > delta) {
            //             timeCategory.push(timeCategories[timeKey]);
            //         }
            //     }
            //
            //     var itemElem = document.createElement("li");
            //     itemElem.classList.add("episode");
            //     itemElem.dataset.time = timeCategory.join(",");
            //     itemElem.style.backgroundImage = "url(" + item.feed.image + ")";
            //
            //     $(".list--episodes").append(itemElem);

                var episodeElem = document.createElement("cbus-episode");

                episodeElem.title = episode.title;
                episodeElem.image = episode.feed.image;
                episodeElem.feedTitle = episode.feed.title;
                episodeElem.url = episode.url;
                episodeElem.description = episode.description;

                $(".list--episodes").append(episodeElem);
            };

            break;
    }
};

cbus.update = function() {
    $(".list--episodes").html("");
    xhr("update?feeds=" + encodeURIComponent(JSON.stringify(cbus.feeds)), function(r) {
        var feedContents = JSON.parse(r);
        var episodes = [];

        console.log(feedContents);

        Object.keys(feedContents).forEach(function(feedUrl) {
            feedContents[feedUrl].items.forEach(function(episode) {
                var feed = cbus.feeds.filter(function(feed) {
                    return feed.url === feedUrl;
                })[0];

                episodes.push({
                    url: episode.url,
                    title: episode.title,
                    description: episode.description,
                    date: (new Date(episode.date).getTime() ? new Date(episode.date) : null), // check if date is valid
                    feed: feed
                });
            });
        });

        cbus.episodes = episodes.sort(function(a, b) {
            if (a.date > b.date) return -1;
            if (a.date < b.date) return 1;
            return 0;
        });
        cbus.display("episodes");
    });
};

cbus.feeds = (localStorage.getItem("cbus_feeds") ? JSON.parse(localStorage.getItem("cbus_feeds")) : []);

cbus.display("feeds");

$("#add").click(function() {
    Ply.dialog("prompt", {
        title: "Add feed",
        form: { title: "Some Random Podcast" }
    }).always(function (ui) {
        if (ui.state) {
            console.log(ui.widget);
            var feedTitle = ui.data.title;
            xhr("feedinfo?term=" + feedTitle, function(res) {
                var json = JSON.parse(res);
                console.log(json);

                var feedInfo = json[0];

                var feedTitle = feedInfo.title;
                var feedImage = feedInfo.image;
                var feedUrl = feedInfo.url;

                var feedAlreadyAdded = false;
                for (var i = 0; i < cbus.feeds.length; i++) {
                    var lfeed = cbus.feeds[i];
                    var lfeedUrl = lfeed.url;
                    if (lfeedUrl === feedUrl) {
                        feedAlreadyAdded = true;
                        break;
                    }
                }

                if (feedAlreadyAdded) {
                    Ply.dialog("alert", "You already have that feed.");
                } else {
                    cbus.feeds.push({
                        url: feedUrl,
                        title: feedTitle,
                        image: feedImage
                    });
                    localStorage.setItem("cbus_feeds", JSON.stringify(cbus.feeds));
                    Ply.dialog("alert", "Added feed.");
                }
            });
        }
    });
});

$(".list--episodes").on("click", function(e) {
    var classList = e.target.classList;
    if (classList.contains("episode_audio_button--play")) {
        cbus.audio.setElement(e.target.parentElement.querySelector(".episode_audio_player"));
        cbus.audio.play();
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
                cbus.audio.setElement($(".episode_audio_player")[0]);
                cbus.audio.play();
            } else if (cbus.audio.element.paused) {
                cbus.audio.play();
            } else {
                cbus.audio.pause();
            }
        }
    }
});

$(".player_slider").on("input", function() {
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
        if (classList.contains("header_action--show-filters")) {
            $(".content-container")[0].classList.toggle("filters-visible");
            e.target.classList.toggle("md-inactive");
        }
        if (classList.contains("header_action--refresh-episodes")) {
            cbus.update();
        }
    }
});

/* do the thing */

cbus.update();
