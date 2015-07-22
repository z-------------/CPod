module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        concat: {
            options: {
                separator: ";\n",
                process: function(src, path) {
                    return "/* " + path + " */\n" + src;
                },
            },
            dist: {
                src: ["src/requires.js", "src/routing.js", "src/feedinfo.js", "src/update.js", "src/server_start.js"],
                dest: "server.js",
            },
        }
    });

    // Load plugins
    grunt.loadNpmTasks("grunt-contrib-concat");

    // Register default tasks
    grunt.registerTask("default", ["concat"]);
};
