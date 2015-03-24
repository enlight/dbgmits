module.exports = function(grunt) {
  grunt.initConfig({
    'pkg': grunt.file.readJSON('package.json'),
    'jshint': {
      files: ['Gruntfile.js'],
      options: {
        // options here to override JSHint defaults
        globals: {
          jQuery: true,
          console: true,
          module: true,
          document: true
        }
      }
    },
    'mochaTest': {
      test: {
        options: {
          reporter: 'spec',
          quiet: false,
          clearRequireCache: true
        },
        src: ['test/**/*.js']
      }
    },
    'tsd': {
      lib: {
        options: {
          command: 'reinstall',
          latest: true,
          config: 'conf/tsd-lib.json',
          opts: {
            // props from tsd.Options
          }
        }
      },
      test: {
        options: {
          command: 'reinstall',
          latest: true,
          config: 'conf/tsd-test.json',
          opts: {
            // props from tsd.Options
          }
        }
      }
    },
    'tslint': {
      errors: {
        options: {
          configuration: grunt.file.readJSON('conf/tslint.json')
        },
        files: {
          src: [
            'src/**/*.ts',
            'test/**/*.ts'
          ]
        }
      }
    },
    'typedoc': {
        build: {
            options: {
                module: 'commonjs',
                target: 'es5',
                out: 'docs/',
                name: '<%= pkg.name %>'
            },
            src: 'src/**/*.ts'
        }
    },
    'typescript': {
       lib: {
         src: ['src/**/*.ts'],
         dest: 'lib',
         options: {
           basePath: 'src',
           declaration: true,
           module: 'commonjs',
           sourceMap: true,
           target: 'es5'
         }
       },
       test: {
         src: ['test/**/*.ts'],
         options: {
           module: 'commonjs',
           sourceMap: true,
           target: 'es5'
         }
       }
    },
    'watch': {
      lib: {
        files: 'src/**/*.ts',
        tasks: ['tslint', 'typescript']
      },
      test: {
        files: 'test/**/*.ts',
        tasks: ['test']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-tsd');
  grunt.loadNpmTasks('grunt-tslint');
  grunt.loadNpmTasks('grunt-typedoc');
  grunt.loadNpmTasks('grunt-typescript');

  grunt.registerTask('docs', ['typedoc']);

  grunt.registerTask('lint', ['jshint', 'tslint']);

  grunt.registerTask('build', ['typescript']);

  grunt.registerTask('run-tests', ['mochaTest']);

  grunt.registerTask('test', ['tslint', 'typescript', 'run-tests']);

  grunt.registerTask('default', ['lint', 'build', 'run-tests']);
};
