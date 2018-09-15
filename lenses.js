function * id (focus) {
  yield { match: focus, replace: (value) => value }
}

// TODO:
// slices: `[start:end]`
// type checkers
// `update` takes callback (like lens `over`)

function hasKey (focus, key) {
  if (!focus || typeof focus !== 'object') { return false }
  return key in focus
}

// `.foo` |`${string}`
const key = (key) => function * (focus) {
  if (hasKey(focus, key)) {
    yield {
      match: focus[key],
      replace: (value) => ({ ...focus, [key]: value })
    }
  }
}

// `.0` | `${number}`
const index = (i) => function * (focus) {
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

const slice = (start, end) => function * (focus) {
  yield {
    match: focus.slice(start, end),
    replace: (value) => [
      ...focus.slice(0, start),
      ...value,
      ...focus.slice(end)
    ]
  }
}

const where = (fn) => function * (focus) {
  if (fn(focus)) {
    yield { match: focus, replace: (value) => value }
  }
}

const value = (val) => where((x) => x === val)

const regex = (re) => where((x) => re.test(x))

function * spread (focus) {
  for (const [lens] of lensesForStructure(focus)) {
    yield * lens(focus)
  }
}

// `..`
// TODO: how should `replace` work on a circular structure?
function * recursive (focus) {
  const q = [[id, focus]]
  for (const [lens, value] of q) {
    yield * lens(focus)
    // yes, you can modify an array while you're iterating over it
    for (const [childLens, childValue] of lensesForStructure(value)) {
      q.push([pipe(lens, childLens), childValue])
    }
  }
}

function defaultReducer (l = { match: [], replace: () => [] }, r) {
  return {
    match: l.match.concat([r.match]),
    replace: (value) => l.replace(value).concat([r.replace(value)])
  }
}
const collect = (x, reducer = defaultReducer) => function * (focus) {
  let collected
  for (const lens of x(focus)) {
    collected = reducer(collected, lens)
  }
  yield collected
}

const project = (fn) => function * (focus) {
  yield {
    match: fn(focus),
    replace: (value) => value
  }
}

// `${x} | ${y}`
const alt = (x, y) => function * (focus) {
  yield * x(focus)
  yield * y(focus)
}

// `${x} & ${y}`
const and = (x, y) => function * (focus) {
  for (const _ of x(focus)) {
    yield * y(focus)
  }
}

// `${x} ${y}`
const pipe = (x, y) => function * (focus) {
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

function * arrayInit (focus) {
  yield { match: [], replace: () => focus }
}

const entryReducer = (acc, [key, lens]) => function * (focus) {
  if (!hasKey(focus, key)) { return }

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

const object = (object) => function * (focus) {
  const entries = Object.entries(object)
  yield * entries.reduce(entryReducer, objectInit)(focus)
}

const arrayReducer = (acc, lens, index) => function * (focus) {
  if (index >= focus.length) { return }

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

const array = (array) => function * (focus) {
  yield * array.reduce(arrayReducer, arrayInit)(focus)
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

module.exports = {
  id,
  key,
  index,
  slice,
  where,
  value,
  regex,
  spread,
  recursive,
  collect,
  project,
  and,
  alt,
  pipe,
  object,
  array
}
