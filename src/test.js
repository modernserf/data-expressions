// # Test framework
// This library has its code, documentation, and tests intertwingled; the tests act as examples for the code. This is made possible with Rollup's "tree-shaking" -- the tests aren't included in the bundled output.
import * as patterns from './patterns.js'
import * as parser from './parser.js'
import * as operations from './operations.js'
import * as index from './index.js'
const tape = require('tape')

// Use Jasmine-style `expect(value).toEqual(expected)` test assertions.
function expecter (t) {
  const f = (value) => ({
    toEqual: (expected) => t.deepEquals(value, expected),
    toThrow: () => t.throws(value)
  })
  f.comment = (comment) => t.comment(comment)
  return f
}

// Use the exported function's name to determine if it's a test, and if it should be skipped/isolated.
function tester (tape, key, cb) {
  const test = /^only_test_/.test(key) ? tape.only
    : /^skip_test_/.test(key) ? tape.skip
      : /^test_/.test(key) ? tape
        : null
  if (!test) { return }
  // Extract a properly-formatted name from the test function name.
  const message = key.replace(/^(skip_|only_)?test_/, '').replace(/_/g, ' ')
  return test(message, cb, { objectPrintDepth: 10 })
}

// If any of the exported values are test functions, run them with `tape`.
for (const dep of [patterns, parser, operations, index]) {
  for (const key in dep) {
    tester(tape, key, (t) => {
      // Call the test with `expect` and `dx` as arguments.
      const out = dep[key](expecter(t), parser.dx)
      // Return values are ignored, but async functions always return a promise, so assume a return value implies an async test.
      if (out) {
        Promise.resolve(out).then(() => t.end())
      } else {
        t.end()
      }
    })
  }
}
