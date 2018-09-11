class MissingKey extends Error {}
class TooManyIterations extends Error {}
class TODO extends Error {}

const id = ({
  get: (focus) => [focus],
  set: (focus, value) => [value]
})

// `.foo` | `.0` | `.${string | number}`
const key = (key) => ({
  get: (focus) => key in focus ? [focus[key]] : [],
  set: (focus, value) => [{ ...focus, [key]: value }],
})

// `.foo!` | `.0!` | `.${string | number}!`
const keyRequired = (key) => ({
  get: (focus) => key in focus ? [focus[key]] : [],
  set: (focus, value) => key in focus ? [{ ...focus, [key]: value }] : []
})

// `..`
function * pathEntries (x, parentPath = []) {
  const iter = x.entries ? x.entries : Object.entries(x)
  for (const [key, value] of iter) {
    yield [parentPath.concat([key]), value]
  }
}

// TODO: how does update work on a circular structure?
function * bfs (focus) {
  const q = pathEntries([focus])
  for (let i = 0; i < ~(1 << 31); i++) {
    if (!q.length) { return }
    const [path, value] = q.shift()
    yield [path, value]
    q.push(...pathEntries(value, path))
  }
  throw new TooManyIterations()
}

const recursive = {
  * get (focus) {
    for (const [_, value] of bfs(focus)) {
      yield value
    }
  }
  * set (focus, value) {
    throw new TODO()
  }
}

// `${x} , ${y}`
const seq = (x, y) => ({
  get: (focus) => [...x.get(focus), ...y.get(focus)],
  * set (focus, value) {
    for (const updated of x.set(focus, value)) {
      yield * y.set(updated, value)
    }
  }
})

// `${x} | ${y}`
const alt = (x, y) => ({
  * get (focus) {
    let done = false
    for (const res of x.get(focus)) {
      done = true
      yield res
    }
    if (!done) {
      yield* y.get(focus)
    }
  },
  * set (focus, value) {
    let done = false
    for (const res of x.set(focus, value)) {
      done = true
      yield res
    }
    if (!done) {
      yield* y.set(focus, value)
    }
  }
})

// `${x}?`
const maybe = (x) => alt(x, id)

// `${x} ${y}`
const pipe = (x, y) => ({
  * get(focus) {
    for (const result of x.get(focus)) {
      yield* y.get(result);
    }
  },
  * set(focus, value) {
    for (const result of x.get(focus)) {
      for (const updated of y.set(result, value)) {
        yield * x.set(focus, updated)
      }
    }
  }
});
