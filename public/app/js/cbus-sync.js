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

  cbus.sync.auth.retry = function(fn, args) {
    cbus.sync.auth.authenticate(success => {
      if (!success) {
        args[args.length - 1](false);
      } else {
        fn(...args);
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
        cbus.sync.auth.retry(cbus.sync.subscriptions.get, arguments);
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
        cbus.sync.auth.retry(cbus.sync.subscriptions.getAll, arguments);
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
        cbus.sync.auth.retry(cbus.sync.subscriptions.set, arguments);
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
        cbus.sync.auth.retry(cbus.sync.subscriptions.push, arguments);
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
          cbus.sync.auth.retry(cbus.sync.subscriptions.pull, arguments);
        } else {
          body = JSON.parse(body);
          localforage.setItem("cbus_sync_subscriptions_pull_timestamp", body.timestamp);
          cb({
            add: body.add,
            remove: body.remove
          });
        }
      });
    });
  };

  cbus.sync.subscriptions.getSyncDevices = function(cb) {
    request.get({
      url: `${base}/api/2/sync-devices/${username}.json`
    }, (err, res, body) => {
      if (err || statusCodeNotOK(res.statusCode)) {
        cbus.sync.auth.retry(cbus.sync.subscriptions.getSyncDevices, arguments);
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

  cbus.sync.subscriptions.pullAllDevices = function(cb) {
    cbus.sync.subscriptions.getSyncDevices(syncedDevices => {
      if (!syncedDevices) {
        cb(false);
      } else {
        syncedDevices.push(deviceID);
        var devicesDoneCount = 0;
        for (let i = 0; i < syncedDevices.length; i++) {
          let adds = [];
          let removes = [];
          cbus.sync.subscriptions.pull(syncedDevices[i], (delta) => {
            if (!delta) {
              cb(false);
            } else {
              for (let j = 0; j < delta.add.length; j++) {
                if (adds.indexOf(delta.add[j]) === -1) {
                  adds.push(delta.add[j])
                }
              }
              for (let j = 0; j < delta.remove.length; j++) {
                if (removes.indexOf(delta.remove[j]) === -1) {
                  removes.push(delta.remove[j])
                }
              }
              devicesDoneCount++;
              if (devicesDoneCount === syncedDevices.length) {
                for (let j = 0; j < removes.length; j++) {
                  cbus.data.unsubscribeFeed({
                    url: removes[j]
                  }, false, true);
                }
                var addDoneCount = 0;
                for (let j = 0; j < adds.length; j++) {
                  cbus.server.getPodcastInfo(adds[j], podcastInfo => {
                    podcastInfo.url = adds[j];
                    cbus.data.subscribeFeed(podcastInfo, false, false, true);
                    addDoneCount++;
                    if (addDoneCount === adds.length) {
                      cb(true, {
                        add: adds,
                        remove: removes
                      });
                    }
                  });
                }
              }
            }
          });
        }
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
          cbus.sync.subscriptions.pullAllDevices(success => {
            if (!success) {
              cb(false, "pull");
            } else {
              cb(true);
            }
          });
        }
      });
    });
  };
}());
