// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

// Type definitions for the generated MI output parser.
// NOTE: This is an external module in TypeScript parlance.

import mioutput = require('./mi_output');

declare module MIOutputParser {

  export interface ParseOutput {
    contentType: mioutput.ParseOutputType;
    content: any;
  }

  export function parse(input: string): ParseOutput;

  export class SyntaxError {
    line: number;
    column: number;
    offset: number;
    expected: any[];
    found: any;
    name: string;
    message: string;
  }

} // module MIOutputParser

export = MIOutputParser;
