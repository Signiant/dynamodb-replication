module.exports = function(grunt) {
  grunt.initConfig({
    uglify: {
      dist: {
        files: [
          {
            src: 'lambda/**/*.js',
            ext: '.min.js',
            expand: true
          }
        ]
      }
    },
    cfninit: {
      src: 'cfn/replicator.cfn.json',
      dest: 'dist/replicator.cfn.json'
    },
    clean: [ 'lambda/**/*.min.js' ]
  });

  //Load plugins for creating and removing minified javascript files
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');

  //Register task for compiling cfn template
  grunt.registerTask('cfn-include', 'Build cloudformation template using cfn-include', function(){
    var compileTemplate = require('cfn-include');
    var path = require('path');
    var config = grunt.config.get('cfninit');

    var getAbsolutePath = function(filePath){
      if(!path.isAbsolute(filePath))
        filePath = path.join(process.cwd(), filePath);
      return filePath;
    };

    //Build source and destination URLS for cfn templates
    var srcUrl = "file://" + getAbsolutePath(config.src);

    //Compile source template
    var done = this.async();
    compileTemplate({ url: srcUrl }).then(function(template){
      //Write compiled template to dest
      grunt.file.write(getAbsolutePath(config.dest), JSON.stringify(template, null, 2));
      done();
    });
  });

  grunt.registerTask('default', ['uglify', 'cfn-include', 'clean']);
};
