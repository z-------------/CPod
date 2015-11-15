cbus.data = {};

cbus.data.update = function() {
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
        cbus.ui.display("episodes");
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
            var filteredList = cbus.episodes.filter(function(episode) {
                return episode.id === options.id;
            });

            if (filteredList.length !== 0) {
                result = filteredList[0];
            }
        } else if (options.audioElement) {
            result = cbus.data.getEpisodeData({
                id: options.audioElement.parentElement.parentElement.parentElement.parentElement.dataset.id
            });
        } else { // options.index
            result = cbus.episodes[Number(options.index)];
        }

        return result;
    }
    return false;
};

cbus.data.getFeedData = function(options) {
    if ((typeof options.index !== "undefined" && options.index !== null)) {
        var data = null;

        data = cbus.feeds[options.index];

        return data;
    }
    return false;
};

cbus.data.subscribeFeed = function(data, showModal) {
    var duplicateFeeds = cbus.feeds.filter(function(feed) {
        return feed.url === data.url;
    });

    if (duplicateFeeds.length === 0) {
        cbus.feeds.push(data);
        cbus.feeds.sort(cbus.const.podcastSort);
        localStorage.setItem("cbus_feeds", JSON.stringify(cbus.feeds));

        var index;
        for (var i = 0; i < cbus.feeds.length; i++) {
            var feed = cbus.feeds[i];
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

cbus.data.unsubscribeFeed = function(url) {
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

        $(".filters_feeds--subscribed .filters_feed").eq(feedIndex).remove();
        $(".filters_feeds--subscribed .filters_feed").each(function(index, elem) {
            $(elem).attr("data-index", index);
        });
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

                cbus.data.unsubscribeFeed(feedData.url);
                cbus.ui.showSnackbar("Unsubscribed from " + feedData.title + ".", null, [
                    {
                        text: "Undo",
                        onClick: function() {
                            cbus.data.subscribeFeed(feedData);
                        }
                    }
                ]);
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
};
