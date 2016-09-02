module.exports = function(grunt) {
  "use strict";

  grunt.initConfig({
    ts: {
      app: {
        files: [{
          src: ["site/**/*.ts", "!site/.baseDir.ts", "!site/_all.d.ts"],
          dest: "site/."
        }],
        options: {
          module: "commonjs",
          noLib: false,
          target: "es6",
          sourceMap: false
        }
      }
    },
    tslint: {
      options: {
        configuration: "tslint.json"
      },
      files: {
        src: ["site/**/*.ts"]
      }
    },
    watch: {
      ts: {
        files: ["site/**/*.ts"],
        tasks: ["ts", "tslint"]
      }
    }
  });

  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-ts");
  grunt.loadNpmTasks("grunt-tslint");

  grunt.registerTask("default", [
    "ts",
    "tslint"
  ]);

};