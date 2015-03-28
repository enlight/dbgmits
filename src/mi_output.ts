// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

// NOTE: This is an external module in TypeScript parlance.

module MIOutput {

  /**
   * Identifiers for the various types of objects produced by the MI Output parser.
   */
  export enum ParseOutputType {
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

  // also export the members of ParseOutputType separately so that they can be easily used 
  // from plain old JavaScript written by humans
  export var POT_ConsoleStream = ParseOutputType.ConsoleStream;
  export var POT_TargetStream = ParseOutputType.TargetStream;
  export var POT_DebuggerStream = ParseOutputType.DebuggerStream;

} // module MIOutput

export = MIOutput;
