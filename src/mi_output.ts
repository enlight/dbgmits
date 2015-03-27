// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

module MIOutput {

  export enum StreamSource { Console, Target, Debugger };

  export class StreamRecord {
    source: StreamSource;
    text: string;
  }

}
