module.exports = function(grunt) {
    // Project config
    grunt.initConfig({
        concat: {
            options: {
                separator: ";\n",
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
