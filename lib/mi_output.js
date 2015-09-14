// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.
// NOTE: This is an external module in TypeScript parlance.
var MIOutput;
(function (MIOutput) {
    /**
     * Identifiers for the various types of output records sent by the debugger MI.
     */
    (function (RecordType) {
        /**
         * Indicates the previously requested synchronous operation was successful.
         */
        RecordType[RecordType["Done"] = 0] = "Done";
        /**
         * Equivalent to Done.
         */
        RecordType[RecordType["Running"] = 1] = "Running";
        /**
         * Indicates the debugger has connected to a remote target.
         */
        RecordType[RecordType["Connected"] = 2] = "Connected";
        /**
         * Indicates the previously requested operation failed.
         */
        RecordType[RecordType["Error"] = 3] = "Error";
        /**
         * Indicates the debugger has terminated.
         */
        RecordType[RecordType["Exit"] = 4] = "Exit";
        /**
         * Indicates an asynchronous state change on the target (e.g. stopped, started, disappeared).
         */
        RecordType[RecordType["AsyncExec"] = 5] = "AsyncExec";
        /**
         * On-going status information about the progress of a slow operation.
         */
        RecordType[RecordType["AsyncStatus"] = 6] = "AsyncStatus";
        /**
         * Information that the client should handle (e.g. new breakpoint information).
         */
        RecordType[RecordType["AsyncNotify"] = 7] = "AsyncNotify";
        /**
         * Textual response to a CLI command.
         */
        RecordType[RecordType["DebuggerConsoleOutput"] = 8] = "DebuggerConsoleOutput";
        /**
         * Textual output from a running target.
         */
        RecordType[RecordType["TargetOutput"] = 9] = "TargetOutput";
        /**
         * Textual output from the debugger's internals.
         */
        RecordType[RecordType["DebuggerLogOutput"] = 10] = "DebuggerLogOutput";
    })(MIOutput.RecordType || (MIOutput.RecordType = {}));
    var RecordType = MIOutput.RecordType;
    function getAsyncRecordType(char) {
        switch (char) {
            case '*':
                return RecordType.AsyncExec;
            case '+':
                return RecordType.AsyncStatus;
            case '=':
                return RecordType.AsyncNotify;
        }
    }
    MIOutput.getAsyncRecordType = getAsyncRecordType;
    /**
     * Converts an array of key-value objects into a single object where each key is a property,
     * if a key appears in the input array multiple times the corresponding property in the
     * returned object will be an array of values.
     */
    function createObjFromResultList(resultList) {
        var dict = {};
        if (resultList) {
            resultList.forEach(function (result) {
                var prevValue = dict[result.name];
                if (prevValue === undefined) {
                    dict[result.name] = result.value;
                }
                else if (Array.isArray(prevValue)) {
                    dict[result.name].push(result.value);
                }
                else {
                    // a property with this name already exists, so convert it to an array
                    dict[result.name] = [prevValue, result.value];
                }
            });
        }
        return dict;
    }
    MIOutput.createObjFromResultList = createObjFromResultList;
})(MIOutput || (MIOutput = {})); // module MIOutput
module.exports = MIOutput;
//# sourceMappingURL=mi_output.js.map