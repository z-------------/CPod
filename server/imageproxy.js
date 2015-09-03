var router = function(req, res) {
    var url = req.query.url;
    if (url) {
        var request = require("request");

        console.log("fetch image at '" + url +  "'");
        request.get({
            url: url,
            headers: require("./REQUEST_HEADERS.js").REQUEST_HEADERS
        }).on("response", function(response) {
            if (response.headers["content-type"].match(new RegExp("image/*", "gi"))) {
                response.pipe(res);
            } else {
                res.sendStatus(400);
            }
        });
    } else {
        res.sendStatus(400);
    }
};

module.exports.router = router;
