// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

require('source-map-support').install();

import * as chai from 'chai';
import chaiAsPromised = require('chai-as-promised');
import * as stream from 'stream';
import * as bunyan from 'bunyan';
import * as dbgmits from '../lib/index';
import { startDebugSession } from './test_utils';

chai.use(chaiAsPromised);

// aliases
var expect = chai.expect;
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
        dbgmits.EVENT_THREAD_GROUP_ADDED,
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
        dbgmits.EVENT_THREAD_GROUP_REMOVED,
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
        dbgmits.EVENT_THREAD_GROUP_STARTED,
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
        dbgmits.EVENT_THREAD_GROUP_EXITED,
        (data: any) => {
          expect(data).to.have.property('id', id);
          expect(data).to.have.property('exitCode', exitCode);
          done();
        }
      );
    });

    it("emits EVENT_THREAD_CREATED", (done: MochaDone) => {
      const id = 1;
      var groupId: string = 'i1';
      emitEventForDebuggerOutput(
        `=thread-created,id="${id}",group-id="${groupId}"\n`,
        dbgmits.EVENT_THREAD_CREATED,
        (data: any) => {
          expect(data).to.have.property('id', id);
          expect(data).to.have.property('groupId', groupId);
          done();
        }
      );
    });

    it("emits EVENT_THREAD_EXITED", (done: MochaDone) => {
      const id = 1;
      var groupId: string = 'i1';
      emitEventForDebuggerOutput(
        `=thread-exited,id="${id}",group-id="${groupId}"\n`,
        dbgmits.EVENT_THREAD_EXITED,
        (data: any) => {
          expect(data).to.have.property('id', id);
          expect(data).to.have.property('groupId', groupId);
          done();
        }
      );
    });

    it("emits EVENT_THREAD_SELECTED", (done: MochaDone) => {
      const id = 1;
      emitEventForDebuggerOutput(
        `=thread-selected,id="${id}"\n`,
        dbgmits.EVENT_THREAD_SELECTED,
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
        dbgmits.EVENT_LIB_LOADED,
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
        dbgmits.EVENT_LIB_UNLOADED,
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
        dbgmits.EVENT_DBG_CONSOLE_OUTPUT,
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
        dbgmits.EVENT_TARGET_OUTPUT,
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
        dbgmits.EVENT_DBG_LOG_OUTPUT,
        (data: string) => {
          expect(data).to.equal(testStr);
          done();
        }
      );
    });

    it("emits EVENT_TARGET_RUNNING", (done: MochaDone) => {
      var threadId: string = 'all';
      emitEventForDebuggerOutput(
        '*running,thread-id="${threadId}"', dbgmits.EVENT_TARGET_RUNNING,
        (threadId: string) => {
          expect(threadId).to.equal(threadId);
          done();
        }
      );
    });

    it("emits EVENT_TARGET_STOPPED", (done: MochaDone) => {
      emitEventForDebuggerOutput(
        '*stopped,reason="exited-normally"\n', dbgmits.EVENT_TARGET_STOPPED,
        (notification: dbgmits.ITargetStoppedEvent) => {
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
        dbgmits.EVENT_BREAKPOINT_HIT,
        (notification: dbgmits.IBreakpointHitEvent) => {
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
        dbgmits.EVENT_SIGNAL_RECEIVED,
        (notification: dbgmits.ISignalReceivedEvent) => {
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
        dbgmits.EVENT_EXCEPTION_RECEIVED,
        (notification: dbgmits.IExceptionReceivedEvent) => {
          expect(notification.reason).to.equal(dbgmits.TargetStopReason.ExceptionReceived);
          expect(notification.threadId).to.equal(threadId);
          expect(notification.stoppedThreads.length).to.equal(0);
          expect(notification.exception).to.equal(msg);
          done();
        }
      );
    });

    it("emits EVENT_BREAKPOINT_MODIFIED", (done: MochaDone) => {
      const id = 999;
      const breakpointType = 'breakpoint';
      const address = '0x0000000000400927';
      const func = 'main(int, char const**)';
      const filename = '../test/break_tests_target.cpp';
      const fullname = '/media/sf_dbgmits/test/break_tests_target.cpp';
      const line = 47;
      const threadGroup = 'i1';
      const hitCount = 1;
      const ignoreCount = 2;
      const enableCount = 3;
      const passCount = 4;
      const originaLocation = 'main';
      const threadId = 10;
      const condition = 'something == true';
      const what = 'nothing';
      const at = `${address} ${func}`;
      const evaluatedBy = 'target';
      const mask = "xxxx";

      emitEventForDebuggerOutput(
        `=breakpoint-modified,bkpt={number="${id}",type="${breakpointType}",disp="keep",` +
        `enabled="y",addr="${address}",func="${func}",file="${filename}",` +
        `fullname="${fullname}",line="${line}",thread-groups=["${threadGroup}"],` +
        `times="${hitCount}",enable="${enableCount}",ignore="${ignoreCount}",` +
        `original-location="${originaLocation}",pending="${originaLocation}",` +
        `thread="${threadId}",cond="${condition}",what="${what}",at="${at}",` +
        `pass="${passCount}",evaluated-by="${evaluatedBy}",mask="${mask}",` +
        `installed="y"}`,
        dbgmits.EVENT_BREAKPOINT_MODIFIED,
        (e: dbgmits.IBreakpointModifiedEvent) => {
          const bp = e.breakpoint;
          expect(bp).to.have.property('id', id);
          expect(bp).to.have.property('breakpointType', breakpointType);
          expect(bp).to.have.property('isTemp', false);
          expect(bp).to.have.property('isEnabled', true);
          expect(bp).to.have.property('locations').of.length(1);
          expect(bp).to.have.property('pending', originaLocation);
          expect(bp).to.have.property('threadId', threadId);
          expect(bp).to.have.property('condition', condition);
          expect(bp).to.have.property('ignoreCount', ignoreCount);
          expect(bp).to.have.property('enableCount', enableCount);
          expect(bp).to.have.property('originalLocation', originaLocation);
          expect(bp).to.have.property('hitCount', hitCount);
          expect(bp).to.have.property('what', what);
          expect(bp).to.have.property('passCount', passCount);
          expect(bp).to.have.property('evaluatedBy', evaluatedBy);
          expect(bp).to.have.property('mask', mask);
          expect(bp).to.have.property('isInstalled', true);

          const bploc = bp.locations[0];
          expect(bploc).to.have.property('id', id.toString());
          expect(bploc).to.have.property('address', address);
          expect(bploc).to.have.property('func', func);
          expect(bploc).to.have.property('filename', filename);
          expect(bploc).to.have.property('fullname', fullname);
          expect(bploc).to.have.property('line', line);
          expect(bploc).to.have.property('at', at);

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
});
