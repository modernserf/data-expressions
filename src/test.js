import * as patterns from './patterns.js'
import * as parser from './parser.js'
import * as index from './index.js'
const tape = require('tape')

// Use Jasmine-style `expect(value).toEqual(expected)` test assertions.
const expecter = (t) => {
  const f = (value) => ({
    toEqual: (expected) => t.deepEquals(value, expected),
    toThrow: () => t.throws(value)
  })
  f.comment = (comment) => t.comment(comment)
  return f
}

// Use the exported function's name to determine if it's a test, and if it should be skipped/isolated
const tester = (tape, key, cb) => {
  const test = /^only_test_/.test(key) ? tape.only
    : /^skip_test_/.test(key) ? tape.skip
      : /^test_/.test(key) ? tape
        : null
  if (!test) { return }
  const message = key.replace(/^(skip_|only_)?test_/, '').replace(/_/g, ' ')
  return test(message, cb)
}

for (const dep of [patterns, parser, index]) {
  for (const key in dep) {
    tester(tape, key, (t) => {
      const out = dep[key](expecter(t))
      if (out) {
        Promise.resolve(out).then(() => t.end())
      } else {
        t.end()
      }
    })
  }
}
