import DebugSession from './debug_session';
export declare enum DebuggerType {
    GDB = 0,
    LLDB = 1,
}
/**
 * Starts a new debugging session and spawns the debbuger process.
 *
 * Once the debug session has outlived its usefulness call [[DebugSession.end]] to ensure proper
 * cleanup.
 *
 * @param debuggerFilename Full path to debugger executable, defaults to either `lldb-mi` or `gdb`
 *                         (based on [[debuggerType]]).
 * @returns A new debug session, or null if a new session couldn't be started.
 */
export declare function startDebugSession(debuggerType: DebuggerType, debuggerFilename?: string): DebugSession;
