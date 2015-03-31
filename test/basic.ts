// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/test/mocha/mocha.d.ts" />
/// <reference path="../typings/test/chai/chai.d.ts" />

import chai = require('chai');
import dbgmits = require('../src/dbgmits');

// aliases
import expect = chai.expect;
import DebugSession = dbgmits.DebugSession;

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
