var xhr = function(url, callback) {
    var oReq = new XMLHttpRequest();
    oReq.onload = function(e){
        callback(this.responseText, e);
    };
    oReq.open("get", url, true);
    oReq.send();
};

var xhrBlob = function(url, callback) {
    var oReq = new XMLHttpRequest();
    oReq.open("GET", url, true);
    oReq.responseType = "blob";
    oReq.onload = function(e) {
        callback(this.response, e);
    };
    oReq.send();
}

var cbus = {
    audios: []
};
cbus.display = function(thing) {
    switch (thing) {
        case "feeds":
            $("#list").html("");
            cbus.feeds.forEach(function(feed) {
                $("#list").append("<li><img data-src='" + feed.image + "' class='podcast_image'><h3>" + feed.title + " (" + feed.url + ")</h3></li>");
            });
            $(".podcast_image").each(function() {
                var that = this;
                var imageURL = that.dataset.src;
                xhrBlob(imageURL, function(res) {
                    var blobURL = window.URL.createObjectURL(res);
                    that.setAttribute("src", blobURL);
                });
            });
            break;
        case "feedContents":
            $("#items").html("");
            Object.keys(cbus.feedContents).forEach(function(feedURL) {
                var feed = cbus.feeds.filter(function(feed) {
                    return feed.url === feedURL;
                })[0];
                if (feed) {
                    var items = cbus.feedContents[feedURL].items;
                    items.forEach(function(item) {
                        console.log(item);
                        $("#items").append("<li><p>" + item.title + " - " + feed.title + "</p><button class='podcast_button-play' data-src='" + item.url + "'>Play</button></li>");
                    });
                }
            });
            break;
    }
};

$(window).load(function() {
    chrome.storage.sync.get(["feeds"], function(r) {
        /* deal with feeds */
        cbus.feeds = r.feeds || [];

        cbus.display("feeds");
        Object.observe(cbus.feeds, function() {
            cbus.display("feeds");
        });

        $("#add").click(function() {
            Ply.dialog("prompt", {
                title: "Add feed",
                form: { url: "http://" }
            }).always(function (ui) {
                if (ui.state) {
                    console.log(ui.widget);
                    var feedURL = ui.data.url;
                    xhr(feedURL, function(res) {
                        var xmlDoc = $.parseXML(res);
                        var $xml = $(xmlDoc);

                        var titleElem = $xml.find("title")[0];
                        var feedTitle = titleElem.textContent;

                        var imageElem = $xml.find("image")[0];
                        var feedImage;
                        if (imageElem) {
                            if (imageElem.querySelector("url")) {
                                feedImage = imageElem.querySelector("url").textContent;
                            } else {
                                feedImage = imageElem.getAttribute("href");
                            }
                        } else {
                            feedImage = null;
                        }

                        chrome.storage.sync.get("feeds", function(r) {
                            var feeds = r.feeds || [];

                            var feedAlreadyAdded = false;
                            for (var i = 0; i < feeds.length; i++) {
                                var lfeed = feeds[i];
                                var lfeedURL = lfeed.url;
                                if (lfeedURL === feedURL) {
                                    feedAlreadyAdded = true;
                                    break;
                                }
                            }

                            if (feedAlreadyAdded) {
                                Ply.dialog("alert", "You already have that feed.");
                            } else {
                                feeds.push({
                                    url: feedURL,
                                    title: feedTitle,
                                    image: feedImage
                                });
                                chrome.storage.sync.set({ feeds: feeds }, function() {
                                    cbus.feeds.length = 0;
                                    Array.prototype.push.apply(cbus.feeds, feeds);
                                    Ply.dialog("alert", "Added feed.");
                                });
                            }
                        });
                    });
                }
            });
        });
    });

    chrome.storage.local.get(["feedContents"], function(r) {
        /* deal with items */
        cbus.feedContents = r.feedContents || {};

        cbus.display("feedContents");
        Object.observe(cbus.feedContents, function() {
            cbus.display("feedContents");
        });
    });

    /* listen for play button clicks */
    $("#items").click(function(e) {
        if (e.target.classList.contains("podcast_button-play")) {
            var audio = document.createElement("audio");
            var audioSrc = e.target.dataset.src;
            xhrBlob(audioSrc, function(res) {
                var blobURL = window.URL.createObjectURL(res);
                audio.src = blobURL;
                cbus.audios.push(audio);
                document.body.appendChild(audio);
                audio.onloadedmetadata = function() {
                    audio.play();
                };
            });
        }
    });
});
