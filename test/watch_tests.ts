// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/test/tsd.d.ts" />

require('source-map-support').install();

import chai = require('chai');
import chaiAsPromised = require('chai-as-promised');
import stream = require('stream');
import dbgmits = require('../src/dbgmits');

chai.use(chaiAsPromised);

// aliases
import expect = chai.expect;
import DebugSession = dbgmits.DebugSession;
import IWatchInfo = dbgmits.IWatchInfo;

// the directory in which Gruntfile.js resides is also Mocha's working directory,
// so any relative paths will be relative to that directory
var localTargetExe: string = './build/Debug/watch_tests_target';

describe("Watch Manipulation", () => {
  var debugSession: DebugSession;

  beforeEach(() => {
    debugSession = dbgmits.startDebugSession();
    return debugSession.setExecutableFile(localTargetExe);
  });

  afterEach(() => {
    return debugSession.end();
  });
    
  it("adds a new floating watch for a local variable in an outer frame", () => {
    var onBreakpointCreateWatch = new Promise<void>((resolve, reject) => {
      debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
        (breakNotify: dbgmits.BreakpointHitNotify) => {
          // add a new watch for a local variable in funcWithMoreVariablesToWatch()
          return debugSession.addWatch('f', { threadId: 1, frameLevel: 1, isFloating: true })
          .then((watch: IWatchInfo) => {
            expect(watch.id).not.to.be.empty;
            expect(watch.childCount).to.equal(0);
            expect(watch.value).to.equal('9.5');
            expect(watch.expressionType).to.equal('float');
            expect(watch.threadId).to.equal(1);
            expect(watch.isDynamic).to.be.false;
            expect(watch.hasMoreChildren).to.be.false;
            expect(watch.displayHint).to.be.undefined;
          })
          .then(resolve)
          .catch(reject);
        }
      );
    });
    // add breakpoint to get to the starting point of the test
    return debugSession.addBreakpoint('funcWithMoreVariablesToWatch_Inner')
    .then(() => {
      return Promise.all([
        onBreakpointCreateWatch,
        debugSession.startTarget()
      ])
    });
  });

  it("adds a new fixed watch for a simple local variable in the current frame", () => {
    var onStepFinishedAddWatch = new Promise<void>((resolve, reject) => {
      debugSession.once(DebugSession.EVENT_STEP_FINISHED,
        (notification: dbgmits.StepFinishedNotify) => {
          // add a new watch for a local variable in funcWithMoreVariablesToWatch()
          debugSession.addWatch('e')
          .then((watch: IWatchInfo) => {
            expect(watch.id).not.to.be.empty;
            expect(watch.childCount).to.equal(2);
            expect(watch.expressionType).to.equal('Point');
            expect(watch.threadId).to.equal(1);
            expect(watch.isDynamic).to.be.false;
            expect(watch.hasMoreChildren).to.be.false;
            expect(watch.displayHint).to.be.undefined;
          })
          .then(resolve)
          .catch(reject);
        }
      )
    });
    // step out into funcWithThreeLocalVariables()
    var onBreakpointStepOut = new Promise<void>((resolve, reject) => {
      debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
        (breakNotify: dbgmits.BreakpointHitNotify) => {
          resolve(debugSession.stepOut());
        }
      );
    });
    // add breakpoint to the get near the starting point of the test
    return debugSession.addBreakpoint('funcWithMoreVariablesToWatch_Inner')
    .then(() => {
      return Promise.all([
        onBreakpointStepOut,
        onStepFinishedAddWatch,
        debugSession.startTarget()
      ])
    });
  });

  it("removes a watch", () => {
    var onBreakpointCreateAndDestroyWatch = new Promise<void>((resolve, reject) => {
      debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
        (breakNotify: dbgmits.BreakpointHitNotify) => {
          var theWatch: IWatchInfo;
          // add a new watch for a local variable in funcWithMoreVariablesToWatch()
          return debugSession.addWatch('f', { threadId: 1, frameLevel: 1, isFloating: true })
          .then((watch: IWatchInfo) => { return debugSession.removeWatch(watch.id); })
          .then(resolve)
          .catch(reject);
        }
      );
    });
    // add breakpoint to get to the starting point of the test
    return debugSession.addBreakpoint('funcWithMoreVariablesToWatch_Inner')
    .then(() => {
      return Promise.all([
        onBreakpointCreateAndDestroyWatch,
        debugSession.startTarget()
      ])
    });
  });

  it("updates a fixed watch for a local variable after the value changes", () => {
    // check the change in the value of the variable was detected by the watch
    var onStepOverUpdateWatch = (watch: IWatchInfo) => {
      return new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_STEP_FINISHED,
          (stepNotify: dbgmits.StepFinishedNotify) => {
            debugSession.updateWatch(watch.id, dbgmits.VariableDetailLevel.All)
            .then((changelist: dbgmits.IWatchUpdateInfo[]) => {
              expect(changelist.length).to.be.equal(1);
              var firstEntry = changelist[0];
              expect(firstEntry.id).to.equal(watch.id);
              expect(firstEntry.hasTypeChanged).to.be.false;
              expect(firstEntry.value).not.to.equal(watch.value);
              expect(firstEntry.isInScope).to.be.true;
              expect(firstEntry.isObsolete).to.be.false;
            })
            .then(resolve)
            .catch(reject);
          }
        );
      });
    }
    // create a watch on a variable and step over the line that alters the value of the variable
    var onStepOutStepOver = () => {
      return new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_STEP_FINISHED,
          (stepNotify: dbgmits.StepFinishedNotify) => {
            debugSession.addWatch('f')
            .then((watch: IWatchInfo) => {
              return Promise.all([
                onStepOverUpdateWatch(watch),
                debugSession.stepOverLine()
              ]);
            })
            .then(() => { resolve(); })
            .catch(reject);
          }
        );
      });
    }
    // step out of funcWithMoreVariablesToWatch_Inner() into funcWithMoreVariablesToWatch()
    var onBreakpointStepOut = new Promise<void>((resolve, reject) => {
      debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
        (breakNotify: dbgmits.BreakpointHitNotify) => {
          Promise.all([
            onStepOutStepOver(),
            debugSession.stepOut()
          ])
          .then(() => { resolve(); })
          .catch(reject);
        }
      );
    });
    // add breakpoint to get to the starting point of the test
    return debugSession.addBreakpoint('funcWithMoreVariablesToWatch_Inner')
    .then(() => {
      return Promise.all([
        onBreakpointStepOut,
        debugSession.startTarget()
      ])
    });
  });

  it("gets a list of members of a simple variable under watch", () => {
    var onStepOutGetWatchChildren = () => {
      return new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_STEP_FINISHED,
          (stepNotify: dbgmits.StepFinishedNotify) => {
            debugSession.addWatch('f')
            .then((watch: IWatchInfo) => {
              return debugSession.getWatchChildren(watch.id);
            })
            .then((children: dbgmits.IWatchChildInfo[]) => {
              // watches on simple variables shouldn't have any children
              expect(children.length).to.equal(0);
            })
            .then(resolve)
            .catch(reject);
          }
        );
      });
    }
    // step out of funcWithMoreVariablesToWatch() into funcWithVariablesToWatch()
    var onBreakpointStepOut = new Promise<void>((resolve, reject) => {
      debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
        (breakNotify: dbgmits.BreakpointHitNotify) => {
          Promise.all([
            onStepOutGetWatchChildren(),
            debugSession.stepOut()
          ])
          .then(() => { resolve(); })
          .catch(reject);
        }
      );
    });
    // add breakpoint to get to the starting point of the test
    return debugSession.addBreakpoint('funcWithMoreVariablesToWatch')
    .then(() => {
      return Promise.all([
        onBreakpointStepOut,
        debugSession.startTarget()
      ])
    });
  });

  it("gets a list of members of a pointer variable under watch", () => {
    var onStepOutGetWatchChildren = () => {
      return new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_STEP_FINISHED,
          (stepNotify: dbgmits.StepFinishedNotify) => {
            debugSession.addWatch('g')
            .then((watch: IWatchInfo) => {
              return debugSession.getWatchChildren(watch.id);
            })
            .then((children: dbgmits.IWatchChildInfo[]) => {
              // watches on pointer variables should have a single child
              expect(children.length).to.equal(1);
              expect(children[0].expressionType).to.equal('float');
            })
            .then(resolve)
            .catch(reject);
          }
        );
      });
    }
    // step out of funcWithMoreVariablesToWatch() into funcWithVariablesToWatch()
    var onBreakpointStepOut = new Promise<void>((resolve, reject) => {
      debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
        (breakNotify: dbgmits.BreakpointHitNotify) => {
          Promise.all([
            onStepOutGetWatchChildren(),
            debugSession.stepOut()
          ])
          .then(() => { resolve(); })
          .catch(reject);
        }
      );
    });
    // add breakpoint to get to the starting point of the test
    return debugSession.addBreakpoint('funcWithMoreVariablesToWatch')
    .then(() => {
      return Promise.all([
        onBreakpointStepOut,
        debugSession.startTarget()
      ])
    });
  });

  it("gets a list of members of a struct variable under watch", () => {
    var onStepOutGetWatchChildren = () => {
      return new Promise<void>((resolve, reject) => {
        debugSession.once(DebugSession.EVENT_STEP_FINISHED,
          (stepNotify: dbgmits.StepFinishedNotify) => {
            debugSession.addWatch('e')
            .then((watch: IWatchInfo) => {
              return debugSession.getWatchChildren(
                watch.id, { detail: dbgmits.VariableDetailLevel.None }
              );
            })
            .then((children: dbgmits.IWatchChildInfo[]) => {
              // watches on variables of aggregate types should have one or more children
              expect(children.length).to.equal(2);
              expect(children[0].expressionType).to.equal('float');
              expect(children[1].expressionType).to.equal('float');
            })
            .then(resolve)
            .catch(reject);
          }
        );
      });
    }
    // step out of funcWithMoreVariablesToWatch_Inner() into funcWithMoreVariablesToWatch()
    var onBreakpointStepOut = new Promise<void>((resolve, reject) => {
      debugSession.once(DebugSession.EVENT_BREAKPOINT_HIT,
        (breakNotify: dbgmits.BreakpointHitNotify) => {
          Promise.all([
            onStepOutGetWatchChildren(),
            debugSession.stepOut()
          ])
          .then(() => { resolve(); })
          .catch(reject);
        }
      );
    });
    // add breakpoint to get to the starting point of the test
    return debugSession.addBreakpoint('funcWithMoreVariablesToWatch_Inner')
    .then(() => {
      return Promise.all([
        onBreakpointStepOut,
        debugSession.startTarget()
      ])
    });
  });
});
