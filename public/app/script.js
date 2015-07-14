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
            $("#list").html("");
            cbus.feeds.forEach(function(feed) {
                $("#list").append("<li>\
                <img src='" + feed.image + "' class='podcast_image'>\
                <h3>" + feed.title + " (" + feed.url + ")</h3>\
                </li>");
            });
            break;
        case "feedContents":
            var items = [];

            Object.keys(cbus.feedContents).forEach(function(feedURL) {
                var feed = cbus.feeds.filter(function(feed) {
                    return feed.url === feedURL;
                })[0];
                if (feed) {
                    cbus.feedContents[feedURL].items.forEach(function(item) {
                        var object = item;
                        object.feed = feed;
                        items.push(object);
                    });
                }
            });

            items.sort(function(a, b) {
                var aDate = new Date(a.date);
                var bDate = new Date(b.date);
                if (aDate > bDate) return -1;
                if (aDate < bDate) return 1;
                return 0;
            });

            $("#items").html("");
            items.forEach(function(item) {
                var timeCategories = {
                    3600000: "hour",
                    86400000: "day",
                    604800000: "week",
                    2629743830: "month",
                    Infinity: "all-time"
                };
                var timeKeys = Object.keys(timeCategories);
                var timeCategory = [];

                var delta = new Date() - new Date(item.date[0]);

                for (var i = 0; i < timeKeys.length; i++) {
                    var timeKey = Number(timeKeys[i]);
                    if (timeKey > delta) {
                        timeCategory.push(timeCategories[timeKey]);
                    }
                }

                $("#items").append("<li class='podcast' data-time='" + timeCategory.join(",") + "'>\
                <div class='podcast_info'>\
                <h3>" + item.title + " - " + item.feed.title + "</h3>\
                <p>" + item.description + "</p>\
                </div>\
                <div class='podcast_audio'>\
                <audio class='podcast_audio_player' src='" + item.url + "' controls preload='metadata'></audio>\
                <button class='podcast_audio_button podcast_audio_button--play material-icons'>play_arrow</button>\
                </div>\
                </li>");
            });

            break;
    }
};

$(window).load(function() {
    /* deal with feeds */
    cbus.feeds = (localStorage.getItem("cbus_feeds") ? JSON.parse(localStorage.getItem("cbus_feeds")) : []);

    cbus.display("feeds");
    Object.observe(cbus.feeds, function() {
        cbus.display("feeds");
    });

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

    xhr("update?feeds=" + encodeURIComponent(JSON.stringify(cbus.feeds)), function(r) {
        var json = JSON.parse(r);
        console.log(r);

        /* deal with items */
        cbus.feedContents = json || {};

        cbus.display("feedContents");
        Object.observe(cbus.feedContents, function() {
            cbus.display("feedContents");
        });
    });

    /* listen for audio control clicks */

    $("#items").on("click", function(e) {
        var classList = e.target.classList;
        if (classList.contains("podcast_audio_button--play")) {
            cbus.audio.setElement(e.target.parentElement.querySelector(".podcast_audio_player"));
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
                    cbus.audio.setElement($(".podcast_audio_player")[0]);
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

    /* filters */

    $(".filter--time").on("change", function() {
        var timeCategory = this.value;
        $(".podcast").each(function(i, elem) {
            var matchableTimes = elem.dataset.time.split(",");
            if (matchableTimes.indexOf(timeCategory) !== -1) {
                elem.classList.remove("hidden");
            } else {
                elem.classList.add("hidden");
            }
        });
    });
});
