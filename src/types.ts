// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

export enum TargetStopReason {
  /** A breakpoint was hit. */
  BreakpointHit,
  /** A step instruction finished. */
  EndSteppingRange,
  /** A step-out instruction finished. */
  FunctionFinished,
  /** The target finished executing and terminated normally. */
  ExitedNormally,
  /** The target was signalled. */
  SignalReceived,
  /** The target encountered an exception (this is LLDB specific). */
  ExceptionReceived,
  /** Catch-all for any of the other numerous reasons. */
  Unrecognized
}

/** Frame-specific information returned by breakpoint and stepping MI commands. */
export interface IFrameInfo {
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
export interface IStackFrameInfo {
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
export interface IBreakpointInfo {
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

export interface IVariableInfo {
  /** Variable name. */
  name: string;
  /** String representation of the value of the variable. */
  value?: string;
  /** Type of the variable. */
  type?: string;
}

/** Contains information about the arguments of a stack frame. */
export interface IStackFrameArgsInfo {
  /** Index of the frame on the stack, zero for the innermost frame. */
  level: number;
  /** List of arguments for the frame. */
  args: IVariableInfo[];
}

/** Contains information about the arguments and locals of a stack frame. */
export interface IStackFrameVariablesInfo {
  args: IVariableInfo[];
  locals: IVariableInfo[];
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

/** A watch may have one or more of these attributes associated with it. */
export enum WatchAttribute {
  /** Indicates the watch value can be modified. */
  Editable,
  /** 
    * Indicates the watch value can't be modified. This will be the case for any watch with 
    * children (at least when implemented correctly by the debugger, *cough* not LLDB-MI *cough*).
    */
  NonEditable
}

/** Contains the contents of a block of memory from the target process. */
export interface IMemoryBlock {
  /** Start address of the memory block (hex literal). */
  begin: string;
  /** End address of the memory block (hex literal). */
  end: string;
  /** 
    * Offset of the memory block (in bytes, as a hex literal) from the start address passed into
    * [[DebugSession.readMemory]].
    */
  offset: string;
  /** Contents of the memory block in hexadecimal. */
  contents: string;
}

/** Contains information about an ASM instruction. */
export interface IAsmInstruction {
  /** Address at which this instruction was disassembled. */
  address: string;
  /** Name of the function this instruction came from. */
  func: string;
  /** Offset of this instruction from the start of `func` (as a decimal). */
  offset: number;
  /** Text disassembly of this instruction. */
  inst: string;
  /** 
    * Raw opcode bytes for this instruction.
    * NOTE: This field is currently not filled in by LLDB-MI.
    */
  opcodes?: string;
  /**
    * Size of the raw opcode in bytes.
    * NOTE: This field is an LLDB-MI specific extension.
    */
  size?: number;
}

/** Contains ASM instructions for a single source line. */
export interface ISourceLineAsm {
  /** Source filename from the compilation unit, may be absolute or relative. */
  file: string;
  /** 
    * Absolute filename of `file` (with all symbolic links resolved).
    * If the source file can't be found this field will populated from the debug information.
    * NOTE: This field is currently not filled in by LLDB-MI.
    */
  fullname: string;
  /** Source line number in `file`. */
  line: number;
  /** ASM instructions corresponding to `line` in `file`. */
  instructions: IAsmInstruction[];
}

/** Output format specifiers for register values. */
export enum RegisterValueFormatSpec {
  Binary,
  Decimal,
  Hexadecimal,
  Octal,
  Raw,
  /** 
    * This specifier is used to indicate that one of the other ones should be automatically chosen.
    */
  Default
}
