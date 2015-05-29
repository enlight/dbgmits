// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/test/tsd.d.ts" />

require('source-map-support').install();

import * as chai from 'chai';
import chaiAsPromised = require('chai-as-promised');
import * as bunyan from 'bunyan';
import * as dbgmits from '../src/dbgmits';
import { beforeEachTestWithLogger, logSuite as log, startDebugSession } from '../test/test_utils';

chai.use(chaiAsPromised);

// aliases
var expect = chai.expect;
import DebugSession = dbgmits.DebugSession;

// the directory in which Gruntfile.js resides is also Mocha's working directory,
// so any relative paths will be relative to that directory
var localTargetExe: string = './build/Debug/break_tests_target';
var localTargetSrcFilename = 'break_tests_target.cpp';

log(describe("Debug Session", () => {
  describe("Breakpoints", () => {
    var debugSession: DebugSession;

    beforeEachTestWithLogger((logger: bunyan.Logger) => {
      debugSession = startDebugSession(logger);
      return debugSession.setExecutableFile(localTargetExe);
    });

    afterEach(() => {
      return debugSession.end();
    });

    it("adds a breakpoint by function name", () => {
      return debugSession.addBreakpoint('main')
      .then((info: dbgmits.IBreakpointInfo) => {
        expect(info).to.have.property('id');
        expect(info).to.have.property('breakpointType', 'breakpoint');
        expect(info).to.have.property('isEnabled', true);
        expect(info).to.have.property('func');
        expect(info.func).match(/^main/);
      });
    });

    it("adds a breakpoint by filename and line number", () => {
      let filename: string = localTargetSrcFilename;
      let line = 5;
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
}));
