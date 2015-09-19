// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.
var debug_session_1 = require('./debug_session');
var gdb_debug_session_1 = require('./gdb_debug_session');
var child_process_1 = require('child_process');
var os = require('os');
var path = require('path');
function setProcessEnvironment() {
    // HACK for LLDB on Windows (where users have to build their own Python)
    if (os.platform() === 'win32') {
        if (process.env['LLDB_PYTHON_SRC'] === undefined) {
            throw new Error('LLDB_PYTHON_SRC environment variable is not set. It must be set to the source directory ' +
                'of the Python version used in the LLDB build.');
        }
        if (process.env['LLVM_SRC_BUILD'] === undefined) {
            throw new Error('LLVM_SRC_BUILD environment variable is not set. It must be set to the LLVM build output ' +
                'directory.');
        }
        process.env['PATH'] =
            process.env['PATH'] + ';' + path.join(process.env['LLDB_PYTHON_SRC'], 'PCbuild');
        var pythonPath = path.join(process.env['LLDB_PYTHON_SRC'], 'Lib') + ';' +
            path.join(process.env['LLVM_SRC_BUILD'], 'lib\\site-packages');
        if (process.env['PYTHONPATH']) {
            process.env['PYTHONPATH'] = process.env['PYTHONPATH'] + ';' + pythonPath;
        }
        else {
            process.env['PYTHONPATH'] = pythonPath;
        }
    }
}
(function (DebuggerType) {
    DebuggerType[DebuggerType["LLDB"] = 0] = "LLDB";
    DebuggerType[DebuggerType["GDB"] = 1] = "GDB";
})(exports.DebuggerType || (exports.DebuggerType = {}));
var DebuggerType = exports.DebuggerType;
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
function startDebugSession(debuggerType, debuggerFilename) {
    var debuggerArgs;
    switch (debuggerType) {
        case DebuggerType.LLDB:
            setProcessEnvironment();
            if (!debuggerFilename) {
                // lldb-mi.exe should be on the PATH
                debuggerFilename = 'lldb-mi';
            }
            debuggerArgs = ['--interpreter'];
            break;
        case DebuggerType.GDB:
            if (!debuggerFilename) {
                debuggerFilename = 'gdb';
            }
            debuggerArgs = ['--interpreter', 'mi'];
            break;
        default:
            throw new Error('Unknown debugger type!');
    }
    var debuggerProcess = child_process_1.spawn(debuggerFilename, debuggerArgs);
    var debugSession = null;
    if (debuggerProcess) {
        if (debuggerType === DebuggerType.GDB) {
            debugSession = new gdb_debug_session_1.default(debuggerProcess.stdout, debuggerProcess.stdin);
        }
        else {
            debugSession = new debug_session_1.default(debuggerProcess.stdout, debuggerProcess.stdin);
        }
        if (debugSession) {
            debuggerProcess.once('exit', function (code, signal) { debugSession.end(false); });
        }
    }
    return debugSession;
}
exports.startDebugSession = startDebugSession;
;
//# sourceMappingURL=dbgmits.js.map