var express = require("express");
var app = express();
var fs = require("fs");

var debug = require("./server/debug.js").debug;

app.use(express.static("public"));

app.get("/", function(req, res) {
    res.sendFile("/public/index.html");
});

app.get("/bower_components/*", function(req, res) {
    var path = __dirname + req.originalUrl;
    fs.exists(path, function(exists) {
        if (exists) {
            res.sendFile(path);
        } else {
            res.sendStatus(404);
        }
    });
});

if (debug) {
    app.get("/debug/env", function(req, res) {
        res.send(JSON.stringify(process.env));
    });
}

app.get("/app/search", require("./server/searchPodcasts.js").router);
app.get("/app/feeds", require("./server/getFeeds.js").router);
app.get("/app/proxy", require("./server/proxy.js").router);
app.get("/app/info", require("./server/getPodcastInfo.js").router);

var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log("cbus listening on *:%s", port);
});
