import * as patterns from './patterns.js'
import * as parser from './parser.js'
import * as index from './index.js'
const tape = require('tape')

const expecter = (t) => {
  const f = (value) => ({
    toEqual: (expected) => t.deepEquals(value, expected),
    toThrow: () => t.throws(value)
  })
  f.comment = (comment) => t.comment(comment)
  return f
}

const tester = (tape, key, cb) => {
  if (!/^test_/.test(key)) { return }
  const test = /only$/.test(key) ? tape.only : tape
  const message = key.replace('test_', '').replace(/_/g, ' ')
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
