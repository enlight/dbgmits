// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/test/tsd.d.ts" />

require('source-map-support').install();

import * as chai from 'chai';
import chaiAsPromised = require('chai-as-promised');
import * as stream from 'stream';
import * as dbgmits from '../src/dbgmits';
import { startDebugSession, runToFuncAndStepOut } from '../test/test_utils';

chai.use(chaiAsPromised);

// aliases
import expect = chai.expect;
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

    beforeEach(() => {
      debugSession = startDebugSession();
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

    beforeEach(() => {
      debugSession = startDebugSession();
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

  describe("Stack Inspection", () => {
    var debugSession: DebugSession;

    beforeEach(() => {
      debugSession = startDebugSession();
      return debugSession.setExecutableFile(localTargetExe);
    });

    afterEach(() => {
      return debugSession.end();
    });

    it("gets info for the current stack frame", () => {
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

    it("gets the current stack depth", () => {
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
