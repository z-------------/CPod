var cbus = {};

const xhr = function(options, callback) {
  var url, headers, timeout, responseType;

  if (typeof options === "object") {
    url = options.url;
    if (options.hasOwnProperty("headers")) { headers = options.headers; }
    if (options.hasOwnProperty("timeout")) { timeout = options.timeout; }
    if (options.hasOwnProperty("responseType")) { responseType = options.responseType; }
  } else {
    url = options;
  }

  let req = new XMLHttpRequest();

  req.onload = function(e) {
    var response;
    if (this.responseType === "text" || this.responseType === "") {
      response = this.responseText;
    } else {
      response = this.response;
    }
    callback(null, {
      statusCode: this.status,
      requestUrl: url
    }, response);
  };

  req.onerror = function(e) {
    callback(e, {
      statusCode: this.status,
      requestUrl: url
    }, null);
  };

  req.open("get", url, true);

  if (headers) {
    for (key in headers) {
      req.setRequestHeader(key, headers[key])
    }
  }
  if (timeout) {
    req.timeout = timeout;
  }
  if (responseType) {
    req.responseType = responseType;
  }

  req.send();
};

const statusCodeNotOK = function(statusCode) {
  let str = statusCode.toString();
  if (str[0] === "4" || str[0] === "5" || str === "0") return true;
  return false;
};

const colonSeparateDuration = function(num) { // in seconds
  if (typeof num == "number" && !(Number.isNaN || isNaN)(num)) {
    var hours = Math.floor(num / 60 / 60);
    var minutes = Math.floor(num / 60) - hours * 60;
    var seconds = Math.floor(num % 60);
    return (hours !== 0 ? "" + hours + ":" : "") + zpad(minutes, 2) + ":" + zpad(seconds, 2);
  } else {
    return "--:--";
  }
};

const zpad = function pad(n, width, z) { // by user Pointy on SO: stackoverflow.com/a/10073788
  z = z || "0";
  n = n + "";
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

const mergeObjects = function(a, b){
  var result = {};

  for (var key in a) {
    result[key] = a[key];
  }
  for (var key in b) {
    result[key] = b[key];
  }

  return result;
};

const arrayFindByKey = function(arr, key, val) {
  let results = [];

  for (let i = 0, l = arr.length; i < l; i++) {
    if (arr[i][key] === val) {
      results.push(arr[i]);
    }
  }

  return results;
};

const arrayFindByKeySingle = function(arr, key, val) {
  var result;

  for (let i = 0, l = arr.length; i < l; i++) {
    if (arr[i][key] === val) {
      result = arr[i];
      break;
    }
  }

  return result;
};

const arraysFindByKeySingle = function(arrays, key, value) {
  var result;
  for (let i = 0, l = arrays.length; i < l; i++) {
    let resultI = arrayFindByKeySingle(arrays[i], key, value);
    if (resultI) {
      result = resultI;
      break;
    }
  }
  return result;
};

const htmlTagsRegex = /(<([^>]+)>)/gi; // https://css-tricks.com/snippets/javascript/strip-html-tags-in-javascript/

const stripHTML = function(html) {
  if (html) {
    return html.replace(htmlTagsRegex, "");
  }
  return "";
};

const regexReplaceContextual = function(string, pattern, func) {
  while (pattern.exec(string)) {
    let match = pattern.exec(string);
    string = string.substring(0, match.index) + func(match[0]) + string.substring(match.index + match[0].length, string.length);
  }
  return string;
};

const unescapeHTML = function(html) {
  html = regexReplaceContextual(html, /&#\d+;/,
    v => String.fromCharCode(Number(v.substring(2, v.length - 1)))
  );
  html = regexReplaceContextual(html, /&#x\d+;/,
    v => String.fromCharCode(parseInt(v.substring(3, v.length - 1), 16))
  );
  return html;
};

const KEYCODES = {
  "0": 48,
  "1": 49,
  "2": 50,
  "3": 51,
  "4": 52,
  "5": 53,
  "6": 54,
  "7": 55,
  "8": 56,
  "9": 57,
  "A": 65,
  "B": 66,
  "C": 67,
  "D": 68,
  "E": 69,
  "F": 70,
  "G": 71,
  "H": 72,
  "I": 73,
  "J": 74,
  "K": 75,
  "L": 76,
  "M": 77,
  "N": 78,
  "O": 79,
  "P": 80,
  "Q": 81,
  "R": 82,
  "S": 83,
  "T": 84,
  "U": 85,
  "V": 86,
  "W": 87,
  "X": 88,
  "Y": 89,
  "Z": 90,
  "a": 97,
  "b": 98,
  "c": 99,
  "d": 100,
  "e": 101,
  "f": 102,
  "g": 103,
  "h": 104,
  "i": 105,
  "j": 106,
  "k": 107,
  "l": 108,
  "m": 109,
  "n": 110,
  "o": 111,
  "p": 112,
  "q": 113,
  "r": 114,
  "s": 115,
  "t": 116,
  "u": 117,
  "v": 118,
  "w": 119,
  "x": 120,
  "y": 121,
  "z": 122,
  "_space": 32
};

const localforageGetMulti = function(keys, callback) {
  let results = {};

  var gotCount = 0;
  let keysCount = keys.length;

  for (let i = 0, l = keys.length; i < l; i++) {
    localforage.getItem(keys[i]).then(function(r) {
      results[keys[i]] = r;
      gotCount++;
      if (gotCount === keysCount) {
        callback(results);
      }
    });
  }
};

const existsRecursive = function(root, path) {
  if (typeof root !== "object") {
    throw new TypeError("First argument must be an object")
  }
  var currentObject = root
  for (let i = 0, l = path.length; i < l; i++) {
    if (!currentObject.hasOwnProperty(path[i])) {
      return false
    }
    currentObject = currentObject[path[i]]
  }
  return true
}

const clamp = function(n, min, max) {
  if (n < min) return min;
  if (n > max) return max;
  return n;
};

const sha1 = function(message) {
  let hash = nodeCrypto.createHash("sha1");
  hash.update(message);
  return hash.digest("hex");
};

const rgbColorBrightness = function(rgbColor, brightness) {
  let r = clamp(Math.round(rgbColor[0] * brightness), 0, 255);
  let g = clamp(Math.round(rgbColor[1] * brightness), 0, 255);
  let b = clamp(Math.round(rgbColor[2] * brightness), 0, 255);
  return [r, g, b];
};

const round = function(n, d) {
  d = d || 1;
  return Math.round(n * 1 / d) * d;
};

const uniqueNumber = function() {
  return new Date().getTime() + Math.round(Math.random() * 999999);
};

const getElem = (function() {
  let cache = {};

  return function(query) {
    if (typeof query !== "string") throw new TypeError("argument must be a string");

    if (cache.hasOwnProperty(query)) {
      return cache[query];
    } else if (query.indexOf(" ") !== -1) {
      let elem = document.querySelector(query);
      cache[query] = elem;
      return elem;
    } else {
      var elem;
      if (query[0] === ".") {
        elem = document.getElementsByClassName(query.substring(1))[0];
      } else if (query[0] === "#") {
        elem = document.getElementById(query.substring(1));
      } else {
        elem = document.getElementsByTagName(query)[0];
      }
      cache[query] = elem;
      return elem;
    }
  };
}());
