var path = require('path');

module.exports = function(grunt) {
  grunt.initConfig({
    'pkg': grunt.file.readJSON('package.json'),
    'env': {
      testWithGDB: {
        DBGMITS_DEBUGGER: 'gdb'
      },
      testWithLLDB: {
        DBGMITS_DEBUGGER: 'lldb'
      }
    },
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
      testGDB: {
        options: {
          reporter: '../../../test-js/custom_reporter',
          quiet: false,
          clearRequireCache: true,
          // skip any tests tagged with @skipOnGDB
          grep: '@skipOnGDB',
          invert: true
        },
        src: ['test-js/**/*.js']
      },
      testLLDB: {
        options: {
          reporter: '../../../test-js/custom_reporter',
          quiet: false,
          clearRequireCache: true,
          // skip any tests tagged with @skipOnLLDB
          grep: '@skipOnLLDB',
          invert: true
        },
        src: ['test-js/**/*.js']
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
          mode: 'file',
          module: 'commonjs',
          target: 'es5',
          out: 'docs/',
          name: '<%= pkg.name %>'
        },
        src: 'src/**/*.ts'
      }
    },
    'tsc': {
      options: {
        tscPath: path.resolve('node_modules', 'typescript', 'bin', 'tsc')
      },
      'lib': {
        options: {
          project: './src'
        }
      },
      'test': {
        options: {
          project: './test'
        }
      }
    },
    'watch': {
      lib: {
        files: 'src/**/*.ts',
        tasks: ['tslint', 'tsc:lib']
      },
      test: {
        files: 'test/**/*.ts',
        tasks: ['tsc:test', 'test']
      }
    },
    'peg': {
      mi_output_parser: {
        src: "src/mi_output_grammar.pegjs",
        dest: "lib/mi_output_parser.js"
      }
    },
    'gyp': {
      rebuild: {
        command: 'rebuild', // clean, configure, build
        options: {
          debug: true
        }
      },
      build: {
        command: 'build',
        options: {
          debug: true
        }
      }
    },
    'release': {
      options: {
        github: {
          repo: 'enlight/dbgmits',
          usernameVar: 'GITHUB_TOKEN',
          passwordVar: 'BLANK_PLACEHOLDER'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-tsc');
  grunt.loadNpmTasks('grunt-tsd');
  grunt.loadNpmTasks('grunt-tslint');
  grunt.loadNpmTasks('grunt-typedoc');
  grunt.loadNpmTasks('grunt-peg');
  grunt.loadNpmTasks('grunt-node-gyp');
  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-release');
  
  grunt.registerTask('copy-mi-output-parser-dts', 'Copy MI Output parser typings to ./lib', function () {
    grunt.file.copy('./src/mi_output_parser.d.ts', './lib/mi_output_parser.d.ts');
  });

  grunt.registerTask('docs', ['typedoc']);

  grunt.registerTask('lint', ['jshint', 'tslint']);
  
  grunt.registerTask('build', ['peg', 'copy-mi-output-parser-dts', 'tsc']);
  
  grunt.registerTask('configure-tests', ['gyp:rebuild']);

  grunt.registerTask('run-gdb-tests', ['env:testWithGDB', 'mochaTest:testGDB']);
  
  grunt.registerTask('run-lldb-tests', ['env:testWithLLDB', 'mochaTest:testLLDB']);

  grunt.registerTask('test', ['tslint', 'build', 'run-tests']);

  grunt.registerTask('default', ['lint', 'build', 'run-tests']);
};
