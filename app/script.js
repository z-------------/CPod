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
};

var xhrBuffer = function(url, callback) {
    var oReq = new XMLHttpRequest();
    oReq.open("GET", url, true);
    oReq.responseType = "arraybuffer";
    oReq.onload = function(e) {
        callback(this.response, e);
    };
    oReq.send();
};

window.AudioContext = window.AudioContext || window.webkitAudioContext;

var cbus = {};

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
                console.log(item);
                $("#items").append("<li><p>" + item.title + " - " + item.feed.title + "</p><button class='podcast_button-play' data-src='" + item.url + "'>Play</button></li>");
            });

            break;
    }
};

/* audio player insides */

cbus.audio = {};

cbus.audio.load = function(url, callback) {
    console.log("cbus.audio.load called: " + url)

    if (!cbus.audio.element) {
        cbus.audio.element = document.createElement("audio");
        document.body.appendChild(cbus.audio.element);
    }

    cbus.audio.element.addEventListener("loadedmetadata", function() {
        callback();
        console.log("cbus.audio.load done: " + url)
    });

    xhrBlob(url, function(blob) {
        var blobURL = window.URL.createObjectURL(blob);
        cbus.audio.element.src = blobURL;
        console.log("cbus.audio.load loaded: " + url)
    });
};

cbus.audio.play = function(fromStart) {
    if (cbus.audio.element) {
        if (fromStart) {
            cbus.audio.element.currentTime = 0;
        }
        return cbus.audio.element.play();
    }
};

cbus.audio.pause = function() {
    if (cbus.audio.element) {
        return cbus.audio.element.pause();
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
        var target = e.target;
        if (e.target.classList.contains("podcast_button-play")) {
            if (e.target.textContent === "Play") {
                target.textContent = "Loading...";
                cbus.audio.load(e.target.dataset.src, function() {
                    cbus.audio.play();
                    target.textContent = "Pause";
                });
            } else if (e.target.textContent === "Pause") {
                cbus.audio.pause();
                target.textContent = "Play";
            }
        }
    });
});
