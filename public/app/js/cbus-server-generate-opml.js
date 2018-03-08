if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
  const j2x = require("js2xmlparser");

  const currentWindow = remote.getCurrentWindow();

  cbus.server.generateOPML = function(feeds, callback) {
    var json = {
      head: {
        title: `${APP_NAME} feeds`
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

    for (let i = 0, l = feeds.length; i < l; i++) {
      json.body.outline.outline.push({
        "@": {
          type: "rss",
          text: feeds[i].title,
          xmlUrl: feeds[i].url
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
        remote.dialog.showErrorBox("Error saving OPML", `${APP_NAME} could not save the OPML file to the specified location. Sorry about this.`)
      }/* else {
        remote.dialog.showMessageBox(remote.getCurrentWindow(), {
          message: "OPML file saved."
        });
      }*/
    }

    remote.dialog.showSaveDialog(currentWindow, {
      defaultPath: `${APP_NAME.toLowerCase()}_opml_export.opml`
    }, function(filename) {
      fs.writeFile(filename, opmlString, savedCallback);
    });
  };
}())
