function * bfsValues (root) {
  const q = [root]
  while (q.length) {
    const value = q.shift()
    yield value
    q.push(...values(value))
  }
}

function values (x) {
  if (x.values && (typeof x.values === 'function')) { return x.values() }
  return Object.values(x)
}
