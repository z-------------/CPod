cbus.ui = {};

cbus.ui.display = function(thing, data) {
  switch (thing) {
    case "feeds":
      $(".podcasts_feeds--subscribed").html("");
      cbus.data.feeds.forEach(function(feed, index) {
        $(".podcasts_feeds--subscribed").append(cbus.data.makeFeedElem(feed, index));
      });
      break;
    case "episodes":
      var listElem = document.querySelector(".list--episodes");

      for (var i = 0; i < Math.min(50, cbus.data.episodes.length); i++) {
        var episode = cbus.data.episodes[i];
        var feed = cbus.data.getFeedData({ url: episode.feedURL });

        if (listElem.querySelectorAll(`[data-id="${episode.url}"]`).length === 0) { // this episode doesn't yet have an element
          var episodeElem = document.createElement("cbus-episode");

          episodeElem.title = episode.title;
          episodeElem.date = moment(episode.date).calendar();
          episodeElem.image = feed.image;
          episodeElem.feedTitle = feed.title;
          episodeElem.description = decodeHTML(episode.description);
          episodeElem.url = episode.url;
          episodeElem.dataset.id = episode.id;

          listElem.insertBefore(episodeElem, listElem.children[i]); // what is now at index `i` will become `i + 1` after insertion
        }
      };

      break;
    case "player":
      var feed = cbus.data.getFeedData({ url: data.feedURL });

      $(".player_detail_title").text(data.title);
      $(".player_detail_feed-title").text(feed.title);
      $(".player_detail_date").text(moment(data.date).calendar());
      $(".player_detail_description").html(data.description);

      // first show podcast art, then switch to episode art (maybe different, maybe same) when it loads (if it exists)
      console.log(data.feedURL, feed, feed.image)
      if (typeof feed.image === "string") {
        $(".player_detail_image").css({ backgroundImage: `url(${feed.image})` });
      } else if (feed.image instanceof Blob) {
        $(".player_detail_image").css({ backgroundImage: `url(${ URL.createObjectURL(feed.image) })` });
      }
      if (data.art) {
        var episodeArtImage = document.createElement("img");
        episodeArtImage.addEventListener("load", function() {
          console.log( "loaded episode art", data.art );
          if (cbus.data.getEpisodeData({ audioElement: cbus.audio.element }).id === data.id) {
            $(".player_detail_image").css({ backgroundImage: `url(${data.art})` });
          }
        });
        episodeArtImage.src = data.art;
      }

      // description links open in new tab
      $(".player_detail_description a").attr("target", "_blank");

      // blur podcast art and show in player background
      var podcastImage = document.createElement("img");
      podcastImage.addEventListener("load", function() {
        var canvas = document.getElementById("player_blurred-image");
        canvas.width = document.querySelector(".player").getClientRects()[0].width;
        canvas.height = canvas.width;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(podcastImage, 0, 0, canvas.width, canvas.height);
        stackBlurCanvasRGBA(canvas, 0, 0, canvas.width, canvas.height, 150) // canvas, top_x, top_y, width, height, radius
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });
      if (typeof feed.image === "string") {
        podcastImage.src = feed.image;
      } else if (feed.image instanceof Blob) {
        podcastImage.src = URL.createObjectURL(feed.image);
      }
  }
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

  if (options.image instanceof Blob) {
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
  podcastImage = feedData.image;
  if (typeof podcastImage === "string") {
    $(".podcast-detail_header_image").css({ backgroundImage: `url(${podcastImage})` });
  } else if (podcastImage instanceof Blob) {
    $(".podcast-detail_header_image").css({ backgroundImage: `url(${ URL.createObjectURL(podcastImage) })` });
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
    element: $(".podcast-detail_header")
  });
});

cbus.broadcast.listen("gotPodcastEpisodes", function(e) {
  for (episode of e.data.episodes) {
    var elem = document.createElement("cbus-podcast-detail-episode");

    var description = decodeHTML(episode.description);
    var descriptionWords = description.split(" ");
    if (descriptionWords.length > 50) {
      descriptionWords.length = 50;
      description = descriptionWords.join(" ") + "…";
    }

    $(elem).attr("title", episode.title);
    $(elem).attr("date", moment(episode.date).calendar());
    $(elem).attr("description", description);
    $(elem).attr("id", episode.id);
    $(".podcast-detail_episodes").append(elem);
  }
});

/* listen for queue change */
cbus.broadcast.listen("queueChanged", function() {
  if (cbus.audio.queue.length === 0) {
    $(document.body).addClass("queue-empty");
  } else {
    $(document.body).removeClass("queue-empty");
  }

  $(".list--queue").html("");
  for (queueItem of cbus.audio.queue) {
    var data = cbus.data.getEpisodeData({ audioElement: queueItem });
    var feed = cbus.data.getFeedData({ url: data.feedURL });

    var queueItemElem = document.createElement("cbus-episode");

    queueItemElem.title = data.title;
    queueItemElem.feedTitle = feed.title;
    queueItemElem.image = feed.image;
    queueItemElem.isQueueItem = true;
    queueItemElem.url = data.url;
    queueItemElem.description = data.description;

    $(".list--queue").append(queueItemElem);
  }
}, true);

/* listen for J and L keyboard shortcuts */
$(document).on("keypress", function(e) {
  if (e.target.tagName.toLowerCase() !== "input") {
    if (e.keyCode === KEYCODES.j || e.keyCode === KEYCODES.J) {
      cbus.audio.jump(cbus.audio.DEFAULT_JUMP_AMOUNT_BACKWARD);
    } else if (e.keyCode === KEYCODES.l || e.keyCode === KEYCODES.L) {
      cbus.audio.jump(cbus.audio.DEFAULT_JUMP_AMOUNT_FORWARD);
    } else if (e.keyCode === KEYCODES.k || e.keyCode === KEYCODES.K) {
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

$(".podcast-detail_close-button").on("click", function() {
  cbus.broadcast.send("hidePodcastDetail");
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

  function calculateCanvasDimens() {
    canvas.width = document.querySelector(".player").getClientRects()[0].width;
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

$(".filters").on("change", function(e) {
  var selectElem = e.target;
  var key = selectElem.name;
  var val = selectElem.value;
  console.log(key + ": " + val);

  $("#stream .list--episodes cbus-episode").each(function(i, elem) {
    var $elem = $(elem);
    var data = cbus.data.getEpisodeData({ index: i });

    switch (key) {
      case "date":
        if (val === "any") {
          $elem.removeClass("hidden");
        } else {
          if (new Date() - new Date(data.date) <= Number(val) * 24 * 60 * 60 * 1000) { // convert days to ms
            $elem.removeClass("hidden");
          } else {
            $elem.addClass("hidden");
          }
        }
        break;
      case "length":
        if (val === "any") {
          $elem.removeClass("hidden");
        } else {
          if (data.length <= Number(val) * 60) { // * 60 because minutes
            $elem.removeClass("hidden");
          } else {
            $elem.addClass("hidden");
          }
        }
        break;
    }
  });
});

/* hide elements that are not on-screen (reduce draw times) */
setInterval(function() {
  var listElem = document.getElementsByClassName("list--episodes")[0];
  var episodeElems = listElem.getElementsByTagName("cbus-episode");
  var startIndex = Math.floor(listElem.scrollTop / 71) - 5; // 71px = height of episode elem
  var endIndex = Math.ceil( (listElem.scrollTop + listElem.offsetHeight) / 71 ) + 5;
  for (let i = 0; i < episodeElems.length; i++) {
    if (i < startIndex || i > endIndex) {
      episodeElems[i].classList.add("contents-hidden");
    } else {
      episodeElems[i].classList.remove("contents-hidden");
    }
  }
}, 200);
