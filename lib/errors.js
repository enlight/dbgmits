// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.
/**
 * Used to indicate failure of a MI command sent to the debugger.
 */
var CommandFailedError = (function () {
    function CommandFailedError(message, command, code, token) {
        this.name = "CommandFailedError";
        this.message = message;
        this.code = code;
        this.command = command;
        this.token = token;
    }
    return CommandFailedError;
})();
exports.CommandFailedError = CommandFailedError;
/**
 * Used to indicate the response to an MI command didn't match the expected format.
 */
var MalformedResponseError = (function () {
    /**
     * @param message The description of the error.
     * @param response The malformed response text (usually just the relevant part).
     * @param command The command text that was sent to the debugger (minus token and dash prefix).
     * @param token Token of the command (if the command had one).
     */
    function MalformedResponseError(message, response, command, token) {
        this.message = message;
        this.response = response;
        this.command = command;
        this.token = token;
        this.name = "MalformedResponseError";
    }
    return MalformedResponseError;
})();
exports.MalformedResponseError = MalformedResponseError;
//# sourceMappingURL=errors.js.map