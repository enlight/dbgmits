import { IBreakpointInfo, IStackFrameInfo, IWatchChildInfo, IAsmInstruction, ISourceLineAsm, IThreadInfo } from './types';
/**
 * Converts the output produced by the MI Output parser from the response to the
 * -break-insert and -break-after MI commands into a more useful form.
 */
export declare function extractBreakpointInfo(data: any): IBreakpointInfo;
/**
 * Creates an object that conforms to the IStackFrameInfo interface from the output of the
 * MI Output parser.
 */
export declare function extractStackFrameInfo(data: any): IStackFrameInfo;
/**
 * Converts the output produced by the MI Output parser from the response to the
 * -var-list-children MI command into an array of objects that conform to the IWatchChildInfo
 * interface.
 */
export declare function extractWatchChildren(data: any | any[]): IWatchChildInfo[];
/**
 * Converts the output produced by the MI Output parser from the response to the
 * -data-disassemble MI command into an array of objects that conform to the IAsmInstruction
 * interface.
 */
export declare function extractAsmInstructions(data: any[]): IAsmInstruction[];
/**
 * Converts the output produced by the MI Output parser from the response to the
 * -data-disassemble MI command into an array of objects that conform to the ISourceLineAsm
 * interface.
 */
export declare function extractAsmBySourceLine(data: any | any[]): ISourceLineAsm[];
/**
 * Creates an object that conforms to the IThreadInfo interface from the output of the
 * MI Output parser.
 */
export declare function extractThreadInfo(data: any): IThreadInfo;
