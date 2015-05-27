// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/test/tsd.d.ts" />

require('source-map-support').install();

import mocha = require('mocha');

/** Partial interface for mocha.Suite */
interface Suite {
  parent: Suite;
  title: string;

  fullTitle(): string;
}

/** Partial interface for mocha.Test */
interface Test extends NodeJS.EventEmitter {
  parent: Suite;
  title: string;
  fn: Function;
  async: boolean;
  sync: boolean;
  timedOut: boolean;

  fullTitle(): string;
}

interface ICreateLoggerCallback {
  (testIndex: number, title: string): void;
}

/** Partial interface for mocha.Hook callback functions (with some customization) */
interface IHookCallback {
  (): any;
  createLogger?: ICreateLoggerCallback;
};

/** Partial interface for mocha.Hook */
interface IHook {
  fn: IHookCallback;
}

/**
 * Specialization of Mocha's `spec` reporter that creates a new logger for each test.
 */
class CustomReporter extends mocha.reporters.Spec {
  private createLogger: ICreateLoggerCallback;

  constructor(runner: mocha.Runner) {
    super(runner);

    runner.on('hook', (hook: IHook) => {
      if (hook.fn && hook.fn.createLogger) {
        this.createLogger = hook.fn.createLogger;
      }
    });

    runner.on('test', (test: Test) => {
      if (this.createLogger) {
        this.createLogger(this.stats.tests, test.title);
      }
    });
  }
}

module.exports = CustomReporter;
