// Copyright (c) 2015-2016 Vadim Macagon
// MIT License, see LICENSE file for full terms.

require('source-map-support').install();

import * as chai from 'chai';
import chaiAsPromised = require('chai-as-promised');
import * as bunyan from 'bunyan';
import * as dbgmits from '../lib/index';
import {
  beforeEachTestWithLogger, logSuite as log, startDebugSession, runToFunc,
  getLocalTargetExe
} from './test_utils';

chai.use(chaiAsPromised);

// aliases
var expect = chai.expect;
import DebugSession = dbgmits.DebugSession;

const localTargetExe = getLocalTargetExe('thread_tests_target');

log(describe("Debug Session", () => {
  var debugSession: DebugSession;

  beforeEachTestWithLogger((logger: bunyan.Logger) => {
    debugSession = startDebugSession(logger);
    return debugSession.setExecutableFile(localTargetExe);
  });

  afterEach(() => {
    return debugSession.end();
  });

  describe("#getThread()", () => {
    it("gets information about thread 1", () => {
      return runToFunc(debugSession, 'main', () => {
        return debugSession.getThread(1)
        .then((info: dbgmits.IThreadInfo) => {
          expect(info).to.have.property('id', 1);
          expect(info).to.have.property('isStopped', true);
        });
      });
    });

    // FIXME: re-enable for LLDB when LLDB-MI stops crashing when processin -thread-info 2
    it("gets information about thread 2 @skipOnLLDB", () => {
      return debugSession.setInferiorArguments('--threads 2')
      .then(() => {
        return runToFunc(debugSession, 'funcA', () => {
          return debugSession.getThread(2)
          .then((info: dbgmits.IThreadInfo) => {
            expect(info).to.have.property('id', 2);
            expect(info).to.have.property('isStopped', true);
          });
        });
      });
    });
  }); // describe #getThread()

  describe("#getThreads()", () => {
    // FIXME: re-enable for LLDB when LLDB-MI starts returning the current thread id in the
    // result for -thread-info
    it("gets thread list from a single-threaded inferior @skipOnLLDB", () => {
      return runToFunc(debugSession, 'main', () => {
        return debugSession.getThreads()
        .then((info: dbgmits.IMultiThreadInfo) => {
          expect(info).to.have.property('all').which.has.property('length', 1);
          expect(info).to.have.property('current').which.equals(info.all[0]);
          expect(info.current).to.have.property('id', 1);
          expect(info.current).to.have.property('isStopped', true);
        });
      });
    });

    // FIXME: same issue when using LLDB-MI as above
    it("gets thread list from a multi-threaded inferior @skipOnLLDB", () => {
      return debugSession.setInferiorArguments('--threads 2')
      .then(() => {
        return runToFunc(debugSession, 'funcA', () => {
          return debugSession.getThreads()
          .then((info: dbgmits.IMultiThreadInfo) => {
            expect(info).to.have.property('all').which.has.property('length', 2);
            expect(info).to.have.property('current').which.equals(info.all[0]);
            expect(info.all[0]).to.have.property('isStopped', true);
            expect(info.all[1]).to.have.property('isStopped', true);
          });
        });
      });
    });
  }); // describe #getThreads()
}));
