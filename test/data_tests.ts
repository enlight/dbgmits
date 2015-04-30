// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/test/tsd.d.ts" />

require('source-map-support').install();

import chai = require('chai');
import chaiAsPromised = require('chai-as-promised');
import dbgmits = require('../src/dbgmits');
import testUtils = require('../test/test_utils');

chai.use(chaiAsPromised);

// aliases
import expect = chai.expect;
import DebugSession = dbgmits.DebugSession;
import runToFuncAndStepOut = testUtils.runToFuncAndStepOut;

// the directory in which Gruntfile.js resides is also Mocha's working directory,
// so any relative paths will be relative to that directory
var localTargetExe: string = './build/Debug/data_tests_target';

describe("Data Inspection and Manipulation", () => {
  var debugSession: DebugSession;

  beforeEach(() => {
    debugSession = dbgmits.startDebugSession();
    return debugSession.setExecutableFile(localTargetExe);
  });

  afterEach(() => {
    return debugSession.end();
  });

  it("evaluates expressions", () => {
    return runToFuncAndStepOut(debugSession, 'expressionEvaluationBreakpoint', () => {
      return debugSession.evaluateExpression('a')
      .then((value: string) => { expect(value).to.equal('1'); })
      .then(() => { return debugSession.evaluateExpression('a + b'); })
      .then((value: string) => { expect(value).to.equal('3'); })
      .then(() => { return debugSession.evaluateExpression('c.x * c.y'); })
      .then((value: string) => { expect(value).to.equal('25'); })
      .then(() => { return debugSession.evaluateExpression('get10()'); })
      .then((value: string) => { expect(value).to.equal('10'); })
      .then(() => { return debugSession.evaluateExpression('get10() * get10()'); })
      .then((value: string) => { expect(value).to.equal('100'); })
      .then(() => { return debugSession.evaluateExpression('get10() == 10'); })
      .then((value: string) => { expect(value).to.equal('true'); })
      .then(() => { return debugSession.evaluateExpression('get10() == getInt(10)'); })
      .then((value: string) => { expect(value).to.equal('true'); });
    });
  });
});
