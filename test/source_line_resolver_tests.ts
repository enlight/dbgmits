import { SourceLineResolver } from './test_utils';
import * as chai from 'chai';
import chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

// aliases
const expect = chai.expect;

// the directory in which Gruntfile.js resides is also Mocha's working directory,
// so any relative paths will be relative to that directory
const sourceFilename = './test/source_line_resolver_tests_target.cpp'
const firstLineNumber = 1;
const mainFuncNameLineNumber = 3;
const mainFuncReturnLineNumber = 5;
const lastLineNumber = 8;

describe("SourceLineResolver", () => {
  describe("#loadSourceFileSync()", () => {
    it("Loads an existing source file", () => {
	    const resolver = SourceLineResolver.loadSourceFileSync(sourceFilename);
      expect(resolver).is.not.undefined;
      expect(resolver).is.not.null;
    });
  });
  
  describe("#getMatchingLineNumber()", () => {
    let resolver: SourceLineResolver;
    
    beforeEach(() => {
      resolver = SourceLineResolver.loadSourceFileSync(sourceFilename);
    });
    
    it("Returns the line number for a RegExp that matches the first line", () => {
      const lineNumber = resolver.getMatchingLineNumber(/^\/\/ first line/);
      expect(lineNumber).to.equal(firstLineNumber);
    });
    
    it("Returns the line number for a RegExp that matches the last line", () => {
      const lineNumber = resolver.getMatchingLineNumber(/^\/\/ last line/);
      expect(lineNumber).to.equal(lastLineNumber);
    });
    
    it("Returns the line number for a RegExp that matches the main function", () => {
      const lineNumber = resolver.getMatchingLineNumber(/^int main/);
      expect(lineNumber).to.equal(mainFuncNameLineNumber);
    });
    
    it("Returns the number of the first matching line for a RegExp that matches multiple lines", () => {
      const lineNumber = resolver.getMatchingLineNumber(/^\/\/.*/);
      expect(lineNumber).to.equal(firstLineNumber);
    });
  });
  
  describe("#getLineNumberOfComment()", () => {
    let resolver: SourceLineResolver;
    
    beforeEach(() => {
      resolver = SourceLineResolver.loadSourceFileSync(sourceFilename);
    });
    
    it("Returns the line number for the comment on the first line", () => {
      const lineNumber = resolver.getCommentLineNumber('first line');
      expect(lineNumber).to.equal(firstLineNumber);
    });
    
    it("Return the line number for a comment at the end of a line of code", () => {
      const lineNumber = resolver.getCommentLineNumber('return value');
      expect(lineNumber).to.equal(mainFuncReturnLineNumber);
    });
    
    it("Returns the line number for the comment on the last line", () => {
      const lineNumber = resolver.getCommentLineNumber("last line (and it's missing a line terminator)");
      expect(lineNumber).to.equal(lastLineNumber);
    });
  });
});
