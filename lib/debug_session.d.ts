import * as events from 'events';
import * as stream from 'stream';
import * as bunyan from 'bunyan';
import { IBreakpointInfo, IStackFrameInfo, IStackFrameArgsInfo, IStackFrameVariablesInfo, IWatchInfo, IWatchUpdateInfo, IWatchChildInfo, IMemoryBlock, IAsmInstruction, ISourceLineAsm, IThreadInfo, IMultiThreadInfo, VariableDetailLevel, WatchFormatSpec, WatchAttribute, RegisterValueFormatSpec } from './types';
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
export default class DebugSession extends events.EventEmitter {
    private outStream;
    private lineReader;
    private nextCmdId;
    private cmdQueue;
    private cleanupWasCalled;
    private _logger;
    logger: bunyan.Logger;
    /**
     * In most cases [[startDebugSession]] should be used to construct new instances.
     *
     * @param inStream Debugger responses and notifications will be read from this stream.
     * @param outStream Debugger commands will be written to this stream.
     */
    constructor(inStream: stream.Readable, outStream: stream.Writable);
    /**
     * Ends the debugging session.
     *
     * @param notifyDebugger If **false** the session is cleaned up immediately without waiting for
     *                       the debugger to respond (useful in cases where the debugger terminates
     *                       unexpectedly). If **true** the debugger is asked to exit, and once the
     *                       request is acknowldeged the session is cleaned up.
     */
    end(notifyDebugger?: boolean): Promise<void>;
    /**
     * Returns `true` if [[EVENT_FUNCTION_FINISHED]] can be emitted during this debugging session.
     *
     * LLDB-MI currently doesn't emit [[EVENT_FUNCTION_FINISHED]] after stepping out of a function,
     * instead it emits [[EVENT_STEP_FINISHED]] just like it does for any other stepping operation.
     */
    canEmitFunctionFinishedNotification(): boolean;
    private emitExecNotification(name, data);
    private emitAsyncNotification(name, data);
    /**
     * Parse a single line containing a response to a MI command or some sort of async notification.
     */
    private parseDebbugerOutput(line);
    /**
     * Sends an MI command to the debugger process.
     */
    private sendCommandToDebugger(command);
    /**
     * Adds an MI command to the back of the command queue.
     *
     * If the command queue is empty when this method is called then the command is dispatched
     * immediately, otherwise it will be dispatched after all the previously queued commands are
     * processed.
     */
    private enqueueCommand(command);
    /**
     * Sends an MI command to the debugger.
     *
     * @param command Full MI command string, excluding the optional token and dash prefix.
     * @param token Token to be prefixed to the command string (must consist only of digits).
     * @returns A promise that will be resolved when the command response is received.
     */
    private executeCommand(command, token?);
    /**
     * Sends an MI command to the debugger and returns the response.
     *
     * @param command Full MI command string, excluding the optional token and dash prefix.
     * @param token Token to be prefixed to the command string (must consist only of digits).
     * @param transformOutput This function will be invoked with the output of the MI Output parser
     *                        and should transform that output into an instance of type `T`.
     * @returns A promise that will be resolved when the command response is received.
     */
    private getCommandOutput<T>(command, token?, transformOutput?);
    /**
     * Sets the executable file to be debugged, the symbol table will also be read from this file.
     *
     * This must be called prior to [[connectToRemoteTarget]] when setting up a remote debugging
     * session.
     *
     * @param file This would normally be a full path to the host's copy of the executable to be
     *             debugged.
     */
    setExecutableFile(file: string): Promise<void>;
    /**
     * Sets the terminal to be used by the next inferior that's launched.
     *
     * @param slaveName Name of the slave end of a pseudoterminal that should be associated with
     *                  the inferior, see `man pty` for an overview of pseudoterminals.
     */
    setInferiorTerminal(slaveName: string): Promise<void>;
    /**
     * Connects the debugger to a remote target.
     *
     * @param host
     * @param port
     */
    connectToRemoteTarget(host: string, port: number): Promise<void>;
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
     */
    addBreakpoint(location: string, options?: {
        isTemp?: boolean;
        isHardware?: boolean;
        isPending?: boolean;
        isDisabled?: boolean;
        isTracepoint?: boolean;
        condition?: string;
        ignoreCount?: number;
        threadId?: number;
    }): Promise<IBreakpointInfo>;
    /**
     * Removes a breakpoint.
     */
    removeBreakpoint(breakId: number): Promise<void>;
    /**
     * Removes multiple breakpoints.
     */
    removeBreakpoints(breakIds: number[]): Promise<void>;
    /**
     * Enables a breakpoint.
     */
    enableBreakpoint(breakId: number): Promise<void>;
    /**
     * Enables multiple breakpoints.
     */
    enableBreakpoints(breakIds: number[]): Promise<void>;
    /**
     * Disables a breakpoint.
     */
    disableBreakpoint(breakId: number): Promise<void>;
    /**
     * Disables multiple breakpoints.
     */
    disableBreakpoints(breakIds: number[]): Promise<void>;
    /**
     * Tells the debugger to ignore a breakpoint the next `ignoreCount` times it's hit.
     *
     * @param breakId Identifier of the breakpoint for which the ignore count should be set.
     * @param ignoreCount The number of times the breakpoint should be hit before it takes effect,
     *                    zero means the breakpoint will stop the program every time it's hit.
     */
    ignoreBreakpoint(breakId: number, ignoreCount: number): Promise<IBreakpointInfo>;
    /**
     * Sets the condition under which a breakpoint should take effect when hit.
     *
     * @param breakId Identifier of the breakpoint for which the condition should be set.
     * @param condition Expression to evaluate when the breakpoint is hit, if it evaluates to
     *                  **true** the breakpoint will stop the program, otherwise the breakpoint
     *                  will have no effect.
     */
    setBreakpointCondition(breakId: number, condition: string): Promise<void>;
    /**
     * Sets the commandline arguments to be passed to the inferior next time it is started
     * using [[startInferior]].
     */
    setInferiorArguments(args: string): Promise<void>;
    /**
     * Executes an inferior from the beginning until it exits.
     *
     * Execution may stop before the inferior finishes running due to a number of reasons,
     * for example a breakpoint being hit.
     * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
     *
     * @param options.threadGroup *(GDB specific)* The identifier of the thread group to start,
     *                            if omitted the currently selected inferior will be started.
     * @param options.stopAtStart *(GDB specific)* If `true` then execution will stop at the start
     *                            of the main function.
     */
    startInferior(options?: {
        threadGroup?: string;
        stopAtStart?: boolean;
    }): Promise<void>;
    /**
     * Executes all inferiors from the beginning until they exit.
     *
     * Execution may stop before an inferior finishes running due to a number of reasons,
     * for example a breakpoint being hit.
     * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
     *
     * @param stopAtStart *(GDB specific)* If `true` then execution will stop at the start
     *                    of the main function.
     */
    startAllInferiors(stopAtStart?: boolean): Promise<void>;
    /**
     * Kills the currently selected inferior.
     */
    abortInferior(): Promise<void>;
    /**
     * Resumes execution of an inferior, execution may stop at any time due to a number of reasons,
     * for example a breakpoint being hit.
     * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
     *
     * @param options.threadGroup *(GDB specific)* Identifier of the thread group to resume,
     *                            if omitted the currently selected inferior is resumed.
     * @param options.reverse *(GDB specific)* If **true** the inferior is executed in reverse.
     */
    resumeInferior(options?: {
        threadGroup?: string;
        reverse?: boolean;
    }): Promise<void>;
    /**
     * Resumes execution of all inferiors.
     *
     * @param reverse *(GDB specific)* If `true` the inferiors are executed in reverse.
     */
    resumeAllInferiors(reverse?: boolean): Promise<void>;
    /**
     * Interrupts execution of an inferior.
     * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
     *
     * @param options.threadGroup The identifier of the thread group to interrupt, if omitted the
     *                            currently selected inferior will be interrupted.
     */
    interruptInferior(threadGroup?: string): Promise<void>;
    /**
     * Interrupts execution of all threads in all inferiors.
     *
     * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
     */
    interruptAllInferiors(): Promise<void>;
    /**
     * Resumes execution of the target until the beginning of the next source line is reached.
     * If a function is called while the target is running then execution stops on the first
     * source line of the called function.
     * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
     *
     * @param options.threadId Identifier of the thread to execute the command on.
     * @param options.reverse *(GDB specific)* If **true** the target is executed in reverse.
     */
    stepIntoLine(options?: {
        threadId?: number;
        reverse?: boolean;
    }): Promise<void>;
    /**
     * Resumes execution of the target until the beginning of the next source line is reached.
     * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
     *
     * @param options.threadId Identifier of the thread to execute the command on.
     * @param options.reverse *(GDB specific)* If **true** the target is executed in reverse until
     *                        the beginning of the previous source line is reached.
     */
    stepOverLine(options?: {
        threadId?: number;
        reverse?: boolean;
    }): Promise<void>;
    /**
     * Executes one instruction, if the instruction is a function call then execution stops at the
     * beginning of the function.
     * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
     *
     * @param options.threadId Identifier of the thread to execute the command on.
     * @param options.reverse *(GDB specific)* If **true** the target is executed in reverse until
     *                        the previous instruction is reached.
     */
    stepIntoInstruction(options?: {
        threadId?: number;
        reverse?: boolean;
    }): Promise<void>;
    /**
     * Executes one instruction, if the instruction is a function call then execution continues
     * until the function returns.
     * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
     *
     * @param options.threadId Identifier of the thread to execute the command on.
     * @param options.reverse *(GDB specific)* If **true** the target is executed in reverse until
     *                        the previous instruction is reached.
     */
    stepOverInstruction(options?: {
        threadId?: number;
        reverse?: boolean;
    }): Promise<void>;
    /**
     * Resumes execution of the target until the current function returns.
     * [[EVENT_TARGET_STOPPED]] will be emitted when execution stops.
     *
     * @param options.threadId Identifier of the thread to execute the command on.
     * @param options.reverse *(GDB specific)* If **true** the target is executed in reverse.
     */
    stepOut(options?: {
        threadId?: number;
        reverse?: boolean;
    }): Promise<void>;
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
    getStackFrame(options?: {
        threadId?: number;
        frameLevel?: number;
    }): Promise<IStackFrameInfo>;
    /**
     * Retrieves the current depth of the stack.
     *
     * @param options.threadId The thread for which the stack depth should be retrieved,
     *                         defaults to the currently selected thread if not specified.
     * @param options.maxDepth *(GDB specific)* If specified the returned stack depth will not exceed
     *                         this number.
     */
    getStackDepth(options?: {
        threadId?: number;
        maxDepth?: number;
    }): Promise<number>;
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
    getStackFrames(options?: {
        threadId?: number;
        lowFrame?: number;
        highFrame?: number;
        noFrameFilters?: boolean;
    }): Promise<IStackFrameInfo[]>;
    /**
     * Retrieves a list of all the arguments for the specified frames.
     *
     * The `lowFrame` and `highFrame` options can be used to limit the frames for which arguments
     * are retrieved. If both are supplied only the frames with levels in that range (inclusive) are
     * taken into account, if both are omitted the arguments of all frames currently on the stack
     * will be retrieved.
     *
     * Note that while it's possible to specify a frame range of one frame in order to retrieve the
     * arguments of a single frame it's better to just use [[getStackFrameVariables]] instead.
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
    getStackFrameArgs(detail: VariableDetailLevel, options?: {
        threadId?: number;
        noFrameFilters?: boolean;
        skipUnavailable?: boolean;
        lowFrame?: number;
        highFrame?: number;
    }): Promise<IStackFrameArgsInfo[]>;
    /**
     * Retrieves a list of all arguments and local variables in the specified frame.
     *
     * @param detail Specifies what information to retrieve for each argument or local variable.
     * @param options.threadId The thread for which variables should be retrieved,
     *                         defaults to the currently selected thread if not specified.
     * @param options.frameLevel Stack index of the frame for which to retrieve locals,
     *                           zero for the innermost frame, one for the frame from which the call
     *                           to the innermost frame originated, etc. Defaults to the currently
     *                           selected frame if not specified.
     * @param options.noFrameFilters *(GDB specific)* If `true` then Python frame filters will not be
     *                               executed.
     * @param options.skipUnavailable If `true` information about variables that are not available
     *                                will not be retrieved.
     */
    getStackFrameVariables(detail: VariableDetailLevel, options?: {
        threadId?: number;
        frameLevel: number;
        noFrameFilters?: boolean;
        skipUnavailable?: boolean;
    }): Promise<IStackFrameVariablesInfo>;
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
    addWatch(expression: string, options?: {
        id?: string;
        threadId?: number;
        threadGroup?: string;
        frameLevel?: number;
        frameAddress?: string;
        isFloating?: boolean;
    }): Promise<IWatchInfo>;
    /**
     * Destroys a previously created watch.
     *
     * @param id Identifier of the watch to destroy.
     */
    removeWatch(id: string): Promise<void>;
    /**
     * Updates the state of an existing watch.
     *
     * @param id Identifier of the watch to update.
     */
    updateWatch(id: string, detail?: VariableDetailLevel): Promise<IWatchUpdateInfo[]>;
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
    getWatchChildren(id: string, options?: {
        detail?: VariableDetailLevel;
        from?: number;
        to?: number;
    }): Promise<IWatchChildInfo[]>;
    /**
     * Sets the output format for the value of a watch.
     *
     * @param id Identifier of the watch for which the format specifier should be set.
     * @param formatSpec The output format for the watch value.
     * @returns A promise that will be resolved with the value of the watch formatted using the
     *          provided `formatSpec`.
     */
    setWatchValueFormat(id: string, formatSpec: WatchFormatSpec): Promise<string>;
    /**
     * Evaluates the watch expression and returns the result.
     *
     * @param id Identifier of the watch whose value should be retrieved.
     * @param formatSpec The output format for the watch value.
     * @returns A promise that will be resolved with the value of the watch.
     */
    getWatchValue(id: string, formatSpec?: WatchFormatSpec): Promise<string>;
    /**
     * Sets the value of the watch expression to the value of the given expression.
     *
     * @param id Identifier of the watch whose value should be modified.
     * @param expression The value of this expression will be assigned to the watch expression.
     * @returns A promise that will be resolved with the new value of the watch.
     */
    setWatchValue(id: string, expression: string): Promise<string>;
    /**
     * Retrives a list of attributes for the given watch.
     *
     * @param id Identifier of the watch whose attributes should be retrieved.
     * @returns A promise that will be resolved with the list of watch attributes.
     */
    getWatchAttributes(id: string): Promise<WatchAttribute[]>;
    /**
     * Retrieves an expression that can be evaluated in the current context to obtain the watch value.
     *
     * @param id Identifier of the watch whose path expression should be retrieved.
     * @returns A promise that will be resolved with the path expression of the watch.
     */
    getWatchExpression(id: string): Promise<string>;
    /**
     * Evaluates the given expression within the target process and returns the result.
     *
     * The expression may contain function calls, which will be executed synchronously.
     *
     * @param expression The expression to evaluate.
     * @param options.threadId The thread within which the expression should be evaluated.
     *                         *Default*: the currently selected thread.
     * @param options.frameLevel The index of the stack frame within which the expression should
     *                           be evaluated, zero for the innermost stack frame. Note that
     *                           if `frameLevel` is specified then `threadId` must also be specified.
     *                           *Default*: the currently selected frame.
     * @returns A promise that will be resolved with the value of the expression.
     */
    evaluateExpression(expression: string, options?: {
        threadId?: number;
        frameLevel?: number;
    }): Promise<string>;
    /**
     * Attempts to read all accessible memory regions in the given range.
     *
     * @param address Start of the range from which memory should be read, this can be a literal
     *                address (e.g. `0x00007fffffffed30`) or an expression (e.g. `&someBuffer`) that
     *                evaluates to the desired address.
     * @param numBytesToRead Number of bytes that should be read.
     * @param options.byteOffset Offset in bytes relative to `address` from which to begin reading.
     * @returns A promise that will be resolved with a list of memory blocks that were read.
     */
    readMemory(address: string, numBytesToRead: number, options?: {
        byteOffset?: number;
    }): Promise<IMemoryBlock[]>;
    /**
     * Retrieves a list of register names for the current target.
     *
     * @param registers List of numbers corresponding to the register names to be retrieved.
     *                  If this argument is omitted all register names will be retrieved.
     * @returns A promise that will be resolved with a list of register names.
     */
    getRegisterNames(registers?: number[]): Promise<string[]>;
    /**
     * Retrieves the values of registers.
     *
     * @param formatSpec Specifies how the register values should be formatted.
     * @param options.registers Register numbers of the registers for which values should be retrieved.
     *                          If this option is omitted the values of all registers will be retrieved.
     * @param options.skipUnavailable *(GDB specific)* If `true` only values of available registers
     *                                will be retrieved.
     * @param options.threadId Identifier of the thread from which register values should be retrieved.
     *                         If this option is omitted it will default to the currently selected thread.
     *                         NOTE: This option is not currently supported by LLDB-MI.
     * @param options.frameLevel Index of the frame from which register values should be retrieved.
     *                           This is a zero-based index, zero corresponds to the innermost frame
     *                           on the stack. If this option is omitted it will default to the
     *                           currently selected frame.
     *                           NOTE: This option is not currently supported by LLDB-MI.
     * @returns A promise that will be resolved with a map of register numbers to register values.
     */
    getRegisterValues(formatSpec: RegisterValueFormatSpec, options?: {
        registers?: number[];
        skipUnavailable?: boolean;
        threadId?: number;
        frameLevel?: number;
    }): Promise<Map<number, string>>;
    /**
     * Retrieves assembly instructions within the specified address range.
     *
     * No source line information will be provided for the assembly instructions that are retrieved,
     * if such information is required [[disassembleAddressRangeByLine]] should be used instead.
     *
     * @param start Start of the address range to disassemble. GDB allows this to be an expression
     *              that can be evaluated to obtain the address (e.g. $pc), however LLDB-MI only
     *              accepts number literals (e.g. 0x4009cc).
     * @param end End of the address range to disassemble, same caveats apply as for `start`.
     * @param showOpcodes If `true` the raw opcode bytes will be retrieved for each instruction.
     * @returns A promise that will be resolved with a list of assembly instructions (and associated
     *          meta-data).
     */
    disassembleAddressRange(start: string, end: string, showOpcodes?: boolean): Promise<IAsmInstruction[]>;
    /**
     * Retrieves assembly instructions within a specified address range grouped by source line.
     *
     * If source line information is not required [[disassembleAddressRange]] should be used instead.
     *
     * @param start Start of the address range to disassemble. GDB allows this to be an expression
     *              that can be evaluated to obtain the address (e.g. $pc), however LLDB-MI only
     *              accepts number literals (e.g. 0x4009cc).
     * @param end End of the address range to disassemble, same caveats apply as for `start`.
     * @param showOpcodes If `true` the raw opcode bytes will be retrieved for each instruction.
     * @returns A promise that will be resolved with a list lines, each of which will contain one
     *          or more assembly instructions (and associated meta-data).
     */
    disassembleAddressRangeByLine(start: string, end: string, showOpcodes?: boolean): Promise<ISourceLineAsm[]>;
    /**
     * Retrieves assembly instructions for the specified source file.
     *
     * No source line information will be provided for the assembly instructions that are retrieved,
     * if such information is required [[disassembleFileByLine]] should be used instead.
     *
     * @param filename Source file to disassemble, e.g. main.cpp
     * @param line Line number in `filename` to disassemble around.
     * @param options.maxInstructions Maximum number of assembly instructions to retrieve.
     *                                If this option is ommitted the entire function at the specified
     *                                source line will be disassembled.
     * @param options.showOpcodes If `true` the raw opcode bytes will be retrieved for each instruction.
     * @returns A promise that will be resolved with a list of assembly instructions (and associated
     *          meta-data).
     */
    disassembleFile(filename: string, line: number, options?: {
        maxInstructions?: number;
        showOpcodes?: boolean;
    }): Promise<IAsmInstruction[]>;
    /**
     * Retrieves assembly instructions for the specified source file grouped by source line.
     *
     * If source line information is not required [[disassembleFile]] should be used instead.
     *
     * @param filename Source file to disassemble, e.g. main.cpp
     * @param line Line number in `filename` to disassemble around.
     * @param options.maxInstructions Maximum number of assembly instructions to retrieve.
     *                                If this option is ommitted the entire function at the specified
     *                                source line will be disassembled.
     * @param options.showOpcodes If `true` the raw opcode bytes will be retrieved for each instruction.
     * @returns A promise that will be resolved with a list lines, each of which will contain one
     *          or more assembly instructions (and associated meta-data).
     */
    disassembleFileByLine(filename: string, line: number, options?: {
        maxInstructions?: number;
        showOpcodes?: boolean;
    }): Promise<ISourceLineAsm[]>;
    /**
     * Gets information about a thread in an inferior.
     * @returns A promise that will be resolved with information about a thread.
     */
    getThread(threadId: number): Promise<IThreadInfo>;
    /**
     * Gets information about all threads in all inferiors.
     * @returns A promise that will be resolved with information about all threads.
     */
    getThreads(): Promise<IMultiThreadInfo>;
}
