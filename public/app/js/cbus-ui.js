cbus.ui = {};

cbus.ui.playerElement = document.getElementsByClassName("player")[0];
cbus.ui.videoCanvasElement = document.getElementsByClassName("player_video-canvas")[0];
cbus.ui.videoCanvasContext = cbus.ui.videoCanvasElement.getContext("2d");
cbus.ui.browserWindow = remote.getCurrentWindow();
cbus.ui.firstrunContainerElem = document.getElementsByClassName("firstrun-container")[0];
cbus.ui.homeListElem = document.getElementsByClassName("list--episodes")[0];
cbus.ui.playerBlurredImageCanvas = document.getElementById("player_blurred-image");
cbus.ui.playerBlurredImageCtx = cbus.ui.playerBlurredImageCanvas.getContext("2d");
cbus.ui.queueListElem = document.getElementsByClassName("list--queue")[0];
cbus.ui.mediaElemsContainer = getElem(".audios");
cbus.ui.settingsLocaleSelectElem = document.getElementsByClassName("settings_select--locale")[0];
cbus.ui.subscriptionsSectionElem = document.getElementById("podcasts");
cbus.ui.exploreSectionElem = document.getElementById("explore");
cbus.ui.exploreRegionSelectElem = document.getElementById("explore-region-select");

cbus.ui.currentFilters = {
  date: "any", length: "any", offline: "any", progress: "any"
};

cbus.ui.displayFeeds = function(data) {
  let subscribedFeedsElem = document.getElementsByClassName("podcasts_feeds--subscribed")[0];
  subscribedFeedsElem.innerHTML = "";
  for (let i = 0, l = cbus.data.feeds.length; i < l; i++) {
    subscribedFeedsElem.appendChild(cbus.ui.makeFeedElem(cbus.data.feeds[i], i));
  }
};

cbus.ui.displayEpisodes = function(data) {
  var startIndex = 0;
  var endIndex = Math.min(cbus.const.STREAM_PAGE_LENGTH, cbus.data.episodes.length);
  if (data && data.afterIndex) {
    startIndex = data.afterIndex;
    endIndex = Math.min(startIndex + cbus.const.STREAM_PAGE_LENGTH, cbus.data.episodes.length);
  }
  if (data && data.untilLastDisplayedEpisode) {
    endIndex = cbus.data.episodes.indexOf(
      cbus.data.getEpisodeData({
        id: [].slice.call(cbus.ui.homeListElem.getElementsByClassName("episode")).reverse()[0].dataset.id
      })
    );
  }

  // // old buggy code for removing old date seps
  // let dateSeparatorElems = cbus.ui.homeListElem.getElementsByClassName("list_date-separator");
  // for (let i = 0, l = dateSeparatorElems.length; i < l; i++) {
  //   let listChildren = [].slice.call(cbus.ui.homeListElem.children);
  //   let elemIndex = listChildren.indexOf(dateSeparatorElems[i]);
  //   if (elemIndex >= startIndex - 1 && elemIndex < endIndex) {
  //     cbus.ui.homeListElem.removeChild(dateSeparatorElems[i]);
  //   }
  // }

  for (let i = startIndex; i < endIndex; i++) {
    let episode = cbus.data.episodes[i];
    let feed = cbus.data.getFeedData({ url: episode.feedURL });

    var elem;
    let matchingElem = cbus.ui.homeListElem.querySelector(`[data-id="${episode.url}"]`);

    if (feed && !matchingElem) { // we have feed info AND this episode doesn't yet have an element
      elem = cbus.ui.makeEpisodeElem({
        title: episode.title,
        date: episode.date,
        feedUrl: feed.url,
        image: feed.image,
        feedTitle: feed.title,
        length: episode.length,
        description: episode.description,
        url: episode.url,
        index: i
      });

      let episodeAfterElem = cbus.ui.homeListElem.getElementsByClassName("episode")[i];
      if (episodeAfterElem && episodeAfterElem.previousSibling && episodeAfterElem.previousSibling.classList.contains("list_date-separator")) {
        let dateSepDate = new Date(episodeAfterElem.previousSibling.dataset.dateSeparatorDate);
        if (datePeriodStart(dateSepDate) <= datePeriodStart(episode.date)) {
          cbus.ui.homeListElem.insertBefore(elem, episodeAfterElem.previousSibling); // before the date sep
        } else {
          cbus.ui.homeListElem.insertBefore(elem, episodeAfterElem); // after the date sep
        }
      } else {
        cbus.ui.homeListElem.insertBefore(elem, episodeAfterElem);
      }
    } else if (feed) {
      elem = matchingElem;
    }

    /* think about inserting date separator before corresponding element */
    let interval = cbus.settings.data.homeDateSeparatorInterval;
    if (interval !== "none") {
      let previousEpisodeInfo = cbus.data.episodes[i - 1];
      if (!previousEpisodeInfo) {
        if (!cbus.ui.getDateSeparatorElem(interval, episode.date)) {
          cbus.ui.insertDateSeparatorElem({
            interval, date: episode.date, elemAfter: elem
          });
        }
      } else if (previousEpisodeInfo.date > episode.date) {
        let prevDate = previousEpisodeInfo.date;

        let insert = false;
        if (interval === "day") {
          if (
            prevDate.getDate() !== episode.date.getDate() ||
            prevDate.getMonth() !== episode.date.getMonth() ||
            prevDate.getYear() !== episode.date.getYear()
          ) insert = true;
        } else if (interval === "month") {
          if (
            prevDate.getMonth() !== episode.date.getMonth() ||
            prevDate.getYear() !== episode.date.getYear()
          ) insert = true;
        }
        if (insert && !cbus.ui.getDateSeparatorElem(interval, episode.date)) {
          cbus.ui.insertDateSeparatorElem({
            interval, date: episode.date, elemAfter: elem
          });
        }
      }
    }
  }
  cbus.ui.applyFilters(cbus.ui.currentFilters);
  cbus.data.state.loadingNextHomePage = false;
};

cbus.ui.displayPlayer = function(data) {
  let feed = cbus.data.getFeedData({ url: data.feedURL });

  cbus.ui.playerElement.getElementsByClassName("player_detail_title")[0].textContent = data.title;
  cbus.ui.playerElement.getElementsByClassName("player_detail_feed-title")[0].textContent = feed.title;
  cbus.ui.playerElement.getElementsByClassName("player_detail_date")[0].textContent = moment(data.date).calendar();

  var descriptionFormatted = data.description ? data.description.trim() : "";
  // sanitize
  descriptionFormatted = sanitizeHTML(descriptionFormatted);
  // fix line breaks
  if (
    descriptionFormatted.toLowerCase().indexOf("<br>") === -1 &&
    descriptionFormatted.toLowerCase().indexOf("<br />") === -1 &&
    descriptionFormatted.toLowerCase().indexOf("<p>") === -1
  ) {
    descriptionFormatted = descriptionFormatted.replace(/\n\s*\n/g, "<br><br>")
  }
  // time links
  descriptionFormatted = descriptionFormatted
    .replace(
      /\d+:\d+(:\d+)*/g,
      "<span class='player_detail_description_timelink'>$&</span>"
    );
  // autolink
  cbus.ui.playerElement.getElementsByClassName("player_detail_description")[0].innerHTML = autolinker.link(descriptionFormatted);

  // switch to description tab
  cbus.ui.setPlayerTab(0);

  // first show podcast art, then switch to episode art (maybe different, maybe same) when it loads (if it exists)
  let playerImageElement = cbus.ui.playerElement.getElementsByClassName("player_detail_image")[0];
  let imageURI = cbus.data.getPodcastImageURI(feed);
  if (imageURI) {
    playerImageElement.style.backgroundImage = "url('" + imageURI + "')";
  } else {
    playerImageElement.style.backgroundImage = "url('" + cbus.const.IMAGE_MISSING_PLACEHOLDER_PATH + "')";
  }
  if (data.art) {
    xhr({
      url: data.art,
      responseType: "arraybuffer"
    }, (err, status, imageBuffer) => {
      Jimp.read(Buffer.from(imageBuffer), function(err, image) {
        if (!err) {
          if (cbus.data.getEpisodeData({ audioElement: cbus.audio.element }).id === data.id) {
            image.cover(cbus.const.PODCAST_ART_SIZE, cbus.const.PODCAST_ART_SIZE)
              .getBase64(Jimp.AUTO, function(err, base64) {
                playerImageElement.style.backgroundImage = `url(${ base64 })`;
              });
          }
        }
      });
    });
  }

  // description links open in browser
  let aElems = cbus.ui.playerElement.querySelectorAll(".player_detail_description a");
  for (let i = 0, l = aElems.length; i < l; i++) {
    aElems[i].addEventListener("click", function(e) {
      e.preventDefault();
      remote.shell.openExternal(this.href);
    });
  }

  // blur podcast art and show in player background
  let podcastImage = document.createElement("img");
  podcastImage.addEventListener("load", function() {
    let size
      = cbus.ui.playerBlurredImageCanvas.width
      = cbus.ui.playerElement.getClientRects()[0].width;
    cbus.ui.playerBlurredImageCanvas.height = size;
    cbus.ui.playerBlurredImageCtx.drawImage(podcastImage, 0, 0, size, size);
    stackBlurCanvasRGBA(cbus.ui.playerBlurredImageCanvas, 0, 0, size, size, 150); // canvas, top_x, top_y, width, height, radius
    cbus.ui.playerBlurredImageCtx.fillStyle = "rgba(0, 0, 0, 0.3)";
    cbus.ui.playerBlurredImageCtx.fillRect(0, 0, size, size);
    cbus.ui.playerBlurredImageCanvas.toBlob((blob) => {
      cbus.ui.playerElement.style.backgroundImage = `url('${ URL.createObjectURL(blob) }')`;
    });
  });
  podcastImage.src = imageURI || cbus.const.IMAGE_MISSING_PLACEHOLDER_PATH;

  /* display chapters */

  let chaptersListElem = cbus.ui.playerElement.getElementsByClassName("player_detail_chapters")[0];
  let playerDetailElem = cbus.ui.playerElement.getElementsByClassName("player_detail")[0];

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

  /* switch to video mode if appropriate */
  if (data.isVideo) {
    cbus.ui.playerElement.classList.add("video-mode");
  } else {
    cbus.ui.playerElement.classList.remove("video-mode");
  }

  /* send episode title and podcast title to main */
  ipcRenderer.send("nowPlayingInfo", {
    episodeTitle: data.title,
    podcastTitle: feed.title
  });
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
    for (let i = 0, l = buttons.length; i < l; i++) {
      n.$message.find(".snackbar_buttons").append(
        $("<button class='snackbar_button'></button>").text(buttons[i].text).on("click", function() {
          buttons[i].onClick();
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
  let colorThiefImage = document.createElement("img");
  colorThiefImage.onload = function() {
    let colorThief = new ColorThief();
    let colorRGB = rgbColorBrightness(colorThief.getColor(colorThiefImage), options.brightness || 1);
    let colorRGBStr = "rgb(" + colorRGB.join(",") + ")";
    let colorL = 0.2126 * colorRGB[0] + 0.7152 * colorRGB[1] + 0.0722 * colorRGB[2];

    options.element.style.backgroundColor = colorRGBStr;
    if (colorL < 158) {
      options.element.classList.add("light-colors");
    } else {
      options.element.classList.remove("light-colors");
    }
  };

  colorThiefImage.src = cbus.data.getPodcastImageURI({
    image: options.image,
    url: options.feedUrl
  });
};

cbus.ui.makeDateSeparatorElem = function(interval, date) {
  let elem = document.createElement("div");

  elem.classList.add("list_date-separator");
  elem.dataset.dateSeparatorInterval = interval;
  elem.dataset.dateSeparatorDate = date.toISOString();

  var format;
  if (interval === "day") {
    format = "LL";
  } else if (interval === "month") {
    format = "MMMM";
  }

  let spanElem = document.createElement("span");
  spanElem.textContent = moment(date).format(format);
  elem.appendChild(spanElem);

  elem.innerHTML += "<button class='button material-icons md-24 list_date-separator_mark-played-button'>check</button>";

  return elem;
};

cbus.ui.getDateSeparatorElem = function(interval, date) {
  let dateSeparatorElems = cbus.ui.homeListElem.getElementsByClassName("list_date-separator");

  let checkDate;
  if (interval === "day") {
    checkDate = function(elemDate) {
      return elemDate.getDate() === date.getDate() && elemDate.getMonth() === date.getMonth() && elemDate.getYear() === date.getYear();
    };
  } else if (interval === "month") {
    checkDate = function(elemDate) {
      return elemDate.getMonth() === date.getMonth() && elemDate.getYear() === date.getYear();
    };
  }

  for (let i = 0; i < dateSeparatorElems.length; i++) {
    let elemDate = new Date(dateSeparatorElems[i].dataset.dateSeparatorDate);
    if (checkDate(elemDate)) {
      return dateSeparatorElems[i];
    }
  }

  return null;
};

cbus.ui.insertDateSeparatorElem = function(options) {
  let interval = options.interval;
  let date = options.date;
  let elemAfter = options.elemAfter;

  let dateSepElem = cbus.ui.makeDateSeparatorElem(interval, date);
  cbus.ui.homeListElem.insertBefore(dateSepElem, elemAfter);

  // remove any unneeded leftover date sep
  if (dateSepElem.previousSibling && dateSepElem.previousSibling.classList.contains("list_date-separator")) {
    cbus.ui.homeListElem.removeChild(dateSepElem.previousSibling);
  }
};

cbus.ui.makeFeedElem = function(data, index, isExplore) {
  let elem = document.createElement("div");

  if (isExplore) {
    elem.classList.add("explore_feed");
  } else {
    elem.classList.add("podcasts_feed");
  }

  elem.dataset.index = index;
  let overlayElem = document.createElement("div");
  overlayElem.classList.add("feed_overlay");
  let titleSafe = stripHTMLQuick(data.title);
  overlayElem.innerHTML = `
<div class="title" title="${titleSafe}">${titleSafe}</div>
<div>
  <div class='podcasts_control podcasts_control--subscription'></div>
  <div class='podcasts_control podcasts_control--view-details'>${i18n.__("button_view_podcast_details")}</div>
</div>
  `;
  let overlaySubscribeButton = overlayElem.getElementsByClassName("podcasts_control--subscription")[0];
  let overlayDetailsButton = overlayElem.getElementsByClassName("podcasts_control--view-details")[0];

  elem.appendChild(overlayElem);

  if (isExplore) {
    elem.dataset.title = data.title;
    elem.dataset.url = data.url;
    elem.dataset.image = data.image;
    elem.dataset.url = data.url;
    elem.style.backgroundImage = `url( ${data.image} )`;

    overlaySubscribeButton.classList.add("podcasts_control--subscribe");
    overlaySubscribeButton.textContent = i18n.__("button_subscribe");

    overlaySubscribeButton.onclick = function() {
      cbus.data.subscribeFeeds([{
        title: data.title,
        url: data.url,
        image: data.image
      }], {
        showModal: true
      });
    };
  } else {
    elem.style.backgroundImage = "url('" + cbus.data.getPodcastImageURI(data) + "')";

    overlaySubscribeButton.classList.add("podcasts_control--unsubscribe");
    overlaySubscribeButton.textContent = i18n.__("button_unsubscribe");

    overlaySubscribeButton.onclick = function() {
      let feedData = cbus.data.getFeedData({
        index: Number(elem.dataset.index)
      });

      cbus.data.unsubscribeFeed({ url: feedData.url }, true);
    };
  }

  overlayDetailsButton.onclick = function() {
    var url;
    if (data.url) {
      url = data.url;
    } else {
      url = cbus.data.getFeedData({
        index: $(".podcasts_feeds--subscribed .podcasts_feed").index($(this))
      }).url;
    }
    cbus.broadcast.send("showPodcastDetail", {
      url: url
    });
  };

  return elem;
};

(function() {
  let template = document.createElement("div");
  template.classList.add("episode");
  template.innerHTML = '<div class="episode_top">\
    <div class="episode_info-button"></div>\
    <div class="episode_info">\
      <div class="episode_image"></div>\
      <div class="episode_text">\
        <h3 class="episode_title"></h3>\
        <div class="episode_meta-container">\
          <span class="episode_feed-title"></span> •\
          <span class="episode_length"></span>\
        </div>\
      </div>\
    </div>\
    <div class="episode_buttons">\
      <button class="button episode_button episode_button--completed material-icons md-24">check</button>\
      <button class="button episode_button episode_button--download material-icons md-24">file_download</button>\
      <button class="button episode_button episode_button--enqueue material-icons md-24">playlist_add</button>\
      <button class="button episode_button episode_button--remove-from-queue material-icons md-24">remove_circle</button>\
      <button class="button episode_button episode_button--play material-icons md-24">play_arrow</button>\
    </div>\
  </div>\
  <div class="episode_bottom">\
    <div class="episode_date">\
      <a target="_blank"></a>\
    </div>\
    <div class="episode_description"></div>\
  </div>';

  cbus.ui.makeEpisodeElem = function(info) {
    let elem = template.cloneNode(true);
    elem.dataset.id = info.url;
    if (info.hasOwnProperty("index")) {
      elem.dataset.index = info.index;
    }

    elem.getElementsByClassName("episode_title")[0].textContent = info.title;
    elem.getElementsByClassName("episode_feed-title")[0].textContent = info.feedTitle;
    elem.getElementsByClassName("episode_length")[0].textContent = colonSeparateDuration(info.length);
    elem.getElementsByClassName("episode_image")[0].style.backgroundImage = `url('${cbus.data.getPodcastImageURI({
      url: info.feedUrl, image: info.image
    })}')`;
    elem.getElementsByClassName("episode_title")[0].setAttribute("title", info.title);
    let dateElem = elem.getElementsByClassName("episode_date")[0].children[0];
    dateElem.setAttribute("href", info.url);
    dateElem.textContent = info.date ? moment(info.date).calendar() : "";
    elem.getElementsByClassName("episode_description")[0].innerHTML = autolinker.link(unescapeHTML(stripHTML(info.description)));

    if (info.isQueueItem) {
      elem.getElementsByClassName("episode_button--enqueue")[0].style.display = "none";
    } else {
      elem.getElementsByClassName("episode_button--remove-from-queue")[0].style.display = "none";
    }

    if (cbus.data.episodesOffline.indexOf(info.url) !== -1) {
      elem.getElementsByClassName("episode_button--download")[0].textContent = "offline_pin";
    }
    if (cbus.data.episodeCompletedStatuses[info.url] === true) {
      elem.getElementsByClassName("episode_button--completed")[0].textContent = "check_circle";
    }

    return elem;
  };
}());

(function() {
  let template = document.createElement("div");
  template.classList.add("podcast-detail_episode");
  template.innerHTML = '<div class="podcast-detail_episode_container">\
    <div class="podcast-detail_episode_info">\
      <h3 class="podcast-detail_episode_title"></h3>\
      <div class="podcast-detail_episode_description-container no-style">\
        <div class="podcast-detail_episode_date"></div>\
        <p class="podcast-detail_episode_description"></p>\
      </div>\
    </div>\
    <div class="podcast-detail_episode_buttons">\
      <button class="button podcast-detail_episode_button podcast-detail_episode_button--play material-icons md-36">play_arrow</button>\
      <button class="button podcast-detail_episode_button podcast-detail_episode_button--enqueue material-icons md-36">playlist_add</button>\
      <button class="button podcast-detail_episode_button podcast-detail_episode_button--download material-icons md-36">file_download</button>\
    </div>\
  </div>';

  cbus.ui.makePodcastDetailEpisodeElem = function(info) {
    let elem = template.cloneNode(true);

    let descriptionTrimmed = unescapeHTML(stripHTML(info.description).trim());
    elem.dataset.title = info.title;
    elem.dataset.description = descriptionTrimmed;
    if (descriptionTrimmed.length > 250) { // 50 * avg word length in English
      descriptionTrimmed = descriptionTrimmed.substring(0, 250) + "…";
    }

    elem.getElementsByClassName("podcast-detail_episode_title")[0].textContent = info.title;
    elem.getElementsByClassName("podcast-detail_episode_date")[0].textContent = moment(info.date).calendar();
    elem.getElementsByClassName("podcast-detail_episode_description")[0].textContent = descriptionTrimmed;

    elem.getElementsByClassName("podcast-detail_episode_button--play")[0].onclick = function() {
      cbus.audio.setElement(document.querySelector(".audios [data-id='" + info.id + "']"));
      cbus.audio.play();
    };
    elem.getElementsByClassName("podcast-detail_episode_button--enqueue")[0].onclick = function() {
      cbus.audio.enqueue(document.querySelector(".audios [data-id='" + info.id + "']"));
    };
    elem.getElementsByClassName("podcast-detail_episode_button--download")[0].onclick = function() {
      cbus.data.downloadEpisode(document.querySelector(".audios [data-id='" + info.id + "']"));
    };

    return elem;
  };
}());

cbus.ui.setFullscreen = function(fullscreenOn) {
  document.body.classList[fullscreenOn ? "add" : "remove"]("video-fullscreen");
  cbus.ui.browserWindow.setFullScreen(fullscreenOn);
};

cbus.ui.updateThumbarButtons = function() {
  if (cbus.audio.element) {
    cbus.ui.browserWindow.setThumbarButtons([{
      tooltip: cbus.audio.element.paused ? i18n.__("button_playback-play") : i18n.__("button_playback-pause"),
      icon: path.join(__dirname, "img", `ic_${cbus.audio.element.paused ? "play_arrow" : "pause"}_white_24dp_1x.png`),
      click: cbus.audio.element.paused ? cbus.audio.play : cbus.audio.pause
    }, {
      tooltip: i18n.__("button_playback-next"),
      icon: path.join(__dirname, "img", `ic_skip_next_${cbus.audio.queue.length ? "white" : "black"}_24dp_1x.png`),
      flags: [ cbus.audio.queue.length ? "enabled" : "disabled" ],
      click: function() { cbus.audio.playQueueItem(0) }
    }]);
  }
};

(function() {
  let progressBars = [];
  let progressBarContainerElem = document.getElementsByClassName("progressbar-container")[0];

  let progressBarTemplate = document.createElement("div");
  progressBarTemplate.classList.add("progressbar");
  progressBarTemplate.innerHTML = `
<span class="progressbar_label"></span>
<div class="progressbar_lower">
<div class="progressbar_bar-container">
  <div class="progressbar_bar"></div>
</div>
<div class="progressbar_actions"></div>
</div>
  `;

  let progressBarActionTemplate = document.createElement("button");
  progressBarActionTemplate.classList.add("progressbar_action", "button", "material-icons", "md-18");

  cbus.ui.progressBar = function(id, options) {
    options = options || {};

    var progressBarElem;

    if (progressBars.indexOf(id) === -1) { // make new progress bar
      progressBars.push(id);
      progressBarElem = progressBarTemplate.cloneNode(true);
      progressBarElem.dataset.id = id;
      progressBarContainerElem.appendChild(progressBarElem);
      progressBarElem.classList.add("shown");
    } else { // update existing progress bar
      progressBarElem = progressBarContainerElem.querySelector(`[data-id="${id}"]`);
    }

    if (options.hasOwnProperty("remove") && options.remove === true) {
      let index = progressBars.indexOf(id);
      progressBars.splice(index, 1);
      setTimeout(function() {
        progressBarElem.classList.remove("shown");
        setTimeout(function() {
          progressBarContainerElem.removeChild(progressBarElem);
        }, 300);
      }, 1000);
    }
    if (options.hasOwnProperty("progress")) {
      progressBarElem.getElementsByClassName("progressbar_bar")[0].style.width = `${Math.floor(options.progress * 100)}%`;
      if (options.progress === 1) {
        progressBarElem.classList.add("complete");
      }
    }
    if (options.hasOwnProperty("label")) {
      progressBarElem.getElementsByClassName("progressbar_label")[0].textContent = options.label;
    }
    if (options.hasOwnProperty("actions")) {
      let actionsContainerElem = progressBarElem.getElementsByClassName("progressbar_actions")[0];
      actionsContainerElem.innerHTML = "";
      for (let i = 0; i < options.actions.length; i++) {
        let action = options.actions[i];
        let actionElem = progressBarActionTemplate.cloneNode(true);
        actionElem.textContent = action.icon;
        actionElem.addEventListener("click", e => {
          action.handler(id);
        });
        actionsContainerElem.appendChild(actionElem);
      }

      progressBarElem.classList.add("has-actions");
    } else {
      progressBarElem.classList.remove("has-actions");
    }
  };
}());

/* moving parts */

(function() { // developer.mozilla.org/en-US/docs/Web/Events/resize
  var throttle = function(type, name, obj) {
    obj = obj || window;
    var running = false;
    var func = function() {
      if (running) { return; }
      running = true;
      requestAnimationFrame(function() {
        obj.dispatchEvent(new CustomEvent(name));
        running = false;
      });
    };
    obj.addEventListener(type, func);
  };

  throttle("resize", "resize_throttled");
  throttle("scroll", "scroll_throttled", cbus.ui.homeListElem);
})();

cbus.broadcast.listen("audioChange", (e) => {
  if (!e.data.isVideo) {
    cbus.ui.setFullscreen(false);
  }

  cbus.ui.firstrunContainerElem.classList.remove("visible");
});

cbus.broadcast.listen("audioBufferStart", (e) => {
  cbus.ui.playerElement.getElementsByClassName("player_slider")[0].classList.add("buffering");
});
cbus.broadcast.listen("audioBufferEnd", (e) => {
  cbus.ui.playerElement.getElementsByClassName("player_slider")[0].classList.remove("buffering");
});

cbus.broadcast.listen("showPodcastDetail", function(e) {
  $("body").addClass("podcast-detail-visible"); // open sidebar without data

  // display
  $(".podcast-detail_header").css({ backgroundColor: "" });
  $(".podcast-detail_header_image").css({ backgroundImage: "" });
  $(".podcast-detail_header_title").empty();
  $(".podcast-detail_header_publisher").empty();
  $(".podcast-detail_control--toggle-subscribe").removeClass("subscribed").off("click");
  document.querySelector(".podcast-detail_control--mark-all-played").onclick = null;
  $(".podcast-detail_control--hide-if-not-subscribed").removeClass("hidden");
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
  podcastImageElem.style.backgroundImage =
    "url('" + cbus.data.getPodcastImageURI({
      url: feedData.url, image: podcastImage
    }) + "')";

  $(".podcast-detail_header_title").text(e.data.title);
  $(".podcast-detail_header_publisher").text(e.data.publisher);
  if (e.data.description) {
    $(".podcast-detail_header_description").text(unescapeHTML(stripHTML(e.data.description).trim()));
  }

  if (cbus.data.feedIsSubscribed({ url: cbus.data.state.podcastDetailCurrentData.url })) {
    $(".podcast-detail_control--toggle-subscribe").addClass("subscribed");
  } else {
    $(".podcast-detail_control--hide-if-not-subscribed").addClass("hidden");
  }
  $(".podcast-detail_control--toggle-subscribe").on("click", function() {
    var broadcastData = {
      url: cbus.data.state.podcastDetailCurrentData.url,
      image: e.data.image,
      title: e.data.title
    };

    cbus.broadcast.send("toggleSubscribe", broadcastData);
  });

  document.querySelector(".podcast-detail_control--mark-all-played").onclick = function() {
    let episodeIDs = arrayFindByKey(cbus.data.episodes, "feedURL", feedData.url).map(episode => episode.url);
    cbus.data.batchMarkAsPlayed(episodeIDs);
  };

  // colorify
  cbus.ui.colorify({
    image: podcastImage,
    feedUrl: feedData.url,
    element: document.getElementsByClassName("podcast-detail_header")[0],
    brightness: 0.9
  });
});

(function(){
  let podcastDetailEpisodesElem = document.getElementsByClassName("podcast-detail_episodes")[0];

  cbus.broadcast.listen("gotPodcastEpisodes", function(e) {
    e.data.episodes.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    for (let i = 0, l = e.data.episodes.length; i < l; i++) {
      let episode = e.data.episodes[i];

      let elem = cbus.ui.makePodcastDetailEpisodeElem({
        title: episode.title,
        description: episode.description,
        date: episode.date,
        id: episode.id
      });

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
          if (pattern.test(episodeElem.dataset.title) || pattern.test(episodeElem.dataset.description)) {
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

cbus.broadcast.listen("subscribe-success", e => {
  if (e.data === cbus.data.state.podcastDetailCurrentData.url) {
    $(".podcast-detail_control--hide-if-not-subscribed").removeClass("hidden");
  }
})

/* listen for queue change */
cbus.broadcast.listen("queueChanged", function(e) {
  if (!e.data.fromUI) {
    if (cbus.audio.queue.length === 0) {
      document.body.classList.add("queue-empty");
    } else {
      document.body.classList.remove("queue-empty");
    }

    cbus.ui.queueListElem.innerHTML = "";
    for (let i = 0, l = cbus.audio.queue.length; i < l; i++) {
      let queueItem = cbus.audio.queue[i];

      let data = cbus.data.getEpisodeData({ audioElement: queueItem });
      let feed = cbus.data.getFeedData({ url: data.feedURL });

      let queueItemElem = cbus.ui.makeEpisodeElem({
        title: data.title,
        feedTitle: feed.title,
        feedUrl: feed.url,
        length: data.length,
        image: feed.image,
        isQueueItem: true,
        url: data.url,
        description: data.description
      });

      cbus.ui.queueListElem.append(queueItemElem);
    }

    sortable(cbus.ui.queueListElem); // reload queue sortable
  }
}, true);

cbus.broadcast.listen("episodeEnqueue", function(e) {
  if (!e.data.hiddenEnqueue) {
    cbus.ui.showSnackbar(i18n.__("snackbar_added-to-queue", e.data.episodeData.title));
  }
});

/* set up queue sortable */
sortable(cbus.ui.queueListElem, { items: ".episode" });
sortable(cbus.ui.queueListElem)[0].addEventListener("sortupdate", function(e) {
  let episodeElems = cbus.ui.queueListElem.getElementsByClassName("episode");
  for (let i = 0, l = episodeElems.length; i < l; i++) {
    let mediaElem = cbus.ui.mediaElemsContainer.querySelector("[data-id='" + episodeElems[i].dataset.id + "']");
    cbus.audio.queue.splice(i, 1, mediaElem);
  }
  cbus.broadcast.send("queueChanged", { fromUI: true });
});

/* listen for space keyboard shortcut */
$(document).on("keypress", function(e) {
  if (e.target.tagName.toLowerCase() !== "input") {
    e.preventDefault();
    if (e.keyCode === KEYCODES._space) {
      cbus.audio.playpause();
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
  let downloadedEpisodesPath = cbus.settings.data.downloadDirectory;
  remote.shell.openItem(downloadedEpisodesPath);
});

getElem(".settings_button--open-config-dir").addEventListener("click", e => {
  remote.shell.openItem(cbus.const.USERDATA_PATH);
});

document.getElementsByClassName("settings_version-string")[0].textContent = package.version;
document.getElementsByClassName("settings_licenses-link")[0].href = path.join(__dirname, "..", "licenses.html");
document.getElementsByClassName("settings_button--open-devtools")[0].addEventListener("click", e => {
  cbus.ui.browserWindow.webContents.openDevTools();
});
document.getElementById("settings").addEventListener("click", e => {
  if (e.target.tagName === "A" && e.target.hasAttribute("href")) {
    e.preventDefault();
    const href = e.target.getAttribute("href");
    const link = isUrl(href) ? href : fileUrl(href);
    remote.shell.openExternal(link);
  }
});
getElem(".settings_buy-me-a-coffee-link").addEventListener("click", function(e) {
  e.preventDefault();
  remote.shell.openExternal(this.getAttribute("href"));
});
fs.readFile(path.join(__dirname, "..", "contributors.txt"), "utf8", (err, data) => {
  if (err) throw err;

  let contributors = [];
  let lines = data.split("\n");
  for (let line of lines) {
    let trimmed = line.trim();
    if (trimmed.length && trimmed[0] !== "#") {
      contributors.push(trimmed);
    }
  }
  let contributorHTMLs = contributors.map(username => `<a href="https://github.com/${username}">${username}</a>`);
  document.getElementsByClassName("settings_contributors-list")[0].innerHTML = "<strong>" + i18n.__("text_contributors").replace(" ", "&nbsp;") + "</strong>" + contributorHTMLs.join(i18n.__("punc_listing_comma"));
});

/* populate settings locale select */

(function() {
  let availableLocales = i18n.getAvailableLocales(true); // canonical only
  for (let i = 0, l = availableLocales.length; i < l; i++) {
    let optionElem = document.createElement("option");
    optionElem.setAttribute("value", availableLocales[i]);
    optionElem.textContent = i18n.readLocaleFile(availableLocales[i]).__locale_name__;
    cbus.ui.settingsLocaleSelectElem.appendChild(optionElem);
  }
}());

/* settings */

(function() {
  let mappingPairElemTemplate = document.createElement("div");
  mappingPairElemTemplate.innerHTML = '\
<div class="settings_label">\
<div class="settings_label_left"><input type="text" placeholder="--"/></div>\
<div class="settings_label_right"><select></select></div>\
</div>\
  ';
  function makeMappingPairElem(settingKey, valueOptions, key, value) {
    let elem = mappingPairElemTemplate.cloneNode(true);
    elem.getElementsByTagName("input")[0].value = key;
    let selectElem = elem.getElementsByTagName("select")[0];
    for (let i = 0, l = valueOptions.length; i < l; i++) {
      let optionElem = document.createElement("option");
      optionElem.setAttribute("value", valueOptions[i]);
      optionElem.textContent = i18n.__("label_keyboard-shortcuts_action_" + valueOptions[i]);
      selectElem.appendChild(optionElem);
    }
    if (value) selectElem.value = value;
    return elem;
  }

  let settingsElems = document.querySelectorAll("[data-setting-key]");
  for (let i = 0, l = settingsElems.length; i < l; i++) {
    let elem = settingsElems[i];

    if (elem.dataset.settingType === "mapping") {
      let map = cbus.settings.data[elem.dataset.settingKey];
      let valueOptions = elem.dataset.settingValueoptions.split(";");
      for (let key in map) {
        elem.appendChild(makeMappingPairElem(elem.dataset.settingKey, valueOptions, key, map[key]));
      }
      // plus an empty one
      elem.appendChild(makeMappingPairElem(elem.dataset.settingKey, valueOptions, "", null));

      elem.addEventListener("change", e => {
        var newMap = {};
        let inputElems = elem.getElementsByTagName("input");
        let selectElems = elem.getElementsByTagName("select");
        for (let j = 0, m = inputElems.length; j < m; j++) {
          if (inputElems[j].value) {
            newMap[inputElems[j].value] = selectElems[j].value;
          }
        }
        cbus.settings.writeSetting(elem.dataset.settingKey, newMap, err => {
          // TODO: put the snackbar stuff into the writeSetting function itself
          if (err) {
            cbus.ui.showSnackbar(i18n.__("snackbar_setting-save-fail"), "error");
          } else if (typeof elem.dataset.settingNeedrestart !== "undefined") {
            cbus.ui.showSnackbar(i18n.__("snackbar_setting-save-success-restart"));
          } else {
            cbus.ui.showSnackbar(i18n.__("snackbar_setting-save-success"));
          }
        });

        if (inputElems[inputElems.length - 1].value !== "") {
          // add a new empty mapping row
          elem.appendChild(makeMappingPairElem(elem.dataset.settingKey, valueOptions, "", null));
        }
      });
    } else {
      if (elem.getAttribute("type") === "checkbox") {
        elem.checked = cbus.settings.data[elem.dataset.settingKey];
      } else {
        elem.value = cbus.settings.data[elem.dataset.settingKey];
      }

      elem.addEventListener("change", e => {
        var isValid = true;
        var typedValue = e.target.value;
        if (elem.dataset.settingType) {
          if (elem.dataset.settingType === "number") {
            typedValue = Number(e.target.value);
            isValid = !Number.isNaN(typedValue);
          } else if (elem.dataset.settingType === "boolean") {
            typedValue = e.target.checked;
          }
        }
        if (isValid) {
          cbus.settings.writeSetting(elem.dataset.settingKey, typedValue, err => {
            // TODO: put the snackbar stuff into the writeSetting function itself
            if (err) {
              cbus.ui.showSnackbar(i18n.__("snackbar_setting-save-fail"), "error");
            } else if (typeof elem.dataset.settingNeedrestart !== "undefined") {
              cbus.ui.showSnackbar(i18n.__("snackbar_setting-save-success-restart"));
            } else {
              cbus.ui.showSnackbar(i18n.__("snackbar_setting-save-success"));
            }
          });
        }
      });
    }
  }
}());

document.getElementById("settingDownloadDirectoryBrowseButton").addEventListener("click", e => {
  remote.dialog.showOpenDialog(cbus.ui.browserWindow, {
    defaultPath: cbus.settings.data.downloadDirectory,
    properties: [ "openDirectory", "createDirectory" ]
  }, filePaths => {
    let settingElem = document.querySelector("[data-setting-key=downloadDirectory]");
    settingElem.value = filePaths[0];
    let changeEvent = document.createEvent("HTMLEvents");
    changeEvent.initEvent("change", false, true);
    settingElem.dispatchEvent(changeEvent);
  });
});

/* end settings */

$(".podcast-detail_close-button").on("click", function() {
  cbus.broadcast.send("hidePodcastDetail");
});

cbus.ui.updateEpisodeOfflineIndicator = function(episodeURL) {
  let isDownloaded = (cbus.data.episodesOffline.indexOf(episodeURL) !== -1);

  let $episodeElems = $(`.episode[data-id="${episodeURL}"]`);
  if (isDownloaded) {
    $episodeElems.find(".episode_button--download").text("offline_pin");
  } else {
    $episodeElems.find(".episode_button--download").text("file_download")
  }

  let $podcastEpisodeElems = $(`.podcast-detail_episode[id="${episodeURL}"]`);
  if (isDownloaded) {
    $podcastEpisodeElems.find(".podcast-detail_episode_button--download").text("offline_pin");
  } else {
    $podcastEpisodeElems.find(".podcast-detail_episode_button--download").text("file_download")
  }
};

cbus.ui.updateEpisodeCompletedIndicator = function(episodeURL, completed) {
  let $episodeElems = $(`.episode[data-id="${episodeURL}"]`);
  let $podcastEpisodeElems = $(`.podcast-detail_episode[id="${episodeURL}"]`);

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

if (cbus.settings.data.enableWaveformVisualization) {
  (function(){
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

    let connectedElements = [];

    function calculateCanvasDimens() {
      canvas.width = cbus.ui.playerElement.getClientRects()[0].width;
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
        if (!element.paused && document.hasFocus()) {
          recordingLength += bufferSize;

          // get volume
          analyser.getByteFrequencyData(streamData);

          // console.log(streamData[0], streamData[Math.floor(bufferSize / 2)], streamData[bufferSize - 1]);
        }
      };

      calculateCanvasDimens();
      animationFrameRequestID = window.requestAnimationFrame(draw);

      // connect recorder
      volume.connect(recorder);
      recorder.connect(context.destination);

      // make the audio still play on speakers
      audioInput.connect(context.destination);

      // add element to list of connected elements
      connectedElements.push(element);
    }

    // draw function
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";

      ctx.beginPath();
      ctx.moveTo(0, CANVAS_BASELINE);

      /* the following code block from "Foundation ActionScript 3.0 Animation: Making things move" (p. 95), via Homan (stackoverflow.com/a/7058606/3234159), modified. */
      // move to the first point
      ctx.lineTo(0, CANVAS_BASELINE - (streamData[0] / 500 * canvas.height));

      for (let i = SKIP, l = streamData.length * CUTOFF * SKIP; i < l; i += SKIP) {
        let xc = (i / SKIP * columnWidth + (i / SKIP + 1) * columnWidth) / 2;
        let yc = (CANVAS_BASELINE - (streamData[i] / 500 * canvas.height) + CANVAS_BASELINE - (streamData[i + SKIP] / 500 * canvas.height)) / 2;
        ctx.quadraticCurveTo(i / SKIP * columnWidth, CANVAS_BASELINE - (streamData[i] / 500 * canvas.height), xc, yc);
      }
      /* end code block */

      ctx.lineTo(canvas.width, CANVAS_BASELINE);
      ctx.closePath();
      ctx.fill();

      animationFrameRequestID = window.requestAnimationFrame(draw);
    }

    function initWaveform() {
      // try {
      //   audioInput = context.createMediaElementSource(cbus.audio.element);
      // } catch (e) {
      //   // console.log("media already connected");
      // }

      if (connectedElements.indexOf(cbus.audio.element) === -1) {
        audioInput = context.createMediaElementSource(cbus.audio.element);
        startAnalyzing(audioInput, cbus.audio.element);
      } else {
        animationFrameRequestID = window.requestAnimationFrame(draw);
      }
    }

    function resumeWaveform() {
      if (!animationFrameRequestID && streamData) {
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

      // if (recorder) {
      //   recorder.onaudioprocess = null;
      // }
    }

    window.onblur = function() {
      stopWaveform();
    };

    window.onfocus = function() {
      resumeWaveform();
    };

    window.addEventListener("resize_throttled", calculateCanvasDimens);

    // cbus.broadcast.listen("audio-play", initWaveform);
    // cbus.broadcast.listen("audio-pause", stopWaveform);
    // cbus.broadcast.listen("audio-stop", stopWaveform);
    cbus.broadcast.listen("audioChange", function() {
      stopWaveform();
      initWaveform();
    });
  }());
}

cbus.ui.resizeVideoCanvas = function() {
  if (document.body.classList.contains("video-fullscreen")) {
    cbus.ui.videoCanvasElement.height = window.screen.height;
    cbus.ui.videoCanvasElement.width = window.screen.height * 16 / 9;
  } else {
    cbus.ui.videoCanvasElement.width = cbus.ui.playerElement.getClientRects()[0].width;
    cbus.ui.videoCanvasElement.height = cbus.ui.videoCanvasElement.width * 9 / 16;
  }
};

window.addEventListener("resize_throttled", cbus.ui.resizeVideoCanvas);
cbus.ui.resizeVideoCanvas();

cbus.ui.homeListElem.addEventListener("scroll_throttled", (e) => {
  if (
    Math.ceil(e.target.scrollTop + e.target.offsetHeight) === e.target.scrollHeight &&
    !cbus.data.state.loadingNextHomePage
  ) {
    cbus.data.state.loadingNextHomePage = true;

    let afterIndex = Number(cbus.ui.homeListElem.children[cbus.ui.homeListElem.children.length - 1].dataset.index);
    cbus.ui.displayEpisodes({
      afterIndex: afterIndex
    });
    cbus.data.updateMedias({
      afterIndex: afterIndex
    });
  }
});

/* filters */

cbus.ui.satisfiesFilters = function(data, filters) {
  let dayToMS = 24 * 60 * 60 * 1000;
  /*
  filters: {
    date: "any" | Number days,
    length: "any" | Number minutes,
    offline: "any" | "true",
    progress: "any" | "unplayed" | "partial" | "finished"
  }
  */
  if (typeof filters.date === "number") {
    if (new Date() - new Date(data.date) > filters.date * dayToMS) {
      return false;
    }
  }
  if (typeof filters.length === "number") {
    if (data.length > filters.length * 60) {
      return false;
    }
  }
  if (filters.offline === "true") {
    if (cbus.data.episodesOffline.indexOf(data.url) === -1) {
      return false;
    }
  }
  if (filters.progress !== "any") {
    let progress = cbus.data.getEpisodeProgress(data.url);
    if (filters.progress === "unplayed") {
      if (!(!progress || !progress.time && !progress.completed)) {
        return false;
      }
    } else if (filters.progress === "partial") {
      if (!(progress.time > 0 && !progress.completed)) {
        return false;
      }
    } else if (filters.progress === "finished") {
      if (!progress.completed) {
        return false;
      }
    }
  }
  return true;
};

cbus.ui.applyFilters = function(filters) {
  let listItems = cbus.ui.homeListElem.getElementsByClassName("episode");
  for (let i = 0, l = listItems.length; i < l; i++) {
    let elem = listItems[i];
    let data = cbus.data.getEpisodeData({ index: i });
    if (cbus.ui.satisfiesFilters(data, cbus.ui.currentFilters)) {
      elem.classList.remove("hidden");
    } else {
      elem.classList.add("hidden");
    }
  }
};

document.getElementsByClassName("filters")[0].addEventListener("change", function(e) {
  let selectElems = this.children;
  for (let i = 0, l = selectElems.length; i < l; i++) {
    let selectElem = selectElems[i];
    if (selectElem.value !== "any" && (selectElem.name === "date" || selectElem.name === "length")) {
      cbus.ui.currentFilters[selectElem.name] = Number(selectElem.value);
    } else {
      cbus.ui.currentFilters[selectElem.name] = selectElem.value;
    }
  }
  cbus.ui.applyFilters(cbus.ui.currentFilters);
});

/* end filters */

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

i18n.doDOMReplacement();

tippy(".header_nav a", {
  placement: "right",
  animation: "shift-away",
  arrow: true,
  delay: [500, 0]
});

(function() {
  let playerTogglesElem = document.getElementsByClassName("player-toggles")[0];

  playerTogglesElem.addEventListener("input", (e) => {
    if (e.target.classList.contains("player-toggles_speed")) {
      cbus.audio.setPlaybackRate(Number(e.target.value));
    }
  });

  playerTogglesElem.addEventListener("change", (e) => {
    if (e.target.classList.contains("player-toggles_speed")) {
      localforage.setItem("cbus_playback_speed", Number(e.target.value));
    }
  });

  cbus.broadcast.listen("playbackRateChanged", (e) => {
    playerTogglesElem.getElementsByClassName("player-toggles_speed")[0].value = e.data;
  });

  tippy(document.getElementsByClassName("player_button--toggles")[0], {
    html: playerTogglesElem,
    trigger: "click",
    interactive: true,
    placement: "bottom-end",
    animation: "shift-away",
    arrow: true
  });

  localforage.getItem("cbus_playback_speed").then((r) => {
    if (r) {
      playerTogglesElem.getElementsByClassName("player-toggles_speed")[0].value = r;
      cbus.audio.element.playbackRate = r;
    }
  });
}());

cbus.ui.handlePopularPodcasts = function(popularPodcastInfos) {
  let popularPodcastsElem = document.getElementsByClassName("explore_feeds--popular")[0];
  popularPodcastsElem.innerHTML = "";

  if (!popularPodcastInfos) {
    popularPodcastsElem.classList.add("load-failed");
  } else {
    for (let i = 0, l = popularPodcastInfos.length; i < l; i++) {
      popularPodcastsElem.appendChild(
        cbus.ui.makeFeedElem(popularPodcastInfos[i], i, true)
      );
      cbus.data.feedsCache.push(popularPodcastInfos[i]);
    }
  }
};

(function() {
  var isoMap = countries.getNames(i18n.getCanonicalLocale().split("_")[0]);
  if (Object.keys(isoMap).length === 0) {
    isoMap = countries.getNames("en");
  }
  let isoCodes = Object.keys(isoMap);
  isoCodes.sort(function(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });

  for (let isoCode of isoCodes) {
    let optionElem = document.createElement("option");
    optionElem.setAttribute("value", isoCode.toLowerCase());
    optionElem.textContent = isoCode;
    cbus.ui.exploreRegionSelectElem.appendChild(optionElem);
  }

  // initial value is set in the localforage part of main.js

  cbus.ui.exploreRegionSelectElem.addEventListener("change", e => {
    let region = e.target.value;

    localforage.setItem("cbus_explore_region_cache", region);

    document.getElementsByClassName("explore_feeds--popular")[0].innerHTML = "";

    cbus.server.getPopularPodcasts({
      region: region,
      ignoreCache: true
    }, cbus.ui.handlePopularPodcasts);
  });
}());

/* register keyboard shortcuts */

for (let keyboardShortcut in cbus.settings.data.keyboardShortcuts) {
  let actionName = cbus.settings.data.keyboardShortcuts[keyboardShortcut];
  // possible actionName: playpause, skip-backward{,-short,-long}, skip-forward{,-short,-long}, next
  var action;
  switch (actionName) {
    case "playpause":
      action = cbus.audio.playpause;
      break;
    case "skip-backward-short":
      action = function() { cbus.audio.jump(- cbus.settings.data.skipAmountBackwardShort) };
      break;
    case "skip-backward":
      action = function() { cbus.audio.jump(- cbus.settings.data.skipAmountBackward) };
      break;
    case "skip-backward-long":
      action = function() { cbus.audio.jump(- cbus.settings.data.skipAmountBackwardLong) };
      break;
    case "skip-forward-short":
      action = function() { cbus.audio.jump(cbus.settings.data.skipAmountForwardShort) };
      break;
    case "skip-forward":
      action = function() { cbus.audio.jump(cbus.settings.data.skipAmountForward) };
      break;
    case "skip-forward-long":
      action = function() { cbus.audio.jump(cbus.settings.data.skipAmountForwardLong) };
      break;
    case "next":
      action = function() { cbus.audio.playQueueItem(0) };
      break;
    case "speed-increase":
      action = function() {
        cbus.audio.setPlaybackRate(round(cbus.audio.element.playbackRate + 0.1, 0.1));
      };
      break;
    case "speed-decrease":
      action = function() {
        cbus.audio.setPlaybackRate(round(cbus.audio.element.playbackRate - 0.1, 0.1));
      };
      break;
  }
  Mousetrap.bind(keyboardShortcut, action);
}

Mousetrap.bind("esc", function() {
  cbus.broadcast.send("hidePodcastDetail");
});

/* global shortcuts */

if (cbus.settings.data.globalMediaKeysEnable) {
  ipcRenderer.on("globalShortcut", (e, accelerator) => {
    switch (accelerator) {
      case "mediaplaypause":
        cbus.audio.playpause();
        break;
      case "medianexttrack":
        cbus.audio.playQueueItem(0);
        break;
      // case "mediaprevioustrack":
      //   cbus.audio.playHistoryItem(0);
      //   break;
      default:
        console.log(`received unhandled globalShortcut "${accelerator}"`);
    }
  });
}

/* playback controls from tray menu */

ipcRenderer.on("playbackControl", (e, action) => {
  switch (action) {
    case "playpause":
      cbus.audio.playpause();
      break;
    case "next":
      cbus.audio.playQueueItem(0);
      break;
    // case "mediaprevioustrack":
    //   cbus.audio.playHistoryItem(0);
    //   break;
    default:
      console.log(`received unhandled playbackControl "${action}"`);
  }
});

/* menu for macOS */

if (os.platform() === "darwin") {
  let { app, Menu } = remote;

  let template = [{
    label: "CPod",
    submenu: [{
      role: "services", submenu: []
    }, {
      type: "separator"
    }, {
      role: "hide"
    }, {
      role: "hideothers"
    }, {
      role: "unhide"
    }, {
      type: "separator"
    }, {
      role: "quit"
    }]
  }, {
    label: "Edit",
    submenu: [{
      role: "undo"
    }, {
      role: "redo"
    }, {
      type: "separator"
    }, {
      role: "cut"
    }, {
      role: "copy"
    }, {
      role: "paste"
    }, {
      role: "pasteandmatchstyle"
    }, {
      role: "delete"
    }, {
      role: "selectall"
    }, {
      type: "separator"
    }, {
      label: "Speech",
      submenu: [{
        role: "startspeaking"
      }, {
        role: "stopspeaking"
      }]
    }]
  }, {
    label: "View",
    submenu: [{
      role: "reload"
    }, {
      role: "forcereload"
    }, {
      role: "toggledevtools"
    }]
  }, {
    role: "window",
    submenu: [{
      role: "close"
    }, {
      role: "minimize"
    }, {
      role: "zoom"
    }, {
      type: "separator"
    }, {
      role: "front"
    }]
  }, {
    role: "help",
    submenu: [{
      label: i18n.__("settings_button_report-issue"),
      click: function() {
        remote.shell.openExternal("https://github.com/z-------------/cumulonimbus/issues");
      }
    }]
  }];

  let menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/* dark mode, custom scrollbar */

(function() {
  let themeKeys = {
    "darkMode": "theme-dark",
    "customScrollbar": "custom-scrollbar"
  };

  function applyThemes() {
    for (let key in themeKeys) {
      document.body.classList[cbus.settings.data[key] ? "add" : "remove"](themeKeys[key]);
    }
  }

  applyThemes();

  cbus.broadcast.listen("settingChanged", e => {
    if (themeKeys.hasOwnProperty(e.data.key)) {
      applyThemes();
    }
  });
}());
