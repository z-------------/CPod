cbus.sync = {};

(function() {
  let base = "https://gpodder.net";

  let username = cbus.settings.data.syncUsername;
  let password = cbus.settings.data.syncPassword;
  let deviceID = cbus.settings.data.syncDeviceID;
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
          let cookie = res.headers["set-cookie"][i];
          if (cookie.split("=")[0] === "sessionid") {
            cookieJar.setCookie(request.cookie(cookie), base);
            localforage.setItem("cbus_sync_auth_sessionid_cookie", cookie);
          }
        }
        cb(true);
      }
    });
  };

  cbus.sync.auth.isLoggedIn = function(cb) {
    localforage.getItem("cbus_sync_auth_sessionid_cookie", (err, cookie) => {
      if (cookie) cookieJar.setCookie(request.cookie(cookie), base);
      request.post({
        url: `${base}/api/2/auth/${username}/login.json`
      }, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          cb(false);
        } else {
          cb(true);
        }
      });
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

  cbus.sync.auth.authenticate = function(cb) { // if sessionid valid, use that; if not, relogin
    cbus.sync.auth.isLoggedIn(isLoggedIn => {
      if (!isLoggedIn) {
        cbus.sync.auth.login(loginSuccess => {
          if (!loginSuccess) {
            cb(false);
          } else {
            cb(true);
          }
        })
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
        for (let i = 0, l = body["update_urls"].length; i < l; i++) {
          try {
            cbus.data.getFeedData({ url: body["update_urls"][i][0] }).url = body["update_urls"][i][1];
          } catch (e) {}
        }
        localforage.setItem("cbus_feeds", cbus.data.feeds);
        localforage.setItem("cbus_sync_subscriptions_push_feeds", cbus.data.feeds.map(feed => feed.url));
        localforage.setItem("cbus_sync_subscriptions_push_timestamp", body.timestamp);

        cb(true);
      }
    });
  };

  cbus.sync.subscriptions.pull = function(deviceID, cb) {
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
          let delta = {
            add: body.add,
            remove: body.remove
          };

          localforage.setItem("cbus_sync_subscriptions_pull_timestamp", body.timestamp);

          var addDoneCount = 0;
          for (let i = 0, l = body.add.length; i < l; i++) {
            cbus.server.getPodcastInfo(body.add[i], podcastInfo => {
              podcastInfo.url = body.add[i];
              cbus.data.subscribeFeed(podcastInfo, false);
              addDoneCount++;
              if (addDoneCount === body.add.length) {
                cb(true, delta);
              }
            });
          }

          for (let i = 0, l = body.remove.length; i < l; i++) {
            cbus.data.unsubscribeFeed({ url: body.remove[i] }, false);
          }

          if (body.add.length === 0) {
            cb(true, delta);
          }
        }
      });
    });
  };

  cbus.sync.subscriptions.getSyncDevices = function(cb) {
    request.get({
      url: `${base}/api/2/sync-devices/${username}.json`
    }, (err, res, body) => {
      if (err || statusCodeNotOK(res.statusCode)) {
        cb(null);
      } else {
        body = JSON.parse(body);
        let syncedDevices = [];
        for (let i = 0; i < body.synchronized.length; i++) {
          if (body.synchronized[i][0] === deviceID) {
            syncedDevices.push(body.synchronized[i][1]);
          } else if (body.synchronized[i][1] === deviceID) {
            syncedDevices.push(body.synchronized[i][0]);
          }
        }
        cb(syncedDevices);
      }
    });
  };

  cbus.sync.subscriptions.pushPull = function(cb) {
    localforage.getItem("cbus_sync_subscriptions_push_feeds", (err, r) => {
      var lastPushFeedURLs = [];
      if (r) lastPushFeedURLs = r;
      let currentFeedURLs = cbus.data.feeds.map(feed => feed.url);
      let add = [];
      let remove = [];
      for (let i = 0; i < currentFeedURLs.length; i++) {
        if (lastPushFeedURLs.indexOf(currentFeedURLs[i]) === -1) {
          add.push(currentFeedURLs[i]);
        }
      }
      for (let i = 0; i < lastPushFeedURLs.length; i++) {
        if (currentFeedURLs.indexOf(lastPushFeedURLs[i]) === -1) {
          remove.push(lastPushFeedURLs[i]);
        }
      }
      cbus.sync.subscriptions.push({
        add: add,
        remove: remove
      }, success => {
        if (!success) {
          cb(false, "push");
        } else {
          cbus.sync.subscriptions.getSyncDevices(syncedDevices => {
            if (!syncedDevices) {
              cb(false, "pull");
            } else {
              var doneCount = 0;
              for (let i = 0; i < syncedDevices.length; i++) {
                cbus.sync.subscriptions.pull(syncedDevices[i], (success, delta) => {
                  doneCount++;
                  if (doneCount === syncedDevices.length) {
                    cb(true);
                  }
                });
              }
            }
          });
        }
      });
    });
  };
}());
