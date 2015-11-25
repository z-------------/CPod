var router = function(req, res) {
    if (require("./debug.js").debug) {
        res.send("in debug mode, no requests sent");
    } else {
        var request = require("request");
        var x2j = require("xml2js");

        var id = req.query.id;
        var itunesApiUrl = "https://itunes.apple.com/lookup?id=" + encodeURIComponent(id);

        var podcastData = {};

        request({
            url: itunesApiUrl,
            headers: require("./REQUEST_HEADERS.js").REQUEST_HEADERS
        }, function(err, result, body) {
            if (!err) {
                var json = JSON.parse(body);

                var results = json.results;
                var result = results[0];

                podcastData.publisher = result.artistName;
                podcastData.title = result.collectionName;
                podcastData.url = result.feedUrl;
                podcastData.infoUrl = result.collectionViewUrl;
                podcastData.image = result.artworkUrl600;
                podcastData.tags = result.genres;
                podcastData.id = result.trackId;

                request({
                    url: podcastData.url,
                    headers: require("./REQUEST_HEADERS.js").REQUEST_HEADERS
                }, function(err, result, body) {
                    x2j.parseString(body, function(err, result) {
                        if (err) {
                            console.log("error parsing xml for", podcastData.title);
                        } else {
                            var description = result.rss.channel[0].description[0];
                            podcastData.description = description;
                        }

                        res.send(podcastData);
                    });
                });
            }
        });
    }
};

module.exports.router = router;
