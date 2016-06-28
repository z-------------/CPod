var j2x = require("js2xmlparser");

var router = function(req, res) {
    var queryData = req.query.data;
    // var queryData = '[{"image":"http://is1.mzstatic.com/image/thumb/Music6/v4/6a/97/62/6a976225-2424-82d1-f350-5a99c2fbf388/source/600x600bb.jpg","title":"99% Invisible","url":"http://feeds.99percentinvisible.org/99percentinvisible"},{"image":"http://is3.mzstatic.com/image/thumb/Music20/v4/56/1f/d1/561fd162-9abc-2b65-45fc-1b9cdd26cf0b/source/600x600bb.jpg","title":"Acquired","url":"http://www.acquired.fm/episodes?format=rss"},{"image":"http://is3.mzstatic.com/image/thumb/Music69/v4/d0/05/2f/d0052fd9-8679-40a0-a869-d18664bc960c/source/600x600bb.jpg","title":"The Allusionist","url":"http://feeds.theallusionist.org/Allusionist"}]';

    var feeds = JSON.parse(queryData);

    var json = {
        head: {
            title: "Cumulonimbus feeds"
        },
        body: {
            outline: {
                "@": {
                    text: "feeds"
                },
                outline: []
            }
        }
    };

    for (feed of feeds) {
        json.body.outline.outline.push({
            "@": {
                type: "rss",
                text: feed.title,
                xmlUrl: feed.url
            }
        });
    }

    var opml = j2x("opml", json, {
        declaration: {
            include: false
        }
    });

    res.append("Content-Type", "text/x-opml");
    res.append("Content-Disposition", "attachment");
    res.send(opml);
};

module.exports.router = router;
