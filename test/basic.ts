// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/test/tsd.d.ts" />

require('source-map-support').install();

import chai = require('chai');
import chaiAsPromised = require('chai-as-promised');
import stream = require('stream');
import dbgmits = require('../src/dbgmits');

chai.use(chaiAsPromised);

// aliases
import expect = chai.expect;
import DebugSession = dbgmits.DebugSession;

// the directory in which Gruntfile.js resides is also Mocha's working directory,
// so any relative paths will be relative to that directory
var localTargetExe: string = './build/Debug/test_target';
var hostExecutable: string = 'C:/Projects/hello-world/hello-world';
var remoteHost: string = '192.168.56.101';
var remotePort: number = 8099;

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
      debugSession = dbgmits.startDebugSession();
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

    it("emits EVENT_LIB_LOADED (LLDB variant)", (done: MochaDone) => {
      var num: string = '1';
      var name: string = 'somelib';
      var path: string = 'C:/Projects/MyProject/somelib';
      var loadAddr: string = '-';
      emitEventForDebuggerOutput(
        `=shlibs-added,shlib-info=[num="${num}",name="${name}",dyld-addr="${loadAddr}",` +
        `reason="dyld",path="${path}",loaded_addr="${loadAddr}"]\n`,
        DebugSession.EVENT_LIB_LOADED,
        (data: any) => {
          expect(data).to.have.property('id', num);
          expect(data).to.have.property('targetName', path);
          expect(data).to.have.property('hostName', name);
          expect(data).to.have.property('loadAddress', loadAddr);
          done();
        }
      );
    });

    it("emits EVENT_LIB_UNLOADED (LLDB variant)", (done: MochaDone) => {
      var num: string = '1';
      var name: string = 'somelib';
      var path: string = 'C:/Projects/MyProject/somelib';
      var loadAddr: string = '-';
      emitEventForDebuggerOutput(
        `=shlibs-removed,shlib-info=[num="${num}",name="${name}",dyld-addr="${loadAddr}",` +
        `reason="dyld",path="${path}",loaded_addr="${loadAddr}"]\n`,
        DebugSession.EVENT_LIB_UNLOADED,
        (data: any) => {
          expect(data).to.have.property('id', num);
          expect(data).to.have.property('targetName', path);
          expect(data).to.have.property('hostName', name);
          expect(data).to.have.property('loadAddress', loadAddr);
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
      debugSession = dbgmits.startDebugSession();
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
      debugSession = dbgmits.startDebugSession();
      return debugSession.setExecutableFile(localTargetExe);
    });

    afterEach(() => {
      return debugSession.end();
    });

    it("adds a breakpoint by function name", () => {
      var funcName: string = 'main';
      return debugSession.addBreakpoint(funcName)
      .then((info: dbgmits.BreakpointInfo) => {
        expect(info).to.have.property('id');
        expect(info).to.have.property('breakpointType', 'breakpoint');
        expect(info).to.have.property('isEnabled', true);
        expect(info).to.have.property('func', funcName);
      });
    });

    it("removes a breakpoint", () => {
      return debugSession.addBreakpoint('main')
      .then((info: dbgmits.BreakpointInfo) => { return parseInt(info.id, 10); })
      .then((breakpointId: number) => { return debugSession.removeBreakpoint(breakpointId); });
    });

    it("enables a breakpoint", () => {
      return debugSession.addBreakpoint('main', { isDisabled: true })
      .then((info: dbgmits.BreakpointInfo) => { return parseInt(info.id, 10); })
      .then((breakpointId: number) => { return debugSession.enableBreakpoint(breakpointId); });
    });

    it("disables a breakpoint", () => {
      return debugSession.addBreakpoint('main', { isDisabled: false })
      .then((data: dbgmits.BreakpointInfo) => { return parseInt(data.id, 10); })
      .then((breakpointId: number) => { debugSession.disableBreakpoint(breakpointId); });
    });
  });
});
