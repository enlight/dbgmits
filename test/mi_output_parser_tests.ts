// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import chai = require('chai');
import parser = require('../src/mi_output_parser');
import mioutput = require('../src/mi_output');

// aliases
import expect = chai.expect;
import ParseOutputType = mioutput.ParseOutputType;

describe("MI Output Parser", () => {

  it("should parse double-quoted text from console output stream",() => {
    var testStr = 'console output stream text';
    var result = parser.parse('~"' + testStr + '"');
    expect(result.contentType).to.equal(ParseOutputType.ConsoleStream);
    expect(result.content).to.equal(testStr);
  });

  it("should parse double-quoted text from target output stream",() => {
    var testStr = 'target output stream text';
    var result = parser.parse('@"' + testStr + '"');
    expect(result.contentType).to.equal(ParseOutputType.TargetStream);
    expect(result.content).to.equal(testStr);
  });

  it("should parse double-quoted text from debugger output stream",() => {
    var testStr = 'debugger output stream text';
    var result = parser.parse('&"' + testStr + '"');
    expect(result.contentType).to.equal(ParseOutputType.DebuggerStream);
    expect(result.content).to.equal(testStr);
  });

});
