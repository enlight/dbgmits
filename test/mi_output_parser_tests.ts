// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/test/tsd.d.ts" />

require('source-map-support').install();

import chai = require('chai');
import parser = require('../src/mi_output_parser');
import mioutput = require('../src/mi_output');

// aliases
import expect = chai.expect;
import RecordType = mioutput.RecordType;

describe("MI Output Parser", () => {
  describe("Result Records", () => {
    it("parses 'done'", () => {
      var result = parser.parse('^done');
      expect(result.recordType).to.equal(RecordType.Done);
    });

    it("parses 'done' from 'add breakpoint' command", () => {
      var id = '1';
      var addr = '0x004009a3';
      var func = 'main';
      var filename = 'main.cpp';
      var fullname = '/home/enlight/build/../hello-world/main.cpp';
      var line = '5';
      var result = parser.parse(
        `^done,bkpt={number="${id}",type="breakpoint",disp="keep",enabled="y",addr="${addr}",` +
        `func="${func}",file="${filename}",fullname="${fullname}",` +
        `line="${line}",times="0",original-location="${func}"}`
      );

      expect(result.recordType).to.equal(RecordType.Done);
      expect(result.data).to.have.property('bkpt');

      var bkpt: any = result.data.bkpt;
      expect(bkpt).to.have.property('number', id);
      expect(bkpt).to.have.property('type', 'breakpoint');
      expect(bkpt).to.have.property('disp', 'keep');
      expect(bkpt).to.have.property('enabled', 'y');
      expect(bkpt).to.have.property('addr', addr);
      expect(bkpt).to.have.property('func', func);
      expect(bkpt).to.have.property('file', filename);
      expect(bkpt).to.have.property('fullname', fullname);
      expect(bkpt).to.have.property('line', line);
      expect(bkpt).to.have.property('times', '0');
      expect(bkpt).to.have.property('original-location', func);
    });

    it("parses 'done' from 'get stack depth' command", () => {
      var frameLevel: string = '0';
      var frameAddr: string = '0x000000000040080a';
      var frameFunc: string = 'getNextInt';
      var frameFile: string = '../test_target.cpp';
      var frameFullname: string = '/test/test_target.cpp';
      var frameLine: string = '6';
      var result = parser.parse(
        `^done,stack=[` +
        `frame={level="${frameLevel}",addr="${frameAddr}",func="${frameFunc}",file="${frameFile}",` +
        `fullname="${frameFullname}",line="${frameLine}"},` +
        `frame={level="1",addr="0x0000000000400828",func="printNextInt",file="../test_target.cpp",` +
        `fullname="/media/sf_dbgmits/test/test_target.cpp",line="11"},` +
        `frame={level="2",addr="0x0000000000400860",func="main",file="../test_target.cpp",` +
        `fullname="/media/sf_dbgmits/test/test_target.cpp",line="19"}]`
      );

      expect(result.recordType).to.equal(RecordType.Done);
      expect(result.data).to.have.property('stack');
      expect(result.data.stack).to.have.property('frame');
      expect(result.data.stack.frame.length).to.equal(3);
      
      var frame: any = result.data.stack.frame[0];
      expect(frame).to.have.property('level', frameLevel);
      expect(frame).to.have.property('addr', frameAddr);
      expect(frame).to.have.property('func', frameFunc);
      expect(frame).to.have.property('file');
      expect(frame).to.have.property('fullname');
      expect(frame).to.have.property('line', frameLine);
    });

    it("parses 'done' from 'get locals' command", () => {
      var result = parser.parse('^done,locals=[name="A",name="B",name="C"]');

      expect(result.recordType).to.equal(RecordType.Done);
      expect(result.data).to.have.property('locals');
      expect(result.data.locals).to.have.property('name');
      expect(result.data.locals.name.length).to.equal(3);
      expect(result.data.locals.name[0]).to.equal('A');
      expect(result.data.locals.name[1]).to.equal('B');
      expect(result.data.locals.name[2]).to.equal('C');
    });

    it("parses 'running'", () => {
      var result = parser.parse('^running');
      expect(result.recordType).to.equal(RecordType.Running);
    });

    it("parses 'connected'", () => {
      var result = parser.parse('^connected');
      expect(result.recordType).to.equal(RecordType.Connected);
    });

    it("parses 'error'", () => {
      var msg = "Command 'target-select'. Error connecting to target 'somehost'.";
      var result = parser.parse('^error,msg="' + msg + '"');
      expect(result.recordType).to.equal(RecordType.Error);
      expect(result.data.msg).to.equal(msg);
    });

    it("parses 'error' with code", () => {
      var msg = "Command 'target-select'. Error connecting to target 'somehost'.";
      var code = "undefined-command";
      var result = parser.parse('^error,msg="' + msg + '",code="' + code + '"');
      expect(result.recordType).to.equal(RecordType.Error);
      expect(result.data.msg).to.equal(msg);
      expect(result.data.code).to.equal(code);
    });

    it("parses 'exit'", () => {
      var result = parser.parse('^exit');
      expect(result.recordType).to.equal(RecordType.Exit);
    });
  });

  describe("Stream Records", () => {
    it("parses double-quoted text from console output stream", () => {
      var testStr = 'console output stream text';
      var result = parser.parse('~"' + testStr + '"');
      expect(result.recordType).to.equal(RecordType.DebuggerConsoleOutput);
      expect(result.data).to.equal(testStr);
    });

    it("parses double-quoted text from target output stream", () => {
      var testStr = 'target output stream text';
      var result = parser.parse('@"' + testStr + '"');
      expect(result.recordType).to.equal(RecordType.TargetOutput);
      expect(result.data).to.equal(testStr);
    });

    it("parses double-quoted text from debugger output stream", () => {
      var testStr = 'debugger output stream text';
      var result = parser.parse('&"' + testStr + '"');
      expect(result.recordType).to.equal(RecordType.DebuggerLogOutput);
      expect(result.data).to.equal(testStr);
    });
  });

  describe("Async Records", () => {
    it("parses exec", () => {
      var asyncClass: string = 'stopped';
      var testStr = `*${asyncClass},reason="signal-received",signal-name="SIGINT",signal-meaning="Interrupt"`;
      var result = parser.parse(testStr);
      expect(result.recordType).to.equal(RecordType.AsyncExec);
      expect(result.data.length).to.equal(2);
      expect(result.data[0]).to.equal(asyncClass);
      expect(result.data[1]).to.contain.keys(['reason', 'signal-name']);
    });

    it("parses status", () => {
      var asyncClass: string = 'download';
      var testStr: string = `+${asyncClass}`;
      var result = parser.parse(testStr);
      expect(result.recordType).to.equal(RecordType.AsyncStatus);
      expect(result.data.length).to.equal(2);
    });

    it("parses notify", () => {
      var asyncClass: string = 'thread-group-started';
      var testStr: string = `=${asyncClass},id="i1",pid="6550"`;
      var result = parser.parse(testStr);
      expect(result.recordType).to.equal(RecordType.AsyncNotify);
      expect(result.data.length).to.equal(2);
      expect(result.data[0]).to.equal(asyncClass);
      expect(result.data[1]).to.contain.keys(['id', 'pid']);
    });
  });
});
