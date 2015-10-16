// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.
var types_1 = require('./types');
var extractors_1 = require('./extractors');
/**
  * Emitted when a thread group is added by the debugger, it's possible the thread group
  * hasn't yet been associated with a running program.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[IThreadGroupAddedEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_THREAD_GROUP_ADDED = 'thdgrpadd';
/**
  * Emitted when a thread group is removed by the debugger.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[IThreadGroupRemovedEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_THREAD_GROUP_REMOVED = 'thdgrprem';
/**
  * Emitted when a thread group is associated with a running program,
  * either because the program was started or the debugger was attached to it.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[IThreadGroupStartedEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_THREAD_GROUP_STARTED = 'thdgrpstart';
/**
  * Emitted when a thread group ceases to be associated with a running program,
  * either because the program terminated or the debugger was dettached from it.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[IThreadGroupExitedEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_THREAD_GROUP_EXITED = 'thdgrpexit';
/**
  * Emitted when a thread is created.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[IThreadCreatedEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_THREAD_CREATED = 'thdcreate';
/**
  * Emitted when a thread exits.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[IThreadExitedEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_THREAD_EXITED = 'thdexit';
/**
  * Emitted when the debugger changes the current thread selection.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[IThreadSelectedEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_THREAD_SELECTED = 'thdselect';
/**
  * Emitted when a new library is loaded by the program being debugged.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[ILibLoadedEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_LIB_LOADED = 'libload';
/**
  * Emitted when a library is unloaded by the program being debugged.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[ILibUnloadedEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_LIB_UNLOADED = 'libunload';
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
exports.EVENT_DBG_CONSOLE_OUTPUT = 'conout';
/**
  * Emitted when some console output from the target becomes available.
  *
  * Listener function should have the signature:
  * ~~~
  * (output: string) => void
  * ~~~
  * @event
  */
exports.EVENT_TARGET_OUTPUT = 'targetout';
/**
  * Emitted when log output from the debugger becomes available.
  *
  * Listener function should have the signature:
  * ~~~
  * (output: string) => void
  * ~~~
  * @event
  */
exports.EVENT_DBG_LOG_OUTPUT = 'dbgout';
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
exports.EVENT_TARGET_RUNNING = 'targetrun';
/**
  * Emitted when the target stops running.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[ITargetStoppedEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_TARGET_STOPPED = 'targetstop';
/**
  * Emitted when the target stops running because a breakpoint was hit.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[IBreakpointHitEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_BREAKPOINT_HIT = 'brkpthit';
/**
  * Emitted when the target stops due to a stepping operation finishing.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[IStepFinishedEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_STEP_FINISHED = 'endstep';
/**
  * Emitted when the target stops due to a step-out operation finishing.
  *
  * NOTE: Currently this event will not be emitted by LLDB-MI, it will only be emitted by GDB-MI,
  * so for the time being use [[EVENT_STEP_FINISHED]] with LLDB-MI.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[IStepOutFinishedEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_FUNCTION_FINISHED = 'endfunc';
/**
  * Emitted when the target stops running because it received a signal.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[ISignalReceivedEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_SIGNAL_RECEIVED = 'signal';
/**
  * Emitted when the target stops running due to an exception.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[IExceptionReceivedEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_EXCEPTION_RECEIVED = 'exception';
/**
  * Emitted when a breakpoint is modified by the debugger.
  *
  * Listener function should have the signature:
  * ~~~
  * (e: [[IBreakpointModifiedEvent]]) => void
  * ~~~
  * @event
  */
exports.EVENT_BREAKPOINT_MODIFIED = 'breakpoint-modified';
function createEventsForExecNotification(notification, data) {
    switch (notification) {
        case 'running':
            return [{ name: exports.EVENT_TARGET_RUNNING, data: data['thread-id'] }];
        case 'stopped':
            var stopEvent = {
                reason: parseTargetStopReason(data.reason),
                threadId: parseInt(data['thread-id'], 10),
                stoppedThreads: parseStoppedThreadsList(data['stopped-threads']),
                processorCore: data.core
            };
            var events = [{ name: exports.EVENT_TARGET_STOPPED, data: stopEvent }];
            // emit a more specialized event for notifications that contain additional info
            switch (stopEvent.reason) {
                case types_1.TargetStopReason.BreakpointHit:
                    var breakpointHitEvent = {
                        reason: stopEvent.reason,
                        threadId: stopEvent.threadId,
                        stoppedThreads: stopEvent.stoppedThreads,
                        processorCore: stopEvent.processorCore,
                        breakpointId: parseInt(data.bkptno, 10),
                        frame: extractFrameInfo(data.frame)
                    };
                    events.push({ name: exports.EVENT_BREAKPOINT_HIT, data: breakpointHitEvent });
                    break;
                case types_1.TargetStopReason.EndSteppingRange:
                    var stepFinishedEvent = {
                        reason: stopEvent.reason,
                        threadId: stopEvent.threadId,
                        stoppedThreads: stopEvent.stoppedThreads,
                        processorCore: stopEvent.processorCore,
                        frame: extractFrameInfo(data.frame)
                    };
                    events.push({ name: exports.EVENT_STEP_FINISHED, data: stepFinishedEvent });
                    break;
                case types_1.TargetStopReason.FunctionFinished:
                    var stepOutEvent = {
                        reason: stopEvent.reason,
                        threadId: stopEvent.threadId,
                        stoppedThreads: stopEvent.stoppedThreads,
                        processorCore: stopEvent.processorCore,
                        frame: extractFrameInfo(data.frame),
                        resultVar: data['gdb-result-var'],
                        returnValue: data['return-value']
                    };
                    events.push({ name: exports.EVENT_FUNCTION_FINISHED, data: stepOutEvent });
                    break;
                case types_1.TargetStopReason.SignalReceived:
                    var signalEvent = {
                        reason: stopEvent.reason,
                        threadId: stopEvent.threadId,
                        stoppedThreads: stopEvent.stoppedThreads,
                        processorCore: stopEvent.processorCore,
                        signalCode: data.signal,
                        signalName: data['signal-name'],
                        signalMeaning: data['signal-meaning']
                    };
                    events.push({ name: exports.EVENT_SIGNAL_RECEIVED, data: signalEvent });
                    break;
                case types_1.TargetStopReason.ExceptionReceived:
                    var exceptionEvent = {
                        reason: stopEvent.reason,
                        threadId: stopEvent.threadId,
                        stoppedThreads: stopEvent.stoppedThreads,
                        processorCore: stopEvent.processorCore,
                        exception: data.exception
                    };
                    events.push({ name: exports.EVENT_EXCEPTION_RECEIVED, data: exceptionEvent });
                    break;
            }
            return events;
        default:
            // TODO: log and keep on going
            return [];
    }
}
exports.createEventsForExecNotification = createEventsForExecNotification;
function createEventForAsyncNotification(notification, data) {
    switch (notification) {
        case 'thread-group-added':
            return { name: exports.EVENT_THREAD_GROUP_ADDED, data: data };
        case 'thread-group-removed':
            return { name: exports.EVENT_THREAD_GROUP_REMOVED, data: data };
        case 'thread-group-started':
            return { name: exports.EVENT_THREAD_GROUP_STARTED, data: data };
        case 'thread-group-exited':
            var groupExitedEvent = {
                id: data.id,
                exitCode: data['exit-code']
            };
            return { name: exports.EVENT_THREAD_GROUP_EXITED, data: groupExitedEvent };
        case 'thread-created':
            var threadCreatedEvent = {
                id: data.id ? parseInt(data.id, 10) : undefined,
                groupId: data['group-id']
            };
            return { name: exports.EVENT_THREAD_CREATED, data: threadCreatedEvent };
        case 'thread-exited':
            var threadExitedEvent = {
                id: data.id ? parseInt(data.id, 10) : undefined,
                groupId: data['group-id']
            };
            return { name: exports.EVENT_THREAD_EXITED, data: threadExitedEvent };
        case 'thread-selected':
            var threadSelectedEvent = {
                id: data.id ? parseInt(data.id, 10) : undefined
            };
            return { name: exports.EVENT_THREAD_SELECTED, data: threadSelectedEvent };
        case 'library-loaded':
            var libLoadedEvent = {
                id: data.id,
                targetName: data['target-name'],
                hostName: data['host-name'],
                threadGroup: data['thread-group'],
                symbolsPath: data['symbols-path'],
                loadAddress: data.loaded_addr
            };
            return { name: exports.EVENT_LIB_LOADED, data: libLoadedEvent };
        case 'library-unloaded':
            var libUnloadedEvent = {
                id: data.id,
                targetName: data['target-name'],
                hostName: data['host-name'],
                threadGroup: data['thread-group'],
                symbolsPath: data['symbols-path'],
                loadAddress: data.loaded_addr
            };
            return { name: exports.EVENT_LIB_UNLOADED, data: libUnloadedEvent };
        case 'breakpoint-modified':
            return {
                name: exports.EVENT_BREAKPOINT_MODIFIED,
                data: {
                    breakpoint: extractors_1.extractBreakpointInfo(data)
                }
            };
        default:
            // TODO: log and keep on going
            return undefined;
    }
    ;
}
exports.createEventForAsyncNotification = createEventForAsyncNotification;
/**
  * Creates an object that conforms to the IFrameInfo interface from the output of the
  * MI Output parser.
  */
function extractFrameInfo(data) {
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
var targetStopReasonMap = new Map()
    .set('breakpoint-hit', types_1.TargetStopReason.BreakpointHit)
    .set('end-stepping-range', types_1.TargetStopReason.EndSteppingRange)
    .set('function-finished', types_1.TargetStopReason.FunctionFinished)
    .set('exited-normally', types_1.TargetStopReason.ExitedNormally)
    .set('exited-signalled', types_1.TargetStopReason.ExitedSignalled)
    .set('exited', types_1.TargetStopReason.Exited)
    .set('signal-received', types_1.TargetStopReason.SignalReceived)
    .set('exception-received', types_1.TargetStopReason.ExceptionReceived);
function parseTargetStopReason(reasonString) {
    var reasonCode = targetStopReasonMap.get(reasonString);
    if (reasonCode !== undefined) {
        return reasonCode;
    }
    // TODO: log and keep on running
    return types_1.TargetStopReason.Unrecognized;
}
/**
  * Parses a list of stopped threads from a GDB/MI 'stopped' async notification.
  * @return An array of thread identifiers, an empty array is used to indicate that all threads
  *         were stopped.
  */
function parseStoppedThreadsList(stoppedThreads) {
    if (stoppedThreads === 'all') {
        return [];
    }
    else {
        // FIXME: GDB/MI spec. fails to specify what the format of the list is, need to experiment
        //        to figure out what is actually produced by the debugger.
        return [parseInt(stoppedThreads, 10)];
    }
}
//# sourceMappingURL=events.js.map