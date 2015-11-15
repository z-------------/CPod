var router = function(req, res) {
    if (require("./debug.js").debug) {
        res.send("in debug mode, no requests sent");
    } else {
        var request = require("request");

        var searchTerm = req.query.term;
        var itunesApiUrl = "https://itunes.apple.com/search?media=podcast&term=" + encodeURIComponent(searchTerm);

        request({
            url: itunesApiUrl,
            headers: require("./REQUEST_HEADERS.js").REQUEST_HEADERS
        }, function(err, result, body) {
            if (!err) {
                var json = JSON.parse(body);
                var results = json.results;
                resultsMapped = results.map(function(result) {
                    return {
                        title: result.collectionName,
                        url: result.feedUrl,
                        image: result.artworkUrl600
                    }
                });
                res.send(resultsMapped);
            }
        });
    }
};

module.exports.router = router;
