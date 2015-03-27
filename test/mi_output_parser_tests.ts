// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../src/mi_output_parser.d.ts" />
/// <reference path="../src/mi_output.ts" />

import chai = require('chai');
import parser = require('mi_output_parser');

// aliases
import expect = chai.expect;
import StreamRecord = MIOutput.StreamRecord;

describe("Machine Interface Output Parser", () => {
  it("Should parse double-quoted text from console output stream", () => {
    var testStr = 'console output stream text';
    var result = parser.parse('~"' + testStr + '"');
    expect(result).to.be.an.instanceof(StreamRecord);
  });
});
