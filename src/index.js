// # DatEx: JavaScript Data Expressions
//
// DatEx is a library for matching, searching, and immutably updating JavaScript data with tagged template strings.

// ## Examples
// Test if value matches a pattern:
export function test_dx_test (expect, dx) {
  expect(dx`.foo.bar`.test({ foo: { bar: 3 } }))
    .toEqual(true)
}
// Search value for a pattern, and return the results:
export function test_dx_match (expect, dx) {
  expect(dx`.foo.bar`.match({ foo: { bar: 3 } }))
    .toEqual(3)
}
// Immutably replace values where a pattern matches:
export function test_dx_replace (expect, dx) {
  expect(dx`.foo.bar`.replace({ foo: { bar: 3 } }, 5))
    .toEqual({ foo: { bar: 5 } })
}

// ## API Reference

// ### [Patterns](patterns.html)
export { id, fail, key, index, slice, where, value, regex, spread, recursive, collect, lens, and, alt, seq, objectShape, arrayShape, typeOf, instanceOf, number, string, func, func as function, bool, bool as boolean, symbol, date } from './patterns.js'

// ### [Operations](operations.html)
export { test, match, replace, updateAll } from './operations.js'

// ### [Parser](parser.html)
export { parse, compile, dx } from './parser.js'

// ---
// ©2018 [Justin Falcone](https://justinfalcone.com/) | [DatEx on GitHub](https://github.com/modernserf/data-expressions) | [@modernserf](https://twitter.com/modernserf)
