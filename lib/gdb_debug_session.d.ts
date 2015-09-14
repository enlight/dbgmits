import DebugSession from './debug_session';
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
export default class GDBDebugSession extends DebugSession {
    /** `true` if this is a remote debugging session. */
    private isRemote;
    /** Pseudo-terminal used in a local debugging session, not available if [[isRemote]] is `false`. */
    private terminal;
    end(notifyDebugger?: boolean): Promise<void>;
    canEmitFunctionFinishedNotification(): boolean;
    connectToRemoteTarget(host: string, port: number): Promise<void>;
    startInferior(options?: {
        threadGroup?: string;
        stopAtStart?: boolean;
    }): Promise<void>;
}
