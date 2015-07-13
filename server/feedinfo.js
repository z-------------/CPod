var request = require("request");

module.exports = {};
module.exports.feedinfo = function(req, res) {
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
                    // image: (function() { // doesnt work for some reason
                    //     /* find the biggest artwork image */
                    //     var keys = Object.keys(json);
                    //     var artworkKeys = keys.filter(function(key) {
                    //         return !!key.match(/artworkUrl\d*/g);
                    //     });
                    //     var biggestArtworkSize = 0;
                    //     artworkKeys.forEach(function(artworkKey) {
                    //         var size = artworkKey.match(/\d*/g)[0];
                    //         if (size > biggestArtworkSize) {
                    //             biggestArtworkSize = size;
                    //         }
                    //     });
                    //     return result["artworkUrl" + biggestArtworkSize];
                    // }())
                }
            });
            res.send(resultsMapped);
        }
    });
};
