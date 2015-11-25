var cbus = {};

var xhr = function(url, callback) {
    var oReq = new XMLHttpRequest();
    oReq.onload = function(e){
        callback(this.responseText, e);
    };
    oReq.open("get", url, true);
    oReq.send();
};

var colonSeparateDuration = function(num) { // in seconds
    if (typeof num == "number" && !(Number.isNaN || isNaN)(num)) {
        var hours = Math.floor(num / 60 / 60);
        var minutes = Math.floor(num / 60) - hours * 60;
        var seconds = Math.floor(num % 60);
        return (hours !== 0 ? "" + hours + ":" : "") + zpad(minutes, 2) + ":" + zpad(seconds, 2);
    } else {
        return "--:--";
    }
};

var zpad = function pad(n, width, z) { // by user Pointy on SO: stackoverflow.com/a/10073788
    z = z || "0";
    n = n + "";
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

var mergeObjects = function(a, b){
    var result = {};

    for (var key in a) {
        result[key] = a[key];
    }
    for (var key in b) {
        result[key] = b[key];
    }

    return result;
};

var arrayFindByKey = function(arr, pair) {
    var key = Object.keys(pair)[0];
    var val = pair[key];

    var results = [];

    for (item of arr) {
        if (item[key] === val) {
            results.push(item);
        }
    }

    return results;
};

var decodeHTML = function(html) {
    var elem = document.createElement("div");
    elem.innerHTML = html;
    return elem.textContent;
};

var removeHTMLTags = function(html) {
    return html.replace(/(<([^>]+)>)/ig, ""); // css-tricks.com/snippets/javascript/strip-html-tags-in-javascript
};
