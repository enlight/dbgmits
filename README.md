dbgmits (WIP)
================
This library can be used to programmatically control debuggers that implement the
[GDB/**M**achine **I**nterface](https://sourceware.org/gdb/onlinedocs/gdb/GDB_002fMI.html#GDB_002fMI)
via TypeScript or JavaScript. Currently both [GDB](https://www.gnu.org/s/gdb/) and 
[LLDB](http://lldb.llvm.org/) support this interface, though LLDB's implementation is somewhat limited at this time.

Prerequisites
=========
[Node.js](https://nodejs.org/) **v0.12+**

Installation
========
If you don't already have the **grunt-cli** and **tsd** modules installed do so first:
```
npm install -g grunt-cli
npm install -g tsd
```

Then install all the other module dependencies for this library:
```
npm install
```

License
=====
This library is licensed under the MIT license. See [LICENSE](LICENSE) file for full terms.