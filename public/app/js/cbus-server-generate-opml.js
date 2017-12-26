if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
  const j2x = require("js2xmlparser");
  const fs = require("fs");
  const electron = require("electron");
  const remote = electron.remote;

  const currentWindow = remote.getCurrentWindow();

  cbus.server.generateOPML = function(feeds, callback) {
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

    for (let feed of feeds) {
      json.body.outline.outline.push({
        "@": {
          type: "rss",
          text: feed.title,
          xmlUrl: feed.url
        }
      });
    }

    var opmlString = j2x.parse("opml", json, {
      declaration: {
        include: false
      }
    });

    function savedCallback(err) {
      if (err) {
        remote.dialog.showErrorBox("Error saving OPML", "Cumulonimbus could not save the OPML file to the specified location. Sorry about this.")
      } else {
        remote.dialog.showMessageBox(remote.getCurrentWindow(), {
          message: "OPML file saved."
        });
      }
    }

    remote.dialog.showSaveDialog(currentWindow, {
      // optional options
    }, function(filename) {
      if (fs.existsSync(filename)) {
        remote.dialog.showMessageBox(currentWindow, {
          type: "question",
          message: `${filename} already exists. Are you sure you want to replace it?`,
          buttons: ["Replace", "Cancel"]
        }, function(response) {
          if (response === 0) { // index of button clicked
            fs.writeFile(filename, opmlString, savedCallback);
          }
        });
      } else {
        fs.writeFile(filename, opmlString, savedCallback);
      }
    });
  };
}())
