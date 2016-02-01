// Copyright (c) 2015-2016 Vadim Macagon
// MIT License, see LICENSE file for full terms.
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var debug_session_1 = require('./debug_session');
var Events = require('./events');
/**
 * Uses a pseudo-terminal to forward target stdout when doing local debugging.
 *
 * GDB only forwards stdout from the target via async notifications when remote debugging,
 * when doing local debugging it expects the front-end to read the target stdout via a
 * pseudo-terminal. This distinction between remote/local debugging seems annoying, so when
 * debugging a local target this class automatically creates a pseudo-terminal, reads the target
 * stdout, and emits the text via [[EVENT_TARGET_OUTPUT]]. In this way the front-end using this
 * library doesn't have to bother creating pseudo-terminals when debugging local targets.
 */
var GDBDebugSession = (function (_super) {
    __extends(GDBDebugSession, _super);
    function GDBDebugSession() {
        _super.apply(this, arguments);
        /** `true` if this is a remote debugging session. */
        this.isRemote = false;
    }
    GDBDebugSession.prototype.end = function (notifyDebugger) {
        var _this = this;
        if (notifyDebugger === void 0) { notifyDebugger = true; }
        return new Promise(function (resolve, reject) {
            if (_this.terminal) {
                _this.terminal.destroy();
                _this.terminal = null;
            }
            resolve();
        })
            .then(function () { return _super.prototype.end.call(_this, notifyDebugger); });
    };
    GDBDebugSession.prototype.canEmitFunctionFinishedNotification = function () {
        return true;
    };
    GDBDebugSession.prototype.connectToRemoteTarget = function (host, port) {
        var _this = this;
        return _super.prototype.connectToRemoteTarget.call(this, host, port)
            .then(function () { _this.isRemote = true; });
    };
    GDBDebugSession.prototype.startInferior = function (options) {
        var _this = this;
        if (this.isRemote) {
            return _super.prototype.startInferior.call(this, options);
        }
        else {
            return new Promise(function (resolve, reject) {
                if (_this.terminal) {
                    _this.terminal.destroy();
                    _this.terminal = null;
                }
                var ptyModule = require('pty.js');
                _this.terminal = ptyModule.open();
                _this.terminal.on('data', function (data) {
                    _this.emit(Events.EVENT_TARGET_OUTPUT, data);
                });
                resolve();
            })
                .then(function () { return _this.setInferiorTerminal(_this.terminal.pty); })
                .then(function () { return _super.prototype.startInferior.call(_this, options); });
        }
    };
    return GDBDebugSession;
})(debug_session_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GDBDebugSession;
//# sourceMappingURL=gdb_debug_session.js.map