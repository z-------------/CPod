cbus.const = {};

cbus.const.podcastSort = function(a, b) {
  var re = new RegExp("the |a ", "gi");

  var aTitle = a.title.replace(re, "").toLowerCase();
  var bTitle = b.title.replace(re, "").toLowerCase();

  if (aTitle < bTitle) return -1;
  if (aTitle > bTitle) return 1;
  return 0;
};

cbus.const.USERDATA_PATH = remote.app.getPath("userData");
cbus.const.OFFLINE_STORAGE_DIR = path.join(cbus.const.USERDATA_PATH, "offline_episodes");
cbus.const.PODCAST_IMAGES_DIR = path.join(cbus.const.USERDATA_PATH, "podcast_images");

cbus.const.IMAGE_ON_DISK_PLACEHOLDER = "__cbus_image_on_disk__";

cbus.const.PODCAST_ART_SIZE = 200;

cbus.const.urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/; // https://stackoverflow.com/a/3809435/
cbus.const.videoMimeRegex = /video\/\w+/gi;
