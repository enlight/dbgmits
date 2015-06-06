// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/test-tsd.d.ts" />

require('source-map-support').install();

import * as chai from 'chai';
import chaiAsPromised = require('chai-as-promised');
import * as bunyan from 'bunyan';
import * as dbgmits from '../src/index';
import {
  beforeEachTestWithLogger, logSuite as log, startDebugSession, runToFuncAndStepOut
} from '../test/test_utils';

chai.use(chaiAsPromised);

// aliases
var expect = chai.expect;
import DebugSession = dbgmits.DebugSession;

// the directory in which Gruntfile.js resides is also Mocha's working directory,
// so any relative paths will be relative to that directory
var localTargetExe: string = './build/Debug/exec_tests_target';
// this should be kept up to date with any modifications to exec_tests_target.cpp
var locationOfCallToPrintNextInt: string = 'exec_tests_target.cpp:19';

log(describe("Debug Session", () => {
  describe("Program Execution", () => {
    var debugSession: DebugSession;

    beforeEachTestWithLogger((logger: bunyan.Logger) => {
      debugSession = startDebugSession(logger);
      return debugSession.setExecutableFile(localTargetExe);
    });

    afterEach(() => {
      return debugSession.end();
    });

    it("starts the target process", () => {
      return debugSession.startInferior();
    });

    // FIXME: This tests is skipped on GDB because this MI command is not supported even though
    // it was documented in the GDB/MI spec.
    it("aborts the target process @skipOnGDB", () => {
      var verifyTargetExited = () => {
        // Promises get executed when they're created, wrapping the promise creation in
        // a function makes it possible to delay execution u
        return new Promise<void>((resolve, reject) => {
          debugSession.once(dbgmits.EVENT_TARGET_STOPPED,
            (stopNotify: dbgmits.ITargetStoppedEvent) => {
              // This event listener function gets invoked outside of the promise, 
              // which means the promise doesn't trap any exception thrown here, 
              // so we have to trap any exceptions manually and then hand them over 
              // to the promise (if we don't an exception here will kill the test runner
              // instead of just failing this test).
              try {
                expect(stopNotify.reason).to.equal(dbgmits.TargetStopReason.ExitedNormally);
                resolve();
              } catch (err) {
                reject(err);
              }
            }
          );
        });
      };
      // a breakpoint will be set to get to the desired starting point in the target process
      var onBreakpointAbortTarget = new Promise<void>((resolve, reject) => {
        debugSession.once(dbgmits.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.IBreakpointHitEvent) => {
            Promise.all([verifyTargetExited(), debugSession.abortInferior()])
            .then(() => { resolve() }, reject);
          }
        );
      });
      // break at the start of main()
      return debugSession.addBreakpoint('main')
      .then(() => {
        return Promise.all([
          onBreakpointAbortTarget,
          debugSession.startInferior()
        ]);
      });
    });

    it("steps into a source line", () => {
      // when the step is done check we're in printNextInt()
      var onStepFinishedCheckFrame = new Promise<void>((resolve, reject) => {
        debugSession.once(dbgmits.EVENT_STEP_FINISHED, 
          (notification: dbgmits.IStepFinishedEvent) => {
            debugSession.getStackFrame()
            .then((info: dbgmits.IStackFrameInfo) => {
              expect(info.func.indexOf('printNextInt')).to.equal(0);
            })
            .then(resolve, reject);
          }
        );
      });
      // a breakpoint will be set to get to the desired starting point in the target process
      var onBreakpointStepIntoLine = new Promise<void>((resolve, reject) => {
        debugSession.once(dbgmits.EVENT_BREAKPOINT_HIT, 
          (notify: dbgmits.IBreakpointHitEvent) => {
            // step into the printNextInt() call in main()
            resolve(debugSession.stepIntoLine());
          }
        );
      });
      // break on the line in main() that calls printNextInt()
      return debugSession.addBreakpoint(locationOfCallToPrintNextInt)
      .then(() => {
          return Promise.all([
            onBreakpointStepIntoLine,
            onStepFinishedCheckFrame,
            debugSession.startInferior()
          ]);
      });
    });

    it("steps into an instruction", () => {
      // when the step is done check we're in printNextInt()
      var onStepFinishedCheckFrame = new Promise<void>((resolve, reject) => {
        debugSession.once(dbgmits.EVENT_STEP_FINISHED, 
          (notification: dbgmits.IStepFinishedEvent) => {
            debugSession.getStackFrame()
            .then((info: dbgmits.IStackFrameInfo) => {
              expect(info.func.indexOf('printNextInt')).to.equal(0);
            })
            .then(resolve, reject);
          }
        );
      });
      // a breakpoint will be set to get to the desired starting point in the target process
      var onBreakpointStepIntoInstruction = new Promise<void>((resolve, reject) => {
        debugSession.once(dbgmits.EVENT_BREAKPOINT_HIT, 
          (notify: dbgmits.IBreakpointHitEvent) => {
            // step into the printNextInt() call in main()
            resolve(debugSession.stepIntoInstruction());
          }
        );
      });
      // break on the line in main() that calls printNextInt()
      return debugSession.addBreakpoint(locationOfCallToPrintNextInt)
      .then(() => {
        return Promise.all([
          onBreakpointStepIntoInstruction,
          onStepFinishedCheckFrame,
          debugSession.startInferior()
        ]);
      });
    });

    it("steps over a source line", () => {
      // when the step is done check we're still in main() and haven't stepped into printNextInt()
      var onStepFinishedCheckFrame = new Promise<void>((resolve, reject) => {
        debugSession.once(dbgmits.EVENT_STEP_FINISHED, 
          (notification: dbgmits.IStepFinishedEvent) => {
            debugSession.getStackFrame()
            .then((info: dbgmits.IStackFrameInfo) => {
              expect(info).to.have.property('func', 'main');
            })
            .then(resolve, reject);
          }
        );
      });
      // a breakpoint will be set to get to the desired starting point in the target process
      var onBreakpointStepOverLine = new Promise<void>((resolve, reject) => {
        debugSession.once(dbgmits.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.IBreakpointHitEvent) => {
            // step over the printNextInt() call in main()
            resolve(debugSession.stepOverLine());
          }
        );
      });
      // break on the line in main() that calls printNextInt()
      return debugSession.addBreakpoint(locationOfCallToPrintNextInt)
      .then(() => {
        return Promise.all([
          onBreakpointStepOverLine,
          onStepFinishedCheckFrame,
          debugSession.startInferior()
        ]);
      });
    });

    it("steps over an instruction", () => {
      // when the step is done check we're still in main() and haven't stepped into printNextInt()
      var onStepFinishedCheckFrame = new Promise<void>((resolve, reject) => {
        debugSession.once(dbgmits.EVENT_STEP_FINISHED, 
          (notification: dbgmits.IStepFinishedEvent) => {
            debugSession.getStackFrame()
            .then((info: dbgmits.IStackFrameInfo) => {
              expect(info).to.have.property('func', 'main');
            })
            .then(resolve, reject);
          }
        );
      });
      // a breakpoint will be set to get to the desired starting point in the target process
      var onBreakpointStepOverInstruction = new Promise<void>((resolve, reject) => {
        debugSession.once(dbgmits.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.IBreakpointHitEvent) => {
            // step over the printNextInt() call in main()
            resolve(debugSession.stepOverInstruction());
          }
        );
      });
      // break on the line in main() that calls printNextInt()
      return debugSession.addBreakpoint(locationOfCallToPrintNextInt)
      .then(() => {
        return Promise.all([
          onBreakpointStepOverInstruction,
          onStepFinishedCheckFrame,
          debugSession.startInferior()
        ]);
      });
    });

    it("steps out of a function", () => {
      return runToFuncAndStepOut(debugSession, 'printNextInt', () => {
        return debugSession.getStackFrame()
        .then((info: dbgmits.IStackFrameInfo) => {
          // when the step is done check we're back in main() and not still in printNextInt()
          expect(info).to.have.property('func', 'main');
        })
      });
    });
  });
}));
