function test (lens, focus) {
  for (const _ of lens(focus)) { return true }
  return false
}

function * match (lens, focus) {
  for (const { match } of lens(focus)) {
    yield match
  }
}

function replace (lens, focus, value) {
  for (const { replace } of lens(focus)) {
    return replace(value)
  }
  return focus
}

function * exec (lens, focus, fn) {
  for (const { match, replace } of lens(focus)) {
    yield replace(fn(match))
  }
}

module.exports = { test, match, replace, exec }
