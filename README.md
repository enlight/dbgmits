dbgmits (WIP)
================
This library can be used to programmatically control debuggers that implement the
[GDB/**M**achine **I**nterface](https://sourceware.org/gdb/onlinedocs/gdb/GDB_002fMI.html#GDB_002fMI)
via JavaScript. Currently both [GDB](https://www.gnu.org/s/gdb/) and [LLDB](http://lldb.llvm.org/)
support this interface. Note that LLDB's implementation is incomplete, and is still
under development, so if you want to use LLDB it's best to build it yourself from
source instead of using a released version.

Prerequisites
=============
- [Node.js](https://nodejs.org/) **v0.12+**
- [TypeScript](http://www.typescriptlang.org/) **1.5+** (only for development)

Install
=======
The latest release of this library can be installed via [NPM](https://www.npmjs.com/package/dbgmits):
```
npm install dbgmits --save
```

Development
===========
This section assumes you'll be working within a local checkout of this repository.

Install
-------
If you don't already have the **grunt-cli** and **tsd** modules installed do so first:
```
npm install -g grunt-cli
npm install -g tsd
```

Then install all the other module dependencies for this library:
```
npm install
```

Build
-----
To build the library just run:
```
grunt build
```

Test
----
Before running the tests for the first time you'll need to generate the target executable used by
the tests. Unfortunately, while the target executable can be built on Windows the current setup will
build it with MSVC and the generated debug information will be unreadable by LLDB and GDB, which
in turn means that most of the tests won't run properly. The target executable is built via the
node-gyp module, which currently expects to have access to the Node.js development headers, so if
you haven't done so previously you can ask node-gyp to download and unpack the required files by running:
```
node-gyp install
```

Next, ensure you have Python 2.7 and a C/C++ compiler tool-chain installed on your system,
as detailed in the [node-gyp README](https://github.com/TooTallNate/node-gyp#installation).

Now you're ready to build the target executable, to do so run:
```
grunt configure-tests
```

Finally, you can run the tests with GDB via `grunt run-gdb-tests`, or LLDB via `grunt run-lldb-tests`.

License
=======
This library is licensed under the MIT license. See [LICENSE](LICENSE) file for full terms.
