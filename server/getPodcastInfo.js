var router = function(req, res) {
    if (require("./debug.js").debug) {
        res.send("in debug mode, no requests sent");
    } else {
        var request = require("request");

        var id = req.query.id;
        var itunesApiUrl = "https://itunes.apple.com/lookup?id=" + encodeURIComponent(id);

        request({
            url: itunesApiUrl,
            headers: require("./REQUEST_HEADERS.js").REQUEST_HEADERS
        }, function(err, result, body) {
            if (!err) {
                var json = JSON.parse(body);

                var results = json.results;
                var result = results[0];

                res.send({
                    publisher: result.artistName,
                    title: result.collectionName,
                    url: result.feedUrl,
                    infoUrl: result.collectionViewUrl,
                    image: result.artworkUrl600,
                    tags: result.genres
                });
            }
        });
    }
};

module.exports.router = router;
