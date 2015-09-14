declare module MIOutput {
    /**
     * Identifiers for the various types of output records sent by the debugger MI.
     */
    enum RecordType {
        /**
         * Indicates the previously requested synchronous operation was successful.
         */
        Done = 0,
        /**
         * Equivalent to Done.
         */
        Running = 1,
        /**
         * Indicates the debugger has connected to a remote target.
         */
        Connected = 2,
        /**
         * Indicates the previously requested operation failed.
         */
        Error = 3,
        /**
         * Indicates the debugger has terminated.
         */
        Exit = 4,
        /**
         * Indicates an asynchronous state change on the target (e.g. stopped, started, disappeared).
         */
        AsyncExec = 5,
        /**
         * On-going status information about the progress of a slow operation.
         */
        AsyncStatus = 6,
        /**
         * Information that the client should handle (e.g. new breakpoint information).
         */
        AsyncNotify = 7,
        /**
         * Textual response to a CLI command.
         */
        DebuggerConsoleOutput = 8,
        /**
         * Textual output from a running target.
         */
        TargetOutput = 9,
        /**
         * Textual output from the debugger's internals.
         */
        DebuggerLogOutput = 10,
    }
    function getAsyncRecordType(char: string): RecordType;
    /**
     * Converts an array of key-value objects into a single object where each key is a property,
     * if a key appears in the input array multiple times the corresponding property in the
     * returned object will be an array of values.
     */
    function createObjFromResultList(resultList: Array<{
        name: string;
        value: string;
    }>): any;
}
export = MIOutput;
