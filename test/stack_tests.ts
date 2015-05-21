// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/test/tsd.d.ts" />

require('source-map-support').install();

import * as chai from 'chai';
import chaiAsPromised = require('chai-as-promised');
import * as dbgmits from '../src/dbgmits';
import { startDebugSession } from '../test/test_utils';

chai.use(chaiAsPromised);

// aliases
import expect = chai.expect;
import DebugSession = dbgmits.DebugSession;

// the directory in which Gruntfile.js resides is also Mocha's working directory,
// so any relative paths will be relative to that directory
var localTargetExe: string = './build/Debug/stack_tests_target';

describe("Debug Session", () => {
  describe("Stack Inspection", () => {
    var debugSession: DebugSession;

    beforeEach(() => {
      debugSession = startDebugSession();
      return debugSession.setExecutableFile(localTargetExe);
    });

    afterEach(() => {
      return debugSession.end();
    });

    it("#getStackFrame", () => {
      // verify we can retrieve the frame for printNextInt()
      var onBreakpointGetFrameInfo = new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.BreakpointHitNotify) => {
            debugSession.getStackFrame()
            .then((info: dbgmits.IStackFrameInfo) => {
              expect(info).to.have.property('func');
              expect(info.func.indexOf('printNextInt')).to.equal(0);
            })
            .then(resolve, reject);
          }
        );
      });
      // break at start of printNextInt()
      return debugSession.addBreakpoint('printNextInt')
      .then(() => {
        return Promise.all([
          onBreakpointGetFrameInfo,
          debugSession.startInferior()
        ])
      });
    });

    it("#getStackDepth", () => {
      var initialStackDepth = -1;
      // GDB and LLDB report stack depth a bit differently, LLDB adds a couple of frames from 
      // libc to the count, but GDB does not. So instead of checking the absolute stack depth
      // we check the relative stack depth (starting from main()).
      var onBreakpointCheckStackDepth = new Promise<void>((resolve, reject) => {
        debugSession.on(DebugSession.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.BreakpointHitNotify) => {
            switch (breakNotify.breakpointId) {
              case 1: // breakpoint in main()
                debugSession.getStackDepth()
                .then((stackDepth: number) => { initialStackDepth = stackDepth; })
                .then(() => { return debugSession.addBreakpoint('getNextInt'); })
                .then(() => { return debugSession.resumeInferior(); })
                .catch(reject);
                break;

              case 2: // breakpoint in getNextInt()
                debugSession.getStackDepth()
                .then((stackDepth: number) => {
                  // the stack should be 2 levels deep counting from main(): 
                  // printNextInt()->getNextInt()
                  expect(stackDepth - initialStackDepth).to.equal(2);
                })
                .then(resolve)
                .catch(reject);
                break;
            }
          }
        );
      });
      return debugSession.addBreakpoint('main')
      .then(() => {
        return Promise.all([
          onBreakpointCheckStackDepth,
          debugSession.startInferior()
        ])
      });
    });

    describe("#getStackFrames", () => {
      it("gets a list of stack frames", () => {
        var expectedStackDepth = -1;
        var onBreakpointGetFrameList = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              debugSession.getStackDepth()
              .then((stackDepth: number) => { expectedStackDepth = stackDepth; })
              .then(() => { return debugSession.getStackFrames(); })
              .then((frames: dbgmits.IStackFrameInfo[]) => {
                expect(frames.length).to.equal(expectedStackDepth);
                for (var i = 0; i < frames.length; ++i) {
                  expect(frames[i].level).to.equal(i);
                }
                expect(frames[0].func.indexOf('getNextInt')).to.equal(0);
                expect(frames[1].func.indexOf('printNextInt')).to.equal(0);
                expect(frames[2].func.indexOf('main')).to.equal(0);
              })
              .then(resolve)
              .catch(reject);
            }
          );
        });
        // break at the start of getNextInt()
        return debugSession.addBreakpoint('getNextInt')
        .then(() => {
          return Promise.all([
            onBreakpointGetFrameList,
            debugSession.startInferior()
          ])
        });
      });

      it("gets a list of stack frames within a certain level range", () => {
        var onBreakpointGetFrameList = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              return debugSession.getStackFrames({ lowFrame: 0, highFrame: 1 })
              .then((frames: dbgmits.IStackFrameInfo[]) => {
                expect(frames.length).to.equal(2);
                for (var i = 0; i < frames.length; ++i) {
                  expect(frames[i].level).to.equal(i);
                }
                expect(frames[0].func.indexOf('getNextInt')).to.equal(0);
                expect(frames[1].func.indexOf('printNextInt')).to.equal(0);
              })
              .then(resolve)
              .catch(reject);
            }
          );
        });
        // break at the start of getNextInt()
        return debugSession.addBreakpoint('getNextInt')
        .then(() => {
          return Promise.all([
            onBreakpointGetFrameList,
            debugSession.startInferior()
          ])
        });
      });

      it("gets a stack frame for a specific level", () => {
        var onBreakpointGetFrameList = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              return debugSession.getStackFrames({ highFrame: 1 })
                .then((frames: dbgmits.IStackFrameInfo[]) => {
                expect(frames.length).to.equal(1);
                expect(frames[0].level).to.equal(1);
                expect(frames[0].func.indexOf('printNextInt')).to.equal(0);
              })
              .then(resolve)
              .catch(reject);
            }
          );
        });
        // break at the start of getNextInt()
        return debugSession.addBreakpoint('getNextInt')
          .then(() => {
          return Promise.all([
            onBreakpointGetFrameList,
            debugSession.startInferior()
          ])
        });
      });
    });

    // FIXME: The next few tests are skipped on GDB because -stack-list-locals is deprecated and
    // will be replaced by -stack-list-variables, so I don't want to waste any time making these
    // tests pass on GDB at this point.
    it("gets a single simple local variable (name only) for a frame @skipOnGDB", () => {
      var onBreakpointGetLocals = new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.BreakpointHitNotify) => {
            // get the locals for the previous frame
            return debugSession.getStackFrameLocals(dbgmits.VariableDetailLevel.None, { frameLevel: 1 })
            .then((locals: dbgmits.IVariableInfo[]) => {
              expect(locals.length).to.equal(1);
              expect(locals[0]).to.have.property('name', 'a');
              expect(locals[0]).not.to.have.property('value');
              expect(locals[0]).not.to.have.property('type');
            })
            .then(resolve)
            .catch(reject);
          }
        );
      });
      // break at the start of funcWithOneSimpleLocalVariable_Inner()
      return debugSession.addBreakpoint('funcWithOneSimpleLocalVariable_Inner')
        .then(() => {
        return Promise.all([
          onBreakpointGetLocals,
          debugSession.startInferior()
        ])
      });
    });

    it("gets a single simple local variable (name and value only) for a frame @skipOnGDB", () => {
      var onBreakpointGetLocals = new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.BreakpointHitNotify) => {
            // get the locals for the previous frame
            return debugSession.getStackFrameLocals(
              dbgmits.VariableDetailLevel.All, { frameLevel: 1 }
            )
            .then((locals: dbgmits.IVariableInfo[]) => {
              expect(locals.length).to.equal(1);
              expect(locals[0]).to.have.property('name', 'a');
              expect(locals[0]).to.have.property('value', '5');
              expect(locals[0]).not.to.have.property('type');
            })
            .then(resolve)
            .catch(reject);
          }
        );
      });
      // break at the start of funcWithOneSimpleLocalVariable_Inner()
      return debugSession.addBreakpoint('funcWithOneSimpleLocalVariable_Inner')
        .then(() => {
        return Promise.all([
          onBreakpointGetLocals,
          debugSession.startInferior()
        ])
      });
    });

    it("gets a single simple local variable (name, value, and type) for a frame @skipOnGDB", () => {
      var onBreakpointGetLocals = new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.BreakpointHitNotify) => {
            // get the locals for the previous frame
            return debugSession.getStackFrameLocals(
              dbgmits.VariableDetailLevel.Simple, { frameLevel: 1 }
            )
            .then((locals: dbgmits.IVariableInfo[]) => {
              expect(locals.length).to.equal(1);
              expect(locals[0]).to.have.property('name', 'a');
              expect(locals[0]).to.have.property('value', '5');
              // FIXME: LLDB MI currently does not provide the type, contrary to the spec.
              //expect(locals[0]).to.have.property('type', 'int');
            })
            .then(resolve)
            .catch(reject);
          }
        );
      });
      // break at the start of funcWithOneSimpleLocalVariable_Inner()
      return debugSession.addBreakpoint('funcWithOneSimpleLocalVariable_Inner')
        .then(() => {
        return Promise.all([
          onBreakpointGetLocals,
          debugSession.startInferior()
        ])
      });
    });

    it("gets a single complex local variable (name and type) for the current frame @skipOnGDB", () => {
      var onBreakpointGetLocals = new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.BreakpointHitNotify) => {
            // FIXME: Should use VariableDetailLevel.Simple instead so type information
            //        is provided, but unfortunately LLDB MI doesn't format the output
            //        correctly in that case.
            // get the locals for the current frame
            return debugSession.getStackFrameLocals(
              dbgmits.VariableDetailLevel.All, { frameLevel: 1 }
            )
            .then((locals: dbgmits.IVariableInfo[]) => {
              expect(locals.length).to.equal(1);
              expect(locals[0]).to.have.property('name', 'b');
              // FIXME: uncomment when VariableDetailLevel.Simple works properly on LLDB
              //expect(locals[0]).not.to.have.property('value');
              // FIXME: LLDB MI currently does not provide the type, contrary to the spec.
              //expect(locals[0]).to.have.property('type', 'int [3]');
            })
            .then(resolve)
            .catch(reject);
          }
        );
      });
      // break at the start of funcWithOneComplexLocalVariable_Inner()
      return debugSession.addBreakpoint('funcWithOneComplexLocalVariable_Inner')
        .then(() => {
        return Promise.all([
          onBreakpointGetLocals,
          debugSession.startInferior()
        ])
      });
    });

    it("gets two local variables for a frame @skipOnGDB", () => {
      var onBreakpointGetLocals = new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.BreakpointHitNotify) => {
            // FIXME: Should use VariableDetailLevel.Simple instead so type information
            //        is provided, but unfortunately LLDB MI doesn't format the output
            //        correctly in that case.
            // get the locals for the current frame
            return debugSession.getStackFrameLocals(
              dbgmits.VariableDetailLevel.All, { frameLevel: 1 }
            )
            .then((locals: dbgmits.IVariableInfo[]) => {
              expect(locals.length).to.equal(2);
              
              expect(locals[0]).to.have.property('name', 'c');
              expect(locals[0]).to.have.property('value', 'true');
              // FIXME: LLDB MI currently does not provide the type, contrary to the spec.
              //expect(locals[0]).to.have.property('type', 'bool');
              
              expect(locals[1]).to.have.property('name', 'd');
              // FIXME: uncomment when VariableDetailLevel.Simple works properly on LLDB
              //expect(locals[1]).not.to.have.property('value');
              // FIXME: LLDB MI currently does not provide the type, contrary to the spec.
              //expect(locals[1]).to.have.property('type', 'const char *[3]');
            })
            .then(resolve)
            .catch(reject);
          }
        );
      });
      // break at the start of funcWithTwoLocalVariables_Inner()
      return debugSession.addBreakpoint('funcWithTwoLocalVariables_Inner')
        .then(() => {
        return Promise.all([
          onBreakpointGetLocals,
          debugSession.startInferior()
        ])
      });
    });

    it("gets three local variables for a frame @skipOnGDB", () => {
      var onBreakpointGetLocals = new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.BreakpointHitNotify) => {
            // FIXME: Should use VariableDetailLevel.Simple instead so type information
            //        is provided, but unfortunately LLDB MI doesn't format the output
            //        correctly in that case.
            // get the locals for the current frame
            return debugSession.getStackFrameLocals(dbgmits.VariableDetailLevel.All, { frameLevel: 1 })
            .then((locals: dbgmits.IVariableInfo[]) => {
              expect(locals.length).to.equal(3);

              expect(locals[0]).to.have.property('name', 'e');
              expect(locals[0]).to.have.property('value');
              // FIXME: LLDB MI currently does not provide the type, contrary to the spec.
              //expect(locals[0]).to.have.property('type', 'Point');
              
              expect(locals[1]).to.have.property('name', 'f');
              expect(locals[1]).to.have.property('value', '9.5');
              // FIXME: LLDB MI currently does not provide the type, contrary to the spec.
              //expect(locals[1]).to.have.property('type', 'float');

              expect(locals[2]).to.have.property('name', 'g');
              expect(locals[2]).to.have.property('value', '300');
              // FIXME: LLDB MI currently does not provide the type, contrary to the spec.
              //expect(locals[1]).to.have.property('type', 'long');
            })
            .then(resolve)
            .catch(reject);
          }
        );
      });
      // break at the start of funcWithThreeLocalVariables_Inner()
      return debugSession.addBreakpoint('funcWithThreeLocalVariables_Inner')
        .then(() => {
        return Promise.all([
          onBreakpointGetLocals,
          debugSession.startInferior()
        ])
      });
    });

    it("gets frame arguments for a function with no arguments", () => {
      var onBreakpointGetArgs = new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.BreakpointHitNotify) => {
            return debugSession.getStackFrameArgs(dbgmits.VariableDetailLevel.None, { lowFrame: 0 })
            .then((frames: dbgmits.IStackFrameArgsInfo[]) => {
              expect(frames.length).to.equal(1);
              expect(frames[0].level).to.equal(0);
              expect(frames[0].args.length).to.equal(0);
            })
            .then(resolve)
            .catch(reject);
          }
        );
      });
      // break at the start of funcWithNoArgs()
      return debugSession.addBreakpoint('funcWithNoArgs')
        .then(() => {
        return Promise.all([
          onBreakpointGetArgs,
          debugSession.startInferior()
        ])
      });
    });

    it("gets frame arguments for a function with one simple argument", () => {
      var onBreakpointGetArgs = new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.BreakpointHitNotify) => {
            // FIXME: should switch to simple detail level so we get type information,
            //        but the LLDB MI driver needs to be fixed to support that detail level
            //        first
            return debugSession.getStackFrameArgs(dbgmits.VariableDetailLevel.All, { lowFrame: 0 })
            .then((frames: dbgmits.IStackFrameArgsInfo[]) => {
              expect(frames.length).to.equal(1);
              expect(frames[0].level).to.equal(0);
              expect(frames[0].args.length).to.equal(1);

              expect(frames[0].args[0]).to.have.property('name', 'a');
              expect(frames[0].args[0]).to.have.property('value', '5');
            })
            .then(resolve)
            .catch(reject);
          }
        );
      });
      // break at the start of funcWithOneSimpleArg()
      return debugSession.addBreakpoint('funcWithOneSimpleArg')
        .then(() => {
        return Promise.all([
          onBreakpointGetArgs,
          debugSession.startInferior()
        ])
      });
    });

    it("gets frame arguments for a function with two arguments", () => {
      var onBreakpointGetArgs = new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.BreakpointHitNotify) => {
            // FIXME: should switch to simple detail level so we get type information,
            //        but the LLDB MI driver needs to be fixed to support that detail level
            //        first
            return debugSession.getStackFrameArgs(dbgmits.VariableDetailLevel.All, { lowFrame: 0 })
            .then((frames: dbgmits.IStackFrameArgsInfo[]) => {
              expect(frames.length).to.equal(1);
              expect(frames[0].level).to.equal(0);
              expect(frames[0].args.length).to.equal(2);

              expect(frames[0].args[0].name).to.equal('b');
              expect(frames[0].args[0].value).to.equal('7');

              expect(frames[0].args[1].name).to.equal('c');
              expect(frames[0].args[1]).to.have.property('value');
            })
            .then(resolve)
            .catch(reject);
          }
        );
      });
      // break at the start of funcWithNoArgsfuncWithTwoArgs()
      return debugSession.addBreakpoint('funcWithTwoArgs')
        .then(() => {
        return Promise.all([
          onBreakpointGetArgs,
          debugSession.startInferior()
        ])
      });
    });

    it("gets frame arguments for a function with three arguments", () => {
      var onBreakpointGetArgs = new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.BreakpointHitNotify) => {
            // FIXME: should switch to simple detail level so we get type information,
            //        but the LLDB MI driver needs to be fixed to support that detail level
            //        first
            return debugSession.getStackFrameArgs(dbgmits.VariableDetailLevel.All, { lowFrame: 0 })
            .then((frames: dbgmits.IStackFrameArgsInfo[]) => {
              expect(frames.length).to.equal(1);
              expect(frames[0].level).to.equal(0);
              expect(frames[0].args.length).to.equal(3);

              expect(frames[0].args[0].name).to.equal('d');
              expect(frames[0].args[0].value).to.equal('300');

              expect(frames[0].args[1].name).to.equal('e');
              expect(frames[0].args[1]).to.have.property('value');

              expect(frames[0].args[2].name).to.equal('f');
              expect(frames[0].args[2]).to.have.property('value');
            })
            .then(resolve)
            .catch(reject);
          }
        );
      });
      // break at the start of funcWithThreeArgs()
      return debugSession.addBreakpoint('funcWithThreeArgs')
        .then(() => {
        return Promise.all([
          onBreakpointGetArgs,
          debugSession.startInferior()
        ])
      });
    });
  });
});
