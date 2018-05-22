if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
  cbus.server.generateOPML = function(feeds, callback) {
    /* create the document */

    let doc = document.implementation.createDocument(null, "opml");
    let root = doc.children[0];

    let head = document.createElement("head");
    let title = document.createElement("title");
    title.textContent = "CPod feeds";
    head.appendChild(title);
    root.appendChild(head);

    let body = document.createElement("body");
    let outlineParent = document.createElement("outline");
    outlineParent.setAttribute("text", "feeds");
    for (let i = 0, l = feeds.length; i < l; i++) {
      let outlineChild = document.createElement("outline");
      outlineChild.setAttribute("type", "rss");
      outlineChild.setAttribute("text", feeds[i].title);
      outlineChild.setAttribute("xmlUrl", feeds[i].url);
      outlineParent.appendChild(outlineChild);
    }
    body.appendChild(outlineParent);
    root.appendChild(body);

    let serialized = new XMLSerializer().serializeToString(doc);

    /* save the document */

    function savedCallback(err) {
      if (err) {
        remote.dialog.showErrorBox(i18n.__("dialog_opml-save-error_title"), i18n.__("dialog_opml-save-error_body"));
      }
    }

    remote.dialog.showSaveDialog(cbus.ui.browserWindow, {
      defaultPath: `${APP_NAME.toLowerCase()}_opml_export.opml`
    }, function(filename) {
      fs.writeFile(filename, serialized, savedCallback);
    });
  };
}())
