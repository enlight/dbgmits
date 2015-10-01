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
export declare const EVENT_THREAD_GROUP_ADDED: string;
/**
  * Emitted when a thread group is removed by the debugger.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[ThreadGroupRemovedNotify]]) => void
  * ~~~
  * @event
  */
export declare const EVENT_THREAD_GROUP_REMOVED: string;
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
export declare const EVENT_THREAD_GROUP_STARTED: string;
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
export declare const EVENT_THREAD_GROUP_EXITED: string;
/**
  * Emitted when a thread is created.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[ThreadCreatedNotify]]) => void
  * ~~~
  * @event
  */
export declare const EVENT_THREAD_CREATED: string;
/**
  * Emitted when a thread exits.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[ThreadExitedNotify]]) => void
  * ~~~
  * @event
  */
export declare const EVENT_THREAD_EXITED: string;
/**
  * Emitted when the debugger changes the current thread selection.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[ThreadSelectedNotify]]) => void
  * ~~~
  * @event
  */
export declare const EVENT_THREAD_SELECTED: string;
/**
  * Emitted when a new library is loaded by the program being debugged.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[LibLoadedNotify]]) => void
  * ~~~
  * @event
  */
export declare const EVENT_LIB_LOADED: string;
/**
  * Emitted when a library is unloaded by the program being debugged.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[LibUnloadedNotify]]) => void
  * ~~~
  * @event
  */
export declare const EVENT_LIB_UNLOADED: string;
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
export declare const EVENT_DBG_CONSOLE_OUTPUT: string;
/**
  * Emitted when some console output from the target becomes available.
  *
  * Listener function should have the signature:
  * ~~~
  * (output: string) => void
  * ~~~
  * @event
  */
export declare const EVENT_TARGET_OUTPUT: string;
/**
  * Emitted when log output from the debugger becomes available.
  *
  * Listener function should have the signature:
  * ~~~
  * (output: string) => void
  * ~~~
  * @event
  */
export declare const EVENT_DBG_LOG_OUTPUT: string;
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
export declare const EVENT_TARGET_RUNNING: string;
/**
  * Emitted when the target stops running.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[TargetStoppedNotify]]) => void
  * ~~~
  * @event
  */
export declare const EVENT_TARGET_STOPPED: string;
/**
  * Emitted when the target stops running because a breakpoint was hit.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[BreakpointHitNotify]]) => void
  * ~~~
  * @event
  */
export declare const EVENT_BREAKPOINT_HIT: string;
/**
  * Emitted when the target stops due to a stepping operation finishing.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[StepFinishedNotify]]) => void
  * ~~~
  * @event
  */
export declare const EVENT_STEP_FINISHED: string;
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
export declare const EVENT_FUNCTION_FINISHED: string;
/**
  * Emitted when the target stops running because it received a signal.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[SignalReceivedNotify]]) => void
  * ~~~
  * @event
  */
export declare const EVENT_SIGNAL_RECEIVED: string;
/**
  * Emitted when the target stops running due to an exception.
  *
  * Listener function should have the signature:
  * ~~~
  * (notification: [[ExceptionReceivedNotify]]) => void
  * ~~~
  * @event
  */
export declare const EVENT_EXCEPTION_RECEIVED: string;
export interface IThreadGroupAddedEvent {
    id: string;
}
export interface IThreadGroupRemovedEvent {
    id: string;
}
export interface IThreadGroupStartedEvent {
    id: string;
    pid: string;
}
export interface IThreadGroupExitedEvent {
    id: string;
    exitCode: string;
}
export interface IThreadCreatedEvent {
    id: number;
    groupId: string;
}
export interface IThreadExitedEvent {
    id: number;
    groupId: string;
}
export interface IThreadSelectedEvent {
    id: number;
}
/** Notification sent whenever a library is loaded or unloaded by an inferior. */
export interface ILibEvent {
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
export interface ILibLoadedEvent extends ILibEvent {
}
export interface ILibUnloadedEvent extends ILibEvent {
}
export interface ITargetStoppedEvent {
    reason: TargetStopReason;
    /** Identifier of the thread that caused the target to stop. */
    threadId: number;
    /**
      * Identifiers of the threads that were stopped,
      * if all threads were stopped this array will be empty.
      */
    stoppedThreads: number[];
    /**
     * Processor core on which the stop event occured.
     * The debugger may not always provide a value for this field, in which case it will be `undefined`.
     */
    processorCore: string;
}
export interface IBreakpointHitEvent extends ITargetStoppedEvent {
    breakpointId: number;
    frame: IFrameInfo;
}
export interface IStepFinishedEvent extends ITargetStoppedEvent {
    frame: IFrameInfo;
}
export interface IStepOutFinishedEvent extends ITargetStoppedEvent {
    frame: IFrameInfo;
    resultVar?: string;
    returnValue?: string;
}
export interface ISignalReceivedEvent extends ITargetStoppedEvent {
    signalCode?: string;
    signalName?: string;
    signalMeaning?: string;
}
export interface IExceptionReceivedEvent extends ITargetStoppedEvent {
    exception: string;
}
export interface IDebugSessionEvent {
    name: string;
    data: any;
}
export declare function createEventsForExecNotification(notification: string, data: any): IDebugSessionEvent[];
export declare function createEventForAsyncNotification(notification: string, data: any): IDebugSessionEvent;
