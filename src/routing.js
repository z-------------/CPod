app.use(express.static("public"));

app.get("/", function(req, res) {
    res.sendFile("/public/index.html");
});

if (debug) {
    app.get("/debug/env", function(req, res) {
        res.send(JSON.stringify(process.env));
    });
}
