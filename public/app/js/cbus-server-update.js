if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
  cbus.server.update = function(feeds, callback) {
    var feedContents = {};
    var updatedCount;

    function checkUpdatedCount() {
      if (updatedCount === feeds.length) {
        callback(feedContents);
      }
    }
    updatedCount = 0;

    if (feeds.length > 0) {
      var progressBarID;
      if (feeds.length > 1) {
        progressBarID = `update-${new Date().getTime().toString()}`;
        cbus.ui.progressBar(progressBarID, {
          progress: 0,
          label: i18n.__("progress_bar_home_update")
        });
      }

      for (let i = 0, l = feeds.length; i < l; i++) {
        let feed = feeds[i];
        xhr({
          url: feed.url,
          timeout: cbus.const.REQUEST_TIMEOUT,
          noCache: cbus.settings.data.noUpdateCache
        }, function(err, result, body) {
          if (!err && result.statusCode.toString()[0] === "2") {
            let parser = new DOMParser();
            let doc = parser.parseFromString(body, "application/xml");

            feedContents[feed.url] = { items: [] };
            let feedContent = feedContents[feed.url];

            if (doc.documentElement.nodeName === "parsererror") {
              console.log("error updating feed '" + feed.title + "'");
            } else {
              let items = doc.querySelectorAll("rss channel item");

              for (let item of items) {
                let episodeInfo = {};

                let mediaInfo, url, type;
                let enclosureElems = item.querySelectorAll("enclosure[url]");
                let contentElem = item.querySelector("content[url]");
                if (enclosureElems.length === 1) {
                  url = enclosureElems[0].getAttribute("url");
                  type = enclosureElems[0].getAttribute("type");
                } else if (enclosureElems.length) {
                  for (let elem of enclosureElems) {
                    const enclosureType = elem.getAttribute("type");
                    if (enclosureType && enclosureType.split("/")[0] === "audio") {
                      url = elem.getAttribute("url");
                      type = enclosureType;
                      break;
                    }
                  }
                  if (!url) {
                    url = enclosureElems[0].getAttribute("url");
                    type = enclosureElems[0].getAttribute("type");
                  }
                } else if (contentElem && contentElem.tagName === "media:content") {
                  url = contentElem.getAttribute("url");
                  type = contentElem.getAttribute("type");
                }
                if (url || type) {
                  mediaInfo = { url, type };
                }

                if (mediaInfo) {
                  /* episode title */
                  let childrenTitle = [].slice.call(item.children).filter(child => child.tagName.toLowerCase() === "title");
                  if (childrenTitle[0]) {
                    episodeInfo.title = childrenTitle[0].textContent;
                  } else {
                    episodeInfo.title = null;
                  }

                  /* episode audio url */
                  if (mediaInfo.type) {
                    episodeInfo.isVideo = !!mediaInfo.type.match(cbus.const.videoMimeRegex);
                  } else {
                    episodeInfo.isVideo = false;
                  }
                  episodeInfo.url = mediaInfo.url;

		  /* episode id: in the absence of a <guid> element, use the media URL */
                  episodeInfo.id = mediaInfo.url;
                  let childrenGUID = [].slice.call(item.children).filter(child => child.tagName.toLowerCase() === "guid");
                  if (childrenGUID[0]) {
                    episodeInfo.id = childrenGUID[0].textContent;
                  } 

                  /* episode description */
                  var description = null;
                  let summaryElem = item.getElementsByTagName("itunes:summary")[0];
                  let descriptionElem = item.getElementsByTagName("description")[0];
                  if (summaryElem) {
                    description = summaryElem.textContent;
                  } else if (descriptionElem) {
                    description = descriptionElem.textContent;
                  }
                  if (description) { episodeInfo.description = description; }

                  /* episode publish date */
                  let pubDateElem = item.getElementsByTagName("pubDate")[0];
                  if (pubDateElem) {
                    episodeInfo.date = pubDateElem.textContent;
                  }

                  /* episode duration */
                  let durationElem = item.getElementsByTagName("itunes:duration")[0];
                  if (durationElem) {
                    var length = 0;
                    let lengthStr = durationElem.textContent;
                    let lengthArr = lengthStr.split(":")
                      .map(Number)
                      .reverse(); // seconds, minutes, hours
                    for (let i = 0, l = lengthArr.length; i < l; i++) {
                      if (i === 0) length += lengthArr[i]; // seconds
                      if (i === 1) length += lengthArr[i] * 60 // minutes
                      if (i === 2) length += lengthArr[i] * 60 * 60 // hours
                    }

                    episodeInfo.length = length;
                  }

                  /* episode art */
                  var episodeArt = null;
                  let imageElem = item.querySelector("image[href]");
                  if (imageElem && imageElem.tagName === "itunes:image") {
                    episodeArt = imageElem.getAttribute("href")
                  }/* else if (item["media:content"] && item["media:content"][0] &&
                    item["media:content"][0].$ && item["media:content"][0].$.url &&
                    item["media:content"][0].$.type && item["media:content"][0].$.type.indexOf("image/") === 0) {
                    episodeArt = item["media:content"][0].$.url;
                  }*/
                  episodeInfo.art = episodeArt;

                  /* episode chapters (podlove.org/simple-chapters) */
                  var episodeChapters = [];
                  let chaptersElem = item.getElementsByTagName("psc:chapters")[0];
                  if (chaptersElem && chaptersElem.children.length) {
                    let chapterElems = chaptersElem.querySelectorAll("chapter");
                    for (let i = 0, l = chapterElems.length; i < l; i++) {
                      episodeChapters.push({
                        title: chapterElems[i].getAttribute("name"),
                        time: parseTimeString(chapterElems[i].getAttribute("start"))
                      });
                    }
                  }
                  episodeInfo.chapters = episodeChapters;

                  feedContent.items.push(episodeInfo);
                }
              }
            }
          } else {
            console.log("error updating feed '" + feed.title + "'");
          }

          updatedCount += 1;
          checkUpdatedCount();

          if (progressBarID) {
            cbus.ui.progressBar(progressBarID, {
              progress: updatedCount / feeds.length,
              remove: updatedCount === feeds.length
            });
          }
        });
      }
    } else {
      console.log("no feeds to update");
    }
  };

}());
