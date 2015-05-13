// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import dbgmits = require('../src/dbgmits');

// aliases
import DebugSession = dbgmits.DebugSession;

export function startDebugSession(): DebugSession {
  return dbgmits.startDebugSession(process.env['DBGMITS_DEBUGGER']);
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
      debugSession.once(DebugSession.EVENT_STEP_FINISHED,
        (stepNotify: dbgmits.StepFinishedNotify) => {
          afterStepOut()
          .then(resolve)
          .catch(reject);
        }
      );
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
