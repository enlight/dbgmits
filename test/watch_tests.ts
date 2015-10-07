// Copyright (c) 2015 Vadim Macagon
// MIT License, see LICENSE file for full terms.

require('source-map-support').install();

import * as chai from 'chai';
import chaiAsPromised = require('chai-as-promised');
import * as bunyan from 'bunyan';
import * as dbgmits from '../lib/index';
import {
  beforeEachTestWithLogger, logSuite as log, startDebugSession,
  runToFunc, runToFuncAndStepOut
} from './test_utils';

chai.use(chaiAsPromised);

// aliases
var expect = chai.expect;
import DebugSession = dbgmits.DebugSession;
import IWatchInfo = dbgmits.IWatchInfo;

// the directory in which Gruntfile.js resides is also Mocha's working directory,
// so any relative paths will be relative to that directory
var localTargetExe: string = './build/Debug/watch_tests_target';

log(describe("Debug Session", () => {
  describe("Watch Manipulation", () => {
    var debugSession: DebugSession;

    beforeEachTestWithLogger((logger: bunyan.Logger) => {
      debugSession = startDebugSession(logger);
      return debugSession.setExecutableFile(localTargetExe);
    });

    afterEach(() => {
      return debugSession.end();
    });

    describe("#addWatch", () => {
      it("adds a new floating watch for a local variable in an outer frame", () => {
        return runToFunc(debugSession, 'funcWithMoreVariablesToWatch_Inner', () => {
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
          });
        });
      });

      it("adds a new fixed watch for a local variable in the current frame @skipOnGDB", () => {
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

      // GDB groups C++ struct/class members under private/public/protected pseudo-members,
      // so we need a separate test just for GDB
      it("adds a new fixed watch for a local variable in the current frame @skipOnLLDB", () => {
        return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch_Inner', () => {
          // add a new watch for a local variable in funcWithMoreVariablesToWatch()
          return debugSession.addWatch('e')
          .then((watch: IWatchInfo) => {
            expect(watch.id).not.to.be.empty;
            expect(watch.childCount).to.equal(1);
            expect(watch.expressionType).to.equal('Point');
            expect(watch.threadId).to.equal(1);
            expect(watch.isDynamic).to.be.false;
            expect(watch.hasMoreChildren).to.be.false;
            expect(watch.displayHint).to.be.undefined;
          });
        });
      });
    });

    it("#removeWatch", () => {
      return runToFunc(debugSession, 'funcWithMoreVariablesToWatch_Inner', () => {
        // add a new watch for a local variable in funcWithMoreVariablesToWatch()
        return debugSession.addWatch('f', { threadId: 1, frameLevel: 1, isFloating: true })
        .then((watch: IWatchInfo) => { return debugSession.removeWatch(watch.id); });
      });
    });

    describe("#updateWatch", () => {
      it("updates a fixed watch for a local variable after the value changes", () => {
        // check the change in the value of the variable was detected by the watch
        var onStepOverUpdateWatch = (watch: IWatchInfo) => {
          return new Promise<void>((resolve, reject) => {
            debugSession.once(dbgmits.EVENT_STEP_FINISHED,
              (stepNotify: dbgmits.IStepFinishedEvent) => {
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
        };

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
    });

    describe("#getWatchChildren", () => {
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

      it("gets a list of members of a struct variable under watch @skipOnGDB", () => {
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

      // GDB groups C++ struct/class members under private/public/protected pseudo-members,
      // so we need a separate test just for GDB
      it("gets a list of members of a struct variable under watch @skipOnLLDB", () => {
        return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch_Inner', () => {
          return debugSession.addWatch('e')
          .then((watch: IWatchInfo) => {
            return debugSession.getWatchChildren(watch.id);
          })
          .then((children: dbgmits.IWatchChildInfo[]) => {
            // should be just one child named 'public'
            expect(children.length).to.equal(1);
            return debugSession.getWatchChildren(
              children[0].id, { detail: dbgmits.VariableDetailLevel.None }
            );
          })
          .then((children: dbgmits.IWatchChildInfo[]) => {
            // watches on variables of aggregate types should have one or more children
            expect(children.length).to.equal(2);
            expect(children[0].expressionType).to.equal('float');
            expect(children[1].expressionType).to.equal('float');
          });
        });
      });

      it("gets a subset of members of a struct variable under watch @skipOnGDB", () => {
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

      // GDB groups C++ struct/class members under private/public/protected pseudo-members,
      // so we need a separate test just for GDB
      it("gets a subset of members of a struct variable under watch @skipOnLLDB", () => {
        return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch_Inner', () => {
          return debugSession.addWatch('e')
          .then((watch: IWatchInfo) => {
            return debugSession.getWatchChildren(watch.id);
          })
          .then((children: dbgmits.IWatchChildInfo[]) => {
            // should be just one child named 'public'
            expect(children.length).to.equal(1);
            return debugSession.getWatchChildren(
              children[0].id, { detail: dbgmits.VariableDetailLevel.None, from: 0, to: 1 }
            );
          })
          .then((children: dbgmits.IWatchChildInfo[]) => {
            // watches on variables of aggregate types should have one or more children
            expect(children.length).to.equal(1);
            expect(children[0].expressionType).to.equal('float');
          });
        });
      });
    });

    it("#setWatchValueFormat", () => {
      return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch', () => {
        let watchId: string;
        // watch an integer variable
        return debugSession.addWatch('e')
        .then((watch: IWatchInfo) => {
          watchId = watch.id;
          return debugSession.setWatchValueFormat(watchId, dbgmits.WatchFormatSpec.Binary);
        })
        // FIXME: binary values are formatted differently between LLDB-MI and GDB-MI
        .then((value: string) => { expect(value).to.match(/(0b)?101/); })
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
        .then((value: string) => { expect(value).to.equal('5'); });
      });
    });

    it("#getWatchValue", () => {
      return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch', () => {
        return debugSession.addWatch('e')
        .then((watch: IWatchInfo) => {
          return debugSession.getWatchValue(watch.id);
        })
        .then((value: string) => {
          expect(value).to.equal('5');
        });
      });
    });

    it("#setWatchValue", () => {
      return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch', () => {
        var newValue = '999';
        return debugSession.addWatch('e')
        .then((watch: IWatchInfo) => {
          return debugSession.setWatchValue(watch.id, newValue);
        })
        .then((value: string) => {
          expect(value).to.equal(newValue);
        });
      });
    });

    describe("#getWatchAttributes", () => {
      it("gets the attributes for a watch on a variable of a simple type", () => {
        return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch', () => {
          return debugSession.addWatch('e')
          .then((watch: IWatchInfo) => {
            return debugSession.getWatchAttributes(watch.id);
          })
          .then((attrs: dbgmits.WatchAttribute[]) => {
            expect(attrs.length).to.equal(1);
            expect(attrs[0]).to.equal(dbgmits.WatchAttribute.Editable);
          });
        });
      });

      // FIXME: re-enable this test for LLDB when LLDB-MI starts returning 'noneditable' attributes
      // like it should
      it("gets the attributes for a watch on a variable of an aggregate type @skipOnLLDB", () => {
        return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch_Inner', () => {
          return debugSession.addWatch('e')
          .then((watch: IWatchInfo) => {
            return debugSession.getWatchAttributes(watch.id);
          })
          .then((attrs: dbgmits.WatchAttribute[]) => {
            expect(attrs.length).to.equal(1);
            expect(attrs[0]).to.equal(dbgmits.WatchAttribute.NonEditable);
          });
        });
      });
    });

    it("#getWatchExpression", () => {
      return runToFuncAndStepOut(debugSession, 'funcWithMoreVariablesToWatch_Inner', () => {
        return debugSession.addWatch('f')
        .then((watch: IWatchInfo) => {
          return debugSession.getWatchExpression(watch.id);
        })
        .then((expr: string) => {
          expect(expr).to.equal('f');
        });
      });
    });
  });
}));
