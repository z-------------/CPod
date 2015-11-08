var xhr = function(url, callback) {
    var oReq = new XMLHttpRequest();
    oReq.onload = function(e){
        callback(this.responseText, e);
    };
    oReq.open("get", url, true);
    oReq.send();
};

var colonSeparateDuration = function(num) { // in seconds
    if (typeof num == "number" && !(Number.isNaN || isNaN)(num)) {
        var minutes = Math.floor(num / 60);
        var seconds = Math.floor(num % 60);
        return "" + minutes + ":" + zpad(seconds, 2);
    } else {
        return "--:--";
    }
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

        var episodeElem = elem.parentElement.parentElement.parentElement.parentElement;

        var episodeTitle = episodeElem.querySelector(".episode_title").textContent;
        var episodeFeedTitle = episodeElem.querySelector(".episode_feed-title").textContent;
        var episodeImageCSS = episodeElem.querySelector(".episode_background").style.backgroundImage;
        var episodeImage = episodeImageCSS.substring(4, episodeImageCSS.length - 1);

        $(".player_time--total").text(colonSeparateDuration(cbus.audio.element.duration));

        document.querySelector("cbus-queue-item").title = episodeTitle;
        document.querySelector("cbus-queue-item").feedTitle = episodeFeedTitle;
        document.querySelector("cbus-queue-item").image = episodeImage;

        /* extract accent color of feed image and apply to player */

        var colorThiefImage = document.createElement("img");
        colorThiefImage.src = "/app/proxy?url=" + encodeURIComponent(episodeImage);
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

            $("cbus-queue-item").eq(index).remove();

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

        var episodeData = cbus.getEpisodeData({
            audioElement: elem
        });

        var queueItemElem = document.createElement("cbus-queue-item");

        queueItemElem.title = episodeData.title;
        queueItemElem.feedTitle = episodeData.feed.title;
        queueItemElem.image = episodeData.feed.image;

        $(".player_queue").append(queueItemElem);
    }
};

cbus.audio.sliderUpdateInterval = setInterval(cbus.audio.updatePlayerTime, 500);

cbus.display = function(thing) {
    switch (thing) {
        case "feeds":
            $(".filters_feeds--subscribed").html("");
            cbus.feeds.forEach(function(feed, index) {
                $(".filters_feeds--subscribed").append(cbus.makeFeedElem(feed, index));
            });
            break;
        case "episodes":
            $(".list--episodes").html("");

            for (var i = 0; i < Math.min(112, cbus.episodes.length); i++) {
                var episode = cbus.episodes[i];

                var episodeElem = document.createElement("cbus-episode");

                episodeElem.title = episode.title;
                episodeElem.image = episode.feed.image;
                episodeElem.feedTitle = episode.feed.title;
                episodeElem.url = episode.url;
                episodeElem.description = episode.description;
                episodeElem.dataset.id = episode.id;

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
                    id: episode.id,
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

cbus.getEpisodeElem = function(options) {
    if (options.id || (typeof options.index !== "undefined" && options.index !== null)) {
        var elem = null;

        if (options.id) {
            elem = document.querySelector("cbus-episode[data-id='" + options.id + "']");
        } else { // options.index
            elem = document.querySelectorAll("cbus-episode")[Number(options.index)];
        }

        return elem;
    }
    return false;
};

cbus.getEpisodeData = function(options) {
    if (options.id || (typeof options.index !== "undefined" && options.index !== null) || options.audioElement) {
        var result = null;

        if (options.id) {
            var filteredList = cbus.episodes.filter(function(episode) {
                return episode.id === options.id;
            });

            if (filteredList.length !== 0) {
                result = filteredList[0];
            }
        } else if (options.audioElement) {
            result = cbus.getEpisodeData({
                id: options.audioElement.parentElement.parentElement.parentElement.parentElement.dataset.id
            });
        } else { // options.index
            result = cbus.episodes[Number(options.index)];
        }

        return result;
    }
    return false;
};

cbus.getFeedData = function(options) {
    if ((typeof options.index !== "undefined" && options.index !== null)) {
        var data = null;

        data = cbus.feeds[options.index];

        return data;
    }
    return false;
};

cbus.subscribeFeed = function(data, showModal) {
    var duplicateFeeds = cbus.feeds.filter(function(feed) {
        return feed.url === data.url;
    });

    if (duplicateFeeds.length === 0) {
        cbus.feeds.push(data);
        localStorage.setItem("cbus_feeds", JSON.stringify(cbus.feeds));
    } else if (showModal) {
        Ply.dialog("alert", "You are already subscribed to " + data.title);
    }
};

cbus.unsubscribeFeed = function(url) {
    var feedExists;
    var feedIndex;
    for (var i = 0; i < cbus.feeds.length; i++) {
        var feed = cbus.feeds[i];
        if (feed.url === url) {
            feedExists = true;
            feedIndex = i;
            break;
        }
    }

    if (feedExists) {
        cbus.feeds.splice(feedIndex, 1);
        localStorage.setItem("cbus_feeds", JSON.stringify(cbus.feeds));
    }
    return false;
};

cbus.makeFeedElem = function(data, index, isSearchResult) {
    var elem = document.createElement("div");

    elem.classList.add("filters_feed", "tooltip--podcast");
    elem.style.backgroundImage = "url(" + data.image + ")";
    elem.dataset.index = index;

    var tooltipContent, tooltipFunctionReady;

    if (isSearchResult) {
        elem.dataset.title = data.title;
        elem.dataset.url = data.url;
        elem.dataset.image = data.image;

        tooltipContent = $("<span>" + data.title + "</span><span class='filters_control filters_control--subscribe material-icons md-18'>add</span>");

        tooltipFunctionReady = function(origin, tooltip) {
            var subscribeButton = tooltip[0].querySelector(".filters_control--subscribe");
            subscribeButton.onclick = function() {
                var resultElem = origin[0];
                var feedData = {
                    title: resultElem.dataset.title,
                    url: resultElem.dataset.url,
                    image: resultElem.dataset.image
                };

                cbus.subscribeFeed(feedData, true);
            };
        };
    } else {
        tooltipContent = $("<span>" + data.title + "</span><span class='filters_control filters_control--unsubscribe material-icons md-18'>delete</span>");

        tooltipFunctionReady = function(origin, tooltip) {
            var deleteButton = tooltip[0].querySelector(".filters_control--unsubscribe");
            deleteButton.onclick = function() {
                var feedData = cbus.getFeedData({
                    index: Number(origin[0].dataset.index)
                });
                Ply.dialog(
                    "confirm",
                    "Are you sure you want to unsubscribe from " + feedData.title + "?"
                ).done(function() {
                    cbus.unsubscribeFeed(feedData.url);
                }).fail(function() {
                    document.body.style.overflow = "auto";
                });
            };
        };
    }

    $(elem).tooltipster({
        theme: "tooltipster-cbus",
        animation: "fadeup",
        speed: 300,
        interactive: true,
        content: tooltipContent,
        functionReady: tooltipFunctionReady
    });

    return elem;
}

cbus.feeds = (localStorage.getItem("cbus_feeds") ?
    JSON.parse(localStorage.getItem("cbus_feeds")).sort(function(a, b) {
        var aTitle = a.title.toLowerCase();
        var bTitle = b.title.toLowerCase();

        if (aTitle < bTitle) return -1;
        if (aTitle > bTitle) return 1;
        return 0;
    })
    : []);

cbus.display("feeds");

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
$(".filters_control--search").on("change input", function() {
    var query = $(this).val();
    clearTimeout(searchTypingTimeout);

    if (query && query.length > 0) {
        searchTypingTimeout = setTimeout(function() {
            $(".filters_feeds--search-results").html(null);

            xhr("/app/feedinfo?term=" + encodeURIComponent(query), function(res) {
                if (res) {
                    var data = JSON.parse(res);

                    for (var i = 0; i < data.length; i++) {
                        $(".filters_feeds--search-results").append(cbus.makeFeedElem(data[i], i, true));
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
    var episodeData = cbus.getEpisodeData({
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
        if (classList.contains("header_action--show-filters")) {
            document.body.classList.toggle("filters-visible");
            e.target.classList.toggle("md-inactive");
        }
        if (classList.contains("header_action--refresh-episodes")) {
            cbus.update();
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

/* do the thing */

cbus.update();

/* initialize generic tooltipster */

$(".tooltip").tooltipster({
    theme: "tooltipster-cbus",
    animation: "fadeup",
    speed: 300
});
