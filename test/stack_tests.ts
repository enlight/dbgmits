// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/test-tsd.d.ts" />

require('source-map-support').install();

import * as chai from 'chai';
import chaiAsPromised = require('chai-as-promised');
import * as bunyan from 'bunyan';
import * as dbgmits from '../src/dbgmits';
import {
  beforeEachTestWithLogger, logSuite as log, startDebugSession, runToFunc
} from '../test/test_utils';

chai.use(chaiAsPromised);

// aliases
var expect = chai.expect;
import DebugSession = dbgmits.DebugSession;

// the directory in which Gruntfile.js resides is also Mocha's working directory,
// so any relative paths will be relative to that directory
var localTargetExe: string = './build/Debug/stack_tests_target';

log(describe("Debug Session", () => {
  describe("Stack Inspection", () => {
    var debugSession: DebugSession;

    beforeEachTestWithLogger((logger: bunyan.Logger) => {
      debugSession = startDebugSession(logger);
      return debugSession.setExecutableFile(localTargetExe);
    });

    afterEach(() => {
      return debugSession.end();
    });

    describe("#getStackFrame", () => {
      it("gets the current stack frame", () => {
        return runToFunc(debugSession, 'funcAtFrameLevel0', () => {
          return debugSession.getStackFrame()
          .then((info: dbgmits.IStackFrameInfo) => {
            expect(info).to.have.property('func');
            expect(info.func).match(/^funcAtFrameLevel0/);
          })
        });
      });

      // FIXME: re-enable on LLDB when it's fixed to handle --thread and --frame arguments
      it("gets an outer stack frame @skipOnLLDB", () => {
        return runToFunc(debugSession, 'funcAtFrameLevel0', () => {
          return debugSession.getStackFrame({ threadId: 1, frameLevel: 1 })
          .then((info: dbgmits.IStackFrameInfo) => {
            expect(info).to.have.property('func');
            expect(info.func).match(/^funcAtFrameLevel1/);
          })
        });
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
                .then(() => { return debugSession.addBreakpoint('funcAtFrameLevel0'); })
                .then(() => { return debugSession.resumeInferior(); })
                .catch(reject);
                break;

              case 2: // breakpoint in funcAtFrameLevel0()
                debugSession.getStackDepth()
                .then((stackDepth: number) => {
                  // the stack should be 2 levels deep counting from main(): 
                  // funcAtFrameLevel1()->funcAtFrameLevel0()
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
        return runToFunc(debugSession, 'funcAtFrameLevel0', () => {
          let expectedStackDepth = -1;
          return debugSession.getStackDepth()
          .then((stackDepth: number) => { expectedStackDepth = stackDepth; })
          .then(() => { return debugSession.getStackFrames(); })
          .then((frames: dbgmits.IStackFrameInfo[]) => {
            expect(frames.length).to.equal(expectedStackDepth);
            for (let i = 0; i < frames.length; ++i) {
              expect(frames[i].level).to.equal(i);
            }
            expect(frames[0].func).match(/^funcAtFrameLevel0/);
            expect(frames[1].func).match(/^funcAtFrameLevel1/);
            expect(frames[2].func).match(/^main/);
          });
        });
      });

      it("gets a list of stack frames within a certain level range", () => {
        return runToFunc(debugSession, 'funcAtFrameLevel0', () => {
          return debugSession.getStackFrames({ lowFrame: 0, highFrame: 1 })
          .then((frames: dbgmits.IStackFrameInfo[]) => {
            expect(frames.length).to.equal(2);
            for (let i = 0; i < frames.length; ++i) {
              expect(frames[i].level).to.equal(i);
            }
            expect(frames[0].func).match(/^funcAtFrameLevel0/);
            expect(frames[1].func).match(/^funcAtFrameLevel1/);
          });
        });
      });

      it("gets a stack frame for a specific level", () => {
        return runToFunc(debugSession, 'funcAtFrameLevel0', () => {
          return debugSession.getStackFrames({ highFrame: 1 })
          .then((frames: dbgmits.IStackFrameInfo[]) => {
            expect(frames.length).to.equal(1);
            expect(frames[0].level).to.equal(1);
            expect(frames[0].func).match(/^funcAtFrameLevel1/);
          });
        });
      });
    }); // #getStackFrames
    
    describe("#getStackFrameArgs", () => {
      it("gets frame arguments for a number of frames", () => {
        return runToFunc(debugSession, 'funcWithNoArgs', () => {
          // FIXME: should switch to simple detail level so we get type information,
          //        but the LLDB MI driver needs to be fixed to support that detail level
          //        first
          return debugSession.getStackFrameArgs(dbgmits.VariableDetailLevel.All, { lowFrame: 0, highFrame: 3 })
          .then((frames: dbgmits.IStackFrameArgsInfo[]) => {
            expect(frames).to.have.property('length', 4);
                
            expect(frames[0]).to.have.property('level', 0);
            expect(frames[0]).to.have.property('args').that.has.property('length', 0);

            expect(frames[1]).to.have.property('level', 1);
            expect(frames[1]).to.have.property('args').that.has.property('length', 1);
            expect(frames[1].args[0]).to.have.property('name', 'a');
            expect(frames[1].args[0]).to.have.property('value', '5');

            expect(frames[2].level).to.equal(2);
            expect(frames[2].args.length).to.equal(2);
            expect(frames[2].args[0].name).to.equal('b');
            expect(frames[2].args[0].value).to.equal('7');
            expect(frames[2].args[1].name).to.equal('c');
            expect(frames[2].args[1]).to.have.property('value');

            expect(frames[3].level).to.equal(3);
            expect(frames[3].args.length).to.equal(3);
            expect(frames[3].args[0].name).to.equal('d');
            expect(frames[3].args[0].value).to.equal('300');
            expect(frames[3].args[1].name).to.equal('e');
            expect(frames[3].args[1]).to.have.property('value');
            expect(frames[3].args[2].name).to.equal('f');
            expect(frames[3].args[2]).to.have.property('value');
          });
        });
      });
    }); // #getStackFrameArgs

    describe("#getStackFrameVariables", () => {
      it("gets a single simple local variable (name only) for a frame", () => {
        return runToFunc(debugSession, 'funcWithOneSimpleLocalVariable_Inner', () => {
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
          });
        });
      });

      // FIXME: re-enable on LLDB when it correctly supports 'simple' mode (as in outputs types)
      it("gets a single simple local variable (name, value, and type) for a frame @skipOnLLDB", () => {
        return runToFunc(debugSession, 'funcWithOneSimpleLocalVariable_Inner', () => {
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
          });
        });
      });

      it("gets a single simple local variable (name and value) for a frame", () => {
        return runToFunc(debugSession, 'funcWithOneSimpleLocalVariable_Inner', () => {
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
          });
        });
      });

      // FIXME: re-enable on LLDB when it correctly supports 'simple' mode (as in outputs types)
      it("gets a single complex local variable (name and type) for the current frame @skipOnLLDB", () => {
        return runToFunc(debugSession, 'funcWithOneComplexLocalVariable_Inner', () => {
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
          });
        });
      });

      // FIXME: re-enable on LLDB when it correctly supports 'simple' mode (as in outputs types)
      it("gets two local variables (name, value, and type) for a frame @skipOnLLDB", () => {
        return runToFunc(debugSession, 'funcWithTwoLocalVariables_Inner', () => {
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
          });
        });
      });

      it("gets two local variables (name and value) for a frame", () => {
        return runToFunc(debugSession, 'funcWithTwoLocalVariables_Inner', () => {
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
          });
        });
      });

      // FIXME: re-enable on LLDB when it correctly supports 'simple' mode (as in outputs types)
      it("gets three local variables (name, value, and type) for a frame @skipOnLLDB", () => {
        return runToFunc(debugSession, 'funcWithThreeLocalVariables_Inner', () => {
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
          });
        });
      });

      it("gets three local variables (name and value) for a frame", () => {
        return runToFunc(debugSession, 'funcWithThreeLocalVariables_Inner', () => {
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
          });
        });
      });

      it("gets no frame arguments for a function with no arguments", () => {
        return runToFunc(debugSession, 'funcWithNoArgs', () => {
          return debugSession.getStackFrameVariables(dbgmits.VariableDetailLevel.None)
          .then((variables: dbgmits.IStackFrameVariablesInfo) => {
            const args = variables.args;
            expect(args.length).to.equal(0);
          });
        });
      });

      // FIXME: re-enable on LLDB when it correctly supports 'simple' mode (as in outputs types)
      it("gets one simple function argument (name, value, and type) @skipOnLLDB", () => {
        return runToFunc(debugSession, 'funcWithOneSimpleArg', () => {
          return debugSession.getStackFrameVariables(dbgmits.VariableDetailLevel.Simple)
          .then((variables: dbgmits.IStackFrameVariablesInfo) => {
            const args = variables.args;
            expect(args.length).to.equal(1);
            expect(args[0]).to.have.property('name', 'a');
            expect(args[0]).to.have.property('value', '5');
            expect(args[0]).to.have.property('type', 'int');
          });
        });
      });

      it("gets one simple function argument (name and value)", () => {
        return runToFunc(debugSession, 'funcWithOneSimpleArg', () => {
          return debugSession.getStackFrameVariables(dbgmits.VariableDetailLevel.All)
          .then((variables: dbgmits.IStackFrameVariablesInfo) => {
            const args = variables.args;
            expect(args.length).to.equal(1);
            expect(args[0]).to.have.property('name', 'a');
            expect(args[0]).to.have.property('value', '5');
            expect(args[0]).to.have.property('type').that.is.undefined;
          });
        });
      });

      // FIXME: re-enable on LLDB when it correctly supports 'simple' mode (as in outputs types)
      it("gets two function arguments (name, value, and type) @skipOnLLDB", () => {
        return runToFunc(debugSession, 'funcWithTwoArgs', () => {
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
          });
        });
      });

      // FIXME: re-enable on LLDB when it correctly supports 'simple' mode (as in outputs types)
      it("gets three function arguments (name, value, and type) @skipOnLLDB", () => {
        return runToFunc(debugSession, 'funcWithThreeArgs', () => {
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
          });
        });
      });
    }); // #getStackFrameVariables
  });
}));
