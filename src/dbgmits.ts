// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/lib/node/node.d.ts" />

import child_process = require('child_process');
import readline = require('readline');
import os = require('os');
import path = require('path');
import events = require('events');
import parser = require('./mi_output_parser');
import mioutput = require('./mi_output');

// aliases
import spawn = child_process.spawn;
type ChildProcess = child_process.ChildProcess;
type ReadLine = readline.ReadLine;
type ErrDataCallback = (err: Error, data: any) => void;
import RecordType = mioutput.RecordType;

class DebugCommand {
  /** 
   * Optional token that can be used to match up the command with a response, 
   * if provided it must only contain digits.
   */
  token: string;
  /** The MI command string that will be sent to debugger (minus the token and dash prefix). */
  text: string;
  /** Optional callback to invoke once a response is received for the command. */
  done: ErrDataCallback;

  /**
   * @param cmd MI command string (minus the token and dash prefix).
   * @param done Callback to invoke once a response is received for the command.
   * @param token Token that can be used to match up the command with a response.
   */
  constructor(cmd: string, done?: ErrDataCallback, token?: string) {
    this.token = token;
    this.text = cmd;
    this.done = done;
  }
}

/**
 * Used to indicate failure of a MI command sent to the debugger.
 */
export class CommandFailedError implements Error {
  /** The name of this error class. */
  name: string;
  /** The error message sent back by the debugger. */
  message: string;
  /** Optional error code sent by the debugger. */
  code: string;
  /** The command text that was sent to debugger (minus token and dash prefix). */
  command: string;
  /** Optional token for the failed command (if the command had one). */
  token: string;

  constructor(message: string, command: string, code?: string, token?: string) {
    this.name = "CommandFailedError";
    this.message = message;
    this.code = code;
    this.command = command;
    this.token = token;
  }
}

export interface ThreadGroupAddedNotify {
  id: string;
}

export interface ThreadGroupRemovedNotify {
  id: string;
}

export interface ThreadGroupStartedNotify {
  id: string;
  pid: string;
}

export interface ThreadGroupExitedNotify {
  id: string;
  exitCode: string;
}

export interface ThreadCreatedNotify {
  id: string;
  groupId: string;
}

export interface ThreadExitedNotify {
  id: string;
  groupId: string;
}

export interface ThreadSelectedNotify {
  id: string;
}

/**
 * A debug session provides two-way communication with a debugger process via the GDB/LLDB 
 * machine interface.
 *
 * Currently commands are queued and executed one at a time in the order they are issued, 
 * a command will not be executed until all the previous commands have been acknowledged by the
 * debugger.
 *
 * Out of band notifications from the debugger are emitted via events, the names of these events
 * are provided by the EVENT_XXX static constants.
 */
export class DebugSession extends events.EventEmitter {
  /**
   * @event Emitted when a thread group is added by the debugger, it's possible the thread group
   *        hasn't yet been associated with a running program.
   * 
   * Listener function should have the signature:
   * ~~~
   * (notification: [[ThreadGroupAddedNotify]]) => void
   * ~~~
   */
  static EVENT_THREAD_GROUP_ADDED: string = 'thdgrpa';
  /**
   * @event Emitted when a thread group is removed by the debugger.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[ThreadGroupRemovedNotify]]) => void
   * ~~~
   */
  static EVENT_THREAD_GROUP_REMOVED: string = 'thdgrpr';
  /**
   * @event Emitted when a thread group is associated with a running program, 
   *        either because the program was started or the debugger was attached to it.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[ThreadGroupStartedNotify]]) => void
   * ~~~
   */
  static EVENT_THREAD_GROUP_STARTED: string = 'thdgrps';
  /**
   * @event Emitted when a thread group ceases to be associated with a running program,
   *        either because the program terminated or the debugger was dettached from it.
   *
   * Listener function should have the signature: 
   * ~~~
   * (notification: [[ThreadGroupExitedNotify]]) => void
   * ~~~
   */
  static EVENT_THREAD_GROUP_EXITED: string = 'thdgrpe';
  /**
   * @event Emitted when a thread is created.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[ThreadCreatedNotify]]) => void
   * ~~~
   */
  static EVENT_THREAD_CREATED: string = 'thdc';
  /**
   * @event Emitted when a thread exits.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[ThreadExitedNotify]]) => void
   * ~~~
   */
  static EVENT_THREAD_EXITED: string = 'thde';
  /**
   * @event Emitted when the debugger changes the current thread selection.
   *
   * Listener function should have the signature:
   * ~~~
   * (notification: [[ThreadSelectedNotify]]) => void
   * ~~~
   */
  static EVENT_THREAD_SELECTED: string = 'thds';
  
  // the debugger process that commands will be sent to (either gdb or lldb-mi)
  private debuggerProcess: ChildProcess;
  // reads input from the debugger's stdout one line at a time
  private lineReader: ReadLine;
  // used to generate to auto-generate tokens for commands
  // FIXME: this is currently unused since I need to decide if tokens should be auto-generated
  // when the user doesn't supply them.
  private nextCmdId: number;
  // commands to be processed (one at a time)
  private cmdQueue: DebugCommand[];

  /**
   * In most cases [[startDebugSession]] should be used to construct new instances.
   *
   * @param debuggerProcess The debugger process to associate with the new debug session.
   */
  constructor(debuggerProcess: ChildProcess) {
    super();
    this.debuggerProcess = debuggerProcess;
    this.lineReader = readline.createInterface({
      input: debuggerProcess.stdout,
      output: null
    });
    this.lineReader.on('line', this.parseDebbugerOutput.bind(this));
    this.nextCmdId = 1;
    this.cmdQueue = [];
  }

  private emitAsyncNotification(name: string, data: any) {
    // TODO: check data is compatible with the corresponding XXXNotify class
    switch (name) {
      case 'thread-group-added':
        this.emit(DebugSession.EVENT_THREAD_GROUP_ADDED, data);
        break;

      case 'thread-group-removed':
        this.emit(DebugSession.EVENT_THREAD_GROUP_REMOVED, data);
        break;

      case 'thread-group-started':
        this.emit(DebugSession.EVENT_THREAD_GROUP_STARTED, data);
        break;

      case 'thread-group-exited':
        this.emit(DebugSession.EVENT_THREAD_GROUP_EXITED, data);
        break;

      case 'thread-created':
        this.emit(DebugSession.EVENT_THREAD_CREATED, data);
        break;

      case 'thread-exited':
        this.emit(DebugSession.EVENT_THREAD_EXITED, data);
        break;

      case 'thread-selected':
        this.emit(DebugSession.EVENT_THREAD_SELECTED, data);
        break;
    };
  }

  /**
   * Parse a single line containing a response to a MI command or some sort of async notification.
   */
  private parseDebbugerOutput(line: string): void {
    // '(gdb)' is used to indicate the end of a set of output lines from the debugger,
    // but since we process each line individually as it comes in this particular marker
    // is of no use
    if (line === '(gdb)') {
      return;
    }
    // todo: call relevant callbacks for asynchronous notifications
    var cmdQueuePopped: boolean = false;
    try {
      var result = parser.parse(line);
    } catch (err) {
      console.log('Attempted to parse: ' + line);
      throw err;
    }

    switch (result.recordType) {
      case RecordType.Done:
      case RecordType.Running:
      case RecordType.Connected:
      case RecordType.Exit:
      case RecordType.Error:
        // this record is a response for the last command that was sent to the debugger, 
        // which is the command at the front of the queue
        var cmd = this.cmdQueue.shift();
        cmdQueuePopped = true;
        // todo: check that the token in the response matches the one sent with the command
        if (cmd.done) {
          if (result.recordType === RecordType.Error) {
            cmd.done(
              new CommandFailedError(result.data.msg, cmd.text, result.data.code, cmd.token), null
            );
          } else {
            cmd.done(null, result.data);
          }
        }
        break;

      case RecordType.AsyncNotify:
        this.emitAsyncNotification(result.data[0], result.data[1]);
        break;
    }

    // if a command was popped from the qeueu we can send through the next command
    if (cmdQueuePopped && (this.cmdQueue.length > 0)) {
      this.sendCommandToDebugger(this.cmdQueue[0]);
    }
  }

  /**
   * Sends a MI command to the debugger process.
   */
  private sendCommandToDebugger(command: DebugCommand): void {
    var cmdStr: string;
    if (command.token) {
      cmdStr = `${command.token}-${command.text}`;
    } else {
      cmdStr = '-' + command.text;
    }
    this.debuggerProcess.stdin.write(cmdStr + '\n');
    // FIXME: remove this before release, it's here temporarily for debugging
    console.log(cmdStr);
  }

  /**
   * Adds a MI command to the back of the command queue.
   *
   * If the command queue is empty when this method is called then the command is dispatched
   * immediately, otherwise it will be dispatched after all the previously queued commands are
   * processed.
   */
  private enqueueCommand(command: string, done?: ErrDataCallback, token?: string): void {
    this.cmdQueue.push(new DebugCommand(command, done, token));

    if (this.cmdQueue.length === 1) {
      this.sendCommandToDebugger(this.cmdQueue[0]);
    }
  }

  /**
   * Sets the executable file to be debugged, the symbol table will also be read from this file.
   *
   * This must be called prior to [[connectToRemoteTarget]] when setting up a remote debugging 
   * session.
   *
   * @param file This would normally be a full path to the host's copy of the executable to be 
   *             debugged.
   * @param done Callback to invoke once the command is processed by the debugger.
   * @param token Token (digits only) that can be used to match up the command with a response.
   */
  setExecutableFile(file: string, done?: ErrDataCallback, token?: string): void {
    // NOTE: While the GDB/MI spec. contains multiple -file-XXX commands that allow the
    // executable and symbol files to be specified separately the LLDB MI driver
    // currently (30-Mar-2015) only supports this one command.
    this.enqueueCommand(`file-exec-and-symbols ${file}`, done, token);
  }

  /**
   * Connects the debugger to a remote target.
   *
   * @param host
   * @param port
   * @param done Callback to invoke once the command is processed by the debugger.
   * @param token Token (digits only) that can be used to match up the command with a response.
   */
  connectToRemoteTarget(host: string, port: number, done?: ErrDataCallback, token?: string): void {
    this.enqueueCommand(`target-select remote ${host}:${port}`, done, token);
  }

  /**
   * Ends the debugging session and terminates the debugger process.
   *
   * @param done Callback to invoke after the debug session is cleaned up.
   */
  end(done?: ErrDataCallback): void {
    if (done) {
      this.debuggerProcess.once('exit',
        (code: number, signal: string) => { done(null, { code: code, signal: signal }); }
      );
    }
    this.enqueueCommand('gdb-exit', () => { this.lineReader.close(); });
  }
};

function setProcessEnvironment(): void {
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
