// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/test/mocha/mocha.d.ts" />
/// <reference path="../typings/test/chai/chai.d.ts" />

import chai = require('chai');
import stream = require('stream');
import dbgmits = require('../src/dbgmits');

// aliases
import expect = chai.expect;
import DebugSession = dbgmits.DebugSession;

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
  var inStream = createTextStream(text);
  var debugSession = new DebugSession(inStream, null);
  debugSession.once(event, (data: any) => {
    debugSession.end(null, false);
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

    it("should set executable to debug", (done) => {
      debugSession.setExecutableFile('C:/Projects/hello-world/hello-world', done);
    });

    after((done) => {
      debugSession.end(done);
    });
  });

  describe("Events", () => {
    it("emits EVENT_THREAD_GROUP_ADDED", (done) => {
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

    it("emits EVENT_THREAD_GROUP_REMOVED", (done) => {
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

    it("emits EVENT_THREAD_GROUP_STARTED", (done) => {
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

    it("emits EVENT_THREAD_GROUP_EXITED", (done) => {
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

    it("emits EVENT_THREAD_CREATED", (done) => {
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

    it("emits EVENT_THREAD_EXITED", (done) => {
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

    it("emits EVENT_THREAD_SELECTED", (done) => {
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
  });

  describe("Remote Debugging Setup", () => {
    var debugSession: DebugSession;

    before(() => {
      debugSession = dbgmits.startDebugSession();
      debugSession.setExecutableFile('C:/Projects/hello-world/hello-world');
    });

    it("should connect to remote target", (done) => {
      debugSession.connectToRemoteTarget('192.168.56.101', 8099, done);
    });

    after((done) => {
      debugSession.end(done);
    });
  });
});
