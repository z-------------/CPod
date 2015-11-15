cbus.const = {
    podcastSort: function(a, b) {
        var re = new RegExp("the |a ", "gi");

        var aTitle = a.title.replace(re, "").toLowerCase();
        var bTitle = b.title.replace(re, "").toLowerCase();

        if (aTitle < bTitle) return -1;
        if (aTitle > bTitle) return 1;
        return 0;
    }
};
