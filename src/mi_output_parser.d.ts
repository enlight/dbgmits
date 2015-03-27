// Type definitions for the generated MI output parser.

declare module MIOutputParser {
  export function parse(input: string): any;

  export class SyntaxError {
    line: number;
    column: number;
    offset: number;

    expected: any[];
    found: any;
    name: string;
    message: string;
  }
}

declare module "mi_output_parser" {
  export = MIOutputParser;
}
