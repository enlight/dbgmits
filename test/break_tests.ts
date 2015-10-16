// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

require('source-map-support').install();

import * as chai from 'chai';
import chaiAsPromised = require('chai-as-promised');
import * as bunyan from 'bunyan';
import * as dbgmits from '../lib/index';
import {
  beforeEachTestWithLogger, logSuite as log, startDebugSession, runToFunc,
  SourceLineResolver
} from './test_utils';
import * as path from 'path';

chai.use(chaiAsPromised);

// aliases
var expect = chai.expect;
import DebugSession = dbgmits.DebugSession;

// the directory in which Gruntfile.js resides is also Mocha's working directory,
// so any relative paths will be relative to that directory
var localTargetExe: string = './build/Debug/break_tests_target';
var localTargetSrcFilename = 'break_tests_target.cpp';

log(describe("Debug Session", () => {
  let lineResolver: SourceLineResolver;

  before(() => {
    lineResolver = SourceLineResolver.loadSourceFileSync(path.join('./test', localTargetSrcFilename));
  });

  describe("Breakpoints", () => {
    var debugSession: DebugSession;

    beforeEachTestWithLogger((logger: bunyan.Logger) => {
      debugSession = startDebugSession(logger);
      return debugSession.setExecutableFile(localTargetExe);
    });

    afterEach(() => {
      return debugSession.end();
    });

    describe("#addBreakpoint()", () => {
      it("adds a single-location breakpoint by function name", () => {
        return debugSession.addBreakpoint('main')
        .then((info: dbgmits.IBreakpointInfo) => {
          expect(info).to.have.property('id');
          expect(info).to.have.property('breakpointType', 'breakpoint');
          expect(info).to.have.property('isEnabled', true);
          expect(info).to.have.property('locations').of.length(1);
          expect(info.locations[0]).to.have.property('func');
          expect(info.locations[0].func).match(/^main/);
        });
      });

      it("adds a multi-location breakpoint by function name", () => {
        return debugSession.addBreakpoint('funcC')
        .then((breakpoint: dbgmits.IBreakpointInfo) => {
          expect(breakpoint).to.have.property('id');
          expect(breakpoint).to.have.property('breakpointType', 'breakpoint');
          expect(breakpoint).to.have.property('isEnabled', true);
          expect(breakpoint).to.have.property('originalLocation');
          expect(breakpoint.originalLocation).match(/^funcC/);
          expect(breakpoint).to.have.property('locations').of.length(3);

          const firstLocation = breakpoint.locations[0];
          expect(firstLocation).to.have.property('id', `${breakpoint.id}.1`);
          expect(firstLocation).to.have.property('address');
          expect(firstLocation).to.have.property('isEnabled', true);
          expect(firstLocation).to.have.property('func');
          expect(firstLocation.func).match(/^funcC/);
          expect(firstLocation).to.have.property('filename');
          expect(firstLocation).to.have.property('fullname');
          expect(firstLocation).to.have.property('line', 15);

          const secondLocation = breakpoint.locations[1];
          expect(secondLocation).to.have.property('id', `${breakpoint.id}.2`);
          expect(secondLocation).to.have.property('address');
          expect(secondLocation).to.have.property('isEnabled', true);
          expect(secondLocation).to.have.property('func');
          expect(secondLocation.func).match(/^funcC/);
          expect(secondLocation).to.have.property('filename');
          expect(secondLocation).to.have.property('fullname');
          expect(secondLocation).to.have.property('line', 20);

          const thirdLocation = breakpoint.locations[2];
          expect(thirdLocation).to.have.property('id', `${breakpoint.id}.3`);
          expect(thirdLocation).to.have.property('address');
          expect(thirdLocation).to.have.property('isEnabled', true);
          expect(thirdLocation).to.have.property('func');
          expect(thirdLocation.func).match(/^funcC/);
          expect(thirdLocation).to.have.property('filename');
          expect(thirdLocation).to.have.property('fullname');
          expect(thirdLocation).to.have.property('line', 25);
        });
      });

      it("adds a breakpoint by filename and line number", () => {
        let filename: string = localTargetSrcFilename;
        let line = lineResolver.getCommentLineNumber('bp: funcA()');
        return debugSession.addBreakpoint(`${filename}:${line}`)
        .then((info: dbgmits.IBreakpointInfo) => {
          expect(info).to.have.property('id');
          expect(info).to.have.property('breakpointType', 'breakpoint');
          expect(info).to.have.property('isEnabled', true);
          expect(info).to.have.property('locations').of.length(1);
          expect(info.locations[0]).to.have.property('filename');
          const locFilename = info.locations[0].filename;
          // FIXME: convoluted way to do endsWith(), replace after switching to ES6
          expect(locFilename.lastIndexOf(filename)).to.equal(locFilename.length - filename.length);
          expect(info.locations[0]).to.have.property('line', line);
        });
      });
    }); // describe #addBreakpoint()

    it("#removeBreakpoint()", () => {
      return debugSession.addBreakpoint('main')
      .then((info: dbgmits.IBreakpointInfo) => debugSession.removeBreakpoint(info.id));
    });

    it("#removeBreakpoints()", () => {
      let breakIds: number[] = [];
      return debugSession.addBreakpoint('main')
      .then((data: dbgmits.IBreakpointInfo) => {
        breakIds.push(data.id);
        return debugSession.addBreakpoint('funcA');
      })
      .then((data: dbgmits.IBreakpointInfo) => {
        breakIds.push(data.id);
        return debugSession.addBreakpoint('funcB');
      })
      .then((data: dbgmits.IBreakpointInfo) => {
        breakIds.push(data.id);
        return debugSession.removeBreakpoints(breakIds);
      });
    });

    it("#enableBreakpoint()", () => {
      return debugSession.addBreakpoint('main', { isDisabled: true })
      .then((info: dbgmits.IBreakpointInfo) => debugSession.enableBreakpoint(info.id));
    });

    it("#enableBreakpoints()", () => {
      let breakIds: number[] = [];
      return debugSession.addBreakpoint('main', { isDisabled: true })
      .then((data: dbgmits.IBreakpointInfo) => {
        breakIds.push(data.id);
        return debugSession.addBreakpoint('funcA', { isDisabled: true });
      })
      .then((data: dbgmits.IBreakpointInfo) => {
        breakIds.push(data.id);
        return debugSession.addBreakpoint('funcB', { isDisabled: true });
      })
      .then((data: dbgmits.IBreakpointInfo) => {
        breakIds.push(data.id);
        return debugSession.enableBreakpoints(breakIds);
      });
    });

    it("#disableBreakpoint()", () => {
      return debugSession.addBreakpoint('main', { isDisabled: false })
      .then((data: dbgmits.IBreakpointInfo) => debugSession.disableBreakpoint(data.id));
    });

    it("#disableBreakpoints()", () => {
      let breakIds: number[] = [];
      return debugSession.addBreakpoint('main', { isDisabled: false })
      .then((data: dbgmits.IBreakpointInfo) => {
        breakIds.push(data.id);
        return debugSession.addBreakpoint('funcA', { isDisabled: false });
      })
      .then((data: dbgmits.IBreakpointInfo) => {
        breakIds.push(data.id);
        return debugSession.addBreakpoint('funcB', { isDisabled: false });
      })
      .then((data: dbgmits.IBreakpointInfo) => {
        breakIds.push(data.id);
        return debugSession.disableBreakpoints(breakIds);
      });
    });

    describe("Events", () => {
      it("Emits EVENT_BREAKPOINT_MODIFIED when breakpoint hit count changes", () => {
        const checkBreakpointHitCount = new Promise<void>((resolve, reject) => {
          debugSession.once(dbgmits.EVENT_BREAKPOINT_MODIFIED,
            (e: dbgmits.IBreakpointModifiedEvent) => {
              try {
                expect(e.breakpoint).has.property('hitCount', 1);
                resolve();
              } catch (err) {
                reject(err);
              }
            }
          );
        });
        return debugSession.addBreakpoint('main')
        .then(() => Promise.all([
          checkBreakpointHitCount,
          debugSession.startInferior()
        ]));
      });
    }); // describe Events
  });
}));
