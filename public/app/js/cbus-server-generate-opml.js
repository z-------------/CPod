if (!cbus.hasOwnProperty("server")) { cbus.server = {} }

(function() {
  cbus.server.generateOPML = function(feeds, callback) {
    /* create the document */

    let doc = document.implementation.createDocument("http://www.w3.org/1999/xhtml", "opml");
    let root = doc.children[0];

    let head = doc.createElement("head");
    let title = doc.createElement("title");
    title.textContent = "CPod feeds";
    head.appendChild(title);
    root.appendChild(head);

    let body = doc.createElement("body");
    let outlineParent = doc.createElement("outline");
    outlineParent.setAttribute("text", "feeds");
    for (let i = 0, l = feeds.length; i < l; i++) {
      let outlineChild = doc.createElement("outline");
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
      defaultPath: `cpod_opml_export.opml`
    }, function(filename) {
      fs.writeFile(filename, serialized, savedCallback);
    });
  };
}())
