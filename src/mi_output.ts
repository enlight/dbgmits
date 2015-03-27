// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

// NOTE: This is an external module in TypeScript parlance.

module MIOutput {

  export enum StreamSource { Console, Target, Debugger };

  export class StreamRecord {
    source: StreamSource;
    text: string;
  }

} // module MIOutput

export = MIOutput;
