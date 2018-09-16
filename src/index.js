// # DatEx: JavaScript Data Expressions
//
// DatEx is a library for matching, searching, and immutably updating JavaScript data with tagged template strings.
//
// ```js
// dx`.foo.bar`.test({ foo: { bar: 3 } }) // => true
// dx`.foo.bar`.match({ foo: { bar: 3 } }) // => [3]
// dx`.foo.bar`.replace({ foo: { bar: 3 }}, 5) // { foo: { bar: 5 } }
// ```
export {
  id, fail, key, index, slice, where, value, regex, spread, recursive, collect, project, and, alt, seq,
  object, array, arrayOf, typeOf, instanceOf, number, string, func, bool, symbol, date
} from './patterns.js'
export { test, match, replace, exec } from './operations.js'
export { parse, compile, dx } from './parser.js'
