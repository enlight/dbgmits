// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

// NOTE: This is an external module in TypeScript parlance.

module MIOutput {

  /**
   * Identifiers for the various types of output records sent by the debugger MI.
   */
  export enum RecordType {
    /**
     * Indicates the previously requested synchronous operation was successful.
     */
    Done,
    /**
     * Equivalent to Done.
     */
    Running,
    /**
     * Indicates the debugger has connected to a remote target.
     */
    Connected,
    /**
     * Indicates the previously requested operation failed.
     */
    Error,
    /**
     * Indicates the debugger has terminated.
     */
    Exit,
    /**
     * Indicates an asynchronous state change on the target (e.g. stopped, started, disappeared).
     */
    AsyncExec,
    /**
     * On-going status information about the progress of a slow operation.
     */
    AsyncStatus,
    /**
     * Information that the client should handle (e.g. new breakpoint information).
     */
    AsyncNotify,
    /** 
     * Textual response to a CLI command.
     */
    ConsoleStream,
    /** 
     * Textual output from a running target.
     */
    TargetStream,
    /**
     * Textual output from the debugger's internals.
     */
    DebuggerStream
  }

} // module MIOutput

export = MIOutput;
