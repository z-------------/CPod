var router = function(req, res) {
    var request = require("request");

    req.pipe(request(req.query.url)).pipe(res);
    console.log("proxied " + req.query.url);
};

module.exports.router = router;
