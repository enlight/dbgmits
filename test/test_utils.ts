// Copyright (c) 2015-2016 Vadim Macagon
// MIT License, see LICENSE file for full terms.

require('source-map-support').install();

import * as dbgmits from '../lib/index';
import * as bunyan from 'bunyan';
import * as fs from 'fs';
import * as path from 'path';
import PrettyStream = require('bunyan-prettystream');

// aliases
import DebugSession = dbgmits.DebugSession;

/**
 * Computes the absolute path to a target executable used by tests that run on the local machine.
 *
 * NOTE: The target executables are built using the `npm run configure-tests` command.
 *
 * @param targetName The name of the target executable (without directory or extension).
 * @return Absolute path to the target executable.
 */
export function getLocalTargetExe(targetName: string): string {
  return path.normalize(path.join(
    __dirname, '../build/Debug',
    targetName + (process.platform === 'win32' ? '.exe' : '')
  ));
}

export function startDebugSession(logger?: bunyan.Logger): DebugSession {
  const debuggerType = ('lldb' === process.env['DBGMITS_DEBUGGER']) ? dbgmits.DebuggerType.LLDB : dbgmits.DebuggerType.GDB;
  let debugSession: DebugSession = dbgmits.startDebugSession(debuggerType);
  if (logger) {
    debugSession.logger = logger;

    // log event data emitted by DebugSession
    let eventsToLog = [
      dbgmits.EVENT_TARGET_RUNNING,
      dbgmits.EVENT_TARGET_STOPPED,
      dbgmits.EVENT_BREAKPOINT_HIT,
      dbgmits.EVENT_STEP_FINISHED,
      dbgmits.EVENT_FUNCTION_FINISHED,
      dbgmits.EVENT_SIGNAL_RECEIVED,
      dbgmits.EVENT_EXCEPTION_RECEIVED,
      dbgmits.EVENT_THREAD_GROUP_ADDED,
      dbgmits.EVENT_THREAD_GROUP_REMOVED,
      dbgmits.EVENT_THREAD_GROUP_STARTED,
      dbgmits.EVENT_THREAD_GROUP_EXITED,
      dbgmits.EVENT_THREAD_CREATED,
      dbgmits.EVENT_THREAD_EXITED,
      dbgmits.EVENT_THREAD_SELECTED,
      dbgmits.EVENT_LIB_LOADED,
      dbgmits.EVENT_LIB_UNLOADED,
    ];
    eventsToLog.forEach((eventName: string) => {
      debugSession.on(eventName, (data: any) => {
        if (debugSession.logger) {
          debugSession.logger.debug({ event: eventName, data: data });
        }
      });
    });

    // monkey-patch DebugSession methods that return non-void promises and log the values
    // the promises are resolved with
    let functionsToLog: string[] = [
      'addBreakpoint',
      'ignoreBreakpoint',
      'getStackFrame',
      'getStackDepth',
      'getStackFrames',
      'getStackFrameArgs',
      'getStackFrameVariables',
      'addWatch',
      'updateWatch',
      'getWatchChildren',
      'setWatchValueFormat',
      'getWatchValue',
      'setWatchValue',
      'getWatchAttributes',
      'getWatchExpression',
      'evaluateExpression',
      'readMemory',
      'getRegisterNames',
      'getRegisterValues',
      'disassembleAddressRange',
      'disassembleAddressRangeByLine',
      'disassembleFile',
      'disassembleFileByLine',
      'getThread',
      'getThreads'
    ];
    functionsToLog.forEach((funcName: string) => {
      let func: Function = (<any> debugSession)[funcName];
      (<any> debugSession)[funcName] = function () {
        return func.apply(this, arguments)
        .then((result: any) => {
          if (debugSession.logger) {
            debugSession.logger.debug({ func: funcName, result: result });
          }
          return result;
        });
      };
    });
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
    debugSession.once(dbgmits.EVENT_BREAKPOINT_HIT,
      (breakNotify: dbgmits.IBreakpointHitEvent) => {
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
    ]);
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
        debugSession.once(dbgmits.EVENT_FUNCTION_FINISHED,
          (stepNotify: dbgmits.IStepOutFinishedEvent) => {
            afterStepOut()
            .then(resolve)
            .catch(reject);
          }
        );
      } else {
        // FIXME: LLDB-MI currently doesn't emit a distinct notification for step-out so we have
        // to listen to the generic step-finished one.
        debugSession.once(dbgmits.EVENT_STEP_FINISHED,
          (stepNotify: dbgmits.IStepFinishedEvent) => {
            afterStepOut()
            .then(resolve)
            .catch(reject);
          }
        );
      }
    });
  };
  var onBreakpointStepOut = new Promise<void>((resolve, reject) => {
    debugSession.once(dbgmits.EVENT_BREAKPOINT_HIT,
      (breakNotify: dbgmits.IBreakpointHitEvent) => {
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
    ]);
  });
}

/** Partial interface for mocha.Hook callback functions (with some customization) */
interface IHookCallback {
  /** Actual callback function to be passed to Mocha's beforeEach(). */
  (): any;
  /** Called by the custom Mocha reporter before each test. */
  setLogger?: (logger: bunyan.Logger) => void;
  /** Logger instance to pass to the hook's callback function, set by [[setLogger]]. */
  logger?: bunyan.Logger;
};

/**
 * Wraps mocha's beforeEach() function so that a logger can be passed through to the callback
 * function `fn`.
 *
 * The logger instance passed to the `fn` function is created by a custom mocha reporter,
 * but only for tests that are in suites wrapped with [[logSuite]], or for tests wrapped with
 * [[logTest]].
 *
 * @param fn A function to execute before each test in the current suite.
 */
export function beforeEachTestWithLogger(fn: (logger: bunyan.Logger) => any): void {
  // unfortunately mocha doesn't return the hook instance from beforeEach(), so it's not possible
  // to add additional fields to the hook itself, instead we have to add the additional fields
  // to the callback passed to beforeEach()
  let cb: IHookCallback = () => {
    // the custom reporter should've already called cb.setLogger() by this stage
    return fn(cb.logger);
  };
  cb.setLogger = (logger: bunyan.Logger): void => {
    cb.logger = logger;
  };
  beforeEach(cb);
}

/**
 * Creates a new logger for a test.
 *
 * The logger will create a log file in the `logs/tests` directory.
 *
 * @param testIndex Test identifier, should be unique for each test.
 * @param title Test title.
 * @return A new logger instance.
 */
function createLogger(testIndex: number, title: string): bunyan.Logger {
  try {
    fs.mkdirSync('logs/tests');
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
  // pad the test number with zeroes (e.g. 1 -> 001, 10 -> 010, 100 -> 100)
  let pad = '000';
  let testFilename = (pad + testIndex).slice(-pad.length) + '.log';
  let logPath = path.join('logs/tests', testFilename);
  let fileStream = fs.createWriteStream(logPath, { flags: 'w' });
  let prettyStream = new PrettyStream({ useColor: false });
  prettyStream.pipe(fileStream);
  let logger = bunyan.createLogger({
    name: 'Test ' + testIndex,
    streams: [{ level: 'debug', type: 'raw', stream: prettyStream }]
  });
  logger.info('====== TEST #%d: %s ======', testIndex, title);
  return logger;
}

export interface ITest {
  /** Creates a new logger. */
  createLogger?: (testIndex: number, title: string) => void;
}

/**
 * Attaches a createLogger() function to a mocha.Test.
 *
 * For example:
 * ```
 * describe("Thingie", () => {
 *   beforeEachTestWithLogger((logger: bunyan.Logger) => {
 *     ...
 *   });
 *
 *   logTest(it("Does something", () => {
 *     ...
 *   }));
 * });
 * ```
 */
export function logTest(test: ITest): ITest {
  test.createLogger = createLogger;
  return test;
}

export interface ISuite {
  /** Creates a new logger. */
  createLogger?: (testIndex: number, title: string) => bunyan.Logger;
}

/**
 * Attaches a createLogger() function to a mocha.Suite.
 *
 * For example:
 * ```
 * logSuite(describe("Thingie", () => {
 *   beforeEachTestWithLogger((logger: bunyan.Logger) => {
 *     ...
 *   });
 *
 *   it("Does something", () => {
 *     ...
 *   });
 * }));
 * ```
 */
export function logSuite(suite: ISuite): ISuite {
  suite.createLogger = createLogger;
  return suite;
}

/**
 * Escapes a string so that it can be safely embedded in a regular expression.
 *
 * @param original The string to escape.
 * @return The escaped string.
 */
function escapeStringForRegExp(original: string): string {
  return original.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Helper class for obtaining the line numbers of relevant source lines in the C++ source files
 * of the target executables used in tests.
 */
export class SourceLineResolver {
  private _sourceLines: string[] = [];

  static loadSourceFileSync(filename: string): SourceLineResolver {
    const sourceLineResolver = new SourceLineResolver();
    sourceLineResolver.loadFileSync(filename);
    return sourceLineResolver;
  }

  private loadFileSync(filename: string): void {
    this._sourceLines = fs.readFileSync(filename, 'utf8').split('\n');
  }

  /**
   * Finds the line number of the first source line that matches the given regular expression.
   *
   * @param sourceLineRegExp The regular expressions to match source lines against, note that
   *                         the expression is matched line by line so it shouldn't be created
   *                         with the multi-line flag.
   * @return The line number of the first matching line in the source file,
   *         or -1 if no matching lines were found.
   */
  getMatchingLineNumber(sourceLineRegExp: RegExp): number {
    for (let i = 0; i < this._sourceLines.length; ++i) {
      if (sourceLineRegExp.test(this._sourceLines[i])) {
        return i + 1;
      }
    }
    return -1;
  }

  /**
   * Finds the line number at which a given single-line comment is located.
   *
   * @param singleLineComment The test of the single-line (prefixed by `//`) comment.
   * @return The line number of a single line comment in the source file,
   *         or -1 if no such comment was found in the source file.
   */
  getCommentLineNumber(singleLineComment: string): number {
    const escapedComment = escapeStringForRegExp(singleLineComment);
    const commentRegExp = new RegExp(`^[\\s\\S]*//\\s*${escapedComment}`);

    return this.getMatchingLineNumber(commentRegExp);
  }
}
