var REQUEST_HEADERS = require("./REQUEST_HEADERS.js").REQUEST_HEADERS;

var router = function(req, res) {
    if (require("./debug.js").debug) {
        res.send("in debug mode, no requests sent");
    } else {
        var request = require("request");
        var x2j = require("xml2js");

        var podcastUrl = req.query.url;

        var podcastData = {};

        request({
            url: podcastUrl,
            headers: REQUEST_HEADERS
        }, function(err, result, body) {
            x2j.parseString(body, function(err, result) {
                if (err) {
                    console.log("error parsing xml for", podcastData.title);
                    res.sendStatus(500);
                } else {
                    var channel = result.rss.channel[0];
                    // console.log(channel);
                    // title
                    if (channel.title && channel.title[0]) {
                        podcastData.title = channel.title[0];
                    }
                    // publisher
                    if (channel["itunes:author"] && channel["itunes:author"][0]) {
                        podcastData.publisher = channel["itunes:author"][0];
                    }
                    // description
                    if (channel.description && channel.description[0]) {
                        podcastData.description = channel.description[0];
                    }
                    // image
                    if (channel["itunes:image"] && channel["itunes:image"][0]) {
                        podcastData.image = channel["itunes:image"][0].$.href;
                    }
                    if (channel["image"] && channel["image"][0] &&
                        channel["image"][0]["url"] && channel["image"][0]["url"][0]) {
                        podcastData.image = channel["image"][0]["url"][0];
                    }
                }

                res.send(podcastData);
            });
        });
    }
};

module.exports.router = router;
