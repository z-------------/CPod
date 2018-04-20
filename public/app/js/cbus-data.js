cbus.data = {};
cbus.data.feeds = [];
cbus.data.episodes = [];
cbus.data.feedsCache = [];
cbus.data.episodesCache = [];
cbus.data.episodesDownloading = [];
cbus.data.episodeProgresses = {};
cbus.data.state = {
  podcastDetailCurrentData: {},
  loadingNextHomePage: false
};

cbus.data.update = function(specificFeedData, untilLastDisplayedEpisode) {
  var requestFeedsData;

  if (specificFeedData) {
    requestFeedsData = [specificFeedData];
  } else {
    requestFeedsData = cbus.data.feeds.map(function(feed) {
      return { title: feed.title, url: feed.url }; // server.update only needs these two props
    });
  }

  cbus.server.update(requestFeedsData, function(feedContents) {
    console.log(feedContents);

    let feedContentsKeys = Object.keys(feedContents);

    for (let i = 0, l = feedContentsKeys.length; i < l; i++) {
      let feedUrl = feedContentsKeys[i];

      let feed = cbus.data.getFeedData({ url: feedUrl });

      for (let j = 0, m = feedContents[feedUrl].items.length; j < m; j++) {
        let episode = feedContents[feedUrl].items[j];

        /* check whether is duplicate */
        var isDuplicate = false;
        for (let k = 0, n = cbus.data.episodes.length; k < n; k++) {
          if (cbus.data.episodes[k].url === episode.url) {
            isDuplicate = true
            break;
          }
        }
        if (!isDuplicate) { // not a duplicate
          let episodeDate = new Date(episode.date);

          cbus.data.episodes.unshift({
            id: episode.id,
            url: episode.url,
            title: episode.title,
            description: episode.description,
            date: (episodeDate.getTime() ? episodeDate : null), // check if date is valid
            feedURL: feedUrl,
            art: episode.art,
            length: episode.length,
            chapters: episode.chapters,
            isVideo: episode.isVideo
          }); // add to front of cbus.data.episodes
        }
      }
    }

    cbus.data.episodes.sort(function(a, b) {
      if (a.date > b.date) return -1;
      if (a.date < b.date) return 1;
      return 0;
    });

    cbus.data.updateMedias({
      untilLastDisplayedEpisode: untilLastDisplayedEpisode
    });

    cbus.ui.display("episodes", {
      untilLastDisplayedEpisode: untilLastDisplayedEpisode
    });

    localforage.setItem("cbus_cache_episodes", cbus.data.episodes);
    localforage.setItem("cbus_cache_episodes_time", new Date().getTime());
  });
};

cbus.data.makeMediaElem = function(episodeInfo) {
  var elem;
  if (episodeInfo.isVideo) {
    elem = document.createElement("video");
  } else {
    elem = document.createElement("audio");
  }

  if (cbus.data.episodesOffline.indexOf(episodeInfo.id) === -1) {
    elem.src = episodeInfo.url;
  } else {
    let storageFilePath = path.join(
      cbus.const.OFFLINE_STORAGE_DIR, sha1(episodeInfo.url)
    );
    elem.src = URL.createObjectURL(new Blob([ fs.readFileSync(storageFilePath) ]))
  }
  elem.dataset.id = episodeInfo.id;
  elem.preload = "none";

  return elem;
};

cbus.data.updateMedias = function(options) {
  let startIndex = (options && options.afterIndex) ? options.afterIndex : 0;
  var endIndex = Math.min(startIndex + cbus.const.STREAM_PAGE_LENGTH, cbus.data.episodes.length);
  if (options && options.untilLastDisplayedEpisode) {
    endIndex = cbus.data.episodes.indexOf(
      cbus.data.getEpisodeData({
        id: cbus.ui.homeListElem.children[cbus.ui.homeListElem.children.length - 1].dataset.id
      })
    );
  }

  let mediasContainerElem = document.getElementsByClassName("audios")[0];

  for (let i = startIndex, l = endIndex; i < l; i++) {
    mediasContainerElem.appendChild(cbus.data.makeMediaElem(cbus.data.episodes[i]));
  }

  let episodeIDs = cbus.data.episodes.filter(function(episodeInfo) {
    return episodeInfo.id;
  });
  for (let i = 0, l = cbus.data.episodesUnsubbed.length; i < l; i++) {
    if (episodeIDs.indexOf(cbus.data.episodesUnsubbed[i].id) === -1) {
      mediasContainerElem.appendChild(cbus.data.makeMediaElem(cbus.data.episodesUnsubbed[i]));
    }
  }
};

cbus.data.getEpisodeElem = function(options) {
  if (options.id) {
    return document.querySelector(".episode[data-id='" + options.id + "']");
  } else if (options.index || options.index !== 0) {
    return document.getElementsByClassName("episode")[Number(options.index)];
  }
  return false;
};

cbus.data.getEpisodeData = function(options) {
  if (options.id || (typeof options.index !== "undefined" && options.index !== null) || options.audioElement) {
    var result = null;

    if (options.id) {
      var filteredA;
      for (let i = 0, l = cbus.data.episodes.length; i < l; i++) {
        if (cbus.data.episodes[i].id === options.id) {
          filteredA = cbus.data.episodes[i];
          break;
        }
      }

      if (filteredA) {
        result = filteredA;
      } else { // if nothing found, try episodesCache (contains only episodes from podcast-detail)
        var filteredB;
        for (let i = 0, l = cbus.data.episodesCache.length; i < l; i++) {
          if (cbus.data.episodesCache[i].id === options.id) {
            filteredB = cbus.data.episodesCache[i];
            break;
          }
        }

        if (filteredB) {
          result = filteredB;
        } else { // if still nothing found, try episodesUnsubbed (contains only episodes from unsubscribed podcasts)
          var filteredC;
          for (let i = 0, l = cbus.data.episodesUnsubbed.length; i < l; i++) {
            if (cbus.data.episodesUnsubbed[i].id === options.id) {
              filteredC = cbus.data.episodesUnsubbed[i];
              break;
            }
          }

          if (filteredC) {
            result = filteredC;
          } // else: return null
        }
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
  if (typeof options.index !== "undefined" && options.index !== null) {
    return cbus.data.feeds[options.index];
  }

  if (typeof options.url !== "undefined" && options.url !== null) {
    var matchedFeed;
    for (let i = 0, l = cbus.data.feeds.length; i < l; i++) {
      if (cbus.data.feeds[i].url === options.url) {
        matchedFeed = cbus.data.feeds[i];
        break;
      }
    }

    if (matchedFeed) {
      // console.log(matches)
      return matchedFeed;
    } else {
      // try again with feedsCache
      // console.log("trying cbus.data.feedsCache")
      var matchedFeedFromCache;
      for (let i = 0, l = cbus.data.feedsCache.length; i < l; i++) {
        if (cbus.data.feedsCache[i].url === options.url) {
          matchedFeedFromCache = cbus.data.feedsCache[i];
          break;
        }
      }

      if (matchedFeedFromCache) {
        // console.log(matchesFromCache)
        return matchedFeedFromCache;
      } else {
        // try again with cbus_feeds_qnp
        // console.log("trying cbus.data.feedsQNP")
        var matchedFeedFromUnsubbed;
        for (let i = 0, l = cbus.data.feedsQNP.length; i < l; i++) {
          if (cbus.data.feedsQNP[i].url === options.url) {
            matchedFeedFromUnsubbed = cbus.data.feedsQNP[i];
            break;
          }
        }

        // console.log(matchesFromUnsubbedFeeds, matchesFromUnsubbedFeeds.length)

        if (matchedFeedFromUnsubbed) {
          let matched = matchedFeedFromUnsubbed
          matched.isUnsubscribed = true
          return matched
        } else {
          return false;
        }
      }
    }
  } else {
    return false;
  }
};

cbus.data.subscribeFeed = function(data, showModal, isFromImport) {
  console.log(data);

  var isDuplicate = false;
  let dF = new URL(data.url);
  for (let i = 0, l = cbus.data.feeds.length; i < l; i++) {
    let pF = new URL(cbus.data.feeds[i].url);
    if (pF.hostname + pF.pathname + pF.search === dF.hostname + dF.pathname + dF.search) {
      isDuplicate = true;
      break;
    }
  }

  if (!isDuplicate) {
    xhr({
      url: data.image,
      responseType: "arraybuffer"
    }, (err, status, imageBuffer) => {
      Jimp.read(Buffer.from(imageBuffer), function(err, image) {
        if (err) throw err
        image.resize(cbus.const.PODCAST_ART_SIZE, cbus.const.PODCAST_ART_SIZE).write(
          path.join(cbus.const.PODCAST_IMAGES_DIR.replace(/\\/g,"/"), sha1(data.url) + ".png"),
          function(err) {
            if (err) throw err
            cbus.data.feeds.push({
              image: cbus.const.IMAGE_ON_DISK_PLACEHOLDER,
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
              var feedElem = cbus.ui.makeFeedElem(cbus.data.feeds[index], index);
              if (index === 0) {
                if (cbus.data.feeds.length === 1) { // this is our only subscribed podcast
                  document.getElementsByClassName("podcasts_feeds--subscribed")[0].appendChild(feedElem)
                } else {
                  $(feedElem).insertBefore($(".podcasts_feeds--subscribed .podcasts_feed").eq(0));
                }
              } else {
                $(feedElem).insertAfter($(".podcasts_feeds--subscribed .podcasts_feed").eq(index - 1))
              }
              cbus.broadcast.send("subscribe-success");

              cbus.data.update({
                title: data.title, url: data.url
              }, !(isFromImport || cbus.data.episodes.length === 0));

              $(".podcasts_feeds--subscribed .podcasts_feed").each(function(index, elem) {
                $(elem).attr("data-index", index);
              });

              if (showModal) {
                cbus.ui.showSnackbar(i18n.__("snackbar_subscribed", data.title));
              }
            }
          });
      });
    });
  } else if (showModal) {
    cbus.ui.showSnackbar(i18n.__("snackbar_already-subscribed", data.title));
  }
};

cbus.data.unsubscribeFeed = function(options, showModal) {
  var feedExists;
  var feedIndex;

  if (options.hasOwnProperty("url")) {
    let key = "url";

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
        var data = arrayFindByKeySingle(cbus.data.feedsCache, key, options[key]);
        cbus.ui.showSnackbar(i18n.__("snackbar_unsubscribed", data.title), null, [
          {
            text: i18n.__("snackbar_button_undo"),
            onClick: function() {
              cbus.broadcast.send("toggleSubscribe", {
                direction: 1,
                url: data.url
              });
            }
          }
        ]);
      }
    } else {
      return false;
    }
  }
  return false;
};

cbus.data.feedIsSubscribed = function(options) {
  if (options.url) {
    var podcastMatchingUrl;
    for (let i = 0, l = cbus.data.feeds.length; i < l; i++) {
      if (cbus.data.feeds[i].url == options.url) {
        podcastMatchingUrl = cbus.data.feeds[i];
        break;
      }
    }
    return !!podcastMatchingUrl;
  }
  return false;
};

cbus.data.downloadEpisode = function(audioElem) {
  let episodeData = cbus.data.getEpisodeData({ audioElement: audioElem });
  let feedData = cbus.data.getFeedData({ url: episodeData.feedURL });
  let audioURL = episodeData.url;

  let storageFilePath = path.join(
    cbus.const.OFFLINE_STORAGE_DIR, sha1(audioURL)
  );

  if (
    cbus.data.episodesOffline.indexOf(audioURL) === -1 &&
    cbus.data.episodesDownloading.indexOf(audioURL) === -1
  ) { // not downloaded and not already downloading, so download it now
    if (!fs.existsSync(cbus.const.OFFLINE_STORAGE_DIR)) {
      fs.mkdirSync(cbus.const.OFFLINE_STORAGE_DIR);
    }
    fs.closeSync(fs.openSync(storageFilePath, "a")); // create empty file

    let writeStream = fs.createWriteStream(storageFilePath);

    cbus.ui.showSnackbar(i18n.__("snackbar_download-start", feedData.title, episodeData.title));

    writeStream.on("finish", function() {
      cbus.data.episodesOffline.push(audioURL);

      let episodesDownloadingIndex = cbus.data.episodesDownloading.indexOf(audioURL);
      if (episodesDownloadingIndex !== -1) {
        cbus.data.episodesDownloading.splice(episodesDownloadingIndex, 1);
      }

      localforage.setItem("cbus_episodes_offline", cbus.data.episodesOffline);

      cbus.ui.showSnackbar(i18n.__("snackbar_download-done", feedData.title, episodeData.title));

      cbus.broadcast.send("offline_episodes_changed", {
        episodeURL: audioURL
      });
    });

    request(audioURL).pipe(writeStream);
    cbus.data.episodesDownloading.push(audioURL);
  } else if (cbus.data.episodesDownloading.indexOf(audioURL) === -1) { // downloaded, so remove download
    fs.unlink(storageFilePath, function(err) {
      if (err) {
        remote.dialog.showErrorBox(i18n.__("dialog_download-remove-error_title"), i18n.__("dialog_download-remove-error_body"));
      } else {
        let index = cbus.data.episodesOffline.indexOf(audioURL);
        cbus.data.episodesOffline.splice(index, 1);
        localforage.setItem("cbus_episodes_offline", cbus.data.episodesOffline);
        cbus.ui.showSnackbar(
          i18n.__("snackbar_download-removed", feedData.title, episodeData.title)
        )
        cbus.broadcast.send("offline_episodes_changed", {
          episodeURL: audioURL
        });
      }
    })
  }
};

cbus.data.getEpisodeProgress = function(id) {
  let result = {
    time: null, completed: false
  };
  if (cbus.data.episodeProgresses.hasOwnProperty(id)) {
    result.time = cbus.data.episodeProgresses[id];
  }
  if (cbus.data.episodeCompletedStatuses.hasOwnProperty(id)) {
    result.completed = cbus.data.episodeCompletedStatuses[id];
  }
  return result;
};

cbus.data.toggleCompleted = function(episodeID, direction) {
  if (typeof direction === "boolean") {
    cbus.data.episodeCompletedStatuses[episodeID] = direction;
  } else {
    cbus.data.episodeCompletedStatuses[episodeID] = !cbus.data.episodeCompletedStatuses[episodeID];
  }
  localforage.setItem("cbus_episode_completed_statuses", cbus.data.episodeCompletedStatuses);
  cbus.broadcast.send("episode_completed_status_change", {
    id: episodeID,
    completed: cbus.data.episodeCompletedStatuses[episodeID]
  });
};

cbus.data.batchMarkAsPlayed = function(episodeIDs) {
  let changedIDs = []; // array of ids whose completion status actually changed
  for (let i = 0, l = episodeIDs.length; i < l; i++) {
    let id = episodeIDs[i];
    if (!cbus.data.episodeCompletedStatuses[id]) {
      cbus.data.toggleCompleted(id, true);
      changedIDs.push(id);
    }
  }
  cbus.ui.showSnackbar(i18n.__("snackbar_batch-marked-as-played", episodeIDs.length.toString()), null, [{
    text: i18n.__("snackbar_button_undo"),
    onClick: function() {
      for (let i = 0, l = changedIDs.length; i < l; i++) {
        cbus.data.toggleCompleted(changedIDs[i], false);
      }
    }
  }]);
};

cbus.data.parseTimeString = function(timeString) {
  let timeStringSplit = timeString.split(":").reverse();
  var time = 0;
  for (let i = 0, l = Math.min(timeStringSplit.length - 1, 2); i <= l; i++) {
    time += Number(timeStringSplit[i]) * (60 ** i);
  }
  return time;
};

cbus.data.getPodcastImageURI = function(feed) {
  // feed only needs to contain image and url
  if (feed.image === cbus.const.IMAGE_ON_DISK_PLACEHOLDER) {
    return "file:///" + cbus.const.PODCAST_IMAGES_DIR.replace(/\\/g,"/").replace(/\\/g,"/") + "/" + sha1(feed.url) + ".png";
  } else if (typeof feed.image === "string") {
    return feed.image;
  } else if (feed.image instanceof Blob) {
    return URL.createObjectURL(feed.image);
  }
  return null;
};

/* moving parts */

cbus.broadcast.listen("showPodcastDetail", function(e) {
  cbus.data.state.podcastDetailCurrentData = {
    url: null
  };

  console.log(e.data.url)

  function startServerUpdate() {
    cbus.server.update([feedData], function(json) {
      let jsonUrl = Object.keys(json)[0];

      var feed;
      for (let i = 0, l = cbus.data.feedsCache.length; i < l; i++) {
        if (cbus.data.feedsCache.url === jsonUrl) {
          feed = cbus.data.feedsCache[i];
          break;
        }
      }

      let episodes = json[jsonUrl].items;
      let mediasElem = document.getElementsByClassName("audios")[0];

      for (let i = 0, l = episodes.length; i < l; i++) {
        let episode = episodes[i];

        episode.feedURL = jsonUrl;
        cbus.data.episodesCache.push(episode);

        // create and append audio elements
        var mediaElem;
        if (episode.isVideo) {
          mediaElem = document.createElement("video");
        } else {
          mediaElem = document.createElement("audio");
        }
        mediaElem.src = episode.url;
        mediaElem.dataset.id = episode.id;
        mediaElem.preload = "none";
        mediasElem.appendChild(mediaElem);
      }

      cbus.broadcast.send("gotPodcastEpisodes", {
        episodes: episodes
      });
    });
  }

  var feedData = cbus.data.getFeedData({ url: e.data.url });
  if (feedData) {
    startServerUpdate();
  } else {
    cbus.broadcast.listen("gotPodcastData", function(f) {
      if (f.data.url === e.data.url) {
        feedData = {
          title: f.data.title,
          url: f.data.url
        };
        startServerUpdate();
      }
    });
  }

  cbus.server.getPodcastInfo(e.data.url, function(data) {
    if (data) {
      data.url = e.data.url;
      console.log("getPodcastInfo", data);
      cbus.data.feedsCache.push(data);
      cbus.broadcast.send("gotPodcastData", data);
    } else {
      cbus.ui.showSnackbar(i18n.__("snackbar_error-podcast-detail"), "error");
    }
  });

  cbus.data.state.podcastDetailCurrentData = {
    url: e.data.url
  };
});

cbus.broadcast.listen("makeFeedsBackup", function(e) {
  localforage.getItem("cbus_feeds").then(function(r) {
    if (r) {
      cbus.server.generateOPML(r);
    } else {
      cbus.ui.showSnackbar(i18n.__("snackbar_opml-no-podcasts"));
    }
  });
});

cbus.broadcast.listen("startFeedsImport", function(e) {
  remote.dialog.showOpenDialog(cbus.ui.browserWindow, {
    title: "Import subscriptions",
    filters: [
      { name:"OPML and XML files", extensions: ["opml", "xml"] },
      { name: "All files", extensions: ["*"] }
    ],
    message: "Select the OPML file to import from"
  }, function(filePaths) {
    if (filePaths) {
      fs.readFile(filePaths[0], "utf8", function(err, opmlRaw) {
        let parser = new DOMParser();
        opml = parser.parseFromString(opmlRaw, "text/xml");
        let outlines = opml.querySelectorAll("body outline[type=rss][xmlUrl]");
        for (let i = 0, l = outlines.length; i < l; i++) {
          let url = outlines[i].getAttribute("xmlUrl");
          // we have title and url, need to find image. getPodcastInfo.js to the rescue!
          cbus.server.getPodcastInfo(url, function(feedData) {
            if (feedData) {
              cbus.data.subscribeFeed({
                url: url,
                title: feedData.title,
                image: feedData.image
              }, true, true); // showModal, isFromImport
            }
          });
        }
        cbus.ui.showSnackbar(i18n.__("snackbar_subscriptions-importing"));
      });
    }
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

cbus.broadcast.listen("updateFeedArtworks", function(e) {
  function updateFailed(feedData) {
    cbus.ui.showSnackbar(i18n.__("snackbar_artwork-update-error", feedData.title), "warning");
  }

  var doneCount = 0;
  var start = 0, end = cbus.data.feeds.length;

  if (e.data.feedUrl) {
    for (let i = 0, l = cbus.data.feeds.length; i < l; i++) {
      if (cbus.data.feeds[i].url === e.data.feedUrl) {
        start = i;
        end = i + 1;
        break;
      }
    }
  }

  for (let i = start; i < end; i++) {
    let feed = cbus.data.feeds[i];

    cbus.server.getPodcastInfo(feed.url, function(body) {
      let feedData = cbus.data.getFeedData({
        url: feed.url
      });

      if (body.image) {
        xhr({
          url: body.image,
          responseType: "arraybuffer"
        }, (err, status, imageBuffer) => {
          Jimp.read(Buffer.from(imageBuffer), function(err, image) {
            if (err) {
              updateFailed(feed);
            }
            image.resize(cbus.const.PODCAST_ART_SIZE, cbus.const.PODCAST_ART_SIZE).write(
              path.join(cbus.const.PODCAST_IMAGES_DIR.replace(/\\/g,"/"), sha1(feed.url) + ".png"),
              (err) => {
                if (err) {
                  updateFailed(feed);
                } else {
                  cbus.data.feeds[i].image = cbus.const.IMAGE_ON_DISK_PLACEHOLDER;
                  cbus.ui.showSnackbar(i18n.__("snackbar_artwork-updated", feed.title));
                }
                doneCount++;
                if (doneCount === end - start) {
                  localforage.setItem("cbus_feeds", cbus.data.feeds);
                  if (e.data.callback) {
                    e.data.callback(cbus.data.feeds.slice(start, end));
                  }
                }
              }
            );
          });
        });
      } else {
        updateFailed(feed);
      }
    });
  }
});

cbus.broadcast.listen("queueChanged", function() {
  localforage.setItem("cbus-last-queue-urls", cbus.audio.queue.map(elem => elem.src));

  localforage.getItem("cbus_feeds_qnp").then(function(feedsQNP) {
    if (!feedsQNP) { feedsQNP = [] }
    for (let i = 0, l = cbus.audio.queue.length; i < l; i++) {
      feedsQNP.push(cbus.data.getFeedData({
        url: cbus.data.getEpisodeData({ audioElement: cbus.audio.queue[i] }).feedURL
      }));
    }
    localforage.setItem("cbus_feeds_qnp", feedsQNP);
  });

  localforage.setItem("cbus-last-queue-infos", cbus.audio.queue.map(elem => {
    return cbus.data.getEpisodeData({ audioElement: elem })
  }))
});

cbus.broadcast.listen("audioChange", function() {
  var currentAudioInfo = cbus.data.getEpisodeData({ audioElement: cbus.audio.element })
  localforage.setItem("cbus-last-audio-info", currentAudioInfo)

  localforage.getItem("cbus_feeds_qnp").then(function(feedsQNP) {
    var thisPodcast = cbus.data.getFeedData({
      url: cbus.data.getEpisodeData({ audioElement: cbus.audio.element }).feedURL
    });
    if (feedsQNP) {
      feedsQNP.push(thisPodcast);
    } else {
      feedsQNP = [thisPodcast];
    }
    localforage.setItem("cbus_feeds_qnp", feedsQNP);
  });
});

cbus.broadcast.listen("offline_episodes_changed", function(info) {
  let episodeURL = info.data.episodeURL;
  let audioElem = document.querySelector(`.audios [data-id="${episodeURL}"]`)
  if (audioElem) {
    if (cbus.data.episodesOffline.indexOf(episodeURL) !== -1) { // added to offline episodes
      let storageFilePath = path.join(
        cbus.const.OFFLINE_STORAGE_DIR, sha1(episodeURL)
      );
      fs.readFile(storageFilePath, function(err, buffer) {
        let blob = new Blob([ buffer ]);
        audioElem.src = URL.createObjectURL(blob);
      });
    } else { // removed from offline episodes
      if (audioElem === cbus.audio.element) { // if currently being played
        cbus.audio.pause();
        let currentTime = audioElem.currentTime;
        audioElem.src = episodeURL;
        audioElem.currentTime = currentTime;
      } else {
        audioElem.src = episodeURL;
      }
    }
  }
});

cbus.broadcast.listen("audioTick", function(e) {
  // e.data.currentTime, e.data.duration
  if (Math.floor(e.data.currentTime) % 5 === 0) { // update every 5 seconds to reduce load
    /* save progress */
    let episodeID = cbus.audio.element.dataset.id;
    cbus.data.episodeProgresses[episodeID] = Math.max(
      e.data.currentTime, (cbus.data.episodeProgresses[episodeID] || 0)
    );
    localforage.setItem("cbus_episode_progresses", cbus.data.episodeProgresses);
    /* keep track of completed status */
    if (e.data.duration - e.data.currentTime < 30) {
      cbus.data.toggleCompleted(episodeID, true);
    }
  }
});
