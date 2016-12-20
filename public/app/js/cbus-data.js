cbus.data = {};

cbus.data.feeds = [];

cbus.data.feedsCache = [];
cbus.data.episodesCache = [];

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
            cbus.data.episodesCache.push(episode);

            if (!document.querySelector(".audios audio[data-id='" + episode.id + "']")) {
                var audioElem = document.createElement("audio");
                audioElem.src = "/app/proxy?url=" + encodeURIComponent(episode.url);
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
            var filteredList = cbus.data.episodesCache.filter(function(episode) {
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
    console.log(data);

    var duplicateFeeds = cbus.data.feeds.filter(function(feed) {
        var pF = parseURL(feed.url);
        var dF = parseURL(data.url);
        return pF.hostname + pF.pathname + pF.search === dF.hostname + dF.pathname + dF.search;
    });

    console.log(duplicateFeeds);

    if (duplicateFeeds.length === 0) {
        cbus.data.feeds.push({
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
                cbus.ui.showSnackbar("Subscribed to '" + data.title + "'.");
            }
        }
    } else if (showModal) {
        cbus.ui.showSnackbar("You are already subscribed to '" + data.title + "'.");
    }
};

cbus.data.unsubscribeFeed = function(options, showModal) {
    var feedExists;
    var feedIndex;

    var key = Object.keys(options).filter(function(key) {
        return key === "url";
    })[0];

    if (key) {
        for (var i = cbus.data.feeds.length - 1; i >= 0; i--) {
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

                var data = arrayFindByKey(cbus.data.feedsCache, query)[0];
                cbus.ui.showSnackbar("Unsubscribed from '" + data.title + "'.", null, [
                    {
                        text: "Undo",
                        onClick: function() {
                            cbus.broadcast.send("toggleSubscribe", {
                                direction: 1,
                                url: data.url
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

cbus.data.syncToLocalStorage = function() {
    localStorage.setItem("cbus_feeds", JSON.stringify(cbus.data.feeds));
    localStorage.setItem("cbus_cache_episodes", JSON.stringify(cbus.data.episodes));
};

cbus.data.feedIsSubscribed = function(options) {
    if (options.url) {
        var podcastsMatchingUrl = cbus.data.feeds.filter(function(feed) {
            return feed.url == options.url;
        });
        if (podcastsMatchingUrl.length > 0) {
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
        elem.dataset.url = data.url;

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
        var url;
        if (this.dataset.url) {
            url = this.dataset.url;
        } else {
            var data = cbus.data.getFeedData({
                index: $(".filters_feeds--subscribed .filters_feed").index($(this))
            });
            url = data.url;
        }
        cbus.broadcast.send("showPodcastDetail", {
            url: url
        });
    });

    return elem;
};

/* moving parts */

cbus.broadcast.listen("showPodcastDetail", function(e) {
    cbus.data.state.podcastDetailCurrentData = {
        url: null
    };

    xhr("info?url=" + encodeURIComponent(e.data.url), function(res, url, err) {
        var data = JSON.parse(res);
        cbus.broadcast.send("gotPodcastData", data);
    });

    var feedData = arrayFindByKey(cbus.data.feedsCache, { url: e.data.url })[0];

    cbus.data.state.podcastDetailCurrentData = {
        url: e.data.url
    };

    xhr("feeds?feeds=" + encodeURIComponent(JSON.stringify([feedData])), function(res, url, err) {
        var json = JSON.parse(res);

        var feed = cbus.data.feedsCache.filter(function(feed) {
            return feed.url === Object.keys(json)[0];
        })[0];
        var episodes = json[Object.keys(json)[0]].items;

        for (episode of episodes) {
            episode.feed = feed;
            cbus.data.episodesCache.push(episode);

            // create and append audio elements
            var audioElem = document.createElement("audio");
            audioElem.src = "/app/proxy?url=" + encodeURIComponent(episode.url);
            audioElem.dataset.id = episode.id;
            audioElem.preload = "none";
            $(".audios").append(audioElem);
        }

        cbus.broadcast.send("gotPodcastEpisodes", {
            episodes: episodes
        });
    });
});

cbus.broadcast.listen("makeFeedsBackup", function(e) {
    window.open("cumulonimbus_opml.xml?data=" + encodeURIComponent(localStorage.getItem("cbus_feeds")));
});

// cbus.broadcast.send("makeFeedsBackup");

// cbus.broadcast.listen("removeDuplicateFeeds", function(e) {
//     var duplicateFeeds = [];
//
//     for (feed of cbus.data.feeds) {
//         for (var i = 0; i < cbus.data.feeds.length; i++) {
//             var comparingFeed = cbus.data.feeds[i];
//
//             var pF = parseURL(feed.url);
//             var dF = parseURL(comparingFeed.url);
//
//             if (
//                 pF.hostname + pF.pathname + pF.search === dF.hostname + dF.pathname + dF.search &&
//                 feed !== comparingFeed
//             ) {
//                 console.log("found duplicate", feed, comparingFeed);
//                 cbus.data.feeds.splice(i, 1);
//                 cbus.ui.showSnackbar("Removed duplicate of '" + feed.title + "'");
//             }
//         }
//     }
//
//     cbus.ui.showSnackbar("Done checking for duplicate feeds.");
// });

cbus.broadcast.listen("updateFeedArtworks", function() {
    for (var i = 0; i < cbus.data.feeds.length; i++) {
        var feed = cbus.data.feeds[i];

        xhr("info?url=" + encodeURIComponent(feed.url), function(res, url, err) {
            var body = JSON.parse(res);

            if (body.image) {
                if (feed.image !== body.image) {
                    console.log(feed.title + ": " + feed.image + " --> " + body.image);
                    // feed.image = body.image;
                    // cbus.ui.showSnackbar("Updated artwork for '" + feed.title + "'.");
                }
            } else {
                console.log(feed.title + " FAIL");
                // cbus.ui.showSnackbar("Error updating artwork for '" + feed.title + "'.", "warning");
            }

            if (i === cbus.data.feeds.length - 1) {
                console.log("done updating feed artworks");
                // cbus.data.syncToLocalStorage();
                // cbus.ui.showSnackbar("Done updating podcast artwork.");
            }
        });
    }
});
