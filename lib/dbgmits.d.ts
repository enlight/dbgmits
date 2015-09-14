import DebugSession from './debug_session';
/**
 * Starts a new debugging session and spawns the debbuger process.
 *
 * Once the debug session has outlived its usefulness call [[DebugSession.end]] to ensure proper
 * cleanup.
 *
 * @returns A new debug session, or null if a new session couldn't be started.
 */
export declare function startDebugSession(debuggerName: string): DebugSession;
