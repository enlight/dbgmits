// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

require('source-map-support').install();

import * as dbgmits from '../src/dbgmits';
import * as bunyan from 'bunyan';
import * as fs from 'fs';
import * as path from 'path';
import PrettyStream = require('bunyan-prettystream');

// aliases
import DebugSession = dbgmits.DebugSession;

export function startDebugSession(logger?: bunyan.Logger): DebugSession {
  let debugSession: DebugSession = dbgmits.startDebugSession(process.env['DBGMITS_DEBUGGER']);
  if (logger) {
    debugSession.logger = logger;
  }
  return debugSession;
}

/**
 * This function performs the following tasks asynchronously (but sequentially):
 * 1. Adds a breakpoint on the given function.
 * 2. Runs the target until the breakpoint is hit.
 * 3. Invokes a callback.
 *
 * @param onBreakHit Callback to invoke after the specified function is reached.
 */
export function runToFunc(
  debugSession: DebugSession, funcName: string, onBreakHit: () => Promise<any>)
  : Promise<any> {
  var onBreakpointHit = new Promise<void>((resolve, reject) => {
    debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
      (breakNotify: dbgmits.BreakpointHitNotify) => {
        onBreakHit()
        .then(resolve)
        .catch(reject);
      }
    );
  });
  // add breakpoint to get to the starting point
  return debugSession.addBreakpoint(funcName)
    .then(() => {
    return Promise.all([
      onBreakpointHit,
      debugSession.startInferior()
    ])
  });
}

/**
 * This function performs the following tasks asynchronously (but sequentially):
 * 1. Adds a breakpoint on the given function.
 * 2. Runs the target until the breakpoint is hit.
 * 3. Steps out of the function within which the breakpoint was hit.
 * 4. Invokes a callback.
 *
 * @param afterStepOut Callback to invoke after the debugger finishes stepping out of the specified
 *                     function.
 */
export function runToFuncAndStepOut(
  debugSession: DebugSession, funcName: string, afterStepOut: () => Promise<any>): Promise<any> {
  var onStepOutRunTest = () => {
    return new Promise<void>((resolve, reject) => {
      if (debugSession.canEmitFunctionFinishedNotification()) {
        debugSession.once(DebugSession.EVENT_FUNCTION_FINISHED,
          (stepNotify: dbgmits.StepOutFinishedNotify) => {
            afterStepOut()
            .then(resolve)
            .catch(reject);
          }
        );
      } else {
        // FIXME: LLDB-MI currently doesn't emit a distinct notification for step-out so we have
        // to listen to the generic step-finished one.
        debugSession.once(DebugSession.EVENT_STEP_FINISHED,
          (stepNotify: dbgmits.StepFinishedNotify) => {
            afterStepOut()
            .then(resolve)
            .catch(reject);
          }
        );
      }
    });
  }
  var onBreakpointStepOut = new Promise<void>((resolve, reject) => {
    debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
      (breakNotify: dbgmits.BreakpointHitNotify) => {
        Promise.all([
          onStepOutRunTest(),
          debugSession.stepOut()
        ])
        .then(() => { resolve(); })
        .catch(reject);
      }
    );
  });
  // add breakpoint to get to the starting point
  return debugSession.addBreakpoint(funcName)
  .then(() => {
    return Promise.all([
      onBreakpointStepOut,
      debugSession.startInferior()
    ])
  });
}

/** Partial interface for mocha.Hook callback functions (with some customization) */
interface IHookCallback {
  /** Actual callback function to be passed to Mocha's beforeEach(). */
  (): any;
  /** Creates a new logger. This will be called by the custom Mocha reporter before each test. */
  createLogger?: (testIndex: number, title: string) => void;
  /** Logger instance created by [[createLogger]]. */
  logger?: bunyan.Logger;
};

export function beforeEachTestCreateLogger(fn: (logger: bunyan.Logger) => any): void {
  let cb: IHookCallback = () => {
    // the custom reporter should've already called cb.createLogger() by this stage,
    // so cb.logger can be passed to the hook's callback function
    return fn(cb.logger);
  };
  cb.createLogger = (testIndex: number, title: string) => {
    // TODO: Create a subdir hierarchy in the logs dir matching the suite hierarchy,
    // suite titles will have to be stripped of any invalid characters first though.
    try {
      fs.mkdirSync('logs');
    } catch (err) {
      if (err.code != 'EEXIST') {
        throw err;
      }
    }
    let logPath = path.join('logs', 'Test' + testIndex + '.log');
    let fileStream = fs.createWriteStream(logPath, { flags: 'w' });
    let prettyStream = new PrettyStream({ useColor: false });
    prettyStream.pipe(fileStream);
    cb.logger = bunyan.createLogger({
      name: 'Test ' + testIndex,
      streams: [{ level: 'debug', type: 'raw', stream: prettyStream }]
    });
    cb.logger.info('====== TEST #%d: %s ======', testIndex, title);
  }
  beforeEach(cb);
}
