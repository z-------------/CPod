cbus.data = {};

cbus.data.feeds = [];
cbus.data.episodes = [];

cbus.data.feedsCache = [];
cbus.data.episodesCache = [];

cbus.data.state = {
  podcastDetailCurrentData: {}
};

cbus.data.update = function() {
  var requestFeedsData = cbus.data.feeds.map(function(feed) {
    return { title: feed.title, url: feed.url }; // getFeeds.js only needs these two props
  });

  request("feeds?feeds=" + encodeURIComponent(JSON.stringify(requestFeedsData)), function(r) {
    var feedContents = JSON.parse(r);

    console.log(feedContents);

    for (let feedUrl of Object.keys(feedContents)) {
      let feed = cbus.data.getFeedData({ url: feedUrl });

      for (let episode of feedContents[feedUrl].items) {
        /* check whether is duplicate */
        var episodesWithMatchingURL = [];
        for (let existingEpisode of cbus.data.episodes) {
          if (existingEpisode.url === episode.url) {
            episodesWithMatchingURL.push(existingEpisode);
          }
        }
        if (episodesWithMatchingURL.length === 0) { // not a duplicate
          cbus.data.episodes.unshift({
            id: episode.id,
              url: episode.url,
              title: episode.title[0],
              description: episode.description,
              date: (new Date(episode.date).getTime() ? new Date(episode.date) : null), // check if date is valid
              feedURL: feedUrl,
              art: episode.episodeArt,
              length: episode.length
          }); // add to front of cbus.data.episodes
        }
      }
    }

    cbus.data.episodes.sort(function(a, b) {
      if (a.date > b.date) return -1;
      if (a.date < b.date) return 1;
      return 0;
    });

    cbus.data.updateAudios();

    cbus.ui.display("episodes");

    localforage.setItem("cbus_cache_episodes", cbus.data.episodes);
    localforage.setItem("cbus_cache_episodes_time", new Date().getTime());
  });
};

cbus.data.updateAudios = function() {
  for (let episode of cbus.data.episodes) {
    if (!document.querySelector(".audios audio[data-id='" + episode.id + "']")) {
      var audioElem = document.createElement("audio");
      audioElem.src = cbus.data.proxify(episode.url);
      audioElem.dataset.id = episode.id;
      audioElem.preload = "none";
      $(".audios").append(audioElem);
    }
  }
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
      var filteredListA = cbus.data.episodes.filter(function(episode) {
        return episode.id === options.id;
      });

      if (filteredListA.length !== 0) {
        result = filteredListA[0];
      } else { // if nothing found, try episodesCache (contains only episodes from podcast-detail)
        var filteredListB = cbus.data.episodesCache.filter(function(episode) {
          return episode.id === options.id;
        });

        if (filteredListB.length !== 0) {
          result = filteredListB[0];
        } // else: nothing found, return null
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

  if ((typeof options.url !== "undefined" && options.url !== null)) {
    var matches = cbus.data.feeds.filter(function(data) {
      if (data.url === options.url) {
        return true;
      }
      return false;
    });

    if (matches.length > 0) {
      return matches[0];
    }
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
    /* get cover art as Blob */
    var img = document.createElement("img");
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");

    img.addEventListener("load", function() {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(function(imageBlob) {
        cbus.data.feeds.push({
          image: imageBlob,
          title: data.title,
          url: data.url
        });
        cbus.data.feeds.sort(cbus.const.podcastSort);
        // localStorage.setItem("cbus_feeds", JSON.stringify(cbus.data.feeds));
        localforage.setItem("cbus_feeds", cbus.data.feeds);

        var index;
        for (var i = 0; i < cbus.data.feeds.length; i++) {
          var feed = cbus.data.feeds[i];
          if (feed.url === data.url) {
            index = i;
            break;
          }
        }

        if (typeof index !== "undefined") {
          var feedElem = cbus.data.makeFeedElem(cbus.data.feeds[index], index);
          if (index === 0) {
            $(feedElem).insertBefore($(".podcasts_feeds--subscribed .podcasts_feed").eq(0));
          } else {
            $(feedElem).insertAfter($(".podcasts_feeds--subscribed .podcasts_feed").eq(index - 1))
          }
          $(".podcasts_feeds--subscribed .podcasts_feed").each(function(index, elem) {
            $(elem).attr("data-index", index);
          });

          if (showModal) {
            cbus.ui.showSnackbar(`Subscribed to ‘${data.title}’.`);
          }
        }
      });
    });

    img.src = cbus.data.imageProxify(data.image);
  } else if (showModal) {
    cbus.ui.showSnackbar(`You are already subscribed to ‘${data.title}’.`);
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
      // localStorage.setItem("cbus_feeds", JSON.stringify(cbus.data.feeds));
      localforage.setItem("cbus_feeds", cbus.data.feeds);

      $(".podcasts_feeds--subscribed .podcasts_feed").eq(feedIndex).remove();
      $(".podcasts_feeds--subscribed .podcasts_feed").each(function(index, elem) {
        $(elem).attr("data-index", index);
      });

      if (showModal) {
        var query = {};
        query[key] = options[key];

        var data = arrayFindByKey(cbus.data.feedsCache, query)[0];
        cbus.ui.showSnackbar(`Unsubscribed from ‘${data.title}’.`, null, [
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

cbus.data.syncOffline = function() {
  // localStorage.setItem("cbus_feeds", JSON.stringify(cbus.data.feeds));
  // localStorage.setItem("cbus_cache_episodes", JSON.stringify(cbus.data.episodes));
  localforage.setItem("cbus_feeds", cbus.data.feeds);
  localforage.setItem("cbus_cache_episodes", cbus.data.episodes);
  console.log("syncOffline")
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

  elem.classList.add("podcasts_feed", "tooltip--podcast");
  elem.dataset.index = index;

  var tooltipContent, tooltipFunctionReady;

  if (isSearchResult) {
    elem.dataset.title = data.title;
    elem.dataset.url = data.url;
    elem.dataset.image = data.image;
    elem.dataset.url = data.url;
    elem.style.backgroundImage = `url( ${data.image} )`;

    tooltipContent = $("<span>" + data.title + "</span><span class='podcasts_control podcasts_control--subscribe material-icons md-18'>add</span>");

    tooltipFunctionReady = function(origin, tooltip) {
      var subscribeButton = tooltip[0].querySelector(".podcasts_control--subscribe");
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
    elem.style.backgroundImage = `url( ${ URL.createObjectURL(data.image) } )`;

    tooltipContent = $("<span>" + data.title + "</span><span class='podcasts_control podcasts_control--unsubscribe material-icons md-18'>delete</span>");

    tooltipFunctionReady = function(origin, tooltip) {
      var deleteButton = tooltip[0].querySelector(".podcasts_control--unsubscribe");
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
        index: $(".podcasts_feeds--subscribed .podcasts_feed").index($(this))
      });
      url = data.url;
    }
    cbus.broadcast.send("showPodcastDetail", {
      url: url
    });
  });

  return elem;
};

cbus.data.proxify = function(url) {
  return "/app/proxy?url=" + encodeURIComponent(url);
};

cbus.data.imageProxify = function(url) {
  return "/app/image_proxy?url=" + encodeURIComponent(url);
};

/* moving parts */

cbus.broadcast.listen("showPodcastDetail", function(e) {
  cbus.data.state.podcastDetailCurrentData = {
    url: null
  };

  request("info?url=" + encodeURIComponent(e.data.url), function(res, url, err) {
    var data = JSON.parse(res);
    data.url = e.data.url;
    cbus.broadcast.send("gotPodcastData", data);
  });

  var feedData = arrayFindByKey(cbus.data.feedsCache, { url: e.data.url })[0];

  cbus.data.state.podcastDetailCurrentData = {
    url: e.data.url
  };

  request("feeds?feeds=" + encodeURIComponent(JSON.stringify([feedData])), function(res, url, e) {
    var json = JSON.parse(res);

    var feed = cbus.data.feedsCache.filter(function(feed) {
      return feed.url === Object.keys(json)[0];
    })[0];
    var episodes = json[Object.keys(json)[0]].items;

    for (episode of episodes) {
      episode.feedURL = Object.keys(json)[0];
      cbus.data.episodesCache.push(episode);

      // create and append audio elements
      var audioElem = document.createElement("audio");
      audioElem.src = cbus.data.proxify(episode.url);
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
  localforage.getItem("cbus_feeds").then(function(r) {
    window.open("cumulonimbus_opml.xml?data=" + encodeURIComponent( JSON.stringify(r) ));
  });
});

cbus.broadcast.listen("startFeedsImport", function(e) {
  Ply.dialog("prompt", {
    title: "Import subscriptions",
    form: { opml: "Paste OPML here" }
  }).done(function(ui) {
    var opmlRaw = ui.data.opml;
    var parser = new DOMParser();
    opml = parser.parseFromString(opmlRaw, "text/xml");
    var outlines = opml.querySelectorAll("body outline[type=rss][xmlUrl]");
    for (let outline of outlines) {
      let url = outline.getAttribute("xmlUrl");
      // we have title and url, need to find image. getPodcastInfo.js to the rescue!
      request(`info?url=${url}`, function(res) {
        if (res) {
          var feedData = JSON.parse(res);
          cbus.data.subscribeFeed({
            url: url,
            title: feedData.title,
            image: feedData.image
          }, true);
        }
      });
    }
    Ply.dialog("alert", "Subscriptions now importing. May take time to gather all necessary data.");
  });
});

// cbus.broadcast.send("makeFeedsBackup");

// cbus.broadcast.listen("removeDuplicateFeeds", function(e) {
//   var duplicateFeeds = [];
//
//   for (feed of cbus.data.feeds) {
//     for (var i = 0; i < cbus.data.feeds.length; i++) {
//       var comparingFeed = cbus.data.feeds[i];
//
//       var pF = parseURL(feed.url);
//       var dF = parseURL(comparingFeed.url);
//
//       if (
//         pF.hostname + pF.pathname + pF.search === dF.hostname + dF.pathname + dF.search &&
//         feed !== comparingFeed
//       ) {
//         console.log("found duplicate", feed, comparingFeed);
//         cbus.data.feeds.splice(i, 1);
//         cbus.ui.showSnackbar(`Removed duplicate of ‘${feed.title}’.`);
//       }
//     }
//   }
//
//   cbus.ui.showSnackbar("Done checking for duplicate feeds.");
// });

cbus.broadcast.listen("updateFeedArtworks", function() {
  for (var i = 0; i < cbus.data.feeds.length; i++) {
    var feed = cbus.data.feeds[i];

    request("info?url=" + encodeURIComponent(feed.url), function(res, url, err) {
      var body = JSON.parse(res);

      var feed = cbus.data.getFeedData({
        url: decodeURIComponent(url.substring(9))
      });

      if (body.image) {
        var img = document.createElement("img");
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");

        img.addEventListener("load", function() {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(function(imageBlob) {
            feed.image = imageBlob;
            cbus.data.syncOffline();
            cbus.ui.showSnackbar(`Updated artwork for ‘${feed.title}’.`);
          });
        });

        img.src = cbus.data.imageProxify(body.image);
      } else {
        console.log(feed.title + " FAIL");
        cbus.ui.showSnackbar(`Error updating artwork for ‘${feed.title}’.`, "warning");
      }
    });
  }
});
