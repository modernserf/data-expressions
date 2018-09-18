// # Patterns
import { test, match, replace, updateAll } from './operations.js'

// Just as regex are composed from patterns that match strings, datex are composed from patterns that match data structures. Some of these patterns match the data directly, while others -- much like the `|`, `+` and `*` in regular expressions, are used to combine these patterns.
// Datex are implemented as ES6 generators. A **pattern**, when called with a **focus**, will **yield** an object with the shape `{ match, replace }` for every match. If the generator yields no results, the match has **failed**; otherwise it has **succeeded**.

// ## Basic Patterns

// ### `${where(fn)}`
export const where = (fn) => function * (focus) {
  if (fn(focus)) {
    yield { match: focus, replace: (value) => value }
  }
}

// `.test` succeeds if the function returns true, and fails if it returns false.
export function test_where (expect, dx) {
  expect(dx`${where((x) => x > 10)}`.test(100))
    .toEqual(true)
  expect(dx`${where((x) => x > 10)}`.test(1))
    .toEqual(false)
}

// `.match` yields the focus if the function returns true, and nothing if it returns false.
export function test_where_match (expect, dx) {
  expect([...dx`${where((x) => x > 10)}`.matchAll(100)])
    .toEqual([100])
  expect([...dx`${where((x) => x > 10)}`.matchAll(1)])
    .toEqual([])
}

// `.replace` returns the replacement value if the function returns true, and the focus if it returns false.
export function test_where_replace (expect, dx) {
  expect(dx`${where((x) => x > 10)}`.replace(100, 500))
    .toEqual(500)
  expect(dx`${where((x) => x > 10)}`.replace(1, 500))
    .toEqual(1)
}

// ---

// ### `${id}`, `_`
// Always succeeds. Useful as a placeholder in complex expressions.
export const id = where(() => true)

// `.match` will always return the focus; `.replace` will always return the replacement value.
export function test_id (expect, dx) {
  expect(dx`_`.match({ foo: 1 })).toEqual({ foo: 1 })
  expect(dx`_`.replace({ foo: 1 }, { bar: 2 })).toEqual({ bar: 2 })
}

//  ---

// ### `${fail}`
// Always fails. Not useful on its own, but can be used for halting/pruning large match result sets.
export function * fail () {}
export function test_fail (expect, dx) {
  expect(dx`_ ${fail}`.test('foo')).toEqual(false)
}

// ---

// ### `${value(x)}`, `"foo"`, `1`, `${primitive value}`
// Succeed if the focus `===` the value.
export const value = (val) => where((x) => x === val)

// Double-quoted strings and numbers can be written in the data expression directly.
export function test_value_literal (expect, dx) {
  expect(dx`"foo"`.test('foo')).toEqual(true)
  expect(dx`1`.test(1)).toEqual(true)
}
// Any JS primitives (strings, numbers, bools, symbols) interpolated into the data expression will act as a value pattern.
export function test_value_interpolation (expect, dx) {
  expect(dx`${1}`.test(1)).toEqual(true)
  const sym = Symbol('a symbol')
  expect(dx`${sym}`.test(sym)).toEqual(true)
}
// Complex data structures cannot be directly interpolated (they're interpreted as other patterns) but they can be "escaped" with `value` for testing reference equality.
export function test_value_escaped (expect, dx) {
  const fn = function () {}
  expect(dx`${value(fn)}`.test(fn)).toEqual(true)
}

// ---

// ### Type patterns
// Succeeds if the focus has this type.
export const typeOf = (type) => where((x) => typeof x === type) // eslint-disable-line valid-typeof
export const instanceOf = (Type) => where((x) => x instanceof Type)
export const number = typeOf('number')
export const string = typeOf('string')
export const bool = typeOf('boolean')
export const func = typeOf('function')
export const symbol = typeOf('symbol')
export const object = where((x) => x && typeof x === 'object')
export const array = where(Array.isArray)
export const date = where((x) => x && typeof x.getTime === 'function')

export function test_type_patterns (expect, dx) {
  expect(dx`${number}`.test(123)).toEqual(true)
  expect(dx`${string}`.test('foo')).toEqual(true)
  expect(dx`${object}`.test({ foo: 123 })).toEqual(true)
  expect(dx`${object}`.test(null)).toEqual(false)
}

// ---

// ## Lenses
// These patterns match a _subsection_ of a structure, and `replace` returns a structure with only that subsection replaced.

// ### `${key("foo")}`, `.foo`, `."foo"`,`.${"foo"}`
// If the focus has the property `foo`, yields `focus.foo`.
export const key = (key) => function * (focus) {
  if (hasKey(focus, key)) {
    yield {
      match: focus[key],
      replace: (value) => ({ ...focus, [key]: value })
    }
  }
}
function hasKey (focus, key) {
  if (!focus || typeof focus !== 'object') { return false }
  return key in focus
}

// `.match` returns the field at `key` if its present, otherwise it fails.
export function test_key (expect, dx) {
  expect(dx`.foo`.match({ foo: { bar: 1 } }))
    .toEqual({ bar: 1 })
  expect(dx`.foo`.match({ baz: 2 }))
    .toEqual(undefined)
}

// `.replace` returns the object with the value at `key` updated if it the pattern succeeds, otherwise it returns the original object.
export function test_key_replace (expect, dx) {
  expect(dx`.foo`.replace({ foo: { bar: 1 } }, { quux: 2 }))
    .toEqual({ foo: { quux: 2 } })
  expect(dx`.foo`.replace({ baz: 2 }, { quux: 2 }))
    .toEqual({ baz: 2 })
}

// ---

// ### `${key.optional("foo")}`, `.foo?`, `."foo"?`, `.${"foo"}?`
// A key followed by `?` will always succeed.
key.optional = (key) => function * (focus) {
  yield {
    match: focus[key],
    replace: (value) => ({ ...focus, [key]: value })
  }
}

export function test_key_optional (expect, dx) {
  expect(dx`.baz?`.test({ foo: { bar: 1 } }))
    .toEqual(true)
  expect(dx`.baz?`.match({ foo: { bar: 1 } }))
    .toEqual(undefined)
}

// If the key is not present in the object, `.replace` will insert the value to the structure.
export function test_key_optional_replace (expect, dx) {
  expect(dx`.baz?`.replace({ foo: { bar: 1 } }, { quux: 2 }))
    .toEqual({ foo: { bar: 1 }, baz: { quux: 2 } })
}

// ---

// ### `${index(1)}`, `.1` , `.${1}`
// Use the value at index `1` in an array.
export const index = (i) => function * (focus) {
  if (i < 0) { i = focus.length + i } // allow indexing from end

  if (i in focus) {
    yield {
      match: focus[i],
      replace: (value) => {
        const copy = focus.slice(0)
        copy[i] = value
        return copy
      }
    }
  }
}

// Match and replace values at the index of the array.
export function test_index (expect, dx) {
  expect(dx`.1`.match(['foo', 'bar', 'baz']))
    .toEqual('bar')
  expect(dx`.1`.replace(['foo', 'bar', 'baz'], 'quux'))
    .toEqual(['foo', 'quux', 'baz'])
}

// You can also match and replace values from the _end_ of the array, using negative indexes.
export function test_index_negative (expect, dx) {
  expect(dx`.-1`.match(['foo', 'bar', 'baz']))
    .toEqual('baz')
  expect(dx`.-1`.replace(['foo', 'bar', 'baz'], 'quux'))
    .toEqual(['foo', 'bar', 'quux'])
}

// The pattern fails if the index is beyond the bounds of the array.
export function test_index_fail (expect, dx) {
  expect(dx`.5`.test(['foo', 'bar', 'baz']))
    .toEqual(false)
  expect(dx`.5`.replace(['foo', 'bar', 'baz'], 'quux'))
    .toEqual(['foo', 'bar', 'baz'])
}

// ---

// ### `${index.optional(1)}`,  `.1?` , `.${number}?`
// As with keys, an index followed by `?` will always succeed.
index.optional = (i) => function * (focus) {
  if (i < 0) { i = focus.length + i }

  yield {
    match: focus[i],
    replace: (value) => {
      const copy = focus.slice(0)
      copy[i] = value
      return Array.from(copy)
    }
  }
}

// `.test` will always return true, and `.replace` will fill the array with `undefined` to that index.
export function test_index_optional (expect, dx) {
  expect(dx`.5?`.test(['foo', 'bar', 'baz']))
    .toEqual(true)
  expect(dx`.5?`.replace(['foo', 'bar', 'baz'], 'quux'))
    .toEqual(['foo', 'bar', 'baz', undefined, undefined, 'quux'])
}

// ---

// ### `${slice(from, to)}`, `.[1:3]`, `.[${from}:${to}]`
// Yields the slice of the array or string.
export const slice = (start, end) => function * (focus) {
  yield {
    match: focus.slice(start, end),
    replace: (value) => [
      ...focus.slice(0, start),
      ...value,
      ...focus.slice(end)
    ]
  }
}
// Start and end values are optional, and can index from the end with negative numbers.
export function test_slice (expect, dx) {
  expect(dx`.[1:]`.match(['foo', 'bar', 'baz']))
    .toEqual(['bar', 'baz'])
  expect(dx`.[:2]`.match(['foo', 'bar', 'baz']))
    .toEqual(['foo', 'bar'])
  expect(dx`.[-1:]`.match(['foo', 'bar', 'baz']))
    .toEqual(['baz'])
}

// `.replace` can insert an arbitrary number of values in place of the slice.
export function test_slice_replace (expect, dx) {
  expect(dx`.[1:3]`.replace(['foo', 'bar', 'baz', 'quux'], []))
    .toEqual(['foo', 'quux'])
  expect(dx`.[2:2]`.replace(['foo', 'bar', 'baz', 'quux'], [1, 2, 3, 4, 5]))
    .toEqual(['foo', 'bar', 1, 2, 3, 4, 5, 'baz', 'quux'])
}

// ---

// ## Traversals
// These patterns can yield multiple results.
//
// _TODO: how should multiple `replace` work?_

// ### `${regex(/^foo+/)}`, `${/^foo+/}`
// Regular expressions can be used for matching strings.
export const regex = (re) => function * (focus) {
  re = new RegExp(re) // "fresh" regex on every invocation
  let match = re.exec(focus)
  if (!match) { return }
  yield {
    match: match[0],
    replace: (val) => focus.replace(new RegExp(re), val)
  }

  // handle stateful regexes
  if (re.global || re.sticky) {
    while (match = re.exec(focus)) { // eslint-disable-line no-cond-assign
      let lastIndex = match.lastIndex
      yield {
        match: match[0],
        replace: (val) => {
          // apply the replacement at match position,
          // but don't mutate match regex
          const reCopy = new RegExp(re)
          reCopy.lastIndex = lastIndex
          return focus.replace(reCopy, val)
        }
      }
    }
  }
}
export function test_regex (expect, dx) {
  expect(dx`${/f../}`.match('foobar')).toEqual('foo')
  expect(dx`${/f../}`.replace('foobar', 'baz')).toEqual('bazbar')
}

// RegEx with the `/g` and `/y` flags can yield multiple matches.
export function test_regex_multiple (expect, dx) {
  expect.comment('TODO: reasonable behavior for regex/g.replace')
  expect([...dx`${/h./g}`.matchAll('ha ho he hi')])
    .toEqual(['ha', 'ho', 'he', 'hi'])
}

// ---

// ### `${spread}`, `*`
// Yield all values of an array or object.
export function * spread (focus) {
  for (const [lens] of lensesForStructure(focus)) {
    yield * lens(focus)
  }
}
export function test_spread (expect, dx) {
  expect([...dx`*`.matchAll([1, 2, 3])])
    .toEqual([1, 2, 3])
  expect([...dx`*`.matchAll({ foo: 1, bar: 2, baz: 3 })])
    .toEqual([1, 2, 3])
}

// Subsequent patterns can filter these results.
export function test_spread_seq (expect, dx) {
  expect([...dx`* ${number}`.matchAll([1, 'foo', 2, 'bar'])])
    .toEqual([1, 2])
}

// ---
// ### `${recursive}`, `**`
// Yield all values of an array or object recursively.
export const recursive = (focus) => _recursive(focus, 1)
recursive.maxVisits = (maxVisits) =>
  (focus) => _recursive(focus, maxVisits)
function * _recursive (focus, maxVisits) {
  const visited = new Map()
  const q = [[id, focus]]
  for (const [lens, node] of q) {
    // prevent infinite recursion
    const visitCount = visited.get(node) || 0
    if (visitCount >= maxVisits) { continue }
    visited.set(node, visitCount + 1)

    yield * lens(focus)
    // yes, you can modify an array while you're iterating over it
    for (const [childLens, childNode] of lensesForStructure(node)) {
      q.push([seq(lens, childLens), childNode])
    }
  }
}

// `.matchAll` yields items in breadth-first order, starting with itself.
export function test_recursive (expect, dx) {
  expect([...dx`**`.matchAll({ foo: 1, bar: [2, { baz: 3 }] })])
    .toEqual([
      { foo: 1, bar: [2, { baz: 3 }] },
      1,
      [2, { baz: 3 }],
      2,
      { baz: 3 },
      3
    ])
}
// The recursive pattern combines with other patterns for deep-search effects.
export function test_recursive_search (expect, dx) {
  expect(dx`** .baz`.match({ foo: 1, bar: [2, { baz: 3 }] }))
    .toEqual(3)
}

// ## Combinators
// These functions operate on the patterns themselves, and return new patterns.
// Patterns can be grouped with parentheses. Otherwise, `.foo & .bar .baz | .quux .xyzzy` groups as `(.foo & (.bar .baz)) | (.quux .xyyzy)`.

export const arrayOf = (lens) => function * (focus) {
  for (const item of focus) {
    if (!test(lens, item)) { return }
  }
  yield * id(focus)
}
export function test_arrayOf (expect) {
  const lens = arrayOf(key('foo'))
  expect(test(lens, [{ foo: 1 }, { foo: 2 }])).toEqual(true)
  expect(test(lens, [{ foo: 1 }, { bar: 2 }])).toEqual(false)
}

export const collect = (x, reducer = defaultReducer) => function * (focus) {
  let collected
  for (const lens of x(focus)) {
    collected = reducer(collected, lens)
  }
  yield collected
}
function defaultReducer (l = { match: [], replace: () => [] }, r) {
  return {
    match: l.match.concat([r.match]),
    replace: (value) => l.replace(value).concat([r.replace(value)])
  }
}

export function test_collect (expect) {
  const lens = collect(alt(key('foo'), key('bar')))
  const [res] = match(lens, { foo: 1, bar: 2, baz: 3 })
  expect(res).toEqual([1, 2],
    'collect.match returns an array of results')
  const [res2] = match(lens, { foo: 1, quux: 2 })
  expect(res2).toEqual([1],
    'collect.match propagates failure')
  const out = replace(lens, { foo: 1, bar: 2, baz: 3 }, 10)
  expect(out).toEqual([
    { foo: 10, bar: 2, baz: 3 },
    { foo: 1, bar: 10, baz: 3 }
  ], 'collect.replace returns an array of results')
}

export const project = (fn) => function * (focus) {
  yield {
    match: fn(focus),
    replace: (value) => value
  }
}
export function test_project (expect) {
  const lens = project((x) => x.toUpperCase())
  const [res] = match(lens, 'foo')
  expect(res).toEqual('FOO')
  const out = replace(lens, 'foo', 'bar')
  expect(out).toEqual('bar')
}

// `${x} | ${y}`
// Try both patterns on a value. Note that `.match` returns an iterator, and will return _both_ results, if they both succeed; `.replace` will replace the _first_ that succeeds.
export const alt = (x, y) => function * (focus) {
  yield * x(focus)
  yield * y(focus)
}
export function test_alt (expect) {
  const lens = alt(key('foo'), key('bar'))
  const [res] = match(lens, { foo: 1, baz: 3 })
  expect(res).toEqual(1,
    'alt.match returns first on success')
  const [res2] = match(lens, { bar: 2, baz: 3 })
  expect(res2).toEqual(2,
    'alt.match returns second if first fails')
  expect(test(lens, { baz: 3 })).toEqual(false)
  // 'alt.match fails if both fail')
  const out = replace(lens, { foo: 1, baz: 3 }, 10)
  expect(out).toEqual({ foo: 10, baz: 3 },
    'alt.replace on first item')
  const out2 = replace(lens, { bar: 2, baz: 3 }, 10)
  expect(out2).toEqual({ bar: 10, baz: 3 },
    'alt.replace on second item')
  const [...out3] = updateAll(lens, { foo: 1, bar: 2, baz: 3 }, () => 10)
  expect(out3).toEqual([
    { foo: 10, bar: 2, baz: 3 },
    { foo: 1, bar: 10, baz: 3 }
  ], 'alt.replace returns multiple items on success')
}

// `${x} & ${y}`
// If the left pattern succeeds, try the right pattern on the focus.
export const and = (x, y) => function * (focus) {
  for (const _ of x(focus)) {
    yield * y(focus)
  }
}
export function test_and (expect) {
  const lens = and(key('foo'), key('bar'))
  const [res] = match(lens, { foo: 1, bar: 2 })
  expect(res).toEqual(2)
  expect(test(lens, { bar: 2, quux: 3 })).toEqual(false)
  const out = replace(lens, { foo: 1, bar: 2 }, 4)
  expect(out).toEqual({ foo: 1, bar: 4 })
}

// `.foo.bar` , `.foo .bar`
// You can chain sequences of patterns. Whitespace between patterns is optional.
export const seq = (x, y) => function * (focus) {
  for (const outer of x(focus)) {
    for (const inner of y(outer.match)) {
      yield {
        match: inner.match,
        replace: (value) => outer.replace(inner.replace(value))
      }
    }
  }
}
export function test_seq (expect) {
  const lens = seq(key('foo'), key('bar'))
  const [res] = match(lens, { foo: { bar: 1 } })
  expect(res).toEqual(1,
    'seq.match traverses structures')
  const out = replace(lens, { foo: { bar: 1 } }, 2)
  expect(out).toEqual({ foo: { bar: 2 } },
    'seq.replace traverses structures')
  const lens2 = seq(recursive, key('bar'))
  const out2 = replace(lens2, { foo: { quux: { flerb: { bar: 1 } } } }, 2)
  expect(out2).toEqual({ foo: { quux: { flerb: { bar: 2 } } } },
    'seq.replace recursive updates')
}

function lensesForStructure (value) {
  if (Array.isArray(value)) {
    return value.map((val, i) =>
      [index(i), val])
  } else if (value && typeof value === 'object') {
    return Object.keys(value).map((k) =>
      [key(k), value[k]])
  } else {
    return []
  }
}

// does this have to be an _operator_, instead of a generator?
export const limit = (lens, maxCount = 1) => function * (focus) {
  let count = 0
  for (const item of lens(focus)) {
    if (maxCount <= count) { return }
    yield item
    count++
  }
}

// ---

// ## Structure patterns
// These patterns match the shapes of structures.

// ### `{foo: ${x}, bar?: ${y}, ...${z} }`
// Succeeds if focus is an object where _all_ fields match the patterns at the corresponding key. Keys can also be _optional_ -- if the key is present in the focus, it must match; otherwise it is skipped. Replacement propagates _through_ the object's fields.
export const objectShape = (entries) => {
  if (!entries.some((e) => e.type === 'RestEntry')) {
    entries = entries.concat([objectInit])
  }
  return entries.reduceRight(entryReducer)
}
const entryReducer = (acc, entry) => function * (focus) {
  if (entry.type === 'RestEntry') {
    yield * entry.value(focus)
    return
  }
  const { key, value: pattern, optional } = entry

  if (!hasKey(focus, key)) {
    if (optional) { yield * acc(focus) }
    return
  }
  const { [key]: keyFocus, ...restFocus } = focus
  for (const outer of acc(restFocus)) {
    for (const inner of pattern(keyFocus)) {
      yield {
        match: { ...outer.match, [key]: inner.match },
        replace: (value) => ({
          ...outer.replace(value),
          [key]: inner.replace(value[key])
        })
      }
    }
  }
}
const objectInit = (focus) => [{ match: {}, replace: (value) => ({ ...focus, ...value }) }]

// The pattern succeeds if all fields succeed.
export function test_objectShape (expect, dx) {
  expect(dx`{foo: ${number}, bar: ${string}}`
    .test({ foo: 10, bar: 'a string', baz: ['else'] })).toEqual(true)
}
// Match returns only the matched fields.
export function test_objectShape_match (expect, dx) {
  expect(dx`{foo: ${number}, bar: ${string}}`
    .match({ foo: 10, bar: 'a string', baz: ['else'] }))
    .toEqual({ foo: 10, bar: 'a string' })
}
// Replace merges the replacement values onto the object.
export function test_objectShape_merge (expect, dx) {
  expect(dx`{foo: ${number}, bar: ${string}}`
    .replace({ foo: 10, bar: 'a string', baz: ['else'] },
      { foo: 20, bar: 'flerb', quux: 100 }))
    .toEqual({ foo: 20, bar: 'flerb', baz: ['else'], quux: 100 })
}
// The pattern fails if a field is missing from the focus, or its pattern fails.
export function test_objectShape_fail (expect, dx) {
  expect(dx`{foo: ${number}, bar: ${string}}`
    .test({ foo: 20 })).toEqual(false)
  expect(dx`{foo: ${number}, bar: ${string}}`
    .test({ foo: 'not a number', bar: 'a string' })).toEqual(false)
}
// `id` or `_` can test for the presence of a field, regardless of the value.
export function test_objectShape_placeholder (expect, dx) {
  expect(dx`{type: ${string}, payload: _}`
    .test({ type: 'foo', payload: [1, 2, 3] })).toEqual(true)
  expect(dx`{type: ${string}, payload: _}`
    .test({ type: 'bar', payload: 42, error: false })).toEqual(true)
}
// Patterns can have optional fields, marked with `?`.
export function test_objectShape_optional (expect, dx) {
  expect(dx`{foo: ${number}, bar?: ${string}}`.test({ foo: 123 })).toEqual(true)
  expect(dx`{foo: ${number}, bar?: ${string}}`
    .replace({ foo: 123, baz: 789 }, { foo: 456 })).toEqual({ foo: 456, baz: 789 })
}
// The pattern will still fail if the field is present on the focus but its pattern doesn't match.
export function test_objectShape_optional_faile (expect, dx) {
  expect(dx`{foo: ${number}, bar?: ${string}}`.test({ foo: 123, bar: 456 })).toEqual(false)
}

export function skip_test_objectShape_additional (expect) {
  expect.comment('TODO: rest patterns, lens/traversal propagation, multiple rests, `...{exact}` ')
}

// ---

// # `[${x}, ${y}, ...${rest}]`
// Succeeds if every pattern matches the value at that index or for the rest of the array.

export const arrayShape = (array, rest) => function * (focus) {
  if (array.length > focus.length) { return }
  if ((array.length < focus.length) && !rest) { return }

  const head = array.reduce(arrayReducer, arrayInit)
  if (rest) {
    for (const h of head(focus)) {
      for (const r of rest(focus.slice(array.length))) {
        yield {
          match: h.match.concat(r.match),
          replace: (value) => h.replace(value)
            .concat(r.replace(value.slice(array.length)))
        }
      }
    }
  } else {
    yield * head(focus)
  }
}
function * arrayInit () {
  yield { match: [], replace: () => [] }
}

const arrayReducer = (acc, lens, index) => function * (focus) {
  for (const base of acc(focus)) {
    for (const inner of lens(focus[index])) {
      yield {
        match: base.match.concat([inner.match]),
        replace: (value) => base.replace(value)
          .concat([inner.replace(value[index])])
      }
    }
  }
}

export function test_array (expect) {
  const lens = arrayShape([value('foo'), number])
  const [res] = match(lens, ['foo', 1])
  expect(res).toEqual(['foo', 1])
  const out = replace(lens, ['foo', 1], ['bar', 10])
  expect(out).toEqual(['bar', 10])
}
export function test_array_rest (expect) {
  const lens = arrayShape([value('foo')], arrayOf(number))
  const [res] = match(lens, ['foo', 1, 2, 3])
  expect(res).toEqual(['foo', 1, 2, 3])
}
