module.exports = {};
module.exports.feedinfo = function(req, res) {
    if (process.env.DEBUG === "true") {
        res.sendFile("update");
    } else {
        var request = require("request");

        var searchTerm = req.query.term;
        var itunesApiUrl = "https://itunes.apple.com/search?media=podcast&term=" + encodeURIComponent(searchTerm);

        request(itunesApiUrl, function(err, result, body) {
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
