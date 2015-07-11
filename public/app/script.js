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
    /* deal with feeds */
    cbus.feeds = (localStorage.getItem("cbus_feeds") ? JSON.parse(localStorage.getItem("cbus_feeds")) : []);

    cbus.display("feeds");
    Object.observe(cbus.feeds, function() {
        cbus.display("feeds");
    });

    $("#add").click(function() {
        Ply.dialog("prompt", {
            title: "Add feed",
            form: { title: "Some Random Podcast" }
        }).always(function (ui) {
            if (ui.state) {
                console.log(ui.widget);
                var feedTitle = ui.data.title;
                xhr("feedinfo?term=" + feedTitle, function(res) {
                    var json = JSON.parse(res);
                    console.log(json);

                    var feedInfo = json[0];

                    var feedTitle = feedInfo.title;
                    var feedImage = feedInfo.image;
                    var feedUrl = feedInfo.url;

                    var feedAlreadyAdded = false;
                    for (var i = 0; i < cbus.feeds.length; i++) {
                        var lfeed = cbus.feeds[i];
                        var lfeedUrl = lfeed.url;
                        if (lfeedUrl === feedUrl) {
                            feedAlreadyAdded = true;
                            break;
                        }
                    }

                    if (feedAlreadyAdded) {
                        Ply.dialog("alert", "You already have that feed.");
                    } else {
                        cbus.feeds.push({
                            url: feedUrl,
                            title: feedTitle,
                            image: feedImage
                        });
                        localStorage.setItem("cbus_feeds", JSON.stringify(cbus.feeds));
                        Ply.dialog("alert", "Added feed.");
                    }
                });
            }
        });
    });

    xhr("update?feeds=" + encodeURIComponent(JSON.stringify(cbus.feeds)), function(r) {
        var json = JSON.parse(r);
        console.log(r);

        /* deal with items */
        cbus.feedContents = json || {};

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
