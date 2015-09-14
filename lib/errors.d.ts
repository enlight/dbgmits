/**
 * Used to indicate failure of a MI command sent to the debugger.
 */
export declare class CommandFailedError implements Error {
    /** The name of this error class. */
    name: string;
    /** The error message sent back by the debugger. */
    message: string;
    /** Optional error code sent by the debugger. */
    code: string;
    /** The command text that was sent to the debugger (minus token and dash prefix). */
    command: string;
    /** Optional token for the failed command (if the command had one). */
    token: string;
    constructor(message: string, command: string, code?: string, token?: string);
}
/**
 * Used to indicate the response to an MI command didn't match the expected format.
 */
export declare class MalformedResponseError implements Error {
    message: string;
    response: string;
    command: string;
    token: string;
    /** The name of this error class. */
    name: string;
    /**
     * @param message The description of the error.
     * @param response The malformed response text (usually just the relevant part).
     * @param command The command text that was sent to the debugger (minus token and dash prefix).
     * @param token Token of the command (if the command had one).
     */
    constructor(message: string, response: string, command?: string, token?: string);
}
