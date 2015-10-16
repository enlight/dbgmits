// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.
function extractBreakpointLocationInfo(data) {
    return {
        id: data['number'],
        isEnabled: (data.enabled !== undefined) ? (data.enabled === 'y') : undefined,
        address: data.addr,
        func: data.func,
        filename: data.file || data.filename,
        fullname: data.fullname,
        line: parseInt(data.line, 10),
        at: data.at
    };
}
/**
 * Converts the output produced by the MI Output parser from the response to the
 * -break-insert and -break-after MI commands into a more useful form.
 */
function extractBreakpointInfo(data) {
    var breakpoint;
    var locations;
    if (Array.isArray(data.bkpt)) {
        breakpoint = data.bkpt[0];
        locations = [];
        for (var i = 1; i < data.bkpt.length; ++i) {
            locations.push(extractBreakpointLocationInfo(data.bkpt[i]));
        }
    }
    else {
        breakpoint = data.bkpt;
        locations = (breakpoint.addr === '<PENDING>') ? [] : [extractBreakpointLocationInfo(data.bkpt)];
    }
    return {
        id: parseInt(breakpoint['number'], 10),
        breakpointType: breakpoint['type'],
        catchpointType: breakpoint['catch-type'],
        isTemp: (breakpoint.disp !== undefined) ? (breakpoint.disp === 'del') : undefined,
        isEnabled: (breakpoint.enabled !== undefined) ? (breakpoint.enabled === 'y') : undefined,
        locations: locations,
        pending: breakpoint.pending,
        evaluatedBy: breakpoint['evaluated-by'],
        threadId: parseInt(breakpoint.thread, 10),
        condition: breakpoint.cond,
        ignoreCount: parseInt(breakpoint.ignore, 10),
        enableCount: parseInt(breakpoint.enable, 10),
        mask: breakpoint.mask,
        passCount: parseInt(breakpoint.pass, 10),
        originalLocation: breakpoint['original-location'],
        hitCount: parseInt(breakpoint.times, 10),
        isInstalled: (breakpoint.installed !== undefined) ? (breakpoint.installed === 'y') : undefined,
        what: breakpoint.what
    };
}
exports.extractBreakpointInfo = extractBreakpointInfo;
/**
 * Creates an object that conforms to the IStackFrameInfo interface from the output of the
 * MI Output parser.
 */
function extractStackFrameInfo(data) {
    return {
        level: parseInt(data.level, 10),
        func: data.func,
        address: data.addr,
        filename: data.file,
        fullname: data.fullname,
        line: data.line ? parseInt(data.line, 10) : undefined,
        from: data.from
    };
}
exports.extractStackFrameInfo = extractStackFrameInfo;
/**
 * Converts the output produced by the MI Output parser from the response to the
 * -var-list-children MI command into an array of objects that conform to the IWatchChildInfo
 * interface.
 */
function extractWatchChildren(data) {
    var extractWatchChild = function (data) {
        return {
            id: data.name,
            childCount: parseInt(data.numchild, 10),
            value: data.value,
            expressionType: data['type'],
            threadId: parseInt(data['thread-id'], 10),
            hasMoreChildren: data.has_more !== '0',
            isDynamic: data.dynamic === '1',
            displayHint: data.displayhint,
            expression: data.exp,
            isFrozen: data.frozen === '1'
        };
    };
    if ((data === undefined) || Array.isArray(data)) {
        // data will only be an array if the array is empty
        return [];
    }
    else if (Array.isArray(data.child)) {
        // data is in the form: { child: [{ name: var1.child1, ... }, { name: var1.child2, ... }, ...]
        return data.child.map(function (child) { return extractWatchChild(child); });
    }
    else {
        // data is in the form: { child: { name: var1.child1, ... } }
        return [extractWatchChild(data.child)];
    }
}
exports.extractWatchChildren = extractWatchChildren;
/**
 * Converts the output produced by the MI Output parser from the response to the
 * -data-disassemble MI command into an array of objects that conform to the IAsmInstruction
 * interface.
 */
function extractAsmInstructions(data) {
    return data.map(function (asmInstruction) {
        return {
            address: asmInstruction.address,
            func: asmInstruction['func-name'],
            offset: parseInt(asmInstruction.offset, 10),
            inst: asmInstruction.inst,
            opcodes: asmInstruction.opcodes,
            size: parseInt(asmInstruction.size, 10)
        };
    });
}
exports.extractAsmInstructions = extractAsmInstructions;
/**
 * Converts the output produced by the MI Output parser from the response to the
 * -data-disassemble MI command into an array of objects that conform to the ISourceLineAsm
 * interface.
 */
function extractAsmBySourceLine(data) {
    var extractSrcAsmLine = function (data) {
        return {
            line: parseInt(data.line, 10),
            file: data.file,
            fullname: data.fullname,
            instructions: extractAsmInstructions(data.line_asm_insn)
        };
    };
    if ((data === undefined) || Array.isArray(data)) {
        // data will only be an array if the array is empty
        return [];
    }
    else if (Array.isArray(data.src_and_asm_line)) {
        // data is in the form:  { src_and_asm_line: [{ line: "45", ... }, { line: "46", ... }, ...] }
        return data.src_and_asm_line.map(extractSrcAsmLine);
    }
    else {
        // data is in the form: { src_and_asm_line: { line: "45", ... } }
        return [extractSrcAsmLine(data.src_and_asm_line)];
    }
}
exports.extractAsmBySourceLine = extractAsmBySourceLine;
/**
 * Creates an object that conforms to the IThreadFrameInfo interface from the output of the
 * MI Output parser.
 */
function extractThreadFrameInfo(data) {
    return {
        level: parseInt(data.level, 10),
        func: data.func,
        args: data.args,
        address: data.addr,
        filename: data.file,
        fullname: data.fullname,
        line: data.line ? parseInt(data.line, 10) : undefined
    };
}
/**
 * Creates an object that conforms to the IThreadInfo interface from the output of the
 * MI Output parser.
 */
function extractThreadInfo(data) {
    return {
        id: parseInt(data.id, 10),
        targetId: data['target-id'],
        name: data.name,
        frame: extractThreadFrameInfo(data.frame),
        isStopped: (data.state === 'stopped') ? true : ((data.state === 'running') ? false : undefined),
        processorCore: data.core,
        details: data.details
    };
}
exports.extractThreadInfo = extractThreadInfo;
//# sourceMappingURL=extractors.js.map