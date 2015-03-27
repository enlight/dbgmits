// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import chai = require('chai');
import parser = require('../src/mi_output_parser');
import mioutput = require('../src/mi_output');

// aliases
import expect = chai.expect;

describe("Machine Interface Output Parser", () => {
  it("Should parse double-quoted text from console output stream", () => {
    var testStr = 'console output stream text';
    var result = parser.parse('~"' + testStr + '"');
    expect(result).to.be.an.instanceof(mioutput.StreamRecord);
  });
});
