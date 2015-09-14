// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

require('source-map-support').install();

import mocha = require('mocha');

/** Partial interface for mocha.Suite */
interface ISuite extends Mocha.ISuite {
  createLogger?: { (testIndex: number, title: string): void };
}

/** Partial interface for mocha.Test (with some customization) */
interface ITest extends Mocha.ITest {
  createLogger?: { (testIndex: number, title: string): void };
}

/** Partial interface for mocha.Hook callback functions (with some customization) */
interface IHookCallback {
  (): any;
  setLogger?: { (logger: any): void };
};

/** Partial interface for mocha.Hook */
interface IHook {
  fn: IHookCallback;
}

/**
 * Specialization of Mocha's `spec` reporter that creates a new logger for each test.
 */
class CustomReporter extends mocha.reporters.Spec {
  /** Passed to every beforeEach hook that needs one. */
  private logger: any;

  constructor(runner: Mocha.IRunner) {
    super(runner);

    // 'test' gets emitted before the beforeEach 'hook', so the logger for each test needs to be
    // created at this point and then passed through to the hook callback
    runner.on('test', (test: ITest) => {
      // pad the test number with zeroes (e.g. 1 -> 001, 10 -> 010, 100 -> 100)
      let pad = '000';
      let testSuffix = (pad + this.stats.tests).slice(-pad.length);
      test.title = `${test.title} [${testSuffix}]`;
      if (test.createLogger) {
        this.logger = test.createLogger(this.stats.tests, test.title);
      } else {
        // the test doesn't have a function to create a logger so look for one further up
        // the hierarchy
        let parent = <ISuite>test.parent;
        while (parent) {
          if (parent.createLogger) {
            this.logger = parent.createLogger(this.stats.tests, test.title);
            break;
          }
          parent = parent.parent;
        }
      }
    });

    runner.on('hook', (hook: IHook) => {
      // only the beforeEach hook should have a setLogger function
      if (hook.fn && hook.fn.setLogger) {
        hook.fn.setLogger(this.logger);
      }
    });
  }
}

module.exports = CustomReporter;
