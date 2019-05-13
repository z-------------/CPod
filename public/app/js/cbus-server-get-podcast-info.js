if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
  cbus.server.getPodcastInfo = function(podcastUrl, callback) {
    var podcastData = {};

    xhr({
      url: podcastUrl
    }, function(err, result, body) {
      if (err) {
        callback(null)
      } else {
        let parser = new DOMParser();
        let doc = parser.parseFromString(body, "application/xml");

        if (doc.documentElement.nodeName === "parsererror") {
          console.log("error parsing xml", err);
          callback(null)
        } else {
          let channel = doc.querySelector("rss channel");

          if (channel) {
            // title
            let titleElem = channel.getElementsByTagName("title")[0];
            if (titleElem) {
              podcastData.title = titleElem.textContent.trim();
            }
            // publisher
            let authorElem = channel.getElementsByTagName("itunes:author")[0];
            if (authorElem) {
              podcastData.publisher = authorElem.textContent;
            }
            // description
            let descriptionElem = channel.getElementsByTagName("description")[0];
            if (descriptionElem) {
              podcastData.description = descriptionElem.textContent;
            }
            // image
            let imageElems = [...doc.querySelectorAll("rss channel > image"), ...doc.querySelectorAll("rss > image")];
            for (let i = 0, l = imageElems.length; i < l; i++) {
              let imageElem = imageElems[i];
              if (imageElem.tagName === "image" && imageElem.getElementsByTagName("url")[0]) {
                podcastData.image = imageElem.getElementsByTagName("url")[0].textContent;
              } else if (imageElem.tagName === "itunes:image") {
                podcastData.image = imageElem.getAttribute("href");
              }
            }
            if (!podcastData.image) {
              podcastData.image = cbus.const.IMAGE_MISSING_PLACEHOLDER_PATH;
            }

            callback(podcastData);
          } else {
            callback(null);
          }
        }
      }
    });
  }
}());
