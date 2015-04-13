dbgmits (WIP)
================
This library can be used to programmatically control debuggers that implement the
[GDB/**M**achine **I**nterface](https://sourceware.org/gdb/onlinedocs/gdb/GDB_002fMI.html#GDB_002fMI)
via TypeScript or JavaScript. Currently both [GDB](https://www.gnu.org/s/gdb/) and 
[LLDB](http://lldb.llvm.org/) support this interface, though LLDB's implementation is somewhat limited at this time.

Prerequisites
=============
[Node.js](https://nodejs.org/) **v0.12+**

Install
=======
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
=====
To build the library just run:
```
grunt build
```

Test
====
Before running the tests for the first time you'll need to generate the target executable used by 
the tests. The target executable is built via the node-gyp module, which currently expects to have 
access to the Node.js development headers, so if you haven't done so previously you can ask node-gyp
to download and unpack the required files by running:
```
node-gyp install
```

Next, ensure you have Python 2.7 and a C/C++ compiler tool-chain installed on your system,
as detailed in the [node-gyp README](https://github.com/TooTallNate/node-gyp#installation).

Now you're ready to build the target executable, to do so run:
```
grunt configure-tests
```

Note that for the above command to work successfully your system must have Python 2.7 and a C/C++ 
compiler tool-chain as detailed in the [node-gyp README](https://github.com/TooTallNate/node-gyp#installation).

Finally, to run the tests:
```
grunt run-tests
```

License
=======
This library is licensed under the MIT license. See [LICENSE](LICENSE) file for full terms.