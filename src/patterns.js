// # Patterns

// ## TODO: explain the pattern protocol

// ## Glossary of terms used in patterns
// - **pattern**
// - **focus**
// - **yields** - Patterns are generators that yield `{ match, replace }`.
// - **succeeds** - A pattern "succeeds" if it yields any values.

import { test, match, replace, exec } from './operations.js'

// `_`
// Succeeds for any focus. Useful as a placeholder in complex expressions.
export function * id (focus) {
  yield { match: focus, replace: (value) => value }
}
export function test_id (t) {
  const [res] = match(id, { foo: 1 })
  t.deepEquals(res, { foo: 1 },
    'id.match returns itself')
  const out = replace(id, { foo: 1 }, { bar: 2 })
  t.deepEquals(out, { bar: 2 },
    'id.replace returns the new value')
  t.end()
}

// Fails for any focus. Useful for halting/pruning match results.
export function * fail () {}
export function test_fail (t) {
  t.false(test(seq(id, fail), 'foo'))
  t.end()
}

// `.foo`, `."foo"`,`.${string}`
// If the focus has the property `foo`, yields `focus.foo`.
export const key = (key) => function * (focus) {
  if (hasKey(focus, key)) {
    yield {
      match: focus[key],
      replace: (value) => ({ ...focus, [key]: value })
    }
  }
}
export function test_key (t) {
  const [res] = match(key('foo'), { foo: { bar: 1 } })
  t.deepEquals(res, { bar: 1 },
    'key.match returns the field at key')
  const out = replace(key('foo'), { foo: { bar: 1 } }, { quux: 2 })
  t.deepEquals(out, { foo: { quux: 2 } },
    'key.replace returns the object with key updated')
  t.false(test(key('baz')), { foo: { bar: 1 } },
    'key.test fails if key not present')
  t.end()
}

function hasKey (focus, key) {
  if (!focus || typeof focus !== 'object') { return false }
  return key in focus
}

// `.foo?`, `."foo"?`
// A key followed by `?` will always succeed. If that key or index is not present in the object, `.test` will still return `true`, `.match` will yield `undefined`, and `.replace` will insert the value to the structure at that key or index.
key.optional = (key) => function * (focus) {
  yield {
    match: focus[key],
    replace: (value) => ({ ...focus, [key]: value })
  }
}
export function test_key_optional (t) {
  const out = replace(key.optional('baz'), { foo: { bar: 1 } }, { quux: 2 })
  t.deepEquals(out, { foo: { bar: 1 }, baz: { quux: 2 } },
    'key.optional.replace inserts values at a new key')
  t.end()
}

// `.1` , `.${number}`
// Use the value at index `1` in an array. You can also use values from the _end_ of the array, using negative indexes.
export const index = (i) => function * (focus) {
  // allow indexing from end
  if (i < 0) { i = focus.length + i }

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
export function test_index (t) {
  const [res] = match(index(1), ['foo', 'bar', 'baz'])
  t.deepEquals(res, 'bar',
    'index.match gets array items')
  const [res2] = match(index(-1), ['foo', 'bar', 'baz'])
  t.deepEquals(res2, 'baz',
    'index.match gets item from end with negative index')
  t.false(test(index(5), ['foo', 'bar', 'baz']),
    'index.match does not return when out of range')
  const out = replace(index(1), ['foo', 'bar', 'baz'], 'quux')
  t.deepEquals(out, ['foo', 'quux', 'baz'],
    'index.replace updates array items')
  const out2 = replace(index(-1), ['foo', 'bar', 'baz'], 'quux')
  t.deepEquals(out2, ['foo', 'bar', 'quux'],
    'index.replace works with negative index')
  const out3 = replace(index(5), ['foo', 'bar', 'baz'], 'quux')
  t.deepEquals(out3, ['foo', 'bar', 'baz'],
    'index.replace does not beyond end of list')
  t.end()
}

// `.1?` , `.${number}?`
// As with keys, an index followed by `?` will always succeed. If that  index is not present in the array, `.test` will still return `true`, `.match` will yield `undefined`, and `.replace` will fill the array with `undefined` to that index.
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
export function test_index_optional (t) {
  const [...res] = match(index.optional(10), ['foo', 'bar', 'baz'])
  t.deepEquals(res, [undefined],
    'index.optional.match always yields, even if result is undefined')
  const out = replace(index.optional(5), ['foo', 'bar', 'baz'], 'quux')
  t.deepEquals(out, ['foo', 'bar', 'baz', undefined, undefined, 'quux'],
    'index.optional.replace adds past the end of a list')
  t.end()
}

// `.[1:3]`, `.[${from}:${to}]`
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
export function test_slice (t) {
  const [res] = match(slice(1), ['foo', 'bar', 'baz'])
  t.deepEquals(res, ['bar', 'baz'])
  const out = replace(slice(1, 3), ['foo', 'bar', 'baz', 'quux'], ['flerb'])
  t.deepEquals(out, ['foo', 'flerb', 'quux'])
  t.end()
}

export const where = (fn) => function * (focus) {
  if (fn(focus)) {
    yield { match: focus, replace: (value) => value }
  }
}
export function test_where (t) {
  const gt10 = (x) => x > 10
  const [res] = match(where(gt10), 100)
  t.deepEquals(res, 100,
    'where.match returns focus on success')
  t.false(test(where(gt10), 5),
    'where.match does not return on failure')
  const out = replace(where(gt10), 100, 200)
  t.deepEquals(out, 200,
    'where.replace returns value on success')
  const out2 = replace(where(gt10), 5, 200)
  t.deepEquals(out2, 5,
    'where.replace returns focus on failure')
  t.end()
}

// `"foo"`, `1`, `${value}` (NOTE: no `.`)
// JS Primitives (strings, numbers, bools) succeed if the focus === the value.
export const value = (val) => where((x) => x === val)
export function test_value (t) {
  const sym = Symbol('a symbol')
  const [res] = match(value(sym), sym)
  t.deepEquals(res, sym)
  const out = replace(value(sym), sym, 'foo')
  t.deepEquals(out, 'foo')
  t.end()
}

export const typeOf = (t) => where((x) => typeof x === t) // eslint-disable-line valid-typeof
export const instanceOf = (Type) => where((x) => x instanceof Type)
export const number = typeOf('number')
export const string = typeOf('string')
export const bool = typeOf('boolean')
export const func = typeOf('function')
export const symbol = typeOf('symbol')
export const date = where((x) => typeof x.getTime === 'function')

export const regex = (re) => function * (focus) {
  // "fresh" regex on every invocation
  re = new RegExp(re)
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
export function test_regex (t) {
  const [res] = match(regex(/f../), 'foobar')
  t.deepEquals(res, 'foo')
  const out = replace(regex(/f../), 'foobar', 'baz')
  t.deepEquals(out, 'bazbar')
  const [...res2] = match(regex(/h./g), 'ha ho he hi')
  t.deepEquals(res2, ['ha', 'ho', 'he', 'hi'])
  t.comment('TODO: reasonable behavior for regex/g.replace')
  t.end()
}

// `*`
// Yield all values of an array or object. Subsequent patterns will filter these results.
export function * spread (focus) {
  for (const [lens] of lensesForStructure(focus)) {
    yield * lens(focus)
  }
}
export function test_spread (t) {
  const [...res] = match(spread, [1, 2, 3])
  t.deepEquals(res, [1, 2, 3],
    'spread array')
  const [...res2] = match(spread, { foo: 1, bar: 2, baz: 3 })
  t.deepEquals(res2, [1, 2, 3],
    'spread object')
  const [...out] = exec(spread, [1, 2, 3], (x) => x + 1)
  t.deepEquals(out, [
    [2, 2, 3],
    [1, 3, 3],
    [1, 2, 4]
  ])
  const [...out2] = exec(spread, { foo: 1, bar: 2, baz: 3 }, (x) => x + 1)
  t.deepEquals(out2, [
    { foo: 2, bar: 2, baz: 3 },
    { foo: 1, bar: 3, baz: 3 },
    { foo: 1, bar: 2, baz: 4 }
  ])
  t.end()
}

// `**`
// Yield all values of an array or object _recursively_, including itself, in breadth-first order. This _can_ operate on circular data structures, but will ignore repeated nodes.
// TODO: how should `replace` work on a circular structure?
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

export const recursive = (focus) => _recursive(focus, 1)
recursive.maxVisits = (maxVisits) =>
  (focus) => _recursive(focus, maxVisits)
export function test_recursive (t) {
  const [...matches] = match(recursive, { foo: 1, bar: [2, { baz: 3 }] })
  t.deepEquals(matches, [
    { foo: 1, bar: [2, { baz: 3 }] },
    1,
    [2, { baz: 3 }],
    2,
    { baz: 3 },
    3
  ], 'recursive.match returns all items traversed in breadth-first order')
  const [...out] = exec(recursive, { foo: 1, bar: [2, { baz: 3 }] }, () => 'quux')
  t.deepEquals(out, [
    'quux',
    { foo: 'quux', bar: [2, { baz: 3 }] },
    { foo: 1, bar: 'quux' },
    { foo: 1, bar: ['quux', { baz: 3 }] },
    { foo: 1, bar: [2, 'quux'] },
    { foo: 1, bar: [2, { baz: 'quux' }] }
  ], 'recursive.replace returns multiple items')
  t.comment('TODO: circular structures')
  t.end()
}

function defaultReducer (l = { match: [], replace: () => [] }, r) {
  return {
    match: l.match.concat([r.match]),
    replace: (value) => l.replace(value).concat([r.replace(value)])
  }
}
export const collect = (x, reducer = defaultReducer) => function * (focus) {
  let collected
  for (const lens of x(focus)) {
    collected = reducer(collected, lens)
  }
  yield collected
}
export function test_collect (t) {
  const lens = collect(alt(key('foo'), key('bar')))
  const [res] = match(lens, { foo: 1, bar: 2, baz: 3 })
  t.deepEquals(res, [1, 2],
    'collect.match returns an array of results')
  const [res2] = match(lens, { foo: 1, quux: 2 })
  t.deepEquals(res2, [1],
    'collect.match propagates failure')
  const out = replace(lens, { foo: 1, bar: 2, baz: 3 }, 10)
  t.deepEquals(out, [
    { foo: 10, bar: 2, baz: 3 },
    { foo: 1, bar: 10, baz: 3 }
  ], 'collect.replace returns an array of results')
  t.end()
}

export const project = (fn) => function * (focus) {
  yield {
    match: fn(focus),
    replace: (value) => value
  }
}
export function test_project (t) {
  const lens = project((x) => x.toUpperCase())
  const [res] = match(lens, 'foo')
  t.deepEquals(res, 'FOO')
  const out = replace(lens, 'foo', 'bar')
  t.deepEquals(out, 'bar')
  t.end()
}

// ## Operators
// Patterns can be grouped with parentheses. Otherwise, `.foo & .bar .baz | .quux .xyzzy` groups as `(.foo & (.bar .baz)) | (.quux .xyyzy)`.

// `${x} | ${y}`
// Try both patterns on a value. Note that `.match` returns an iterator, and will return _both_ results, if they both succeed; `.replace` will replace the _first_ that succeeds.
export const alt = (x, y) => function * (focus) {
  yield * x(focus)
  yield * y(focus)
}
export function test_alt (t) {
  const lens = alt(key('foo'), key('bar'))
  const [res] = match(lens, { foo: 1, baz: 3 })
  t.deepEquals(res, 1,
    'alt.match returns first on success')
  const [res2] = match(lens, { bar: 2, baz: 3 })
  t.deepEquals(res2, 2,
    'alt.match returns second if first fails')
  t.false(test(lens, { baz: 3 }),
    'alt.match fails if both fail')
  const out = replace(lens, { foo: 1, baz: 3 }, 10)
  t.deepEquals(out, { foo: 10, baz: 3 },
    'alt.replace on first item')
  const out2 = replace(lens, { bar: 2, baz: 3 }, 10)
  t.deepEquals(out2, { bar: 10, baz: 3 },
    'alt.replace on second item')
  const [...out3] = exec(lens, { foo: 1, bar: 2, baz: 3 }, () => 10)
  t.deepEquals(out3, [
    { foo: 10, bar: 2, baz: 3 },
    { foo: 1, bar: 10, baz: 3 }
  ], 'alt.replace returns multiple items on success')
  t.end()
}

// `${x} & ${y}`
// If the left pattern succeeds, try the right pattern on the focus.
export const and = (x, y) => function * (focus) {
  for (const _ of x(focus)) {
    yield * y(focus)
  }
}
export function test_and (t) {
  const lens = and(key('foo'), key('bar'))
  const [res] = match(lens, { foo: 1, bar: 2 })
  t.deepEquals(res, 2)
  t.false(test(lens, { bar: 2, quux: 3 }))
  const out = replace(lens, { foo: 1, bar: 2 }, 4)
  t.deepEquals(out, { foo: 1, bar: 4 })
  t.end()
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
export function test_seq (t) {
  const lens = seq(key('foo'), key('bar'))
  const [res] = match(lens, { foo: { bar: 1 } })
  t.deepEquals(res, 1,
    'seq.match traverses structures')
  const out = replace(lens, { foo: { bar: 1 } }, 2)
  t.deepEquals(out, { foo: { bar: 2 } },
    'seq.replace traverses structures')
  const lens2 = seq(recursive, key('bar'))
  const out2 = replace(lens2, { foo: { quux: { flerb: { bar: 1 } } } }, 2)
  t.deepEquals(out2, { foo: { quux: { flerb: { bar: 2 } } } },
    'seq.replace recursive updates')
  t.end()
}

// `{foo: ${x}, bar?: ${y} }`
// Succeeds if focus is an object where _all_ fields match the patterns at the corresponding key. Keys can also be _optional_ -- if the key is present in the focus, it must match; otherwise it is skipped. Replacement propagates _through_ the object's fields.
function * objectInit (focus) {
  yield { match: {}, replace: () => focus }
}
const entryReducer = (acc, [key, lens, optional = false]) => function * (focus) {
  if (!hasKey(focus, key) && !optional) { return }

  for (const base of acc(focus)) {
    for (const inner of lens(focus[key])) {
      yield {
        match: {
          ...base.match,
          [key]: inner.match
        },
        replace: (value) => ({
          ...base.replace(value),
          [key]: inner.replace(value[key])
        })
      }
    }
  }
}

export const object = (entries) => function * (focus) {
  if (!Array.isArray(entries)) { entries = Object.entries(entries) }
  yield * entries.reduce(entryReducer, objectInit)(focus)
}
export function test_object (t) {
  const lens = object({
    foo: where((x) => x > 0),
    bar: where((x) => typeof x === 'string')
  })
  const focus = { foo: 10, bar: 'a string', baz: ['else'] }
  const [res] = match(lens, focus)
  t.deepEquals(res, { foo: 10, bar: 'a string' })
  const out = replace(lens, focus, { foo: 20, bar: 'flerb' })
  t.deepEquals(out, { foo: 20, bar: 'flerb', baz: ['else'] })
  t.end()
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

export const array = (array, rest) => function * (focus) {
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
export function test_array (t) {
  const lens = array([value('foo'), number])
  const [res] = match(lens, ['foo', 1])
  t.deepEquals(res, ['foo', 1])
  const out = replace(lens, ['foo', 1], ['bar', 10])
  t.deepEquals(out, ['bar', 10])
  t.end()
}
export function test_array_rest (t) {
  const lens = array([value('foo')], arrayOf(number))
  const [res] = match(lens, ['foo', 1, 2, 3])
  t.deepEquals(res, ['foo', 1, 2, 3])
  t.end()
}

export const arrayOf = (lens) => function * (focus) {
  for (const item of focus) {
    if (!test(lens, item)) { return }
  }
  yield * id(focus)
}
export function test_arrayOf (t) {
  const lens = arrayOf(key('foo'))
  t.true(test(lens, [{ foo: 1 }, { foo: 2 }]))
  t.false(test(lens, [{ foo: 1 }, { bar: 2 }]))
  t.end()
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
