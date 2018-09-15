import * as lenses from './lenses.js'
import * as parser from './parser.js'
const tape = require('tape')

for (const dep of [lenses, parser]) {
  for (const key in dep) {
    if (/^test_/.test(key)) {
      tape(key.replace('test_', '').replace(/_/g, ' '), dep[key])
    }
  }
}
