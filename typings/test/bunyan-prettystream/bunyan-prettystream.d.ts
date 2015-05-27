﻿// Type definitions for bunyan-prettystream
// Project: https://www.npmjs.com/package/bunyan-prettystream
// Definitions by: Jason Swearingen <https://github.com/jasonswearingen/>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module "bunyan-prettystream" {
	import stream = require("stream");
	class PrettyStream extends stream.Writable {
    constructor(options?: { mode?: string; useColor?: boolean });
		public pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T;
	}
	export = PrettyStream;
}
