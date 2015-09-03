var router = function(req, res) {
    var url = req.query.url;
    if (url) {
        var request = require("request");
        var Jimp = require("jimp");

        console.log("fetch image at '" + url +  "'");
        request.get({
            url: url,
            headers: require("./REQUEST_HEADERS.js").REQUEST_HEADERS
        }, function(err, response, body) {
            if (!err && response.statusCode === 200 && response.headers["content-type"].match(new RegExp("image/*", "gi"))) {
                var image = new Jimp(body, function(err, image) {
                    if (err) throw err;

                    image.resize(512, 512)
                        .blur(100);
                    image.getBuffer(Jimp.MIME_JPEG, function(err, buffer) {
                        res.send(buffer, function(err) {
                            if (err) {
                                res.sendStatus(500);
                            }
                        });
                    });
                });
            } else {
                res.sendStatus(400);
            }
        });
    } else {
        res.sendStatus(400);
    }
};

module.exports.router = router;
