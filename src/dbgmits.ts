// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/lib/tsd.d.ts" />

import child_process = require('child_process');
import readline = require('readline');
import os = require('os');
import path = require('path');
import events = require('events');
import stream = require('stream');
import parser = require('./mi_output_parser');
import mioutput = require('./mi_output');

// aliases
import spawn = child_process.spawn;
type ChildProcess = child_process.ChildProcess;
type ReadLine = readline.ReadLine;
type ErrDataCallback = (err: Error, data: any) => void;
import RecordType = mioutput.RecordType;

class DebugCommand {
  /** 
   * Optional token that can be used to match up the command with a response, 
   * if provided it must only contain digits.
   */
  token: string;
  /** The MI command string that will be sent to debugger (minus the token and dash prefix). */
  text: string;
  /** Optional callback to invoke once a response is received for the command. */
  done: ErrDataCallback;

  /**
   * @param cmd MI command string (minus the token and dash prefix).
   * @param token Token that can be used to match up the command with a response.
   * @param done Callback to invoke once a response is received for the command.
   */
  constructor(cmd: string, token?: string, done?: ErrDataCallback) {
    this.token = token;
    this.text = cmd;
    this.done = done;
  }
}

/** Frame-specific information returned by breakpoint and stepping MI commands. */
export interface FrameInfo {
  /** Name of the function corresponding to the frame. */
  func?: string;
  /** Arguments of the function corresponding to the frame. */
  args?: any;
  /** Code address of the frame. */
  address: string;
  /** Name of the source file corresponding to the frame's code address. */
  filename?: string;
  /** Full path of the source file corresponding to the frame's code address. */
  fullname?: string;
  /** Source line corresponding to the frame's code address. */
  line?: number;
}

/** Frame-specific information returned by stack related MI commands. */
export interface StackFrameInfo {
  /** Level of the stack frame, zero for the innermost frame. */
  level: number;
  /** Name of the function corresponding to the frame. */
  func?: string;
  /** Code address of the frame. */
  address: string;
  /** Name of the source file corresponding to the frame's code address. */
  filename?: string;
  /** Full path of the source file corresponding to the frame's code address. */
  fullname?: string;
  /** Source line corresponding to the frame's code address. */
  line?: number;
  /** Name of the binary file that corresponds to the frame's code address. */
  from?: string;
}

/** Breakpoint-specific information returned by various MI commands. */
export interface BreakpointInfo {
  id: string;
  breakpointType: string;
  catchpointType?: string;
  isTemp?: boolean;
  isEnabled?: boolean;
  address?: string;
  func?: string;
  filename?: string;
  fullname?: string;
  line?: number;
  at?: string;
  pending?: string;
  evaluatedBy?: string;
  threadId?: number;
  condition?: string;
  ignoreCount?: number;
  enableCount?: number;
  mask?: string;
  passCount?: number;
  originalLocation?: string;
  hitCount?: number;
  isInstalled?: boolean;
  what?: string;
}

export type BreakpointCallback = (err: Error, data: BreakpointInfo, token?: string) => void;

/**
 * Transforms the response into an object that implements the [[BreakpointInfo]] interface.
 */
class BreakpointCommand extends DebugCommand {
  constructor(cmd: string, token?: string, done?: BreakpointCallback) {
    super(cmd, token);
    this.done = (err: Error, data: any) => {
      if (err) {
        done(err, null);
      } else {
        var info: BreakpointInfo = {
          id: data.bkpt['number'],
          breakpointType: data.bkpt['type'],
          catchpointType: data.bkpt['catch-type'],
          isTemp: (data.bkpt.disp !== undefined) ? (data.bkpt.disp === 'del') : undefined,
          isEnabled: (data.bkpt.enabled !== undefined) ? (data.bkpt.enabled === 'y') : undefined,
          address: data.bkpt.addr,
          func: data.bkpt.func,
          filename: data.bkpt.file || data.bkpt.filename, // LLDB MI uses non standard 'file'
          fullname: data.bkpt.fullname,
          line: data.bkpt.line,
          at: data.bkpt.at,
          pending: data.bkpt.pending,
          evaluatedBy: data.bkpt['evaluated-by'],
          threadId: data.bkpt.thread,
          condition: data.bkpt.cond,
          ignoreCount: data.bkpt.ignore,
          enableCount: data.bkpt.enable,
          mask: data.bkpt.mask,
          passCount: data.bkpt.pass,
          originalLocation: data.bkpt['original-location'],
          hitCount: data.bkpt.times,
          isInstalled: (data.bkpt.installed !== undefined) ? (data.bkpt.installed === 'y') : undefined,
          what: data.bkpt.what
        };
        done(err, info, token);
      }
    };
  }
}

/**
 * Used to indicate failure of a MI command sent to the debugger.
 */
export class CommandFailedError implements Error {
  /** The name of this error class. */
  name: string;
  /** The error message sent back by the debugger. */
  message: string;
  /** Optional error code sent by the debugger. */
  code: string;
  /** The command text that was sent to debugger (minus token and dash prefix). */
  command: string;
  /** Optional token for the failed command (if the command had one). */
  token: string;

  constructor(message: string, command: string, code?: string, token?: string) {
    this.name = "CommandFailedError";
    this.message = message;
    this.code = code;
    this.command = command;
    this.token = token;
  }
}

export interface ThreadGroupAddedNotify {
  id: string;
}

export interface ThreadGroupRemovedNotify {
  id: string;
}

export interface ThreadGroupStartedNotify {
  id: string;
  pid: string;
}

export interface ThreadGroupExitedNotify {
  id: string;
  exitCode: string;
}

export interface ThreadCreatedNotify {
  id: string;
  groupId: string;
}

export interface ThreadExitedNotify {
  id: string;
  groupId: string;
}

export interface ThreadSelectedNotify {
  id: string;
}

interface LibNotify {
  id: string;
  targetName: string; // file being debugged on the remote system
  hostName: string; // copy of the file being debugged on the host
  threadGroup: string;
  /**
   * Optional load address.
   * This field is not part of the GDB MI spec. and is only set by LLDB MI driver.
   */
  loadAddress: string;
  /** 
   * Optional path to a file containing additional debug information.
   * This field is not part of the GDB MI spec. and is only set by LLDB MI driver.
   * The LLDB MI driver gets the value for this field from SBModule::GetSymbolFileSpec().
   */
  symbolPath: string;
}

export interface LibLoadedNotify extends LibNotify { }
export interface LibUnloadedNotify extends LibNotify { }

export enum TargetStopReason {
  /** A breakpoint was hit. */
  BreakpointHit,
  /** A step instruction finished. */
  EndSteppingRange,
  /** The target finished executing and terminated normally. */
  ExitedNormally,
  /** The target was signalled. */
  SignalReceived,
  /** The target encountered an exception (this is LLDB specific). */
  ExceptionReceived,
  /** Catch-all for any of the other numerous reasons. */
  Unrecognized
}

export interface TargetStoppedNotify {
  reason: TargetStopReason;
  /** Identifier of the thread that caused the target to stop. */
  threadId: number;
  /** 
   * Identifiers of the threads that were stopped, 
   * if all threads were stopped this array will be empty. 
   */
  stoppedThreads: number[];
  /** Processor core on which the stop event occured. */
  processorCore?: string;
}

export interface BreakpointHitNotify extends TargetStoppedNotify {
  breakpointId: number;
  frame: FrameInfo;
}

export interface StepFinishedNotify extends TargetStoppedNotify {
  frame: FrameInfo;
}

export interface SignalReceivedNotify extends TargetStoppedNotify {
  signalCode?: string;
  signalName?: string;
  signalMeaning?: string;
}

export interface ExceptionReceivedNotify extends TargetStoppedNotify {
  exception: string;
}

export interface VariableInfo {
  /** Variable name. */
  name: string;
  /** String representation of the value of the variable. */
  value?: string;
  /** Type of the variable. */
  type?: string;
}

/** Contains information about the arguments of a stack frame. */
export interface StackFrameArgsInfo {
  /** Index of the frame on the stack, zero for the innermost frame. */
  level: number;
  /** List of arguments for the frame. */
  args: VariableInfo[];
}

/** Indicates how much information should be retrieved when calling 
 *  [[DebugSession.getLocalVariables]].
 */
export enum VariableDetailLevel {
  /** Only variable names will be retrieved, not their types or values. */
  None = 0, // specifying the value is redundant, but is used here to emphasise its importance
  /** Only variable names and values will be retrieved, not their types. */
  All = 1,
  /** 
   * The name and type will be retrieved for all variables, however values will only be retrieved
   * for simple variable types (not arrays, structures or unions). 
   */
  Simple = 2
}

/** Contains information about a newly created watch. */
export interface IWatchInfo {
  id: string;
  childCount: number;
  value: string;
  expressionType: string;
  threadId: number;
  isDynamic: boolean;
  displayHint: string;
  hasMoreChildren: boolean;
}

export interface IWatchChildInfo extends IWatchInfo {
  /** The expression the front-end should display to identify this child. */
  expression: string;
  /** `true` if the watch state is not implicitely updated. */
  isFrozen: boolean;
}

/** Contains information about the changes in the state of a watch. */
export interface IWatchUpdateInfo {
  /** Unique identifier of the watch whose state changed. */
  id: string;
  /** 
   * If the number of children changed this is the updated count,
   * otherwise this field is undefined.
  */
  childCount?: number;
  /** The value of the watch expression after the update. */
  value?: string;
  /** 
   * If the type of the watch expression changed this will be the new type,
   * otherwise this field is undefined.
   */
  expressionType?: string;
  /** 
   * If `true` the watch expression is in-scope and has a valid value after the update.
   * If `false' the watch expression is not in-scope and has no valid value, but if [[isObsolete]]
   * is likewise `false` then the value may become valid at some point in the future if the watch 
   * expression comes back into scope.
   */
  isInScope: boolean;
  /** 
   * `true` if the value of the watch expression is permanently unavailable, possibly because
   * the target has changed or has been recompiled. Obsolete watches should be removed by the
   * front-end.
   */
  isObsolete: boolean;
  /** `true` iff the value if the type of the watch expression has changed. */
  hasTypeChanged?: boolean;
  /** `true` iff the watch relies on a Python-based visualizer. */
  isDynamic?: boolean;
  /** 
   * If `isDynamic` is `true` this field may contain a hint for the front-end on how the value of
   * the watch expression should be displayed. Otherwise this field is undefined.
   */
  displayHint?: string;
  /** `true` iff there are more children outside the update range. */
  hasMoreChildren: boolean;
  /** 
   * If `isDynamic` is `true` and new children were added within the update range this will
   * be a list of those new children. Otherwise this field is undefined.
   */
  newChildren?: string;
}

/** Output format specifiers for watch values. */
export enum WatchFormatSpec {
  Binary,
  Decimal,
  Hexadecimal,
  Octal,
  /** 
   * This specifier is used to indicate that one of the other ones should be automatically chosen
   * based on the expression type, for example `Decimal` for integers, `Hexadecimal` for pointers.
   */
  Default
}

/**
 * A debug session provides two-way communication with a debugger process via the GDB/LLDB 
 * machine interface.
 *
 * Currently commands are queued and executed one at a time in the order they are issued, 
 * a command will not be executed until all the previous commands have been acknowledged by the
 * debugger.
 *
 * Out of band notifications from the debugger are emitted via events, the names of these events
 * are provided by the EVENT_XXX static constants.
 */
export class DebugSession extends events.EventEmitter {
  /**
   * Emitted when a thread group is added by the debugger, it's possible the thread group
   * hasn't yet been associated with a running program.
   * 
   * Listener function should have the signature:
   * ~~~
   * (notification: [[ThreadGroupAddedNotify]]) => void
   * ~~~
   * @event
   */
  static EVENT_THREAD_GROUP_ADDED: string = 'thdgrpa';
  /**
   * Emitted when a thread group is removed by the debugger.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[ThreadGroupRemovedNotify]]) => void
   * ~~~
   * @event
   */
  static EVENT_THREAD_GROUP_REMOVED: string = 'thdgrpr';
  /**
   * Emitted when a thread group is associated with a running program, 
   * either because the program was started or the debugger was attached to it.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[ThreadGroupStartedNotify]]) => void
   * ~~~
   * @event
   */
  static EVENT_THREAD_GROUP_STARTED: string = 'thdgrps';
  /**
   * Emitted when a thread group ceases to be associated with a running program,
   * either because the program terminated or the debugger was dettached from it.
   *
   * Listener function should have the signature: 
   * ~~~
   * (notification: [[ThreadGroupExitedNotify]]) => void
   * ~~~
   * @event
   */
  static EVENT_THREAD_GROUP_EXITED: string = 'thdgrpe';
  /**
   * Emitted when a thread is created.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[ThreadCreatedNotify]]) => void
   * ~~~
   * @event
   */
  static EVENT_THREAD_CREATED: string = 'thdc';
  /**
   * Emitted when a thread exits.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[ThreadExitedNotify]]) => void
   * ~~~
   * @event
   */
  static EVENT_THREAD_EXITED: string = 'thde';
  /**
   * Emitted when the debugger changes the current thread selection.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[ThreadSelectedNotify]]) => void
   * ~~~
   * @event
   */
  static EVENT_THREAD_SELECTED: string = 'thds';
  /**
   * Emitted when a new library is loaded by the program being debugged.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[LibLoadedNotify]]) => void
   * ~~~
   * @event
   */
  static EVENT_LIB_LOADED: string = 'libload';
  /**
   * Emitted when a library is unloaded by the program being debugged.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[LibUnloadedNotify]]) => void
   * ~~~
   * @event
   */
  static EVENT_LIB_UNLOADED: string = 'libunload';

  /**
   * Emitted when some console output from the debugger becomes available, 
   * usually in response to a CLI command.
   *
   * Listener function should have the signature:
   * ~~~
   * (output: string) => void
   * ~~~
   * @event
   */
  static EVENT_DBG_CONSOLE_OUTPUT: string = 'conout';

  /**
   * Emitted when some console output from the target becomes available.
   *
   * Listener function should have the signature:
   * ~~~
   * (output: string) => void
   * ~~~
   * @event
   */
  static EVENT_TARGET_OUTPUT: string = 'targetout';

  /**
   * Emitted when log output from the debugger becomes available.
   *
   * Listener function should have the signature:
   * ~~~
   * (output: string) => void
   * ~~~
   * @event
   */
  static EVENT_DBG_LOG_OUTPUT: string = 'dbgout';

  /**
   * Emitted when the target starts running.
   *
   * The `threadId` passed to the listener indicates which specific thread is now running,
   * a value of **"all"** indicates all threads are running. According to the GDB/MI spec.
   * no interaction with a running thread is possible after this notification is produced until
   * it is stopped again.
   *
   * Listener function should have the signature:
   * ~~~
   * (threadId: string) => void
   * ~~~
   * @event
   */
  static EVENT_TARGET_RUNNING: string = 'targetrun';

  /**
   * Emitted when the target stops running.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[TargetStoppedNotify]]) => void
   * ~~~
   * @event
   */
  static EVENT_TARGET_STOPPED: string = 'targetstop';

  /**
   * Emitted when the target stops running because a breakpoint was hit.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[BreakpointHitNotify]]) => void
   * ~~~
   * @event
   */
  static EVENT_BREAKPOINT_HIT: string = 'brkpthit';

  /**
   * Emitted when the target stops due to a stepping operation finishing.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[StepFinishedNotify]]) => void
   * ~~~
   * @event
   */
  static EVENT_STEP_FINISHED: string = 'endstep';

  /**
   * Emitted when the target stops running because it received a signal.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[SignalReceivedNotify]]) => void
   * ~~~
   * @event
   */
  static EVENT_SIGNAL_RECEIVED: string = 'signal';

  /**
   * Emitted when the target stops running due to an exception.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[ExceptionReceivedNotify]]) => void
   * ~~~
   * @event
   */
  static EVENT_EXCEPTION_RECEIVED: string = 'exception';


  // the stream to which debugger commands will be written
  private outStream: stream.Writable;
  // reads input from the debugger's stdout one line at a time
  private lineReader: ReadLine;
  // used to generate to auto-generate tokens for commands
  // FIXME: this is currently unused since I need to decide if tokens should be auto-generated
  // when the user doesn't supply them.
  private nextCmdId: number;
  // commands to be processed (one at a time)
  private cmdQueue: DebugCommand[];
  // used to to ensure session cleanup is only done once
  private cleanupWasCalled: boolean;

  /**
   * In most cases [[startDebugSession]] should be used to construct new instances.
   *
   * @param inStream Debugger responses and notifications will be read from this stream.
   * @param outStream Debugger commands will be written to this stream.
   */
  constructor(inStream: stream.Readable, outStream: stream.Writable) {
    super();
    this.outStream = outStream;
    this.lineReader = readline.createInterface({
      input: inStream,
      output: null
    });
    this.lineReader.on('line', this.parseDebbugerOutput.bind(this));
    this.nextCmdId = 1;
    this.cmdQueue = [];
    this.cleanupWasCalled = false;
  }

  /**
 * Ends the debugging session.
 *
 * @param notifyDebugger If **false** the session is cleaned up immediately without waiting for 
 *                       the debugger to respond (useful in cases where the debugger terminates
 *                       unexpectedly). If **true** the debugger is asked to exit, and once the
 *                       request is acknowldeged the session is cleaned up.
 */
  end(notifyDebugger: boolean = true): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      var cleanup = (err: Error, data: any) => {
        this.cleanupWasCalled = true;
        this.lineReader.close();
        err ? reject(err) : resolve();
      };

      if (!this.cleanupWasCalled) {
        notifyDebugger ? this.enqueueCommand(new DebugCommand('gdb-exit', null, cleanup))
          : cleanup(null, null);
      };
    });
  }

  private emitExecNotification(name: string, data: any) {
    switch (name) {
      case 'running':
        this.emit(DebugSession.EVENT_TARGET_RUNNING, data['thread-id']);
        break;

      case 'stopped':
        var standardNotify: TargetStoppedNotify = {
          reason: parseTargetStopReason(data.reason),
          threadId: parseInt(data['thread-id'], 10),
          stoppedThreads: parseStoppedThreadsList(data['stopped-threads']),
          processCore: data.core
        };
        this.emit(DebugSession.EVENT_TARGET_STOPPED, standardNotify);

        // emit a more specialized event for notifications that contain additional info
        switch (standardNotify.reason) {
          case TargetStopReason.BreakpointHit:
            var breakpointNotify: BreakpointHitNotify = {
              reason: standardNotify.reason,
              threadId: standardNotify.threadId,
              stoppedThreads: standardNotify.stoppedThreads,
              processorCore: standardNotify.processorCore,
              breakpointId: parseInt(data.bkptno, 10),
              frame: extractFrameInfo(data.frame)
            };
            this.emit(DebugSession.EVENT_BREAKPOINT_HIT, breakpointNotify);
            break;

          case TargetStopReason.EndSteppingRange:
            var stepNotify: StepFinishedNotify = {
              reason: standardNotify.reason,
              threadId: standardNotify.threadId,
              stoppedThreads: standardNotify.stoppedThreads,
              processorCore: standardNotify.processorCore,
              frame: extractFrameInfo(data.frame)
            };
            this.emit(DebugSession.EVENT_STEP_FINISHED, stepNotify);
            break;

          case TargetStopReason.SignalReceived:
            var signalNotify: SignalReceivedNotify = {
              reason: standardNotify.reason,
              threadId: standardNotify.threadId,
              stoppedThreads: standardNotify.stoppedThreads,
              processorCore: standardNotify.processorCore,
              signalCode: data.signal,
              signalName: data['signal-name'],
              signalMeaning: data['signal-meaning']
            };
            this.emit(DebugSession.EVENT_SIGNAL_RECEIVED, signalNotify);
            break;

          case TargetStopReason.ExceptionReceived:
            var exceptionNotify: ExceptionReceivedNotify = {
              reason: standardNotify.reason,
              threadId: standardNotify.threadId,
              stoppedThreads: standardNotify.stoppedThreads,
              processorCore: standardNotify.processorCore,
              exception: data.exception
            };
            this.emit(DebugSession.EVENT_EXCEPTION_RECEIVED, exceptionNotify);
            break;
        }
        break;

      default:
        // TODO: log and keep on going
        break;
    }
  }

  private emitAsyncNotification(name: string, data: any) {
    var shlibInfo: any;

    switch (name) {
      case 'thread-group-added':
        this.emit(DebugSession.EVENT_THREAD_GROUP_ADDED, data);
        break;

      case 'thread-group-removed':
        this.emit(DebugSession.EVENT_THREAD_GROUP_REMOVED, data);
        break;

      case 'thread-group-started':
        this.emit(DebugSession.EVENT_THREAD_GROUP_STARTED, data);
        break;

      case 'thread-group-exited':
        this.emit(DebugSession.EVENT_THREAD_GROUP_EXITED,
          { id: data.id, exitCode: data['exit-code'] }
        );
        break;

      case 'thread-created':
        this.emit(DebugSession.EVENT_THREAD_CREATED,
          { id: data.id, groupId: data['group-id'] }
        );
        break;

      case 'thread-exited':
        this.emit(DebugSession.EVENT_THREAD_EXITED,
          { id: data.id, groupId: data['group-id'] }
        );
        break;

      case 'thread-selected':
        this.emit(DebugSession.EVENT_THREAD_SELECTED, data);
        break;

      case 'library-loaded':
        this.emit(DebugSession.EVENT_LIB_LOADED, {
          id: data.id,
          targetName: data['target-name'],
          hostName: data['host-name'],
          threadGroup: data['thread-group']
        });
        break;

      case 'library-unloaded':
        this.emit(DebugSession.EVENT_LIB_UNLOADED, {
          id: data.id,
          targetName: data['target-name'],
          hostName: data['host-name'],
          threadGroup: data['thread-group']
        });
        break;

      // shlibs-added is a non-standard notifications sent by LLDB MI driver,
      // it correspond to the standard library-loaded notification from the GDB MI spec. 
      // but contain somewhat different data
      case 'shlibs-added':
        shlibInfo = data['shlib-info'];
        this.emit(DebugSession.EVENT_LIB_LOADED, {
          id: shlibInfo.num,
          targetName: shlibInfo.path,
          hostName: shlibInfo.name,
          threadGroup: null,
          loadAddress: shlibInfo.loaded_addr,
          symbolPath: shlibInfo['dsym-objpath']
        });
        break;

      // shlibs-removed is a non-standard notifications sent by LLDB MI driver,
      // it correspond to the standard library-unloaded notification from the GDB MI spec.
      // but contain somewhat different data
      case 'shlibs-removed':
        shlibInfo = data['shlib-info'];
        this.emit(DebugSession.EVENT_LIB_UNLOADED, {
          id: shlibInfo.num,
          targetName: shlibInfo.path,
          hostName: shlibInfo.name,
          threadGroup: null,
          loadAddress: shlibInfo.loaded_addr,
          symbolPath: shlibInfo['dsym-objpath']
        });
        break;

      default:
        // TODO: log and keep on going
        break;
    };
  }

  /**
   * Parse a single line containing a response to a MI command or some sort of async notification.
   */
  private parseDebbugerOutput(line: string): void {
    // '(gdb)' is used to indicate the end of a set of output lines from the debugger,
    // but since we process each line individually as it comes in this particular marker
    // is of no use
    if ((line === '(gdb)') || (line === '')) {
      return;
    }
    
    var cmdQueuePopped: boolean = false;
    try {
      var result = parser.parse(line);
    } catch (err) {
      console.log('Attempted to parse: ->' + line + '<-');
      throw err;
    }

    switch (result.recordType) {
      case RecordType.Done:
      case RecordType.Running:
      case RecordType.Connected:
      case RecordType.Exit:
      case RecordType.Error:
        // this record is a response for the last command that was sent to the debugger, 
        // which is the command at the front of the queue
        var cmd = this.cmdQueue.shift();
        cmdQueuePopped = true;
        // todo: check that the token in the response matches the one sent with the command
        if (cmd.done) {
          if (result.recordType === RecordType.Error) {
            cmd.done(
              new CommandFailedError(result.data.msg, cmd.text, result.data.code, cmd.token), null
            );
          } else {
            cmd.done(null, result.data);
          }
        }
        break;

      case RecordType.AsyncExec:
        this.emitExecNotification(result.data[0], result.data[1]);
        break;

      case RecordType.AsyncNotify:
        this.emitAsyncNotification(result.data[0], result.data[1]);
        break;

      case RecordType.DebuggerConsoleOutput:
        this.emit(DebugSession.EVENT_DBG_CONSOLE_OUTPUT, result.data);
        break;

      case RecordType.TargetOutput:
        this.emit(DebugSession.EVENT_TARGET_OUTPUT, result.data);
        break;

      case RecordType.DebuggerLogOutput:
        this.emit(DebugSession.EVENT_DBG_LOG_OUTPUT, result.data);
        break;
    }

    // if a command was popped from the qeueu we can send through the next command
    if (cmdQueuePopped && (this.cmdQueue.length > 0)) {
      this.sendCommandToDebugger(this.cmdQueue[0]);
    }
  }

  /**
   * Sends a MI command to the debugger process.
   */
  private sendCommandToDebugger(command: DebugCommand): void {
    var cmdStr: string;
    if (command.token) {
      cmdStr = `${command.token}-${command.text}`;
    } else {
      cmdStr = '-' + command.text;
    }
    this.outStream.write(cmdStr + '\n');
    // FIXME: remove this before release, it's here temporarily for debugging
    console.log(cmdStr);
  }

  /**
   * Adds a MI command to the back of the command queue.
   *
   * If the command queue is empty when this method is called then the command is dispatched
   * immediately, otherwise it will be dispatched after all the previously queued commands are
   * processed.
   */
  private enqueueCommand(command: DebugCommand): void {
    this.cmdQueue.push(command);

    if (this.cmdQueue.length === 1) {
      this.sendCommandToDebugger(this.cmdQueue[0]);
    }
  }

  /**
   * Sends an MI command to the debugger and returns the response.
   * 
   * @param command Full MI command string, excluding the optional token and dash prefix.
   * @param token Token to be prefixed to the command string (must consist only of digits).
   * @param transformOutput This function will be invoked with the output of the MI Output parser
   *                        and should transform that output into an instance of type `T`.
   * @returns A promise that will be resolved when the command response is received.
   */
  private getCommandOutput<T>(command: string, token?: string, transformOutput?: (data: any) => T)
    : Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.enqueueCommand(
        new DebugCommand(command, token, (err, data) => {
          if (err) {
            reject(err);
          } else {
            try {
              resolve(transformOutput ? transformOutput(data) : data);
            } catch (err) {
              reject(err);
            }
          }
        })
      );
    });
  }

  /**
   * Sets the executable file to be debugged, the symbol table will also be read from this file.
   *
   * This must be called prior to [[connectToRemoteTarget]] when setting up a remote debugging 
   * session.
   *
   * @param file This would normally be a full path to the host's copy of the executable to be 
   *             debugged.
   * @param token Token (digits only) that can be used to match up the command with a response.
   */
  setExecutableFile(file: string, token?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // NOTE: While the GDB/MI spec. contains multiple -file-XXX commands that allow the
      // executable and symbol files to be specified separately the LLDB MI driver
      // currently (30-Mar-2015) only supports this one command.
      this.enqueueCommand(
        new DebugCommand(`file-exec-and-symbols ${file}`, token,
          (err, data) => { err ? reject(err) : resolve(); }
        )
      );
    });
  }

  /**
   * Connects the debugger to a remote target.
   *
   * @param host
   * @param port
   * @param token Token (digits only) that can be used to match up the command with a response.
   */
  connectToRemoteTarget(host: string, port: number, token?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.enqueueCommand(
        new DebugCommand(`target-select remote ${host}:${port}`, token,
          (err, data) => { err ? reject(err) : resolve(); }
        )
      );
    });
  }

  //
  // Breakpoint Commands
  //

  /**
   * Adds a new breakpoint.
   *
   * @param location The location at which a breakpoint should be added, can be specified in the
   *                 following formats:
   *                 - function_name
   *                 - filename:line_number
   *                 - filename:function_name
   *                 - address
   * @param options.isTemp Set to **true** to create a temporary breakpoint which will be
   *                       automatically removed after being hit.
   * @param options.isHardware Set to **true** to create a hardware breakpoint 
   *                           (presently not supported by LLDB MI).
   * @param options.isPending Set to **true** if the breakpoint should still be created even if
   *                          the location cannot be parsed (e.g. it refers to uknown files or 
   *                          functions).
   * @param options.isDisabled Set to **true** to create a breakpoint that is initially disabled,
   *                           otherwise the breakpoint will be enabled by default.
   * @param options.isTracepoint Set to **true** to create a tracepoint
   *                             (presently not supported by LLDB MI).
   * @param options.condition The debugger will only stop the program execution when this
   *                          breakpoint is hit if the condition evaluates to **true**.
   * @param options.ignoreCount The number of times the breakpoint should be hit before it takes 
   *                            effect, zero (the default) means the breakpoint will stop the 
   *                            program every time it's hit.
   * @param options.threadId Restricts the new breakpoint to the given thread.
   * @token Token (digits only) that can be used to match up the command with a response.
   */
  addBreakpoint(
    location: string,
    options?: {
      isTemp?: boolean;
      isHardware?: boolean;
      isPending?: boolean;
      isDisabled?: boolean;
      isTracepoint?: boolean;
      condition?: string;
      ignoreCount?: number;
      threadId?: number;
    },
    token?: string
  ): Promise<BreakpointInfo> {
    var cmd: string = 'break-insert';
    if (options) {
      if (options.isTemp) {
        cmd = cmd + ' -t';
      }
      if (options.isHardware) {
        cmd = cmd + ' -h';
      }
      if (options.isPending) {
        cmd = cmd + ' -f';
      }
      if (options.isDisabled) {
        cmd = cmd + ' -d';
      }
      if (options.isTracepoint) {
        cmd = cmd + ' -a';
      }
      if (options.condition) {
        cmd = cmd + ' -c ' + options.condition;
      }
      if (options.ignoreCount) {
        cmd = cmd + ' -i ' + options.ignoreCount;
      }
      if (options.threadId) {
        cmd = cmd + ' -p ' + options.threadId;
      }
    }
    
    return new Promise<BreakpointInfo>((resolve, reject) => {
      this.enqueueCommand(
        new BreakpointCommand(cmd + ' ' + location, token,
          (err, data) => { err ? reject(err) : resolve(data); }
        )
      );
    });
  }

  /**
   * Removes a breakpoint.
   */
  removeBreakpoint(breakId: number, token?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.enqueueCommand(
        new DebugCommand('break-delete ' + breakId, token,
          (err, data) => { err ? reject(err) : resolve(); }
        )
      );
    });
  }

  /**
   * Removes multiple breakpoints.
   */
  removeBreakpoints(breakIds: number[], token?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // FIXME: LLDB MI driver only supports removing one breakpoint at a time,
      //        so multiple breakpoints need to be removed one by one.
      this.enqueueCommand(
        new DebugCommand('break-delete ' + breakIds.join(' '), token,
          (err, data) => { err ? reject(err) : resolve(); }
        )
      );
    });
  }

  /**
   * Enables a breakpoint.
   */
  enableBreakpoint(breakId: number, token?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.enqueueCommand(
        new DebugCommand('break-enable ' + breakId, token,
          (err, data) => { err ? reject(err) : resolve(); }
        )
      );
    });
  }

  /**
   * Disables a breakpoint.
   */
  disableBreakpoint(breakId: number, token?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.enqueueCommand(
        new DebugCommand('break-disable ' + breakId, token,
          (err, data) => { err ? reject(err) : resolve(); }
        )
      );
    });
  }

  /**
   * Tells the debugger to ignore a breakpoint the next `ignoreCount` times it's hit.
   *
   * @param breakId Identifier of the breakpoint for which the ignore count should be set.
   * @param ignoreCount The number of times the breakpoint should be hit before it takes effect,
   *                    zero means the breakpoint will stop the program every time it's hit.
   */
  ignoreBreakpoint(
    breakId: number, ignoreCount: number, token?: string): Promise<BreakpointInfo> {
    return new Promise<BreakpointInfo>((resolve, reject) => {
      this.enqueueCommand(
        new BreakpointCommand(`break-after ${breakId} ${ignoreCount}`, token,
          (err, data) => { err ? reject(err) : resolve(data); }
        )
      );
    });
  }

  /**
   * Sets the condition under which a breakpoint should take effect when hit.
   *
   * @param breakId Identifier of the breakpoint for which the condition should be set.
   * @param condition Expression to evaluate when the breakpoint is hit, if it evaluates to 
   *                  **true** the breakpoint will stop the program, otherwise the breakpoint 
   *                  will have no effect.
   */
  setBreakpointCondition(
    breakId: number, condition: string, token?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.enqueueCommand(
        new DebugCommand(`break-condition ${breakId} ${condition}`, token,
          (err, data) => { err ? reject(err) : resolve(); }
        )
      );
    });
  }

  //
  // Program Execution Commands
  //

  /**
   * Sets the commandline arguments to be passed to the target process next time it is started
   * using [[startTarget]].
   */
  setTargetArguments(args: string, token?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.enqueueCommand(
        new DebugCommand('exec-arguments ' + args, token, 
          (err, data) => { err ? reject(err) : resolve(); }
        )
      );
    });
  }

  /**
   * Executes the target from the beginning until it exits, execution may stop prematurely due
   * to a number of reasons, for example a breakpoint being hit.
   * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
   *
   * @param options.threadGroup *(GDB specific)* If **"all"** then all inferiors will be started. 
   *                            Otherwise it should be the identifier of the thread group to start.
   * @param options.stopAtStart *(GDB specific)* If **true** then execution will stop at the start 
   *                            of the main function.
   */
  startTarget(
    options?: { threadGroup?: string; stopAtStart?: boolean}, token?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      var fullCmd: string = 'exec-run';
      if (options) {
        if (options.threadGroup) {
          fullCmd = fullCmd + ' --thread-group ' + options.threadGroup;
        } 
        if (options.stopAtStart) {
          fullCmd = fullCmd + ' --start';
        }
      }
      this.enqueueCommand(
        new DebugCommand(fullCmd, token, (err, data) => { err ? reject(err) : resolve(); })
      );
    });
  }

  /**
   * Kills the target process.
   */
  abortTarget(token?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.enqueueCommand(
        new DebugCommand('exec-abort', token, (err, data) => { err ? reject(err) : resolve(); })
      );
    });
  }

  /**
   * Executes the target from the beginning until it exits, execution may stop at any time due
   * to a number of reasons, for example a breakpoint being hit.
   * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
   *
   * @param options.threadGroup *(GDB specific)* If **"all"** then all inferiors will be resumed. 
   *                            Otherwise it should be the identifier of the thread group to resume.
   * @param options.reverse *(GDB specific)* If **true** the target is executed in reverse.
   */
  resumeTarget(
    options?: { threadGroup: string; reverse: boolean }, token?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      var fullCmd: string = 'exec-continue';
      if (options) {
        if (options.threadGroup) {
          fullCmd = fullCmd + ' --thread-group ' + options.threadGroup;
        }
        if (options.reverse) {
          fullCmd = fullCmd + ' --reverse';
        }
      }
      this.enqueueCommand(
        new DebugCommand(fullCmd, token, (err, data) => { err ? reject(err) : resolve(); })
      );
    });
  }

  /**
   * Pauses execution of the target.
   * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
   *
   * @param threadGroup *(GDB specific)* If **"all"** then all inferiors will be paused. 
   *                    Otherwise it should be the identifier of the thread group to pause.
   */
  pauseTarget(threadGroup?: string, token?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      var fullCmd: string = 'exec-interrupt';
      if (threadGroup) {
        fullCmd = fullCmd + ' --thread-group ' + threadGroup;
      }
      this.enqueueCommand(
        new DebugCommand(fullCmd, token, (err, data) => { err ? reject(err) : resolve(); })
      );
    });
  }

  /**
   * Resumes execution of the target until the beginning of the next source line is reached.
   * If a function is called while the target is running then execution stops on the first 
   * source line of the called function. 
   * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
   *
   * @param options.threadId Identifier of the thread to execute the command on. 
   * @param options.reverse *(GDB specific)* If **true** the target is executed in reverse.
   */
  stepIntoLine(options?: { threadId?: number; reverse?: boolean }, token?: string): Promise<void> {
    return this.enqueueExecCommand('exec-step', options, token);
  }

  /**
   * Resumes execution of the target until the beginning of the next source line is reached.
   * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
   *
   * @param options.threadId Identifier of the thread to execute the command on. 
   * @param options.reverse *(GDB specific)* If **true** the target is executed in reverse until 
   *                        the beginning of the previous source line is reached.
   */
  stepOverLine(options?: { threadId?: number; reverse?: boolean }, token?: string): Promise<void> {
    return this.enqueueExecCommand('exec-next', options, token);
  }

  /**
   * Executes one instruction, if the instruction is a function call then execution stops at the
   * beginning of the function.
   * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
   *
   * @param options.threadId Identifier of the thread to execute the command on.
   * @param options.reverse *(GDB specific)* If **true** the target is executed in reverse until 
   *                        the previous instruction is reached.
   */
  stepIntoInstruction(
    options?: { threadId?: number; reverse?: boolean }, token?: string): Promise<void> {
    return this.enqueueExecCommand('exec-step-instruction', options, token);
  }

  /**
   * Executes one instruction, if the instruction is a function call then execution continues 
   * until the function returns.
   * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
   *
   * @param options.threadId Identifier of the thread to execute the command on. 
   * @param options.reverse *(GDB specific)* If **true** the target is executed in reverse until 
   *                        the previous instruction is reached.
   */
  stepOverInstruction(
    options?: { threadId?: number; reverse?: boolean }, token?: string): Promise<void> {
    return this.enqueueExecCommand('exec-next-instruction', options, token);
  }

  /**
   * Resumes execution of the target until the current function returns.
   * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
   *
   * @param options.threadId Identifier of the thread to execute the command on.
   * @param options.reverse *(GDB specific)* If **true** the target is executed in reverse.
   */
  stepOut(options?: { threadId?: number; reverse?: boolean }, token?: string): Promise<void> {
    return this.enqueueExecCommand('exec-finish', options, token);
  }

  private enqueueExecCommand(
    cmd: string, options: { threadId?: number; reverse?: boolean }, token?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      var fullCmd: string = cmd;
      if (options) {
        if (options.threadId) {
          fullCmd = fullCmd + ' --thread' + options.threadId;
        }
        if (options.reverse) {
          fullCmd = fullCmd + ' --reverse';
        }
      }
      this.enqueueCommand(
        new DebugCommand(fullCmd, token, (err, data) => { err ? reject(err) : resolve(); })
      );
    });
  }

  //
  // Stack Inspection Commands
  //

  /**
   * Retrieves information about a stack frame.
   *
   * @param options.threadId The thread for which the stack depth should be retrieved,
   *                         defaults to the currently selected thread if not specified.
   * @param options.frameLevel Stack index of the frame for which to retrieve locals, 
   *                           zero for the innermost frame, one for the frame from which the call
   *                           to the innermost frame originated, etc. Defaults to the currently
   *                           selected frame if not specified. If a value is provided for this
   *                           option then `threadId` must be specified as well.
   */
  getStackFrame(
    options?: { threadId?: number; frameLevel?: number }, token?: string): Promise<StackFrameInfo> {
    return new Promise<StackFrameInfo>((resolve, reject) => {
      this.enqueueCommand(
        new DebugCommand('stack-info-frame', token,
          (err, data) => { err ? reject(err) : resolve(extractStackFrameInfo(data.frame)); }
        )
      );
    });
  }

  /**
   * Retrieves the current depth of the stack.
   *
   * @param options.threadId The thread for which the stack depth should be retrieved,
   *                         defaults to the currently selected thread if not specified.
   * @param options.maxDepth *(GDB specific)* If specified the returned stack depth will not exceed 
   *                         this number.
   */
  getStackDepth(
    options?: { threadId?: number; maxDepth?: number }, token?: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      var fullCmd: string = 'stack-info-depth';
      if (options) {
        if (options.threadId) {
          fullCmd = fullCmd + ' --thread' + options.threadId;
        }
        if (options.maxDepth) {
          fullCmd = fullCmd + ' ' + options.maxDepth;
        }
      }
      this.enqueueCommand(
        new DebugCommand(fullCmd, token,
          (err, data) => { err ? reject(err) : resolve(parseInt(data.depth)); }
        )
      );
    });
  }

  /**
   * Retrieves the frames currently on the stack.
   *
   * The `lowFrame` and `highFrame` options can be used to limit the number of frames retrieved,
   * if both are supplied only the frame with levels in that range (inclusive) are retrieved.
   * If either `lowFrame` or `highFrame` option is omitted (but not both) then only a single
   * frame corresponding to that level is retrieved.
   *
   * @param options.threadId The thread for which the stack frames should be retrieved,
   *                         defaults to the currently selected thread if not specified.
   * @param options.noFrameFilters *(GDB specific)* If `true` the Python frame filters will not be 
   *                               executed.
   * @param options.lowFrame Must not be larger than the actual number of frames on the stack.
   * @param options.highFrame May be larger than the actual number of frames on the stack, in which
   *                          case only the existing frames will be retrieved.
   */
  getStackFrames(
    options?: { threadId?: number; lowFrame?: number; highFrame?: number; noFrameFilters?: boolean }, 
    token?: string) : Promise<StackFrameInfo[]> {
    var fullCmd: string = 'stack-list-frames';
    if (options) {
      if (options.threadId) {
        fullCmd = fullCmd + ' --thread' + options.threadId;
      }
      if (options.noFrameFilters === true) {
        fullCmd = fullCmd + ' --no-frame-filters';
      }
      if ((options.lowFrame !== undefined) && (options.highFrame !== undefined)) {
        fullCmd = fullCmd + ` ${options.lowFrame} ${options.highFrame}`;
      } else if (options.lowFrame !== undefined) {
        fullCmd = fullCmd + ` ${options.lowFrame} ${options.lowFrame}`;
      } else if (options.highFrame !== undefined) {
        fullCmd = fullCmd + ` ${options.highFrame} ${options.highFrame}`;
      }
    }
    return new Promise<StackFrameInfo[]>((resolve, reject) => {
      this.enqueueCommand(new DebugCommand(fullCmd, token,
        (err, data) => { err ? reject(err) : resolve(extractStackFrames(data.stack.frame)); }
      ));
    });
  }

  /**
   * Get a list of all the local variables for the specified frame.
   *
   * @param detail Specifies what information should be retrieved for each local variable.
   * @param options.threadId The thread for which local variables should be retrieved,
   *                         defaults to the currently selected thread if not specified.
   * @param options.frameLevel Stack index of the frame for which to retrieve locals, 
   *                           zero for the innermost frame, one for the frame from which the call
   *                           to the innermost frame originated, etc. Defaults to the currently
   *                           selected frame if not specified.
   * @param options.noFrameFilters *(GDB specific)* If `true` then Python frame filters will not be
   *                               executed.
   * @param options.skipUnavailable If `true` information about local variables that are not 
   *                                available will not be retrieved.
   */
  getStackFrameLocals(
    detail: VariableDetailLevel,
    options?: {
      threadId?: number; frameLevel?: number; noFrameFilters?: boolean; skipUnavailable?: boolean
    },
    token?: string
  ): Promise<VariableInfo[]> {
    var fullCmd: string = 'stack-list-locals';
    if (options) {
      if (options.threadId) {
        fullCmd = fullCmd + ' --thread ' + options.threadId;
      }
      if (options.frameLevel) {
        fullCmd = fullCmd + ' --frame ' + options.frameLevel;
      }
      if (options.noFrameFilters === true) {
        fullCmd = fullCmd + ' --no-frame-filters';
      }
      if (options.skipUnavailable === true) {
        fullCmd = fullCmd + ' --skip-unavailable';
      }
    }
    fullCmd = fullCmd + ' ' + detail;

    return new Promise<VariableInfo[]>((resolve, reject) => {
      this.enqueueCommand(new DebugCommand(fullCmd, token,
        (err, data) => { err ? reject(err) : resolve(extractFrameLocals(data.locals)); }
      ));
    });
  }

  /**
   * Get a list of all the arguments for the specified frame(s).
   *
   * The `lowFrame` and `highFrame` options can be used to limit the frames for which arguments
   * are retrieved. If both are supplied only the frames with levels in that range (inclusive) are
   * taken into account, if both are omitted the arguments of all frames currently on the stack
   * will be retrieved. If either one is omitted (but not both) then only the arguments for the
   * specified frame are retrieved.
   *
   * @param detail Specifies what information should be retrieved for each argument.
   * @param options.threadId The thread for which arguments should be retrieved,
   *                         defaults to the currently selected thread if not specified.
   * @param options.noFrameFilters *(GDB specific)* If `true` then Python frame filters will not be
   *                               executed.
   * @param options.skipUnavailable If `true` information about arguments that are not available
   *                                will not be retrieved.
   * @param options.lowFrame Must not be larger than the actual number of frames on the stack.
   * @param options.highFrame May be larger than the actual number of frames on the stack, in which
   *                          case only the existing frames will be retrieved.
   */
  getStackFrameArgs(
    detail: VariableDetailLevel,
    options?: {
      threadId?: number;
      noFrameFilters?: boolean;
      skipUnavailable?: boolean;
      lowFrame?: number;
      highFrame?: number;
    },
    token?: string
  ): Promise<StackFrameArgsInfo[]> {
    var fullCmd: string = 'stack-list-arguments';
    if (options) {
      if (options.threadId) {
        fullCmd = fullCmd + ' --thread ' + options.threadId;
      }
      if (options.noFrameFilters === true) {
        fullCmd = fullCmd + ' --no-frame-filters';
      }
      if (options.skipUnavailable === true) {
        fullCmd = fullCmd + ' --skip-unavailable';
      }
    }

    fullCmd = fullCmd + ' ' + detail;
    
    if (options) {
      if ((options.lowFrame !== undefined) && (options.highFrame !== undefined)) {
        fullCmd = fullCmd + ` ${options.lowFrame} ${options.highFrame}`;
      } else if (options.lowFrame !== undefined) {
        fullCmd = fullCmd + ` ${options.lowFrame} ${options.lowFrame}`;
      } else if (options.highFrame !== undefined) {
        fullCmd = fullCmd + ` ${options.highFrame} ${options.highFrame}`;
      }
    }

    return new Promise<StackFrameArgsInfo[]>((resolve, reject) => {
      this.enqueueCommand(new DebugCommand(fullCmd, token,
        (err, data) => { err ? reject(err) : resolve(extractFrameArgs(data['stack-args'])); }
      ));
    });
  }

  //
  // Watch Manipulation (aka Variable Objects)
  //

  /**
   * Creates a new watch to monitor the value of the given expression.
   *
   * @param expression Any expression valid in the current language set (so long as it doesn't
   *                   begin with a `*`), or one of the following:
   *                   - a memory cell address, e.g. `*0x0000000000400cd0`
   *                   - a CPU register name, e.g. `$sp`
   * @param options.id Unique identifier for the new watch, if omitted one is auto-generated.
   *                   Auto-generated identifiers begin with the letters `var` and are followed by
   *                   one or more digits, when providing your own identifiers it's best to use a 
   *                   different naming scheme that doesn't clash with auto-generated identifiers.
   * @param options.threadId The thread within which the watch expression will be evaluated.
   *                         *Default*: the currently selected thread.
   * @param options.threadGroup
   * @param options.frameLevel The index of the stack frame within which the watch expression will 
   *                           be evaluated initially, zero for the innermost stack frame. Note that
   *                           if `frameLevel` is specified then `threadId` must also be specified.
   *                           *Default*: the currently selected frame.
   * @param options.frameAddress *(GDB specific)* Address of the frame within which the expression
   *                             should be evaluated.
   * @param options.isFloating Set to `true` if the expression should be re-evaluated every time
   *                           within the current frame, i.e. it's not bound to a specific frame.
   *                           Set to `false` if the expression should be bound to the frame within
   *                           which the watch is created.
   *                           *Default*: `false`.
   */
  addWatch(
    expression: string,
    options?: {
      id?: string;
      threadId?: number;
      threadGroup?: string;
      frameLevel?: number;
      frameAddress?: string;
      isFloating?: boolean;
    }
  ): Promise<IWatchInfo> {
    var fullCmd: string = 'var-create';
    var id = '-'; // auto-generate id
    var addr = '*'; // use current frame

    if (options) {
      if (options.id) {
        id = options.id;
      }
      if (options.threadId) {
        fullCmd = fullCmd + ' --thread ' + options.threadId;
      }
      if (options.threadGroup) {
        fullCmd = fullCmd + ' --thread-group ' + options.threadGroup;
      }
      if (options.frameLevel) {
        fullCmd = fullCmd + ' --frame ' + options.frameLevel;
      }
      if (options.isFloating === true) {
        addr = '@';
      }
      else if (options.frameAddress) {
        addr = options.frameAddress;
      }
    }

    fullCmd = fullCmd + ` ${id} ${addr} ${expression}`;

    return new Promise<IWatchInfo>((resolve, reject) => {
      this.enqueueCommand(new DebugCommand(fullCmd, null,
        (err, data) => { err ? reject(err) : resolve(extractWatch(data)); }
      ));
    });
  }

  /**
   * Destroys a previously created watch.
   *
   * @param id Identifier of the watch to destroy.
   */
  removeWatch(id: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.enqueueCommand(new DebugCommand('var-delete ' + id, null,
        (err, data) => { err ? reject(err) : resolve(); }
      ));
    });
  }

  /**
   * Updates the state of an existing watch.
   *
   * @param id Identifier of the watch to update.
   */
  updateWatch(id: string, detail?: VariableDetailLevel): Promise<IWatchUpdateInfo[]> {
    var fullCmd: string = 'var-update';
    if (detail !== undefined) {
      fullCmd = fullCmd + ' ' + detail;
    }
    fullCmd = fullCmd + ' ' + id;

    return new Promise<IWatchUpdateInfo[]>((resolve, reject) => {
      this.enqueueCommand(new DebugCommand(fullCmd, null,
        (err, data) => { err ? reject(err) : resolve(extractWatchChangelist(data.changelist)); }
      ));
    });
  }

  /**
   * Retrieves a list of direct children of the specified watch.
   *
   * A watch is automatically created for each child that is retrieved (if one doesn't already exist).
   * The `from` and `to` options can be used to retrieve a subset of children starting from child
   * index `from` and up to (but excluding) child index `to`, note that this currently doesn't work
   * on LLDB.
   *
   * @param id Identifier of the watch whose children should be retrieved.
   * @param options.detail One of:
   *     - [[VariableDetailLevel.None]]: Do not retrieve values of children, this is the default.
   *     - [[VariableDetailLevel.All]]: Retrieve values for all children.
   *     - [[VariableDetailLevel.Simple]]: Only retrieve values of children that have a simple type.
   * @param options.from Zero-based index of the first child to retrieve, if less than zero the
   *                     range is reset. `to` must also be set in order for this option to have any
   *                     effect.
   * @param options.to Zero-based index +1 of the last child to retrieve, if less than zero the
   *                   range is reset. `from` must also be set in order for this option to have any
   *                   effect.
   */
  getWatchChildren(
    id: string, 
    options?: {
      detail?: VariableDetailLevel;
      from?: number;
      to?: number;
    }): Promise<IWatchChildInfo[]> {
    var fullCmd: string = 'var-list-children';
    if (options && (options.detail !== undefined)) {
      fullCmd = fullCmd + ' ' + options.detail;
    }
    fullCmd = fullCmd + ' ' + id;
    if (options) {
      if (options.from && options.to) {
        fullCmd = fullCmd + ' ' + options.from + ' ' + options.to;
      }
    }

    return new Promise<IWatchChildInfo[]>((resolve, reject) => {
      this.enqueueCommand(new DebugCommand(fullCmd, null,
        (err, data) => { err ? reject(err) : resolve(extractWatchChildren(data.children)); }
      ));
    });
  }

  /**
   * Sets the output format for the value of a watch.
   *
   * @param id Identifier of the watch for which the format specifier should be set.
   * @param formatSpec The output format for the watch value.
   * @returns A promise that will be resolved with the value of the watch formatted using the
   *          provided `formatSpec`.
   */
  setWatchValueFormat(id: string, formatSpec: WatchFormatSpec): Promise<string> {
    var fullCmd: string = `var-set-format ${id} ` + watchFormatSpecToStringMap.get(formatSpec);

    return this.getCommandOutput<string>(fullCmd, null, (output: any) => {
      if (output.value) {
        return output.value; // GDB-MI
      } else {
        return output.changelist[0].value; // LLDB-MI
      }
    });
  }

  /**
   * Evaluates the watch expression and returns the result.
   *
   * @param id Identifier of the watch for which the format specifier should be set.
   * @param formatSpec The output format for the watch value.
   * @returns A promise that will be resolved with the value of the watch.
   */
  getWatchValue(id: string, formatSpec?: WatchFormatSpec): Promise<string> {
    var fullCmd: string = 'var-evaluate-expression';
    if (formatSpec !== undefined) {
      fullCmd = fullCmd + ' -f ' + watchFormatSpecToStringMap.get(formatSpec);
    }
    fullCmd = fullCmd + ' ' + id;

    return this.getCommandOutput<string>(fullCmd, null, (output: any) => {
      return output.value;
    });
  }
}

/** Creates a FrameInfo object from the output of the MI Output parser. */
function extractFrameInfo(data: any): FrameInfo {
  return {
    func: data.func,
    args: data.args,
    address: data.addr,
    filename: data.file,
    fullname: data.fullname,
    line: data.line ? parseInt(data.line, 10) : undefined,
  };
}

/** Creates a StackFrameInfo object from the output of the MI Output parser. */
function extractStackFrameInfo(data: any): StackFrameInfo {
  return {
    level: parseInt(data.level),
    func: data.func,
    address: data.addr,
    filename: data.file,
    fullname: data.fullname,
    line: data.line ? parseInt(data.line, 10) : undefined,
    from: data.from
  };
}

/** Creates a StackFrameInfo array from the output of the MI Output parser. */
function extractStackFrames(data: any | any[]): StackFrameInfo[] {
  if (Array.isArray(data)) {
    return data.map((frame: any) => { return extractStackFrameInfo(frame); });
  } else {
    return [extractStackFrameInfo(data)];
  }
}

/**
 * Converts the output produced by the MI Output parser from the response to the
 * -stack-list-locals MI command into a more consistent and useful form.
 */
function extractFrameLocals(data: any): VariableInfo[] {
  if ('name' in data) {
    if (Array.isArray(data.name)) {
      // input is in the form: { name: [varName1, varName2, ...] }
      return data.name.map((varName: string): VariableInfo => { return { name: varName }; });
    } else {
      // input is in the form: { name: varName }
      return [{ name: data.name }];
    }
  } else {
    // input is already in the correct form
    return data;
  }
}

/**
 * Converts the output produced by the MI Output parser from the response to the
 * -stack-list-arguments MI command into a more consistent and useful form.
 */
function extractFrameArgs(data: any): StackFrameArgsInfo[] {
  if (Array.isArray(data.frame)) {
    // input is in the form: { frame: [{ level: 0, args: [...] }, { level: 1, args: arg1 }, ...]
    data.frame.map((frame: any): StackFrameArgsInfo => {
      return {
        level: parseInt(frame.level),
        args: Array.isArray(frame.args) ? frame.args : [frame.args]
      };
    });
  } else {
    // input is in the form: { frame: { level: 0, args: [...] }
    return [{
      level: parseInt(data.frame.level),
      args: Array.isArray(data.frame.args) ? data.frame.args : [data.frame.args]
    }];
  }
}

/**
 * Converts the output produced by the MI Output parser from the response to the
 * -var-create MI command into an object that conforms to the IWatchInfo interface.
 */
function extractWatch(data: any): IWatchInfo {
  return {
    id: data.name,
    childCount: parseInt(data.numchild),
    value: data.value,
    expressionType: data['type'],
    threadId: parseInt(data['thread-id']),
    hasMoreChildren: data.has_more !== '0',
    isDynamic: data.dynamic === '1',
    displayHint: data.displayhint
  };
}

/**
 * Converts the output produced by the MI Output parser from the response to the
 * -var-update MI command into an array of objects that conform to the IWatchUpdateInfo interface.
 */
function extractWatchChangelist(changelist: any[]): IWatchUpdateInfo[] {
  return changelist.map((data: any) => {
    return {
      id: data.name,
      childCount: (data.new_num_children ? parseInt(data.new_num_children) : undefined),
      value: data.value,
      expressionType: data.new_type,
      isInScope: data.in_scope === 'true',
      isObsolete: data.in_scope === 'invalid',
      hasTypeChanged: data.type_changed === 'true',
      isDynamic: data.dynamic === '1',
      displayHint: data.displayhint,
      hasMoreChildren: data.has_more === '1',
      newChildren: data.new_children
    }
  });
}

/** 
 * Converts the output produced by the MI Output parser from the response to the
 * -var-list-children MI command into an array of objects that conform to the IWatchChildInfo 
 * interface.
 */
function extractWatchChildren(data: any | any[]): IWatchChildInfo[] {
  var extractWatchChild = (data: any): IWatchChildInfo => {
    return {
      id: data.name,
      childCount: parseInt(data.numchild),
      value: data.value,
      expressionType: data['type'],
      threadId: parseInt(data['thread-id']),
      hasMoreChildren: data.has_more !== '0',
      isDynamic: data.dynamic === '1',
      displayHint: data.displayhint,
      expression: data.exp,
      isFrozen: data.frozen === '1'
    };
  }

  // FIXME: the input shouldn't actually ever be the string '[]', but LLDB-MI has this quirk,
  // hopefully it'll be fixed in the near future and the string comparison can be removed
  if ((data === undefined) || Array.isArray(data) || (data === '[]')) {
    // input will only be an array if the array is empty
    return [];
  } else if (Array.isArray(data.child)) {
    // input is in the form: { child: [{ name: var1.child1, ... }, { name: var1.child2, ... }, ...]
    return data.child.map((child: any) => { return extractWatchChild(child); });
  } else {
    // input is in the form: { child: { name: var1.child1, ... } }
    return [extractWatchChild(data.child)];
  }
}

function setProcessEnvironment(): void {
  // HACK for LLDB on Windows (where users have to build their own Python)
  if (os.platform() === 'win32') {
    if (process.env['LLDB_PYTHON_SRC'] === undefined) {
      throw new Error(
        'LLDB_PYTHON_SRC environment variable is not set. It must be set to the source directory ' +
        'of the Python version used in the LLDB build.'
      );
    }
    if (process.env['LLVM_SRC_BUILD'] === undefined) {
      throw new Error(
        'LLVM_SRC_BUILD environment variable is not set. It must be set to the LLVM build output ' +
        'directory.'
      );
    }
    process.env['PATH'] =
      process.env['PATH'] + ';' + path.join(process.env['LLDB_PYTHON_SRC'], 'PCbuild');
    var pythonPath =
      path.join(process.env['LLDB_PYTHON_SRC'], 'Lib') + ';' +
      path.join(process.env['LLVM_SRC_BUILD'], 'lib\\site-packages');

    if (process.env['PYTHONPATH']) {
      process.env['PYTHONPATH'] = process.env['PYTHONPATH'] + ';' + pythonPath;
    } else {
      process.env['PYTHONPATH'] = pythonPath;
    }
  }
}

/**
 * Starts a new debugging session and spawns the debbuger process.
 *
 * Once the debug session has outlived its usefulness call [[DebugSession.end]] to ensure proper
 * cleanup.
 *
 * @returns A new debug session.
 */
export function startDebugSession(): DebugSession {
  var debugSession: DebugSession = null;
  setProcessEnvironment();
  // lldb-mi.exe should be on the PATH
  var debuggerProcess = spawn('lldb-mi', ['--interpreter']);
  if (debuggerProcess) {
    debugSession = new DebugSession(debuggerProcess.stdout, debuggerProcess.stdin);
    if (debugSession) {
      debuggerProcess.once('exit',
        (code: number, signal: string) => { debugSession.end(false); }
      );
    }
  }
  return debugSession;
};

// There are more reasons listed in the GDB/MI spec., the ones here are just the subset that's 
// actually used by LLDB MI at this time (11-Apr-2015).
var targetStopReasonMap = new Map<string, TargetStopReason>()
  .set('breakpoint-hit', TargetStopReason.BreakpointHit)
  .set('end-stepping-range', TargetStopReason.EndSteppingRange)
  .set('exited-normally', TargetStopReason.ExitedNormally)
  .set('signal-received', TargetStopReason.SignalReceived)
  .set('exception-received', TargetStopReason.ExceptionReceived);

function parseTargetStopReason(reasonString: string): TargetStopReason {
  var reasonCode = targetStopReasonMap.get(reasonString);
  console.log('REASON: ' + reasonString + ' ' + reasonCode);
  if (reasonCode !== undefined) {
    return reasonCode;
  }
  // TODO: log and keep on running
  return TargetStopReason.Unrecognized;
}

/** 
 * Parses a list of stopped threads from a GDB/MI 'stopped' async notification.
 * @return An array of thread identifiers, an empty array is used to indicate that all threads
 *         were stopped.
 */
function parseStoppedThreadsList(stoppedThreads: string): number[] {
  if (stoppedThreads === 'all') {
    return [];
  } else {
    // FIXME: GDB/MI spec. fails to specify what the format of the list is, need to experiment
    //        to figure out what is actually produced by the debugger.
    return [parseInt(stoppedThreads, 10)];
  }
}

// maps WatchFormatSpec enum members to the corresponding MI string
var watchFormatSpecToStringMap = new Map<WatchFormatSpec, string>()
  .set(WatchFormatSpec.Binary, 'binary')
  .set(WatchFormatSpec.Decimal, 'decimal')
  .set(WatchFormatSpec.Hexadecimal, 'hexadecimal')
  .set(WatchFormatSpec.Octal, 'octal')
  .set(WatchFormatSpec.Default, 'natural');