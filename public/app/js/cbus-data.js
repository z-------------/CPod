cbus.data = {};

cbus.data.feeds = [];

cbus.data.knownFeeds = [];

cbus.data.state = {
    podcastDetailCurrentData: {}
};

cbus.data.update = function() {
    $(".list--episodes").html("");
    xhr("feeds?feeds=" + encodeURIComponent(JSON.stringify(cbus.data.feeds)), function(r) {
        var feedContents = JSON.parse(r);
        var episodes = [];

        console.log(feedContents);

        Object.keys(feedContents).forEach(function(feedUrl) {
            feedContents[feedUrl].items.forEach(function(episode) {
                var feed = cbus.data.feeds.filter(function(feed) {
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

        cbus.data.episodes = episodes.sort(function(a, b) {
            if (a.date > b.date) return -1;
            if (a.date < b.date) return 1;
            return 0;
        });

        for (episode of cbus.data.episodes) {
            if (!document.querySelector(".audios audio[data-id='" + episode.id + "']")) {
                var audioElem = document.createElement("audio");
                audioElem.src = episode.url;
                audioElem.dataset.id = episode.id;
                audioElem.preload = "none";
                $(".audios").append(audioElem);
            }
        }

        cbus.ui.display("episodes");

        // save to localStorage

        localStorage.setItem("cbus_cache_episodes", JSON.stringify(cbus.data.episodes));
        localStorage.setItem("cbus_cache_episodes_time", new Date().getTime().toString());
    });
};

cbus.data.getEpisodeElem = function(options) {
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

cbus.data.getEpisodeData = function(options) {
    if (options.id || (typeof options.index !== "undefined" && options.index !== null) || options.audioElement) {
        var result = null;

        if (options.id) {
            var filteredList = cbus.data.episodes.filter(function(episode) {
                return episode.id === options.id;
            });

            if (filteredList.length !== 0) {
                result = filteredList[0];
            }
        } else if (options.audioElement) {
            result = cbus.data.getEpisodeData({
                id: options.audioElement.dataset.id
            });
        } else { // options.index
            result = cbus.data.episodes[Number(options.index)];
        }

        return result;
    }
    return false;
};

cbus.data.getFeedData = function(options) {
    if ((typeof options.index !== "undefined" && options.index !== null)) {
        var data = null;

        data = cbus.data.feeds[options.index];

        return data;
    }
    return false;
};

cbus.data.subscribeFeed = function(data, showModal) {
    var duplicateFeeds = cbus.data.feeds.filter(function(feed) {
        return feed.url === data.url;
    });

    if (duplicateFeeds.length === 0) {
        cbus.data.feeds.push({
            id: data.id,
            image: data.image,
            title: data.title,
            url: data.url
        });
        cbus.data.feeds.sort(cbus.const.podcastSort);
        localStorage.setItem("cbus_feeds", JSON.stringify(cbus.data.feeds));

        var index;
        for (var i = 0; i < cbus.data.feeds.length; i++) {
            var feed = cbus.data.feeds[i];
            if (feed.url === data.url) {
                index = i;
                break;
            }
        }

        if (typeof index !== "undefined") {
            var feedElem = cbus.data.makeFeedElem(data, index);
            if (index === 0) {
                $(feedElem).insertBefore($(".filters_feeds--subscribed .filters_feed").eq(0));
            } else {
                $(feedElem).insertAfter($(".filters_feeds--subscribed .filters_feed").eq(index - 1))
            }
            $(".filters_feeds--subscribed .filters_feed").each(function(index, elem) {
                $(elem).attr("data-index", index);
            });

            if (showModal) {
                cbus.ui.showSnackbar("Subscribed to " + data.title + ".");
            }
        }
    } else if (showModal) {
        cbus.ui.showSnackbar("You are already subscribed to " + data.title + ".");
    }
};

cbus.data.unsubscribeFeed = function(options, showModal) {
    var feedExists;
    var feedIndex;

    var key = Object.keys(options).filter(function(key) {
        return key === "url" || key === "id";
    })[0];

    if (key) {
        for (var i = 0; i < cbus.data.feeds.length; i++) {
            var feed = cbus.data.feeds[i];
            if (feed[key] === options[key]) {
                feedExists = true;
                feedIndex = i;
                break;
            }
        }

        if (feedExists) {
            cbus.data.feeds.splice(feedIndex, 1);
            localStorage.setItem("cbus_feeds", JSON.stringify(cbus.data.feeds));

            $(".filters_feeds--subscribed .filters_feed").eq(feedIndex).remove();
            $(".filters_feeds--subscribed .filters_feed").each(function(index, elem) {
                $(elem).attr("data-index", index);
            });

            if (showModal) {
                var query = {};
                query[key] = options[key];

                var data = arrayFindByKey(cbus.data.knownFeeds, query)[0];
                cbus.ui.showSnackbar("Unsubscribed from " + data.title + ".", null, [
                    {
                        text: "Undo",
                        onClick: function() {
                            cbus.broadcast.send("toggleSubscribe", {
                                direction: 1,
                                id: data.id
                            });
                        }
                    }
                ]);
            }
        }
        return false;
    }
    return false;
};

cbus.data.feedIsSubscribed = function(options) {
    if (options.id) {
        var podcastsMatchingId = cbus.data.feeds.filter(function(feed) {
            return feed.id == options.id;
        });
        if (podcastsMatchingId.length > 0) {
            return true;
        } else {
            return false;
        }
    }
    return false;
};

cbus.data.makeFeedElem = function(data, index, isSearchResult) {
    var elem = document.createElement("div");

    elem.classList.add("filters_feed", "tooltip--podcast");
    elem.style.backgroundImage = "url(" + data.image + ")";
    elem.dataset.index = index;

    var tooltipContent, tooltipFunctionReady;

    if (isSearchResult) {
        elem.dataset.title = data.title;
        elem.dataset.url = data.url;
        elem.dataset.image = data.image;
        elem.dataset.id = data.id;

        tooltipContent = $("<span>" + data.title + "</span><span class='filters_control filters_control--subscribe material-icons md-18'>add</span>");

        tooltipFunctionReady = function(origin, tooltip) {
            var subscribeButton = tooltip[0].querySelector(".filters_control--subscribe");
            subscribeButton.onclick = function() {
                var resultElem = origin[0];
                var feedData = {
                    title: resultElem.dataset.title,
                    url: resultElem.dataset.url,
                    image: resultElem.dataset.image,
                    id: Number(resultElem.dataset.id)
                };

                cbus.data.subscribeFeed(feedData, true);
            };
        };
    } else {
        tooltipContent = $("<span>" + data.title + "</span><span class='filters_control filters_control--unsubscribe material-icons md-18'>delete</span>");

        tooltipFunctionReady = function(origin, tooltip) {
            var deleteButton = tooltip[0].querySelector(".filters_control--unsubscribe");
            deleteButton.onclick = function() {
                var feedData = cbus.data.getFeedData({
                    index: Number(origin[0].dataset.index)
                });

                cbus.data.unsubscribeFeed({ url: feedData.url }, true);
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

    $(elem).on("click", function() {
        var id;
        if (this.dataset.id) {
            id = Number(this.dataset.id);
        } else {
            var data = cbus.data.getFeedData({
                index: $(".filters_feeds--subscribed .filters_feed").index($(this))
            });
            id = data.id;
        }
        cbus.broadcast.send("showPodcastDetail", {
            id: id
        });
    });

    return elem;
};

/* moving parts */

cbus.broadcast.listen("showPodcastDetail", function(e) {
    cbus.data.state.podcastDetailCurrentData = {
        id: null
    };

    xhr("info?id=" + encodeURIComponent(e.data.id), function(res, err) {
        var data = JSON.parse(res);
        cbus.broadcast.send("gotPodcastData", data);
    });

    var feedData = arrayFindByKey(cbus.data.knownFeeds, { id: e.data.id })[0];

    cbus.data.state.podcastDetailCurrentData = {
        id: Number(e.data.id)
    };

    xhr("feeds?feeds=" + encodeURIComponent(JSON.stringify([feedData])), function(res, err) {
        var json = JSON.parse(res);

        var episodes = json[Object.keys(json)[0]].items;

        cbus.broadcast.send("gotPodcastEpisodes", {
            episodes: episodes
        });
    });
});
