// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/lib/node/node.d.ts" />

import child_process = require('child_process');
import readline = require('readline');
import os = require('os');
import path = require('path');
import parser = require('./mi_output_parser');

// aliases
import spawn = child_process.spawn;
import ChildProcess = child_process.ChildProcess;
import ReadLine = readline.ReadLine;

/**
 * A debug session provides two-way communication with a debugger process via the GDB/LLDB 
 * machine interface.
 */
export class DebugSession {
  private debuggerProcess: ChildProcess;
  private lineReader: ReadLine;
  private nextCmdId: number;

  /**
   * In most cases [[startDebugSession]] should be used to construct new instances.
   *
   * @param debuggerProcess The debugger process to associate with the new debug session.
   */
  constructor(debuggerProcess: ChildProcess) {
    this.debuggerProcess = debuggerProcess;
    this.lineReader = readline.createInterface({
      input: debuggerProcess.stdout,
      output: null
    });
    this.lineReader.on('line', this.parseDebbugerOutput);
    this.nextCmdId = 1;
  }

  private parseDebbugerOutput(line: string) {
    // todo: run parser and call relevant callbacks
    var result = parser.parse(line);
  }

  /**
   * Sends a command to the debugger process.
   *
   * @returns Identifier for the command.
   */
  private sendCommandToDebugger(command: string): number {
    var cmdStr = this.nextCmdId.toString() + '-' + command;
    this.debuggerProcess.stdin.write(cmdStr + '\n');
    console.log(cmdStr);
    return ++this.nextCmdId;
  }

  /**
   * Ends the debugging session and terminates the debugger process.
   *
   * @param done Optional callback to call after the debug session is cleaned up.
   */
  end(done?: () => void) {
    if (done) {
      this.debuggerProcess.once('exit', (code: number, signal: string) => { done(); });
    }
    this.sendCommandToDebugger('gdb-exit');
    this.lineReader.close();
  }
};

function setProcessEnvironment() {
  // HACK for LLDB on Windows (where users have to build their own Python)
  if (os.platform() === 'win32') {
    if (process.env['LLDB_PYTHON_SRC'] === undefined) {
      throw new Error(
        'LLDB_PYTHON_SRC environment variable is not set. It must be set to the source directory ' +
        'of the Python version used in the LLDB build.'
      );
    }
    if (process.env['LLVM_SRC_BUILD'] === undefined) {
      throw new Error(
        'LLVM_SRC_BUILD environment variable is not set. It must be set to the LLVM build output ' +
        'directory.'
      );
    }
    process.env['PATH'] =
      process.env['PATH'] + ';' + path.join(process.env['LLDB_PYTHON_SRC'], 'PCbuild');
    var pythonPath =
      path.join(process.env['LLDB_PYTHON_SRC'], 'Lib') + ';' +
      path.join(process.env['LLVM_SRC_BUILD'], 'lib\\site-packages');

    if (process.env['PYTHONPATH']) {
      process.env['PYTHONPATH'] = process.env['PYTHONPATH'] + ';' + pythonPath;
    } else {
      process.env['PYTHONPATH'] = pythonPath;
    }
  }
}

/**
 * Starts a new debugging session and spawns the debbuger process.
 *
 * Once the debug session has outlived its usefulness call [[DebugSession.end]] to ensure proper
 * cleanup.
 *
 * @returns A new debug session.
 */
export function startDebugSession(): DebugSession {
  setProcessEnvironment();
  // lldb-mi.exe should be on the PATH
  var debuggerProcess = spawn('lldb-mi', ['--interpreter']);
  return new DebugSession(debuggerProcess);
};
