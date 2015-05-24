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
    }); // #getStackFrame

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
    }); // #getStackDepth

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
    }); // #getStackFrames

    describe("#getStackFrameArgs", () => {
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
    }); // #getStackFrameArgs

    describe("#getStackFrameVariables", () => {
      it("gets a single simple local variable (name only) for a frame", () => {
        const onBreakpointGetLocals = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              // get the variables for the previous frame
              return debugSession.getStackFrameVariables(
                dbgmits.VariableDetailLevel.None, { threadId: 1, frameLevel: 1 }
              )
              .then((variables: dbgmits.IStackFrameVariablesInfo) => {
                const locals = variables.locals;
                expect(locals.length).to.equal(1);
                expect(locals[0]).to.have.property('name', 'a');
                expect(locals[0]).to.have.property('value').that.is.undefined;
                expect(locals[0]).to.have.property('type').that.is.undefined;
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

      // FIXME: re-enable on LLDB when it correctly supports 'simple' mode (as in outputs types)
      it("gets a single simple local variable (name, value, and type) for a frame @skipOnLLDB", () => {
        const onBreakpointGetLocals = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              // get the locals for the previous frame
              return debugSession.getStackFrameVariables(
                dbgmits.VariableDetailLevel.Simple, { threadId: 1, frameLevel: 1 }
              )
              .then((variables: dbgmits.IStackFrameVariablesInfo) => {
                const locals = variables.locals;
                expect(locals.length).to.equal(1);
                expect(locals[0]).to.have.property('name', 'a');
                expect(locals[0]).to.have.property('value', '5');
                expect(locals[0]).to.have.property('type', 'int');
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

      it("gets a single simple local variable (name and value) for a frame", () => {
        const onBreakpointGetLocals = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              // get the locals for the previous frame
              return debugSession.getStackFrameVariables(
                dbgmits.VariableDetailLevel.All, { threadId: 1, frameLevel: 1 }
              )
              .then((variables: dbgmits.IStackFrameVariablesInfo) => {
                const locals = variables.locals;
                expect(locals.length).to.equal(1);
                expect(locals[0]).to.have.property('name', 'a');
                expect(locals[0]).to.have.property('value', '5');
                expect(locals[0]).to.have.property('type').that.is.undefined;
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

      // FIXME: re-enable on LLDB when it correctly supports 'simple' mode (as in outputs types)
      it("gets a single complex local variable (name and type) for the current frame @skipOnLLDB", () => {
        const onBreakpointGetLocals = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              // get the locals for the current frame
              return debugSession.getStackFrameVariables(
                dbgmits.VariableDetailLevel.Simple, { threadId: 1, frameLevel: 1 }
              )
              .then((variables: dbgmits.IStackFrameVariablesInfo) => {
                const locals = variables.locals;
                expect(locals.length).to.equal(1);
                expect(locals[0]).to.have.property('name', 'b');
                expect(locals[0]).to.have.property('value').that.is.undefined;
                expect(locals[0]).to.have.property('type', 'int [3]');
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

      // FIXME: re-enable on LLDB when it correctly supports 'simple' mode (as in outputs types)
      it("gets two local variables (name, value, and type) for a frame @skipOnLLDB", () => {
        const onBreakpointGetLocals = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              // get the locals for the current frame
              return debugSession.getStackFrameVariables(
                dbgmits.VariableDetailLevel.Simple, { threadId: 1, frameLevel: 1 }
              )
              .then((variables: dbgmits.IStackFrameVariablesInfo) => {
                const locals = variables.locals;
                expect(locals.length).to.equal(2);

                expect(locals[0]).to.have.property('name', 'c');
                expect(locals[0]).to.have.property('value', 'true');
                expect(locals[0]).to.have.property('type', 'bool');
              
                expect(locals[1]).to.have.property('name', 'd');
                expect(locals[1]).to.have.property('value').that.is.undefined;
                expect(locals[1]).to.have.property('type', 'const char *[3]');
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

      it("gets two local variables (name and value) for a frame", () => {
        const onBreakpointGetLocals = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              // get the locals for the current frame
              return debugSession.getStackFrameVariables(
                dbgmits.VariableDetailLevel.All, { threadId: 1, frameLevel: 1 }
              )
              .then((variables: dbgmits.IStackFrameVariablesInfo) => {
                const locals = variables.locals;
                expect(locals.length).to.equal(2);

                expect(locals[0]).to.have.property('name', 'c');
                expect(locals[0]).to.have.property('value', 'true');
                expect(locals[0]).to.have.property('type').that.is.undefined;
              
                expect(locals[1]).to.have.property('name', 'd');
                expect(locals[1]).to.have.property('value');
                expect(locals[1]).to.have.property('type').that.is.undefined;
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

      // FIXME: re-enable on LLDB when it correctly supports 'simple' mode (as in outputs types)
      it("gets three local variables (name, value, and type) for a frame @skipOnLLDB", () => {
        const onBreakpointGetLocals = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              // get the locals for the current frame
              return debugSession.getStackFrameVariables(
                dbgmits.VariableDetailLevel.Simple, { threadId: 1, frameLevel: 1 }
              )
              .then((variables: dbgmits.IStackFrameVariablesInfo) => {
                const locals = variables.locals;
                expect(locals.length).to.equal(3);

                expect(locals[0]).to.have.property('name', 'e');
                expect(locals[0]).to.have.property('value');
                expect(locals[0]).to.have.property('type', 'Point');
              
                expect(locals[1]).to.have.property('name', 'f');
                expect(locals[1]).to.have.property('value', '9.5');
                expect(locals[1]).to.have.property('type', 'float');

                expect(locals[2]).to.have.property('name', 'g');
                expect(locals[2]).to.have.property('value', '300');
                expect(locals[2]).to.have.property('type', 'long');
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

      it("gets three local variables (name and value) for a frame", () => {
        const onBreakpointGetLocals = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              // get the locals for the current frame
              return debugSession.getStackFrameVariables(
                dbgmits.VariableDetailLevel.All, { threadId: 1, frameLevel: 1 }
              )
              .then((variables: dbgmits.IStackFrameVariablesInfo) => {
                const locals = variables.locals;
                expect(locals.length).to.equal(3);

                expect(locals[0]).to.have.property('name', 'e');
                expect(locals[0]).to.have.property('value');
                expect(locals[0]).to.have.property('type').that.is.undefined;
              
                expect(locals[1]).to.have.property('name', 'f');
                expect(locals[1]).to.have.property('value', '9.5');
                expect(locals[1]).to.have.property('type').that.is.undefined;

                expect(locals[2]).to.have.property('name', 'g');
                expect(locals[2]).to.have.property('value', '300');
                expect(locals[2]).to.have.property('type').that.is.undefined;
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

      it("gets no frame arguments for a function with no arguments", () => {
        const onBreakpointGetArgs = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              return debugSession.getStackFrameVariables(dbgmits.VariableDetailLevel.None)
              .then((variables: dbgmits.IStackFrameVariablesInfo) => {
                const args = variables.args;
                expect(args.length).to.equal(0);
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

      // FIXME: re-enable on LLDB when it correctly supports 'simple' mode (as in outputs types)
      it("gets one simple function argument (name, value, and type) @skipOnLLDB", () => {
        const onBreakpointGetArgs = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              return debugSession.getStackFrameVariables(dbgmits.VariableDetailLevel.Simple)
              .then((variables: dbgmits.IStackFrameVariablesInfo) => {
                const args = variables.args;
                expect(args.length).to.equal(1);
                expect(args[0]).to.have.property('name', 'a');
                expect(args[0]).to.have.property('value', '5');
                expect(args[0]).to.have.property('type', 'int');
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

      it("gets one simple function argument (name and value)", () => {
        const onBreakpointGetArgs = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              return debugSession.getStackFrameVariables(dbgmits.VariableDetailLevel.All)
              .then((variables: dbgmits.IStackFrameVariablesInfo) => {
                const args = variables.args;
                expect(args.length).to.equal(1);
                expect(args[0]).to.have.property('name', 'a');
                expect(args[0]).to.have.property('value', '5');
                expect(args[0]).to.have.property('type').that.is.undefined;
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

      // FIXME: re-enable on LLDB when it correctly supports 'simple' mode (as in outputs types)
      it("gets two function arguments (name, value, and type) @skipOnLLDB", () => {
        const onBreakpointGetArgs = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              return debugSession.getStackFrameVariables(dbgmits.VariableDetailLevel.Simple)
              .then((variables: dbgmits.IStackFrameVariablesInfo) => {
                const args = variables.args;
                expect(args.length).to.equal(2);
              
                expect(args[0]).to.have.property('name', 'b');
                expect(args[0]).to.have.property('value', '7');
                expect(args[0]).to.have.property('type', 'float');

                expect(args[1]).to.have.property('name', 'c');
                expect(args[1]).to.have.property('value').that.is.undefined;
                expect(args[1]).to.have.property('type', 'Point');
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

      // FIXME: re-enable on LLDB when it correctly supports 'simple' mode (as in outputs types)
      it("gets three function arguments (name, value, and type) @skipOnLLDB", () => {
        const onBreakpointGetArgs = new Promise<void>((resolve, reject) => {
          debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
            (breakNotify: dbgmits.BreakpointHitNotify) => {
              return debugSession.getStackFrameVariables(dbgmits.VariableDetailLevel.Simple)
              .then((variables: dbgmits.IStackFrameVariablesInfo) => {
                const args = variables.args;
                expect(args.length).to.equal(3);
              
                expect(args[0]).to.have.property('name', 'd');
                expect(args[0]).to.have.property('value', '300');
                expect(args[0]).to.have.property('type', 'long');

                expect(args[1]).to.have.property('name', 'e');
                expect(args[1]).to.have.property('value');
                expect(args[1]).to.have.property('type', 'const char *');

                expect(args[2]).to.have.property('name', 'f');
                expect(args[2]).to.have.property('type', 'int *');
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
    }); // #getStackFrameVariables
  });
});
