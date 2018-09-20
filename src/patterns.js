// # Patterns
// Just as regex are composed from patterns that match strings, datex are composed from patterns that match data structures. Some of these patterns match the data directly, while others -- much like the `|`, `+` and `*` in regular expressions, are used to combine these patterns.
// Datex are implemented as ES6 generators. A **pattern**, when called with a **focus**, will **yield** an object with the shape `{ match, replace }` for every match. If the generator yields no results, the match has **failed**; otherwise it has **succeeded**.

// ## Basic Patterns

// ### `${where(fn)}`
export const where = (fn) => function * (focus) {
  if (fn(focus)) {
    yield { match: focus, replace: (fn) => fn(focus) }
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

// ### `${id}`, `_`
// Always succeeds. Useful as a placeholder in complex expressions.
export const id = where(() => true)

// `.match` will always return the focus; `.replace` will always return the replacement value.
export function test_id (expect, dx) {
  expect(dx`_`.match({ foo: 1 })).toEqual({ foo: 1 })
  expect(dx`_`.replace({ foo: 1 }, { bar: 2 })).toEqual({ bar: 2 })
}

// ### `${fail}`
// Always fails. Not useful on its own, but can be used for halting/pruning large match result sets.
export function * fail () {}
export function test_fail (expect, dx) {
  expect(dx`_ ${fail}`.test('foo')).toEqual(false)
}

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

// ## Lens patterns
// These patterns match a _subsection_ of a structure, and `replace` returns a structure with only that subsection replaced.

// ### `${key("foo")}`, `.foo`, `."foo"`,`.${"foo"}`
// If the focus has the property `foo`, yields `focus.foo`.
export const key = (key, optional = false) => function * (focus) {
  if (hasKey(focus, key) || optional) {
    yield {
      match: focus[key],
      replace: (fn) => ({ ...focus, [key]: fn(focus[key]) })
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

// #### `${key("foo", true)}`, `.foo?`, `."foo"?`, `.${"foo"}?`
// A key followed by `?` will always succeed.
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

// ### `${index(1)}`, `.1` , `.${1}`
// Use the value at index `1` in an array.
export const index = (i, optional = false) => function * (focus) {
  if (i < 0) { i = focus.length + i } // allow indexing from end

  if ((i in focus) || optional) {
    yield {
      match: focus[i],
      replace: (fn) => {
        const copy = focus.slice(0)
        copy[i] = fn(focus[i])
        return Array.from(copy)
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

// #### `${index(1, true)}`,  `.1?` , `.${number}?`
// As with keys, an index followed by `?` will always succeed. `.test` will always return true, and `.replace` will fill the array with `undefined` to that index.
export function test_index_optional (expect, dx) {
  expect(dx`.5?`.test(['foo', 'bar', 'baz']))
    .toEqual(true)
  expect(dx`.5?`.replace(['foo', 'bar', 'baz'], 'quux'))
    .toEqual(['foo', 'bar', 'baz', undefined, undefined, 'quux'])
}

// ### `${slice(from, to)}`, `.[1:3]`, `.[${from}:${to}]`
// Yields the slice of the array or string.
export const slice = (start, end) => function * (focus) {
  const match = focus.slice(start, end)
  yield {
    match,
    replace: (fn) => [
      ...focus.slice(0, start),
      ...fn(match),
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

// ### `${lens(getter, setter)}`
// Make a custom lens pattern from "getter" and "setter" functions.
// If the match should fail, throw from in the getter function.
export const lens = (get, set = (x) => x) => function * (focus) {
  try {
    const match = get(focus)
    yield { match, replace: (fn) => set(focus, fn(focus)) }
  } catch (e) {}
}
export function test_lens (expect, dx) {
  const mapKey = (key) => lens(
    (map) => {
      if (!map.has(key)) { throw new Error() }
      return map.get(key)
    },
    (map, value) => {
      return new Map(map).set(key, value)
    }
  )
  expect(dx`${mapKey('foo')}`.match(new Map([['foo', 1]])))
    .toEqual(1)
  expect(dx`${mapKey('foo')}`.test(new Map([['bar', 2]])))
    .toEqual(false)
  expect(dx`${mapKey('foo')}`.replace(new Map([['foo', 1]]), 10))
    .toEqual(new Map([['foo', 10]]))
  expect(dx`${mapKey('foo')}`.replace(new Map([['bar', 2]]), 10))
    .toEqual(new Map([['bar', 2]]))
}

// ## Traversal patterns
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
    replace: (fn) => focus.replace(new RegExp(re), fn)
  }

  // handle stateful regexes
  if (re.global || re.sticky) {
    while (match = re.exec(focus)) { // eslint-disable-line no-cond-assign
      let lastIndex = match.lastIndex
      yield {
        match: match[0],
        replace: (fn) => {
          // apply the replacement at match position,
          // but don't mutate match regex
          const reCopy = new RegExp(re)
          reCopy.lastIndex = lastIndex
          return focus.replace(reCopy, fn)
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

// ### `${spread}`, `*`
// Yield all values of an array or object.
export function * spread (focus) {
  for (const [pattern] of lensesForStructure(focus)) {
    yield * pattern(focus)
  }
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

// ### `${recursive}`, `**`
// Yield all values of an array or object recursively.
export const recursive = (focus) => _recursive(focus, 1)
recursive.maxVisits = (maxVisits) =>
  (focus) => _recursive(focus, maxVisits)
function * _recursive (focus, maxVisits) {
  const visited = new Map()
  const q = [[id, focus]]
  for (const [pattern, node] of q) {
    // prevent infinite recursion
    const visitCount = visited.get(node) || 0
    if (visitCount >= maxVisits) { continue }
    visited.set(node, visitCount + 1)

    yield * pattern(focus)
    // yes, you can modify an array while you're iterating over it
    for (const [childpattern, childNode] of lensesForStructure(node)) {
      q.push([seq(pattern, childpattern), childNode])
    }
  }
}

// `.matchAll` yields items in breadth-first order, starting with itself.
export function test_recursive (expect, dx) {
  expect([...dx`**`.matchAll({ foo: 1, bar: [2, { baz: 3 }] })]).toEqual([
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
// Combinators are functions that combine patterns into new ones.

// ### `${seq(patterns...)}`,`.foo.bar` , `.foo .bar`
// Chain sequences of patterns. Whitespace between patterns is optional.
export const seq = (...xs) => xs.reduce(_seq, id)
const _seq = (x, y) => function * (focus) {
  for (const outer of x(focus)) {
    for (const inner of y(outer.match)) {
      yield {
        match: inner.match,
        replace: (fn) => outer.replace(() => inner.replace(fn))
      }
    }
  }
}

// `.match` succeeds if each pattern in the sequence succeeds
export function test_seq (expect, dx) {
  const fizz = where((x) => x % 3 === 0)
  const buzz = where((x) => x % 5 === 0)
  expect(dx`${fizz} ${buzz}`.test(15)).toEqual(true)
  expect(dx`${fizz} ${buzz}`.test(5)).toEqual(false)
}

// The output of each pattern in the sequence is the input to the following pattern. You can use this with lenses to match and replace deep into structures.
export function test_seq_pattern (expect, dx) {
  expect(dx`.foo .bar`.match({ foo: { bar: 'hello' } }))
    .toEqual('hello')
  expect(dx`.foo .bar`.replace({ foo: { bar: 'hello' } }, 'goodbye'))
    .toEqual({ foo: { bar: 'goodbye' } })
}

// ### `${alt(patterns...)}`, `.foo | .bar`
// Match multiple patterns on a value.
export const alt = (...xs) => function * (focus) {
  for (const x of xs) {
    yield * x(focus)
  }
}
export function test_alt (expect, dx) {
  const fizz = where((x) => x % 3 === 0)
  const buzz = where((x) => x % 5 === 0)
  expect(dx`${fizz} | ${buzz}`.test(15)).toEqual(true)
  expect(dx`${fizz} | ${buzz}`.test(3)).toEqual(true)
  expect(dx`${fizz} | ${buzz}`.test(5)).toEqual(true)
  expect(dx`${fizz} | ${buzz}`.test(7)).toEqual(false)
}

// Note that `.matchAll` returns an iterator, and will return _both_ results if they both succeed.
export function test_alt_match (expect, dx) {
  expect(dx`.foo | .bar`.match({ foo: 1, baz: 3 }))
    .toEqual(1)
  expect(dx`.foo | .bar`.match({ bar: 2, quux: 4 }))
    .toEqual(2)
  expect([...dx`.foo | .bar`.matchAll({ foo: 1, bar: 2 })])
    .toEqual([1, 2])
}

// Parentheses can be used to group `|` in sequences.
export function test_alt_operator_precedence (expect, dx) {
  expect(dx`.foo .bar | .baz`.match({ foo: 1, bar: 2, baz: 3 }))
    .toEqual(3)
  expect(dx`.foo (.bar | .baz)`.match({ foo: { bar: 2 }, baz: 3 }))
    .toEqual(2)
}

// TODO: multiple replacement

// ### `${and(pattern)}`, `${pattern} &`

// If the pattern succeeds, yield the focus instead of the result.
export const and = (x) => function * (focus) {
  for (const _ of x(focus)) {
    yield * id(focus)
    return
  }
}

export function test_and (expect, dx) {
  expect(dx`.foo &`.match({ foo: 1, bar: 2 }))
    .toEqual({ foo: 1, bar: 2 })
  expect(dx`.foo & .bar`.match({ foo: 1, bar: 2 }))
    .toEqual(2)
  expect(dx`.foo & .bar`.test({ bar: 2 }))
    .toEqual(false)
}

// ### `${limit(pattern, maxCount=1)}`, `${pattern} !`

export const limit = (pattern, maxCount = 1) => function * (focus) {
  let count = 0
  for (const item of pattern(focus)) {
    if (maxCount <= count) { return }
    yield item
    count++
  }
}

// Limit the number of results a pattern can return. The operator form limits to 1 match.
export function test_limit (expect, dx) {
  expect([...dx`(.foo | .bar)! .baz`.matchAll({ foo: { baz: 1 }, bar: { baz: 2 } })])
    .toEqual([1])
}

// This can "commit" a match to a particular branch once it succeeds:
export function test_limit_commit (expect, dx) {
  expect(dx`(.foo | .bar) .baz`.test({ foo: 1, bar: { baz: 2 } }))
    .toEqual(true)
  expect(dx`(.foo | .bar)! .baz`.test({ foo: 1, bar: { baz: 2 } }))
    .toEqual(false)
}

// ### `${collect(pattern)}`
// Combine multiple match results into a single array.
export const collect = (x, reducer = defaultReducer) => function * (focus) {
  let collected
  for (const pattern of x(focus)) {
    collected = reducer(collected, pattern)
  }
  yield collected
}
function defaultReducer (l = { match: [], replace: () => [] }, r) {
  return {
    match: l.match.concat([r.match]),
    replace: (fn) => l.replace(fn).concat([r.replace(fn)])
  }
}

export function test_collect (expect, dx) {
  expect(dx`${collect(dx`.foo | .bar`)}`.match({ foo: 1, bar: 2, baz: 3 }))
    .toEqual([1, 2])
}

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
        replace: (fn) => ({
          ...outer.replace(fn),
          [key]: inner.replace((value) => fn(value)[key])
        })
      }
    }
  }
}
const objectInit = (focus) => [{ match: {}, replace: (f) => ({ ...focus, ...f({}) }) }]

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
export function test_objectShape_optional_fail (expect, dx) {
  expect(dx`{foo: ${number}, bar?: ${string}}`.test({ foo: 123, bar: 456 })).toEqual(false)
}

export function test_objectShape_additional (expect) {
  expect.comment('TODO: rest patterns, pattern/traversal propagation, multiple rests, `...{exact}` ')
}

// ### `[${x}, ${y}, ...${rest}]`
// Succeeds if every pattern matches the value at that index or for the rest of the array.

export const arrayShape = (entries) => function * (focus) {
  const [entry, ...restEntries] = entries
  const [headFocus, ...restFocus] = focus
  // base case
  if (!focus.length &&
    (!entries.length || (entry && entry.type === 'RestEntry'))) {
    yield { match: [], replace: (fn) => fn([]) }
    return
  }
  // fail: out of either focus or entries
  if (!focus.length || !entries.length) {
    return
  }

  const { type, value: pattern } = entry
  const nextPattern = type === 'RestEntry'
    ? arrayShape(entries)
    : arrayShape(restEntries)

  for (const h of pattern(headFocus)) {
    for (const r of nextPattern(restFocus)) {
      yield {
        match: [h.match, ...r.match],
        replace: (fn) => [
          h.replace(fn),
          ...r.replace(fn)
        ]
      }
    }
  }
}

// The pattern must match every item in the focus array; missing or additional items cause the pattern to fail.
export function test_array (expect, dx) {
  expect(dx`["foo", ${number}]`.test(['foo', 1]))
    .toEqual(true)
  expect(dx`["foo", ${number}]`.test(['foo', 'bar']))
    .toEqual(false)
  expect(dx`["foo", ${number}]`.test(['foo', 1, 2]))
    .toEqual(false)
  expect(dx`["foo", ${number}]`.test(['foo']))
    .toEqual(false)
}

// You can "spread" a pattern to match the remaining items in an array.
export function test_array_rest (expect, dx) {
  expect(dx`["foo", ...${number}]`.match(['foo', 1, 2, 3]))
    .toEqual(['foo', 1, 2, 3])
  expect(dx`["foo", ... .x]`.match(['foo', { x: 1 }, { x: 2 }, { x: 3 }]))
    .toEqual(['foo', 1, 2, 3])
}

// If you only want to match against the first few items in an array, you can spread the identity pattern:
export function test_array_id (expect, dx) {
  expect(dx`["foo", ..._]`.test(['foo', 1, 2, 3]))
    .toEqual(true)
  expect(dx`["foo", ..._]`.test(['foo']))
    .toEqual(true)
}

// If you match against _only_ a spread, you can test if all the items in an array match a pattern.
export function test_array_of (expect, dx) {
  expect(dx`[...${number}]`.test([1, 2, 3]))
    .toEqual(true)
}
