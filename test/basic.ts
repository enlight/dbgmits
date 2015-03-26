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
  var debugSession : DebugSession;

  before(() => {
    debugSession = dbgmits.startDebugSession();
  });

  it("Should start", () => {
    expect(debugSession).to.exist;
  });

  it("Should end", (done) => {
    debugSession.end(done);
  });
});
