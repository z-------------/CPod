cbus.sync = {};

(function() {
  let base = "https://gpodder.net";
  let username = "thedonkeypie";
  let password = "EshOdTagByHya6I";
  let deviceID = os.hostname() + "-CPod";
  let auth = { user: username, pass: password };

  /* auth */

  cbus.sync.auth = {};

  cbus.sync.auth.login = function(cb) {
    request.post({
      url: `${base}/api/2/auth/${username}/login.json`,
      auth: auth
    }, (err, res, body) => {
      if (err || statusCodeNotOK(res.statusCode)) {
        cb(false);
      } else {
        for (let i = 0; i < res.headers["set-cookie"].length; i++) {
          request.cookie(res.headers["set-cookie"][i]);
        }
        cb(true);
      }
    });
  };

  cbus.sync.auth.isLoggedIn = function(cb) {
    request.post({
      url: `${base}/api/2/auth/${username}/login.json`
    }, (err, res, body) => {
      if (err || res.statusCode !== 200) {
        cb(false);
      } else {
        cb(true);
      }
    });
  };

  cbus.sync.auth.logout = function(cb) {
    request.post({
      url: `${base}/api/2/auth/${username}/logout.json`
    }, (err, res, body) => {
      if (err || statusCodeNotOK(res.statusCode)) {
        cb(false);
      } else {
        cb(true);
      }
    });
  };

  /* subscriptions */

  cbus.sync.subscriptions = {};

  cbus.sync.subscriptions.get = function(cb) {
    request.get({
      url: `${base}/subscriptions/${username}/${deviceID}.json`,
      auth: auth
    }, (err, res, body) => {
      if (err || statusCodeNotOK(res.statusCode)) {
        cb(null);
      } else {
        cb(JSON.parse(body));
      }
    });
  };

  cbus.sync.subscriptions.getAll = function(cb) {
    request.get({
      url: `${base}/subscriptions/${username}.json`,
      auth: auth
    }, (err, res, body) => {
      if (err || statusCodeNotOK(res.statusCode)) {
        cb(null);
      } else {
        cb(JSON.parse(body));
      }
    });
  };

  cbus.sync.subscriptions.set = function(cb) {
    var subscriptionsStr = cbus.data.feeds.map(feed => feed.url).join("\n");
    request.put({
      url: `${base}/subscriptions/${username}/${deviceID}.txt`,
      auth: auth,
      body: subscriptionsStr
    }, (err, res, body) => {
      if (err || statusCodeNotOK(res.statusCode)) {
        cb(false);
      } else {
        cb(true);
      }
    });
  };

  cbus.sync.subscriptions.push = function(delta, cb) {
    request.post({
      url: `${base}/api/2/subscriptions/${username}/${deviceID}.json`,
      auth: auth,
      body: JSON.stringify({
        add: delta.add || [],
        remove: delta.remove || []
      })
    }, (err, res, body) => {
      if (err || statusCodeNotOK(res.statusCode)) {
        cb(false);
      } else {
        body = JSON.parse(body);
        localforage.setItem("cbus_sync_subscriptions_push_timestamp", body.timestamp);
        for (let i = 0, l = body["update_urls"].length; i < l; i++) {
          try {
            cbus.data.getFeedData({ url: body["update_urls"][i][0] }).url = body["update_urls"][i][1];
          } catch (e) {}
        }
        localforage.setItem("cbus_feeds", cbus.data.feeds);

        cb(true);
      }
    });
  };

  cbus.sync.subscriptions.pull = function(cb) {
    var sinceTimestamp = 0;
    localforage.getItem("cbus_sync_subscriptions_pull_timestamp", function(err, val) {
      if (val) sinceTimestamp = val;

      request.get({
        url: `${base}/api/2/subscriptions/${username}/${deviceID}.json?since=${sinceTimestamp}`,
        auth: auth
      }, (err, res, body) => {
        if (err || statusCodeNotOK(res.statusCode)) {
          cb(false);
        } else {
          body = JSON.parse(body);

          localforage.setItem("cbus_sync_subscriptions_pull_timestamp", body.timestamp);

          for (let i = 0, l = body.add.length; i < l; i++) {
            cbus.server.getPodcastInfo(body.add[i], podcastInfo => {
              podcastInfo.url = body.add[i];
              cbus.data.subscribeFeed(podcastInfo, false);
            });
          }

          for (let i = 0, l = body.remove.length; i < l; i++) {
            cbus.data.unsubscribeFeed({ url: body.remove[i] }, false);
          }

          cb(true);
        }
      });
    });
  };
}());
