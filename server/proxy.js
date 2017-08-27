var router = function(req, res) {
    var request = require("request");

    req.pipe(request(req.query.url)).pipe(res);
};

module.exports.router = router;
