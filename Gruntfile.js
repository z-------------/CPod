module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        concat: {
            options: {
                separator: ";\n",
                process: function(src, path) {
                    return "\n/* " + path + " */\n\n" + src;
                },
            },
            server: {
                src: [
                    "src/server/requires.js",
                    "src/server/routing.js",
                    "src/server/feedinfo.js",
                    "src/server/update.js",
                    "src/server/server_start.js"
                ],
                dest: "dist/server.js",
            },
            client: {
                src: [
                    "src/public/app/main.css",
                    "src/public/app/material-styles.css"
                ],
                dest: "dist/public/app/style.css"
            }
        },
        copy: {
            main: {
                expand: true,
                cwd: "lib/",
                src: "**",
                dest: "dist/public/assets/"
            }
        }
    });

    // Load plugins
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-copy");

    // Register default tasks
    grunt.registerTask("default", ["concat", "copy"]);
};
