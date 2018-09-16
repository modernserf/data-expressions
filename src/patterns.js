import { test, match, replace } from './operations.js'

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

export function * fail () {}

function hasKey (focus, key) {
  if (!focus || typeof focus !== 'object') { return false }
  return key in focus
}

// `.foo` |`.${string}`
export const key = (key) => function * (focus) {
  if (hasKey(focus, key)) {
    yield {
      match: focus[key],
      replace: (value) => ({ ...focus, [key]: value })
    }
  }
}
key.optional = (key) => function * (focus) {
  yield {
    match: focus[key],
    replace: (value) => ({ ...focus, [key]: value })
  }
}

// `.0` | `.${number}`
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

export const where = (fn) => function * (focus) {
  if (fn(focus)) {
    yield { match: focus, replace: (value) => value }
  }
}

export const value = (val) => where((x) => x === val)
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

// `*`
export function * spread (focus) {
  for (const [lens] of lensesForStructure(focus)) {
    yield * lens(focus)
  }
}

// `**`
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

export const project = (fn) => function * (focus) {
  yield {
    match: fn(focus),
    replace: (value) => value
  }
}

// `${x} | ${y}`
export const alt = (x, y) => function * (focus) {
  yield * x(focus)
  yield * y(focus)
}

// `${x} & ${y}`
export const and = (x, y) => function * (focus) {
  for (const _ of x(focus)) {
    yield * y(focus)
  }
}

// `${x} ${y}`
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

// `{foo: ${x}, bar: ${y} ...}`
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

export const arrayOf = (lens) => function * (focus) {
  for (const item of focus) {
    if (!test(lens, item)) { return }
  }
  yield * id(focus)
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
