// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { TargetStopReason, IFrameInfo } from './types';

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
export const EVENT_THREAD_GROUP_ADDED: string = 'thdgrpadd';
/**
  * Emitted when a thread group is removed by the debugger.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[ThreadGroupRemovedNotify]]) => void
  * ~~~
  * @event
  */
export const EVENT_THREAD_GROUP_REMOVED: string = 'thdgrprem';
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
export const EVENT_THREAD_GROUP_STARTED: string = 'thdgrpstart';
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
export const EVENT_THREAD_GROUP_EXITED: string = 'thdgrpexit';
/**
  * Emitted when a thread is created.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[ThreadCreatedNotify]]) => void
  * ~~~
  * @event
  */
export const EVENT_THREAD_CREATED: string = 'thdcreate';
/**
  * Emitted when a thread exits.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[ThreadExitedNotify]]) => void
  * ~~~
  * @event
  */
export const EVENT_THREAD_EXITED: string = 'thdexit';
/**
  * Emitted when the debugger changes the current thread selection.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[ThreadSelectedNotify]]) => void
  * ~~~
  * @event
  */
export const EVENT_THREAD_SELECTED: string = 'thdselect';
/**
  * Emitted when a new library is loaded by the program being debugged.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[LibLoadedNotify]]) => void
  * ~~~
  * @event
  */
export const EVENT_LIB_LOADED: string = 'libload';
/**
  * Emitted when a library is unloaded by the program being debugged.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[LibUnloadedNotify]]) => void
  * ~~~
  * @event
  */
export const EVENT_LIB_UNLOADED: string = 'libunload';

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
export const EVENT_DBG_CONSOLE_OUTPUT: string = 'conout';

/**
  * Emitted when some console output from the target becomes available.
  *
  * Listener function should have the signature:
  * ~~~
  * (output: string) => void
  * ~~~
  * @event
  */
export const EVENT_TARGET_OUTPUT: string = 'targetout';

/**
  * Emitted when log output from the debugger becomes available.
  *
  * Listener function should have the signature:
  * ~~~
  * (output: string) => void
  * ~~~
  * @event
  */
export const EVENT_DBG_LOG_OUTPUT: string = 'dbgout';

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
export const EVENT_TARGET_RUNNING: string = 'targetrun';

/**
  * Emitted when the target stops running.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[TargetStoppedNotify]]) => void
  * ~~~
  * @event
  */
export const EVENT_TARGET_STOPPED: string = 'targetstop';

/**
  * Emitted when the target stops running because a breakpoint was hit.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[BreakpointHitNotify]]) => void
  * ~~~
  * @event
  */
export const EVENT_BREAKPOINT_HIT: string = 'brkpthit';

/**
  * Emitted when the target stops due to a stepping operation finishing.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[StepFinishedNotify]]) => void
  * ~~~
  * @event
  */
export const EVENT_STEP_FINISHED: string = 'endstep';

/**
  * Emitted when the target stops due to a step-out operation finishing.
  *
  * NOTE: Currently this event will not be emitted by LLDB-MI, it will only be emitted by GDB-MI,
  * so for the time being use [[EVENT_STEP_FINISHED]] with LLDB-MI.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[StepOutFinishedNotify]]) => void
  * ~~~
  * @event
  */
export const EVENT_FUNCTION_FINISHED: string = 'endfunc';

/**
  * Emitted when the target stops running because it received a signal.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[SignalReceivedNotify]]) => void
  * ~~~
  * @event
  */
export const EVENT_SIGNAL_RECEIVED: string = 'signal';

/**
  * Emitted when the target stops running due to an exception.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[ExceptionReceivedNotify]]) => void
  * ~~~
  * @event
  */
export const EVENT_EXCEPTION_RECEIVED: string = 'exception';

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

/** Notification sent whenever a library is loaded or unloaded by an inferior. */
interface LibNotify {
  id: string;
  /** Name of the library file on the target system. */
  targetName: string;
  /** 
    * Name of the library file on the host system.
    * When debugging locally this should be the same as `targetName`.
    */
  hostName: string;
  /**
    * Optional identifier of the thread group within which the library was loaded.
    */
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
  symbolsPath: string;
}

export interface LibLoadedNotify extends LibNotify { }
export interface LibUnloadedNotify extends LibNotify { }

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
  frame: IFrameInfo;
}

export interface StepFinishedNotify extends TargetStoppedNotify {
  frame: IFrameInfo;
}

export interface StepOutFinishedNotify extends TargetStoppedNotify {
  frame: IFrameInfo;
  resultVar?: string;
  returnValue?: string;
}

export interface SignalReceivedNotify extends TargetStoppedNotify {
  signalCode?: string;
  signalName?: string;
  signalMeaning?: string;
}

export interface ExceptionReceivedNotify extends TargetStoppedNotify {
  exception: string;
}

export interface IDebugSessionEvent {
  name: string;
  data: any;
}

export function createEventsForExecNotification(notification: string, data: any): IDebugSessionEvent[] {
  switch (notification) {
    case 'running':
      return [{ name: EVENT_TARGET_RUNNING, data: data['thread-id'] }];

    case 'stopped':
      let standardNotify: TargetStoppedNotify = {
        reason: parseTargetStopReason(data.reason),
        threadId: parseInt(data['thread-id'], 10),
        stoppedThreads: parseStoppedThreadsList(data['stopped-threads']),
        processCore: data.core
      };
      let events = [{ name: EVENT_TARGET_STOPPED, data: standardNotify }];

      // emit a more specialized event for notifications that contain additional info
      switch (standardNotify.reason) {
        case TargetStopReason.BreakpointHit:
          let breakpointNotify: BreakpointHitNotify = {
            reason: standardNotify.reason,
            threadId: standardNotify.threadId,
            stoppedThreads: standardNotify.stoppedThreads,
            processorCore: standardNotify.processorCore,
            breakpointId: parseInt(data.bkptno, 10),
            frame: extractFrameInfo(data.frame)
          };
          events.push({ name: EVENT_BREAKPOINT_HIT, data: breakpointNotify });
          break;

        case TargetStopReason.EndSteppingRange:
          var stepNotify: StepFinishedNotify = {
            reason: standardNotify.reason,
            threadId: standardNotify.threadId,
            stoppedThreads: standardNotify.stoppedThreads,
            processorCore: standardNotify.processorCore,
            frame: extractFrameInfo(data.frame)
          };
          events.push({ name: EVENT_STEP_FINISHED, data: stepNotify });
          break;

        case TargetStopReason.FunctionFinished:
          var stepOutNotify: StepOutFinishedNotify = {
            reason: standardNotify.reason,
            threadId: standardNotify.threadId,
            stoppedThreads: standardNotify.stoppedThreads,
            processorCore: standardNotify.processorCore,
            frame: extractFrameInfo(data.frame),
            resultVar: data['gdb-result-var'],
            returnValue: data['return-value']
          };
          events.push({ name: EVENT_FUNCTION_FINISHED, data: stepOutNotify });
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
          events.push({ name: EVENT_SIGNAL_RECEIVED, data: signalNotify });
          break;

        case TargetStopReason.ExceptionReceived:
          var exceptionNotify: ExceptionReceivedNotify = {
            reason: standardNotify.reason,
            threadId: standardNotify.threadId,
            stoppedThreads: standardNotify.stoppedThreads,
            processorCore: standardNotify.processorCore,
            exception: data.exception
          };
          events.push({ name: EVENT_EXCEPTION_RECEIVED, data: exceptionNotify });
          break;
      }
      return events;

    default:
      // TODO: log and keep on going
      return [];
  }
}

export function createEventForAsyncNotification(notification: string, data: any): IDebugSessionEvent {
  switch (notification) {
    case 'thread-group-added':
      return { name: EVENT_THREAD_GROUP_ADDED, data: data };

    case 'thread-group-removed':
      return { name: EVENT_THREAD_GROUP_REMOVED, data: data };

    case 'thread-group-started':
      return { name: EVENT_THREAD_GROUP_STARTED, data: data };

    case 'thread-group-exited':
      return { name: EVENT_THREAD_GROUP_EXITED, data: {
        id: data.id,
        exitCode: data['exit-code'] }
      };

    case 'thread-created':
      return { name: EVENT_THREAD_CREATED, data: {
        id: data.id, 
        groupId: data['group-id'] }
      };

    case 'thread-exited':
      return { name: EVENT_THREAD_EXITED, data: {
        id: data.id,
        groupId: data['group-id']
      }};

    case 'thread-selected':
      return { name: EVENT_THREAD_SELECTED, data: data };

    case 'library-loaded':
      return { name: EVENT_LIB_LOADED, data: {
        id: data.id,
        targetName: data['target-name'],
        hostName: data['host-name'],
        threadGroup: data['thread-group'],
        symbolsPath: data['symbols-path'],
        loadAddress: data.loaded_addr
      }};
        
    case 'library-unloaded':
      return { name: EVENT_LIB_UNLOADED, data: {
        id: data.id,
        targetName: data['target-name'],
        hostName: data['host-name'],
        threadGroup: data['thread-group'],
        symbolsPath: data['symbols-path'],
        loadAddress: data.loaded_addr
      }};

    default:
      // TODO: log and keep on going
      return undefined;
  };
}

/** 
  * Creates an object that conforms to the IFrameInfo interface from the output of the
  * MI Output parser.
  */
function extractFrameInfo(data: any): IFrameInfo {
  return {
    func: data.func,
    args: data.args,
    address: data.addr,
    filename: data.file,
    fullname: data.fullname,
    line: data.line ? parseInt(data.line, 10) : undefined,
  };
}

// There are more reasons listed in the GDB/MI spec., the ones here are just the subset that's 
// actually used by LLDB MI at this time (11-Apr-2015).
var targetStopReasonMap = new Map<string, TargetStopReason>()
  .set('breakpoint-hit', TargetStopReason.BreakpointHit)
  .set('end-stepping-range', TargetStopReason.EndSteppingRange)
  .set('function-finished', TargetStopReason.FunctionFinished)
  .set('exited-normally', TargetStopReason.ExitedNormally)
  .set('signal-received', TargetStopReason.SignalReceived)
  .set('exception-received', TargetStopReason.ExceptionReceived);

function parseTargetStopReason(reasonString: string): TargetStopReason {
  var reasonCode = targetStopReasonMap.get(reasonString);
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
