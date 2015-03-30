// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import chai = require('chai');
import parser = require('../src/mi_output_parser');
import mioutput = require('../src/mi_output');

// aliases
import expect = chai.expect;
import ParseOutputType = mioutput.ParseOutputType;

describe("MI Output Parser", () => {
  describe("Result Records", () => {
    it("parses 'done'", () => {
      var result = parser.parse('^done');
      expect(result.contentType).to.equal(ParseOutputType.Done);
    });

    it("parses 'running'", () => {
      var result = parser.parse('^running');
      expect(result.contentType).to.equal(ParseOutputType.Running);
    });

    it("parses 'connected'", () => {
      var result = parser.parse('^connected');
      expect(result.contentType).to.equal(ParseOutputType.Connected);
    });

    it("parses 'error'", () => {
      var msg = "Command 'target-select'. Error connecting to target 'somehost'.";
      var result = parser.parse('^error,msg="' + msg + '"');
      expect(result.contentType).to.equal(ParseOutputType.Error);
      expect(result.content.msg).to.equal(msg);
    });

    it("parses 'error' with code", () => {
      var msg = "Command 'target-select'. Error connecting to target 'somehost'.";
      var code = "undefined-command";
      var result = parser.parse('^error,msg="' + msg + '",code="' + code + '"');
      expect(result.contentType).to.equal(ParseOutputType.Error);
      expect(result.content.msg).to.equal(msg);
      expect(result.content.code).to.equal(code);
    });

    it("parses 'exit'", () => {
      var result = parser.parse('^exit');
      expect(result.contentType).to.equal(ParseOutputType.Exit);
    });
  });

  describe("Stream Records", () => {
    it("parses double-quoted text from console output stream", () => {
      var testStr = 'console output stream text';
      var result = parser.parse('~"' + testStr + '"');
      expect(result.contentType).to.equal(ParseOutputType.ConsoleStream);
      expect(result.content).to.equal(testStr);
    });

    it("parses double-quoted text from target output stream", () => {
      var testStr = 'target output stream text';
      var result = parser.parse('@"' + testStr + '"');
      expect(result.contentType).to.equal(ParseOutputType.TargetStream);
      expect(result.content).to.equal(testStr);
    });

    it("parses double-quoted text from debugger output stream", () => {
      var testStr = 'debugger output stream text';
      var result = parser.parse('&"' + testStr + '"');
      expect(result.contentType).to.equal(ParseOutputType.DebuggerStream);
      expect(result.content).to.equal(testStr);
    });
  });
});
