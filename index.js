var express = require("express");
var app = express();

var server = {
    feedinfo: require("./server/feedinfo.js").feedinfo,
    update: require("./server/update.js").update
};

var debug = (process.env.DEBUG === "true");

app.use(express.static("public"));

app.get("/", function(req, res) {
    res.sendFile("/public/index.html");
});

app.get("/app/feedinfo", server.feedinfo);

app.get("/app/update", server.update);

if (debug) {
    app.get("/debug/env", function(req, res) {
        res.send(JSON.stringify(process.env));
    });
}

var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log("cbus listening on *:%s", port);
});
