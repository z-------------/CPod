var express = require("express");
var app = express();
var compression = require("compression");

var fs = require("fs");

var debug = require("./server/debug.js").debug;

app.use(express.static("public"));
app.use(compression());

app.get("/", function(req, res) {
    res.sendFile("/public/index.html");
});

app.get(["/bower_components/*", "/node_modules/*"], function(req, res) {
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

var routers = {
    "app/search": "searchPodcasts",
    "app/feeds": "getFeeds",
    "app/proxy": "proxy",
    "app/image_proxy": "imageProxy",
    "app/info": "getPodcastInfo",
    "app/cumulonimbus_opml.xml": "generateOpml"
};

for (var routerDef in routers) {
    if (routers.hasOwnProperty(routerDef)) {
        app.get("/" + routerDef, require("./server/" + routers[routerDef] + ".js").router);
    }
}

var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log("cbus listening on *:%s", port);
});
