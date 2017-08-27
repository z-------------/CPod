var router = function(req, res) {
    var request = require("request");

    request({
        url: req.query.url,
        encoding: null
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var bodyBuffer = new Buffer(body);
            var contentType = response.headers["content-type"];
            var type;
            if (contentType === "image/jpeg" || contentType === "image/jpg") {
                type = "jpg";
            } else if (contentType = "image/png") {
                type = "png";
            } else if (contentType = "image/gif") {
                type = "gif";
            }

            if (type) {
                require("jimp").read(bodyBuffer, function(err, image){
                    if (err || image == null) {
                        res.redirect("proxy?url=" + encodeURIComponent(req.query.url));
                    } else if (image !== null) {
                        image.resize(image.bitmap.width * 200 / image.bitmap.height, 200)
                            .getBuffer("image/png", function(err, buffer) {
                                if (err) {
                                    res.sendStatus(500);
                                }

                                res.set("Content-Type", "image/png");
                                res.send(buffer);
                            });
                    }
                });
            } else {
                res.redirect("proxy?url=" + encodeURIComponent(req.query.url));
            }
        }
    });
};

module.exports.router = router;
