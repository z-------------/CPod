if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
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
        remote.dialog.showErrorBox(i18n.__("dialog_opml-save-error_title"), i18n.__("dialog_opml-save-error_body"));
      }/* else {
        remote.dialog.showMessageBox(remote.getCurrentWindow(), {
          message: "OPML file saved."
        });
      }*/
    }

    remote.dialog.showSaveDialog(cbus.ui.browserWindow, {
      defaultPath: `${APP_NAME.toLowerCase()}_opml_export.opml`
    }, function(filename) {
      fs.writeFile(filename, opmlString, savedCallback);
    });
  };
}())
