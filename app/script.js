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

var storage = chrome.storage.sync;

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
    }
};

$(window).load(function() {
    storage.get("feeds", function(r) {
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

                        storage.get("feeds", function(r) {
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
                                storage.set({ feeds: feeds }, function() {
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
});
