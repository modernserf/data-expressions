// # DatEx: JavaScript Data Expressions
//
// DatEx is a library for matching, searching, and immutably updating JavaScript data with tagged template strings.

// ## Examples
import { dx } from './parser.js'

export function test_example_1 (expect) {
  // Test if value matches a pattern:
  expect(dx`.foo.bar`.test({ foo: { bar: 3 } }))
    .toEqual(true)
  // Search value for a pattern, and return the results:
  expect(dx`.foo.bar`.match1({ foo: { bar: 3 } }))
    .toEqual(3)
  // Immutably replace values where a pattern matches:
  expect(dx`.foo.bar`.replace({ foo: { bar: 3 } }, 5))
    .toEqual({ foo: { bar: 5 } })
}

export {
  id, fail, key, index, slice, where, value, regex, spread, recursive, collect, project, and, alt, seq,
  object, array, arrayOf, typeOf, instanceOf, number, string, func, bool, symbol, date
} from './patterns.js'
export { test, match, replace, exec } from './operations.js'
export { parse, compile, dx } from './parser.js'
