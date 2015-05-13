// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

/// <reference path="../typings/test/tsd.d.ts" />

require('source-map-support').install();

import chai = require('chai');
import chaiAsPromised = require('chai-as-promised');
import dbgmits = require('../src/dbgmits');
import testUtils = require('../test/test_utils');

chai.use(chaiAsPromised);

// aliases
import expect = chai.expect;
import DebugSession = dbgmits.DebugSession;
import startDebugSession = testUtils.startDebugSession;
import IWatchInfo = dbgmits.IWatchInfo;
import runToFuncAndStepOut = testUtils.runToFuncAndStepOut;

// the directory in which Gruntfile.js resides is also Mocha's working directory,
// so any relative paths will be relative to that directory
var localTargetExe: string = './build/Debug/watch_tests_target';

describe("Watch Manipulation", () => {
  var debugSession: DebugSession;

  beforeEach(() => {
    debugSession = startDebugSession();
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
        debugSession.startInferior()
      ])
    });
  });

  it("adds a new fixed watch for a simple local variable in the current frame", () => {
    return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch_Inner', () => {
      // add a new watch for a local variable in funcWithMoreVariablesToWatch()
      return debugSession.addWatch('e')
      .then((watch: IWatchInfo) => {
        expect(watch.id).not.to.be.empty;
        expect(watch.childCount).to.equal(2);
        expect(watch.expressionType).to.equal('Point');
        expect(watch.threadId).to.equal(1);
        expect(watch.isDynamic).to.be.false;
        expect(watch.hasMoreChildren).to.be.false;
        expect(watch.displayHint).to.be.undefined;
      });
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
        debugSession.startInferior()
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

    return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch_Inner', () => {
      // create a watch on a variable and step over the line that alters the value of the variable
      return debugSession.addWatch('f')
      .then((watch: IWatchInfo) => {
        return Promise.all([
          onStepOverUpdateWatch(watch),
          debugSession.stepOverLine()
        ]);
      });
    });
  });

  it("gets a list of members of a simple variable under watch", () => {
    return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch', () => {
      return debugSession.addWatch('f')
      .then((watch: IWatchInfo) => {
        return debugSession.getWatchChildren(watch.id);
      })
      .then((children: dbgmits.IWatchChildInfo[]) => {
        // watches on simple variables shouldn't have any children
        expect(children.length).to.equal(0);
      });
    });
  });

  it("gets a list of members of a pointer variable under watch", () => {
    return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch', () => {
      return debugSession.addWatch('g')
      .then((watch: IWatchInfo) => {
        return debugSession.getWatchChildren(watch.id);
      })
      .then((children: dbgmits.IWatchChildInfo[]) => {
        // watches on pointer variables should have a single child
        expect(children.length).to.equal(1);
        expect(children[0].expressionType).to.equal('float');
      });
    });
  });

  it("gets a list of members of a struct variable under watch", () => {
    return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch_Inner', () => {
      return debugSession.addWatch('e')
      .then((watch: IWatchInfo) => {
        return debugSession.getWatchChildren(watch.id, { detail: dbgmits.VariableDetailLevel.None });
      })
      .then((children: dbgmits.IWatchChildInfo[]) => {
        // watches on variables of aggregate types should have one or more children
        expect(children.length).to.equal(2);
        expect(children[0].expressionType).to.equal('float');
        expect(children[1].expressionType).to.equal('float');
      });
    });
  });

  // FIXME: LLDB-MI doesn't support subsets yet, re-enable when that's fixed
  it.skip("gets a subset of members of a struct variable under watch", () => {
    return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch_Inner', () => {
      return debugSession.addWatch('e')
      .then((watch: IWatchInfo) => {
        return debugSession.getWatchChildren(
          watch.id, { detail: dbgmits.VariableDetailLevel.None, from: 0, to: 1 });
      })
      .then((children: dbgmits.IWatchChildInfo[]) => {
        // watches on variables of aggregate types should have one or more children
        expect(children.length).to.equal(1);
        expect(children[0].expressionType).to.equal('float');
      });
    });
  });

  it("sets the format specifier for a watch", () => {
    return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch', () => {
      var watchId;
      // watch an integer variable
      return debugSession.addWatch('e')
      .then((watch: IWatchInfo) => {
        watchId = watch.id;
        return debugSession.setWatchValueFormat(watchId, dbgmits.WatchFormatSpec.Binary);
      })
      // FIXME: binary values are formatted differently between LLDB and GDB, this will fail on GDB
      .then((value: string) => { expect(value).to.equal('0b101'); })
      .then(() => {
        return debugSession.setWatchValueFormat(watchId, dbgmits.WatchFormatSpec.Decimal);
      })
      .then((value: string) => { expect(value).to.equal('5'); })
      .then(() => {
        return debugSession.setWatchValueFormat(watchId, dbgmits.WatchFormatSpec.Hexadecimal);
      })
      .then((value: string) => { expect(value).to.equal('0x5'); })
      .then(() => {
        return debugSession.setWatchValueFormat(watchId, dbgmits.WatchFormatSpec.Octal);
      })
      .then((value: string) => { expect(value).to.equal('05'); })
      .then(() => {
        return debugSession.setWatchValueFormat(watchId, dbgmits.WatchFormatSpec.Default);
      })
      .then((value: string) => { expect(value).to.equal('5'); })
    });
  });

  it("gets the value of a watch", () => {
    return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch', () => {
      return debugSession.addWatch('e')
      .then((watch: IWatchInfo) => {
        return debugSession.getWatchValue(watch.id);
      })
      .then((value: string) => {
        expect(value).to.equal('5');
      })
    });
  });

  it("sets the value of a watch", () => {
    return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch', () => {
      var newValue = '999';
      return debugSession.addWatch('e')
      .then((watch: IWatchInfo) => {
        return debugSession.setWatchValue(watch.id, newValue);
      })
      .then((value: string) => {
        expect(value).to.equal(newValue);
      })
    });
  });

  it("gets the attributes for a watch on a variable of a simple type", () => {
    return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch', () => {
      return debugSession.addWatch('e')
      .then((watch: IWatchInfo) => {
        return debugSession.getWatchAttributes(watch.id);
      })
      .then((attrs: dbgmits.WatchAttribute[]) => {
        expect(attrs.length).to.equal(1);
        expect(attrs[0]).to.equal(dbgmits.WatchAttribute.Editable);
      })
    });
  });
  
  // FIXME: re-enable this when LLDB-MI starts returning 'noneditable' attributes like it should
  it.skip("gets the attributes for a watch on a variable of an aggregate type", () => {
    return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch_Inner', () => {
      return debugSession.addWatch('e')
      .then((watch: IWatchInfo) => {
        return debugSession.getWatchAttributes(watch.id);
      })
      .then((attrs: dbgmits.WatchAttribute[]) => {
        expect(attrs.length).to.equal(1);
        expect(attrs[0]).to.equal(dbgmits.WatchAttribute.NonEditable);
      })
    });
  });

  it("gets the watch expression", () => {
    return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch_Inner', () => {
      return debugSession.addWatch('f')
      .then((watch: IWatchInfo) => {
        return debugSession.getWatchExpression(watch.id);
      })
      .then((expr: string) => {
        expect(expr).to.equal('f');
      })
    });
  });
});
