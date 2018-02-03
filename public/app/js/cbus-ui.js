cbus.ui = {};

cbus.ui.display = function(thing, data) {
  if (thing === "feeds") {
    let subscribedFeedsElem = document.getElementsByClassName("podcasts_feeds--subscribed")[0];
    subscribedFeedsElem.innerHTML = "";
    for (let i = 0, l = cbus.data.feeds.length; i < l; i++) {
      subscribedFeedsElem.appendChild(cbus.data.makeFeedElem(cbus.data.feeds[i], i));
    }
  } else if (thing === "episodes") {
    var listElem = document.getElementsByClassName("list--episodes")[0];

    for (let i = 0, l = Math.min(50, cbus.data.episodes.length); i < l; i++) {
      let episode = cbus.data.episodes[i];
      let feed = cbus.data.getFeedData({ url: episode.feedURL });

      if (feed && listElem.querySelectorAll(`[data-id="${episode.url}"]`).length === 0) { // we have feed info AND this episode doesn't yet have an element
        let episodeElem = document.createElement("cbus-episode");

        episodeElem.title = episode.title;
        episodeElem.date = moment(episode.date).calendar();
        episodeElem.feedUrl = feed.url;
        episodeElem.image = feed.image;
        episodeElem.feedTitle = feed.title;
        episodeElem.length = colonSeparateDuration(episode.length);
        episodeElem.description = decodeHTML(episode.description);
        episodeElem.url = episode.url;
        episodeElem.dataset.id = episode.id;

        if (cbus.data.episodesOffline.indexOf(episode.url) !== -1) {
          episodeElem.querySelector(".episode_button--download").textContent = "offline_pin";
        }
        if (cbus.data.episodeCompletedStatuses[episode.url] === true) {
          episodeElem.querySelector(".episode_button--completed").textContent = "check_circle";
        }

        listElem.insertBefore(episodeElem, listElem.children[i]); // what is now at index `i` will become `i + 1` after insertion
      }
    };
  } else if (thing === "player") {
    let feed = cbus.data.getFeedData({ url: data.feedURL });

    document.getElementsByClassName("player_detail_title")[0].textContent = data.title;
    document.getElementsByClassName("player_detail_feed-title")[0].textContent = feed.title;
    document.getElementsByClassName("player_detail_date")[0].textContent = moment(data.date).calendar();
    document.getElementsByClassName("player_detail_description")[0].innerHTML = data.description
      .trim()
      .replace(/\n/g, "<br>")
      .replace(/\d+:\d+(:\d+)*/g, "<span class='player_detail_description_timelink'>$&</span>");

    // switch to description tab
    cbus.ui.setPlayerTab(0);

    // first show podcast art, then switch to episode art (maybe different, maybe same) when it loads (if it exists)
    let playerImageElement = document.getElementsByClassName("player_detail_image")[0];
    if (feed.image === cbus.data.IMAGE_ON_DISK_PLACEHOLDER) {
      playerImageElement.style.backgroundImage =
        "url('file:///" + cbus.data.PODCAST_IMAGES_DIR.replace(/\\/g,"/") + "/" + sha1(feed.url) +".png')";
    } else if (typeof feed.image === "string") {
      playerImageElement.style.backgroundImage = `url(${feed.image})`;
    } else if (feed.image instanceof Blob) {
      playerImageElement.style.backgroundImage = `url(${ URL.createObjectURL(feed.image) })`;
    } else {
      playerImageElement.style.backgroundImage = "url('img/podcast_art_missing.svg')";
    }
    if (data.art) {
      Jimp.read(data.art, function(err, image) {
        if (!err) {
          if (cbus.data.getEpisodeData({ audioElement: cbus.audio.element }).id === data.id) {
            image.resize(150, 150)
              .getBase64(Jimp.AUTO, function(err, base64) {
                playerImageElement.style.backgroundImage = `url(${ base64 })`;
              });
          }
        }
      });
    }

    // description links open in new tab
    $(".player_detail_description a").attr("target", "_blank");

    // blur podcast art and show in player background
    let podcastImage = document.createElement("img");
    podcastImage.addEventListener("load", function() {
      let canvas = document.getElementById("player_blurred-image");
      canvas.width = document.getElementsByClassName("player")[0].getClientRects()[0].width;
      canvas.height = canvas.width;
      let ctx = canvas.getContext("2d");
      ctx.drawImage(podcastImage, 0, 0, canvas.width, canvas.height);
      stackBlurCanvasRGBA(canvas, 0, 0, canvas.width, canvas.height, 150) // canvas, top_x, top_y, width, height, radius
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
    if (feed.image === cbus.data.IMAGE_ON_DISK_PLACEHOLDER) {
      podcastImage.src = "file:///" + cbus.data.PODCAST_IMAGES_DIR.replace(/\\/g,"/") + "/" + sha1(feedUrl) +".png";
    } else if (typeof feed.image === "string") {
      podcastImage.src = feed.image;
    } else if (feed.image instanceof Blob) {
      podcastImage.src = URL.createObjectURL(feed.image);
    } else {
      podcastImage.src = "img/podcast_art_missing.svg";
    }

    /* display chapters */

    let chaptersListElem = document.getElementsByClassName("player_detail_chapters")[0];
    let playerDetailElem = document.getElementsByClassName("player_detail")[0];

    chaptersListElem.innerHTML = "";

    if (data.chapters.length > 0) {
      playerDetailElem.classList.remove("no-chapters");

      for (let i = 0, l = data.chapters.length; i < l; i++) {
        let chapterElem = document.createElement("div");
        chapterElem.classList.add("player_detail_chapter");
        chapterElem.dataset.index = i.toString();

        let chapterTitleElem = document.createElement("div");
        chapterTitleElem.classList.add("player_detail_chapter_title");
        chapterTitleElem.textContent = data.chapters[i].title;

        let chapterTimeElem = document.createElement("div");
        chapterTimeElem.classList.add("player_detail_chapter_time");
        chapterTimeElem.textContent = colonSeparateDuration(data.chapters[i].time);

        chapterElem.appendChild(chapterTitleElem);
        chapterElem.appendChild(chapterTimeElem);

        chaptersListElem.appendChild(chapterElem);
      }
    } else {
      playerDetailElem.classList.add("no-chapters");
    }
  }
};

cbus.ui.setPlayerTab = function(index) {
  var targetDetailBodyElem, targetTabElem;
  if (index === 0) {
    targetDetailBodyElem = document.getElementsByClassName("player_detail_description")[0];
    targetTabElem = document.getElementsByClassName("player_detail_tab--description")[0];
  } else if (index === 1) {
    targetDetailBodyElem = document.getElementsByClassName("player_detail_chapters")[0];
    targetTabElem = document.getElementsByClassName("player_detail_tab--chapters")[0];
  }
  $(".player_detail_body > *").addClass("not-visible");
  targetDetailBodyElem.classList.remove("not-visible");
  $(".player_detail_tab").removeClass("active");
  targetTabElem.classList.add("active");
};

cbus.ui.showSnackbar = function(content, type, buttons) {
  var n;

  if (!type) {
    var type = "notification";
  }

  n = noty({
    text: content,
    type: type,

    maxVisible: 50,

    animation: {
      open: { height: "toggle" },
      close: { height: "toggle" },
      easing: "swing",
      speed: 300
    },
    timeout: 5000,
    layout: "bottomLeft",
    theme: "material"
  });

  if (buttons && Array.isArray(buttons)) {
    n.$message.append("<div class='snackbar_buttons'></div>");
    for (button of buttons) {
      n.$message.find(".snackbar_buttons").append(
        $("<button class='snackbar_button'></button>").text(button.text).on("click", function() {
          button.onClick();
        })
      );
    }
  }

  return n;
};

cbus.ui.tabs = {};
cbus.ui.tabs.switch = function(options) {
  if (options.id || !Number.isNaN(options.index)) {
    var $target, $origin;

    if (options.id) {
      $target = $(".content#" + options.id);
      $origin = $("header nav a[data-target='" + options.id + "']");
    } else { // options.index
      $target = $(".content").eq(options.index);
      $origin = $("header nav a").eq(options.index);
    }

    /* show/hide contents */

    $(".content").removeClass("current"); // remove 'current' class from all tabs

    $target.removeClass("left");
    $target.removeClass("right");
    $target.addClass("current");

    var targetIndex = $target.parent().children().index($target);

    for (var i = 0; i < targetIndex; i++) {
      $target.parent().children().eq(i).removeClass("right");
      $target.parent().children().eq(i).addClass("left");
    }

    for (var i = targetIndex + 1; i < $target.parent().children().length; i++) {
      $target.parent().children().eq(i).removeClass("left");
      $target.parent().children().eq(i).addClass("right");
    }

    /* highlight/unhighlight nav buttons */

    $("header nav a").removeClass("current");
    $origin.addClass("current");

    /* show/hide header buttons */

    var scopeButtons = $("[data-scope='" + $target.attr("id") + "']");
    scopeButtons.addClass("visible");
    $(".header_action").not(scopeButtons).removeClass("visible");

    return;
  }
  return false;
};

cbus.ui.colorify = function(options) {
  var element = $(options.element);

  var colorThiefImage = document.createElement("img");
  colorThiefImage.onload = function() {
    var colorThief = new ColorThief();
    var colorRGB = colorThief.getColor(colorThiefImage);
    var colorRGBStr = "rgb(" + colorRGB.join(",") + ")";
    var colorL = 0.2126 * colorRGB[0] + 0.7152 * colorRGB[1] + 0.0722 * colorRGB[2];

    element.css({ backgroundColor: colorRGBStr });
    if (colorL < 158) {
      element.addClass("light-colors");
    } else {
      element.removeClass("light-colors");
    }
  };

  if (options.image === cbus.data.IMAGE_ON_DISK_PLACEHOLDER) {
    colorThiefImage.src = "file:///" + cbus.data.PODCAST_IMAGES_DIR.replace(/\\/g,"/") + "/" + sha1(options.feedUrl) +".png";
  } else if (options.image instanceof Blob) {
    colorThiefImage.src = URL.createObjectURL(options.image);
  } else if (typeof options.image === "string" || options.image instanceof String) {
    colorThiefImage.src = options.image;
  }
};

/* moving parts */

cbus.broadcast.listen("showPodcastDetail", function(e) {
  $("body").addClass("podcast-detail-visible"); // open sidebar without data

  // display
  $(".podcast-detail_header").css({ backgroundColor: "" });
  $(".podcast-detail_header_image").css({ backgroundImage: "" });
  $(".podcast-detail_header_title").empty();
  $(".podcast-detail_header_publisher").empty();
  $(".podcast-detail_control--toggle-subscribe").removeClass("subscribed").off("click");
  $(".podcast-detail_episodes").empty();
  $(".podcast-detail_header_description").empty();

  // setTimeout(function() {
  //   $(".content-container").on("click", function() {
  //     cbus.broadcast.send("hidePodcastDetail");
  //     $(".content-container").off("click");
  //   });
  // }, 10); // needs a timeout to work, for some reason

  $(".podcast-detail_header").removeClass("light-colors");
});

cbus.broadcast.listen("hidePodcastDetail", function(e) {
  document.body.classList.remove("podcast-detail-visible");
  cbus.data.state.podcastDetailCurrentData = { url: null };
});

cbus.broadcast.listen("gotPodcastData", function(e) {
  var feedData = cbus.data.getFeedData({ url: e.data.url });
  var podcastImage; // can be URL string or Blob
  podcastImage = feedData.image || e.data.image;

  let podcastImageElem = document.getElementsByClassName("podcast-detail_header_image")[0];
  if (podcastImage === cbus.data.IMAGE_ON_DISK_PLACEHOLDER) {
    podcastImageElem.style.backgroundImage =
      "url('file:///" + cbus.data.PODCAST_IMAGES_DIR.replace(/\\/g,"/") + "/" + sha1(feedData.url) +".png')";
  } else if (typeof podcastImage === "string") {
    podcastImageElem.style.backgroundImage = `url(${podcastImage})`;
  } else if (podcastImage instanceof Blob) {
    podcastImageElem.style.backgroundImage = `url(${ URL.createObjectURL(podcastImage) })`;
  }

  $(".podcast-detail_header_title").text(e.data.title);
  $(".podcast-detail_header_publisher").text(e.data.publisher);
  if (e.data.description) {
    $(".podcast-detail_header_description").text(removeHTMLTags(e.data.description));
  }

  if (cbus.data.feedIsSubscribed({ url: cbus.data.state.podcastDetailCurrentData.url })) {
    $(".podcast-detail_control--toggle-subscribe").addClass("subscribed");
  }
  $(".podcast-detail_control--toggle-subscribe").on("click", function() {
    var broadcastData = {
      url: cbus.data.state.podcastDetailCurrentData.url,
      image: e.data.image,
      title: e.data.title
    };

    cbus.broadcast.send("toggleSubscribe", broadcastData);
  });

  // colorify
  cbus.ui.colorify({
    image: podcastImage,
    feedUrl: feedData.url,
    element: $(".podcast-detail_header")
  });
});

(function(){
  let podcastDetailEpisodesElem = document.getElementsByClassName("podcast-detail_episodes")[0];

  cbus.broadcast.listen("gotPodcastEpisodes", function(e) {
    for (let i = 0, l = e.data.episodes.length; i < l; i++) {
      let episode = e.data.episodes[i];

      let elem = document.createElement("cbus-podcast-detail-episode");

      var description = decodeHTML(episode.description);
      var descriptionWords = description.split(" ");
      if (descriptionWords.length > 50) {
        descriptionWords.length = 50;
        description = descriptionWords.join(" ") + "…";
      }

      elem.setAttribute("title", episode.title);
      elem.setAttribute("date", moment(episode.date).calendar());
      elem.setAttribute("description", description);
      elem.setAttribute("id", episode.id);

      if (cbus.data.episodesOffline.indexOf(episode.url) !== -1) {
        elem.getElementsByClassName("podcast-detail_episode_button--download")[0].textContent = "offline_pin";
      }

      podcastDetailEpisodesElem.appendChild(elem);
    }
  });

  /* search within podcast */

  let podcastDetailSearchInput = document.getElementsByClassName("podcast-detail_control--search")[0];

  let handlePodcastDetailSearch = function(self) {
    if (podcastDetailEpisodesElem.children.length > 0) {
      let query = self.value.trim();
      if (query.length > 0) {
        let pattern = new RegExp(query, "i");
        for (let i = 0, l = podcastDetailEpisodesElem.children.length; i < l; i++) {
          let episodeElem = podcastDetailEpisodesElem.children[i];
          if (pattern.test(episodeElem.title) || pattern.test(episodeElem.description)) {
            episodeElem.classList.remove("hidden");
          } else {
            episodeElem.classList.add("hidden");
          }
        }
      } else {
        for (let i = 0, l = podcastDetailEpisodesElem.children.length; i < l; i++) {
          podcastDetailEpisodesElem.children[i].classList.remove("hidden");
        }
      }
    }
  };

  podcastDetailSearchInput.addEventListener("keydown", function(e) {
    if (e.keyCode === 13) {
      handlePodcastDetailSearch(this);
    }
  });

  podcastDetailSearchInput.addEventListener("input", function() {
    if (this.value.trim().length === 0) {
      handlePodcastDetailSearch(this);
    }
  });
}());

/* listen for queue change */
cbus.broadcast.listen("queueChanged", function() {
  if (cbus.audio.queue.length === 0) {
    document.body.classList.add("queue-empty");
  } else {
    document.body.classList.remove("queue-empty");
  }

  let queueListElem = document.getElementsByClassName("list--queue")[0];
  queueListElem.innerHTML = "";
  for (let i = 0, l = cbus.audio.queue.length; i < l; i++) {
    let queueItem = cbus.audio.queue[i];

    let data = cbus.data.getEpisodeData({ audioElement: queueItem });
    let feed = cbus.data.getFeedData({ url: data.feedURL });

    let queueItemElem = document.createElement("cbus-episode");

    queueItemElem.title = data.title;
    queueItemElem.feedTitle = feed.title;
    queueItemElem.feedUrl = feed.url;
    queueItemElem.length = colonSeparateDuration(data.length);
    queueItemElem.image = feed.image;
    queueItemElem.isQueueItem = true;
    queueItemElem.url = data.url;
    queueItemElem.description = data.description;
    queueItemElem.dataset.id = data.url;

    queueListElem.append(queueItemElem);
  }
}, true);

cbus.broadcast.listen("episodeEnqueue", function(e) {
  if (!e.data.hiddenEnqueue) {
    cbus.ui.showSnackbar(`Added '${e.data.episodeData.title}' to queue.`);
  }
});

/* listen for J, K/space, L keyboard shortcuts */
$(document).on("keypress", function(e) {
  if (e.target.tagName.toLowerCase() !== "input") {
    e.preventDefault();
    if (e.keyCode === KEYCODES.j || e.keyCode === KEYCODES.J) {
      cbus.audio.jump(cbus.audio.DEFAULT_JUMP_AMOUNT_BACKWARD);
    } else if (e.keyCode === KEYCODES.l || e.keyCode === KEYCODES.L) {
      cbus.audio.jump(cbus.audio.DEFAULT_JUMP_AMOUNT_FORWARD);
    } else if (
      e.keyCode === KEYCODES.k || e.keyCode === KEYCODES.K ||
      e.keyCode === KEYCODES._space
    ) {
      if (cbus.audio.element.paused) {
        cbus.audio.play();
      } else {
        cbus.audio.pause();
      }
    }
  }
});

// $(".settings_button--remove-duplicate-feeds").on("click", function() {
//   cbus.broadcast.send("removeDuplicateFeeds");
// });
//
// $(".settings_button--update-feed-artworks").on("click", function() {
//   cbus.broadcast.send("updateFeedArtworks");
// });

$(".settings_button--generate-opml").on("click", function() {
  cbus.broadcast.send("makeFeedsBackup");
});

$(".settings_button--import-opml").on("click", function() {
  cbus.broadcast.send("startFeedsImport");
});

$(".settings_button--update-feed-artworks").on("click", function() {
  cbus.broadcast.send("updateFeedArtworks");
});

$(".settings_button--manage-downloaded-episodes").on("click", function() {
  let downloadedEpisodesPath = cbus.data.OFFLINE_STORAGE_DIR;
  remote.shell.showItemInFolder(downloadedEpisodesPath);
});

document.getElementsByClassName("settings_version-string")[0].textContent = require(
  path.join(__dirname, "../..", "package.json")
).version;
document.getElementsByClassName("settings_licenses-link")[0].href = path.join(__dirname, "..", "licenses.html");
document.getElementsByClassName("settings_issue-reporter-link")[0].href = path.join(__dirname, "report-issue.html");
document.getElementsByClassName("settings_issue-reporter-link")[0].href = path.join(__dirname, "report-issue.html");

$(".podcast-detail_close-button").on("click", function() {
  cbus.broadcast.send("hidePodcastDetail");
});

cbus.ui.updateEpisodeOfflineIndicator = function(episodeURL) {
  let isDownloaded = (cbus.data.episodesOffline.indexOf(episodeURL) !== -1);

  let $episodeElems = $(`cbus-episode[data-id="${episodeURL}"]`);
  if (isDownloaded) {
    $episodeElems.find(".episode_button--download").text("offline_pin");
  } else {
    $episodeElems.find(".episode_button--download").text("file_download")
  }

  let $podcastEpisodeElems = $(`cbus-podcast-detail-episode[id="${episodeURL}"]`);
  if (isDownloaded) {
    $podcastEpisodeElems.find(".podcast-detail_episode_button--download").text("offline_pin");
  } else {
    $podcastEpisodeElems.find(".podcast-detail_episode_button--download").text("file_download")
  }
};

cbus.ui.updateEpisodeCompletedIndicator = function(episodeURL, completed) {
  console.log(episodeURL, completed)
  let $episodeElems = $(`cbus-episode[data-id="${episodeURL}"]`);
  let $podcastEpisodeElems = $(`cbus-podcast-detail-episode[id="${episodeURL}"]`);

  if (completed) {
    $episodeElems.find(".episode_button--completed").text("check_circle");
    $podcastEpisodeElems.find(".podcast-detail_episode_button--completed").text("check_circle");
  } else {
    $episodeElems.find(".episode_button--completed").text("check");
    $podcastEpisodeElems.find(".podcast-detail_episode_button--completed").text("check");
  }
};

cbus.broadcast.listen("episode_completed_status_change", function(e) {
  cbus.ui.updateEpisodeCompletedIndicator(e.data.id, e.data.completed);
});

/* waveform */

(function(){
  console.log("waveform");

  var canvas = document.querySelector("#player_waveform");
  var ctx = canvas.getContext("2d");

  canvas.height = 300; // arbitrary constant

  const CANVAS_BASELINE = canvas.height;
  const SKIP = 5;
  const CUTOFF = 0.7; // keep only first 70% of streamData
  var initTimeout;

  var audioStream;
  var recordingLength = 0;
  var sampleRate;
  var audioVolume = 0;
  var audioInput;
  var volume;
  var recorder;
  var columnWidth;
  var streamData;
  var animationFrameRequestID;

  var context = new AudioContext();

  let playerElem = document.getElementsByClassName("player")[0];

  function calculateCanvasDimens() {
    canvas.width = playerElem.getClientRects()[0].width;
    columnWidth = canvas.width / (streamData.length * CUTOFF - SKIP) * SKIP;
  }

  function startAnalyzing(audioInput, element) {
    // retrieve sample rate to be used for wav packaging
    sampleRate = context.sampleRate;

    // create gain node and analyser
    volume = context.createGain();

    var analyser = context.createAnalyser();
    analyser.fftSize = 256;

    // connect nodes
    audioInput.connect(volume);
    volume.connect(analyser);

    streamData = new Uint8Array(analyser.fftSize / 2);

    // lower values -> lower latency.
    // higher values -> avoid audio breakup and glitches
    var bufferSize = Math.pow(2, 8);
    recorder = context.createScriptProcessor(bufferSize, 2, 2);

    recorder.onaudioprocess = function(e) {
      // console.log("audioprocess");

      if (!element.paused && document.hasFocus()) {
        recordingLength += bufferSize;

        // get volume
        analyser.getByteFrequencyData(streamData);

        // console.log(streamData[0], streamData[Math.floor(bufferSize / 2)], streamData[bufferSize - 1]);
      }
    };

    calculateCanvasDimens();
    window.requestAnimationFrame(draw);

    // connect recorder
    volume.connect(recorder);
    recorder.connect(context.destination);

    audioInput.connect(context.destination);
  }

  // draw function
  function draw() {
    var streamDataSkipped = streamData.filter(function(datum, i, array) {
      if (i % SKIP === 0 && i <= CUTOFF * array.length) {
        return true;
      } else {
        return false;
      }
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";

    ctx.beginPath();
    ctx.moveTo(0, CANVAS_BASELINE);

    /* the following code block from "Foundation ActionScript 3.0 Animation: Making things move" (p. 95), via Homan (stackoverflow.com/a/7058606/3234159), modified. */
    // move to the first point
    ctx.lineTo(0, CANVAS_BASELINE - (streamDataSkipped[0] / 500 * canvas.height));

    for (i = 1; i < streamDataSkipped.length - 2; i++) {
      var xc = (i * columnWidth + (i + 1) * columnWidth) / 2;
      var yc = (CANVAS_BASELINE - (streamDataSkipped[i] / 500 * canvas.height) + CANVAS_BASELINE - (streamDataSkipped[i + 1] / 500 * canvas.height)) / 2;
      ctx.quadraticCurveTo(i * columnWidth, CANVAS_BASELINE - (streamDataSkipped[i] / 500 * canvas.height), xc, yc);
    }
    // curve through the last two points
    ctx.quadraticCurveTo(
      (streamDataSkipped.length - 2) * columnWidth,
      CANVAS_BASELINE - (streamDataSkipped[streamDataSkipped.length - 2] / 500 * canvas.height),
      (streamDataSkipped.length - 1) * columnWidth,
      CANVAS_BASELINE - (streamDataSkipped[streamDataSkipped.length - 1] / 500 * canvas.height)
    );
    /* end code block */

    ctx.lineTo(canvas.width, CANVAS_BASELINE);
    ctx.closePath();
    ctx.fill();

    animationFrameRequestID = window.requestAnimationFrame(draw);
  }

  function initWaveform() {
    console.log("initWaveform");

    try {
      audioInput = context.createMediaElementSource(cbus.audio.element);
    } catch (e) {
      console.log("media already connected");
    }

    startAnalyzing(audioInput, cbus.audio.element);
  }

  function resumeWaveform() {
    if (!animationFrameRequestID) {
      draw();
    }
  }

  function stopWaveform() {
    if (animationFrameRequestID) {
      window.cancelAnimationFrame(animationFrameRequestID);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      animationFrameRequestID = undefined;
    }

    // if (context) {
    //   context.close();
    // }

    // audioStream.getAudioTracks().forEach(function(track) {
    //   track.stop();
    // });

    // recorder.onaudioprocess = null;
  }

  window.onblur = function() {
    stopWaveform();
  };

  window.onfocus = function() {
    resumeWaveform();
  };

  window.addEventListener("resize", calculateCanvasDimens);

  // cbus.broadcast.listen("audio-play", initWaveform);
  // cbus.broadcast.listen("audio-pause", stopWaveform);
  // cbus.broadcast.listen("audio-stop", stopWaveform);
  cbus.broadcast.listen("audioChange", function() {
    stopWaveform();
    initWaveform();
  });
}());

/* filters */

document.getElementsByClassName("filters")[0].addEventListener("change", function(e) {
  let selectElem = e.target;
  let key = selectElem.name;
  let val = selectElem.value;
  console.log(key + ": " + val);

  let listItems = document.getElementsByClassName("list--episodes")[0].children;
  for (let i = 0, l = listItems.length; i < l; i++) {
    let elem = listItems[i];
    let data = cbus.data.getEpisodeData({ index: i });

    if (key === "date") {
      if (val === "any") {
        elem.classList.remove("hidden");
      } else {
        if (new Date() - new Date(data.date) <= Number(val) * 24 * 60 * 60 * 1000) { // convert days to ms
          elem.classList.remove("hidden");
        } else {
          elem.classList.add("hidden");
        }
      }
    } else if (key === "length") {
      if (val === "any") {
        elem.classList.remove("hidden");
      } else {
        if (data.length <= Number(val) * 60) { // * 60 because minutes
          elem.classList.remove("hidden");
        } else {
          elem.classList.add("hidden");
        }
      }
    } else if (key === "offline") {
      if (val === "any") {
        elem.classList.remove("hidden");
      } else if (val === "true") {
        if (cbus.data.episodesOffline.indexOf(data.url) !== -1) {
          elem.classList.remove("hidden");
        } else {
          elem.classList.add("hidden");
        }
      }
    } else if (key === "progress") {
      if (val === "any") {
        elem.classList.remove("hidden");
      } else {
        let progress = cbus.data.getEpisodeProgress(data.url);
        if (val === "partial") {
          if (progress.time > 0 && !progress.completed) {
            elem.classList.remove("hidden");
          } else {
            elem.classList.add("hidden");
          }
        } else if (val === "finished") {
          if (progress.completed) {
            elem.classList.remove("hidden");
          } else {
            elem.classList.add("hidden");
          }
        }
      }
    }
  }
});

cbus.broadcast.listen("offline_episodes_changed", function(info) {
  cbus.ui.updateEpisodeOfflineIndicator(info.data.episodeURL);
});

/* hide elements that are not on-screen (reduce draw times) */
// setInterval(function() {
//   var listElem = document.getElementsByClassName("list--episodes")[0];
//   var episodeElems = listElem.getElementsByTagName("cbus-episode");
//   var startIndex = Math.floor(listElem.scrollTop / 71) - 5; // 71px = height of episode elem
//   var endIndex = Math.ceil( (listElem.scrollTop + listElem.offsetHeight) / 71 ) + 5;
//   for (let i = 0; i < episodeElems.length; i++) {
//     if (i < startIndex || i > endIndex) {
//       episodeElems[i].classList.add("contents-hidden");
//     } else {
//       episodeElems[i].classList.remove("contents-hidden");
//     }
//   }
// }, 200);
