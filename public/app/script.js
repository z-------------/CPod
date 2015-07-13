var xhr = function(url, callback) {
    var oReq = new XMLHttpRequest();
    oReq.onload = function(e){
        callback(this.responseText, e);
    };
    oReq.open("get", url, true);
    oReq.send();
};

window.AudioContext = window.AudioContext || window.webkitAudioContext;

var cbus = {};

cbus.display = function(thing) {
    switch (thing) {
        case "feeds":
            $("#list").html("");
            cbus.feeds.forEach(function(feed) {
                $("#list").append("<li>\
                <img src='" + feed.image + "' class='podcast_image'>\
                <h3>" + feed.title + " (" + feed.url + ")</h3>\
                </li>");
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
                $("#items").append("<li>\
                <div class='podcast_info'>\
                <h3>" + item.title + " - " + item.feed.title + "</h3>\
                <p>" + item.description + "</p>\
                </div>\
                <audio class='podcast_audio' src='" + item.url + "' controls></audio>\
                </li>");
            });

            break;
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
});
