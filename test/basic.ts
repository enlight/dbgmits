// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/test/tsd.d.ts" />

require('source-map-support').install();

import * as chai from 'chai';
import chaiAsPromised = require('chai-as-promised');
import * as stream from 'stream';
import * as bunyan from 'bunyan';
import * as dbgmits from '../src/dbgmits';
import {
  beforeEachTestCreateLogger, startDebugSession, runToFuncAndStepOut
} from '../test/test_utils';

chai.use(chaiAsPromised);

// aliases
var expect = chai.expect;
import DebugSession = dbgmits.DebugSession;
import IWatchInfo = dbgmits.IWatchInfo;

// the directory in which Gruntfile.js resides is also Mocha's working directory,
// so any relative paths will be relative to that directory
var localTargetExe: string = './build/Debug/test_target';
var hostExecutable: string = 'C:/Projects/hello-world/hello-world';
var remoteHost: string = '192.168.56.101';
var remotePort: number = 8099;
// this should be kept up to date with any modifications to test_target.cpp
var locationOfCallToPrintNextInt: string = 'test_target.cpp:119';

/**
 * Creates a readable stream containing nothing but the text passed in.
 */
function createTextStream(text: string): stream.Readable {
  var textStream = new stream.Readable();
  textStream.push(text, 'utf8');
  textStream.push(null);
  return textStream;
}

/**
 * Creates a debug session but instead of spawning a debugger and connecting to it the session
 * is simply fed the passed in notification text, this makes it emit an event (assuming the
 * notification text was formatted correctly).
 *
 * @param text Notification text in MI format.
 * @param event The name of the event that is expected to be emitted.
 * @param callback Callback to invoke if the expected event was emitted.
 */
function emitEventForDebuggerOutput(text: string, event: string, callback: (data: any) => void): void {
  var debugSession = new DebugSession(createTextStream(text), null);
  debugSession.once(event, (data: any) => {
    debugSession.end(false);
    callback(data);
  });
}

describe("Debug Session", () => {
  describe("Basics", () => {
    var debugSession: DebugSession;

    before(() => {
      debugSession = startDebugSession();
    });

    it("should start", () => {
      expect(debugSession).to.exist;
    });

    it("should set executable to debug", () => {
      return debugSession.setExecutableFile(localTargetExe);
    });

    after(() => {
      return debugSession.end();
    });
  });

  describe("Events", () => {
    it("emits EVENT_THREAD_GROUP_ADDED", (done: MochaDone) => {
      var id: string = 'i1';
      emitEventForDebuggerOutput(
        `=thread-group-added,id="${id}"\n`,
        DebugSession.EVENT_THREAD_GROUP_ADDED,
        (data: any) => {
          expect(data).to.have.property('id', id);
          done();
        }
      );
    });

    it("emits EVENT_THREAD_GROUP_REMOVED", (done: MochaDone) => {
      var id: string = 'i1';
      emitEventForDebuggerOutput(
        `=thread-group-removed,id="${id}"\n`,
        DebugSession.EVENT_THREAD_GROUP_REMOVED,
        (data: any) => {
          expect(data).to.have.property('id', id);
          done();
        }
      );
    });

    it("emits EVENT_THREAD_GROUP_STARTED", (done: MochaDone) => {
      var id: string = 'i1';
      var pid: string = '6550';
      emitEventForDebuggerOutput(
        `=thread-group-started,id="${id}",pid="${pid}"\n`,
        DebugSession.EVENT_THREAD_GROUP_STARTED,
        (data: any) => {
          expect(data).to.have.property('id', id);
          expect(data).to.have.property('pid', pid);
          done();
        }
      );
    });

    it("emits EVENT_THREAD_GROUP_EXITED", (done: MochaDone) => {
      var id: string = 'i1';
      var exitCode: string = '3';
      emitEventForDebuggerOutput(
        `=thread-group-exited,id="${id}",exit-code="${exitCode}"\n`,
        DebugSession.EVENT_THREAD_GROUP_EXITED,
        (data: any) => {
          expect(data).to.have.property('id', id);
          expect(data).to.have.property('exitCode', exitCode);
          done();
        }
      );
    });

    it("emits EVENT_THREAD_CREATED", (done: MochaDone) => {
      var id: string = '1';
      var groupId: string = 'i1';
      emitEventForDebuggerOutput(
        `=thread-created,id="${id}",group-id="${groupId}"\n`,
        DebugSession.EVENT_THREAD_CREATED,
        (data: any) => {
          expect(data).to.have.property('id', id);
          expect(data).to.have.property('groupId', groupId);
          done();
        }
      );
    });

    it("emits EVENT_THREAD_EXITED", (done: MochaDone) => {
      var id: string = '1';
      var groupId: string = 'i1';
      emitEventForDebuggerOutput(
        `=thread-exited,id="${id}",group-id="${groupId}"\n`,
        DebugSession.EVENT_THREAD_EXITED,
        (data: any) => {
          expect(data).to.have.property('id', id);
          expect(data).to.have.property('groupId', groupId);
          done();
        }
      );
    });

    it("emits EVENT_THREAD_SELECTED", (done: MochaDone) => {
      var id: string = '1';
      emitEventForDebuggerOutput(
        `=thread-selected,id="${id}"\n`,
        DebugSession.EVENT_THREAD_SELECTED,
        (data: any) => {
          expect(data).to.have.property('id', id);
          done();
        }
      );
    });

    it("emits EVENT_LIB_LOADED", (done: MochaDone) => {
      var id: string = '1';
      var targetName: string = 'somelib';
      var hostName: string = 'somelib';
      var threadGroup: string = 'i1';
      emitEventForDebuggerOutput(
        `=library-loaded,id="${id}",target-name="${targetName}",host-name="${hostName}",thread-group="${threadGroup}"\n`,
        DebugSession.EVENT_LIB_LOADED,
        (data: any) => {
          expect(data).to.have.property('id', id);
          expect(data).to.have.property('targetName', targetName);
          expect(data).to.have.property('hostName', hostName);
          expect(data).to.have.property('threadGroup', threadGroup);
          done();
        }
      );
    });

    it("emits EVENT_LIB_UNLOADED", (done: MochaDone) => {
      var id: string = '1';
      var targetName: string = 'somelib';
      var hostName: string = 'somelib';
      var threadGroup: string = 'i1';
      emitEventForDebuggerOutput(
        `=library-unloaded,id="${id}",target-name="${targetName}",host-name="${hostName}",thread-group="${threadGroup}"\n`,
        DebugSession.EVENT_LIB_UNLOADED,
        (data: any) => {
          expect(data).to.have.property('id', id);
          expect(data).to.have.property('targetName', targetName);
          expect(data).to.have.property('hostName', hostName);
          expect(data).to.have.property('threadGroup', threadGroup);
          done();
        }
      );
    });

    it("emits EVENT_DBG_CONSOLE_OUTPUT", (done: MochaDone) => {
      var testStr: string = 'This is a line of text.';
      emitEventForDebuggerOutput(
        '~"' + testStr + '"\n',
        DebugSession.EVENT_DBG_CONSOLE_OUTPUT,
        (data: string) => {
          expect(data).to.equal(testStr);
          done();
        }
      );
    });

    it("emits EVENT_TARGET_OUTPUT", (done: MochaDone) => {
      var testStr: string = 'This is some target output.';
      emitEventForDebuggerOutput(
        '@"' + testStr + '"\n',
        DebugSession.EVENT_TARGET_OUTPUT,
        (data: string) => {
          expect(data).to.equal(testStr);
          done();
        }
      );
    });

    it("emits EVENT_DBG_LOG_OUTPUT", (done: MochaDone) => {
      var testStr: string = 'This is some debugger log output.';
      emitEventForDebuggerOutput(
        '&"' + testStr + '"\n',
        DebugSession.EVENT_DBG_LOG_OUTPUT,
        (data: string) => {
          expect(data).to.equal(testStr);
          done();
        }
      );
    });

    it("emits EVENT_TARGET_RUNNING", (done: MochaDone) => {
      var threadId: string = 'all';
      emitEventForDebuggerOutput(
        '*running,thread-id="${threadId}"', DebugSession.EVENT_TARGET_RUNNING,
        (threadId: string) => {
          expect(threadId).to.equal(threadId);
          done();
        }
      );
    });

    it("emits EVENT_TARGET_STOPPED", (done: MochaDone) => {
      emitEventForDebuggerOutput(
        '*stopped,reason="exited-normally"\n', DebugSession.EVENT_TARGET_STOPPED,
        (notification: dbgmits.TargetStoppedNotify) => {
          expect(notification.reason).to.equal(dbgmits.TargetStopReason.ExitedNormally);
          done();
        }
      );
    });

    it("emits EVENT_BREAKPOINT_HIT", (done: MochaDone) => {
      var bkptId: number = 15;
      var threadId: number = 1;
      emitEventForDebuggerOutput(
        `*stopped,reason="breakpoint-hit",bkptno="${bkptId}",frame={},thread-id="${threadId}",` +
        `stopped-threads="all"\n`,
        DebugSession.EVENT_BREAKPOINT_HIT,
        (notification: dbgmits.BreakpointHitNotify) => {
          expect(notification.reason).to.equal(dbgmits.TargetStopReason.BreakpointHit);
          expect(notification.threadId).to.equal(threadId);
          expect(notification.stoppedThreads.length).to.equal(0);
          expect(notification.breakpointId).to.equal(bkptId);
          done();
        }
      );
    });

    it("emits EVENT_SIGNAL_RECEIVED", (done: MochaDone) => {
      var signalName: string = 'SIGSEGV';
      var signalMeaning: string = 'Segmentation Fault';
      var threadId: number = 1;
      emitEventForDebuggerOutput(
        `*stopped,reason="signal-received",signal-name="${signalName}",` +
        `signal-meaning="${signalMeaning}",thread-id="${threadId}",frame={}\n`,
        DebugSession.EVENT_SIGNAL_RECEIVED,
        (notification: dbgmits.SignalReceivedNotify) => {
          expect(notification.reason).to.equal(dbgmits.TargetStopReason.SignalReceived);
          expect(notification.threadId).to.equal(threadId);
          expect(notification.signalName).to.equal(signalName);
          expect(notification.signalMeaning).to.equal(signalMeaning);
          done();
        }
      );
    });

    it("emits EVENT_EXCEPTION_RECEIVED", (done: MochaDone) => {
      var msg: string = 'This is an exception description.';
      var threadId: number = 1;
      emitEventForDebuggerOutput(
        `*stopped,reason="exception-received",exception="${msg}",thread-id="${threadId}",` +
        `stopped-threads="all"\n`,
        DebugSession.EVENT_EXCEPTION_RECEIVED,
        (notification: dbgmits.ExceptionReceivedNotify) => {
          expect(notification.reason).to.equal(dbgmits.TargetStopReason.ExceptionReceived);
          expect(notification.threadId).to.equal(threadId);
          expect(notification.stoppedThreads.length).to.equal(0);
          expect(notification.exception).to.equal(msg);
          done();
        }
      );
    });
  });
/*
  describe("Remote Debugging Setup", () => {
    var debugSession: DebugSession;

    before(() => {
      debugSession = startDebugSession();
      return debugSession.setExecutableFile(hostExecutable);
    });

    it("should connect to remote target", () => {
      return debugSession.connectToRemoteTarget(remoteHost, remotePort);
    });

    after(() => {
      return debugSession.end();
    });
  });
*/

  describe("Breakpoints", () => {
    var debugSession: DebugSession;

    beforeEachTestCreateLogger((logger: bunyan.Logger) => {
      debugSession = startDebugSession(logger);
      return debugSession.setExecutableFile(localTargetExe);
    });

    afterEach(() => {
      return debugSession.end();
    });

    it("adds a breakpoint by function name", () => {
      var funcName: string = 'main';
      return debugSession.addBreakpoint(funcName)
      .then((info: dbgmits.IBreakpointInfo) => {
        expect(info).to.have.property('id');
        expect(info).to.have.property('breakpointType', 'breakpoint');
        expect(info).to.have.property('isEnabled', true);
        expect(info).to.have.property('func');
        // FIXME: convoluted way to do startsWith(), replace after switching to ES6
        expect(info.func.indexOf(funcName)).to.equal(0);
      });
    });

    it("adds a breakpoint by filename and line number", () => {
      var filename: string = 'test_target.cpp';
      var line: string = '17';
      return debugSession.addBreakpoint(`${filename}:${line}`)
        .then((info: dbgmits.IBreakpointInfo) => {
          expect(info).to.have.property('id');
          expect(info).to.have.property('breakpointType', 'breakpoint');
          expect(info).to.have.property('isEnabled', true);
          expect(info).to.have.property('filename');
          // FIXME: convoluted way to do endsWith(), replace after switching to ES6
          expect(info.filename.lastIndexOf(filename)).to.equal(info.filename.length - filename.length);
          expect(info).to.have.property('line', line);
      });
    });

    it("removes a breakpoint", () => {
      return debugSession.addBreakpoint('main')
      .then((info: dbgmits.IBreakpointInfo) => { return parseInt(info.id, 10); })
      .then((breakpointId: number) => { return debugSession.removeBreakpoint(breakpointId); });
    });

    it("enables a breakpoint", () => {
      return debugSession.addBreakpoint('main', { isDisabled: true })
      .then((info: dbgmits.IBreakpointInfo) => { return parseInt(info.id, 10); })
      .then((breakpointId: number) => { return debugSession.enableBreakpoint(breakpointId); });
    });

    it("disables a breakpoint", () => {
      return debugSession.addBreakpoint('main', { isDisabled: false })
      .then((data: dbgmits.IBreakpointInfo) => { return parseInt(data.id, 10); })
      .then((breakpointId: number) => { debugSession.disableBreakpoint(breakpointId); });
    });
  });

  describe("Program Execution", () => {
    var debugSession: DebugSession;

    beforeEachTestCreateLogger((logger: bunyan.Logger) => {
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
          debugSession.once(DebugSession.EVENT_TARGET_STOPPED,
            (stopNotify: dbgmits.TargetStoppedNotify) => {
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
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.BreakpointHitNotify) => {
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
        debugSession.once(DebugSession.EVENT_STEP_FINISHED, 
          (notification: dbgmits.StepFinishedNotify) => {
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
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT, 
          (notify: dbgmits.BreakpointHitNotify) => {
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
        debugSession.once(DebugSession.EVENT_STEP_FINISHED, 
          (notification: dbgmits.StepFinishedNotify) => {
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
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT, 
          (notify: dbgmits.BreakpointHitNotify) => {
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
        debugSession.once(DebugSession.EVENT_STEP_FINISHED, 
          (notification: dbgmits.StepFinishedNotify) => {
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
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.BreakpointHitNotify) => {
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
        debugSession.once(DebugSession.EVENT_STEP_FINISHED, 
          (notification: dbgmits.StepFinishedNotify) => {
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
        debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
          (breakNotify: dbgmits.BreakpointHitNotify) => {
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
});
