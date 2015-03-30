// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

// NOTE: This is an external module in TypeScript parlance.

module MIOutput {

  /**
   * Identifiers for the various types of objects produced by the MI Output parser.
   */
  export enum ParseOutputType {
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
