export function test (lens, focus) {
  for (const _ of lens(focus)) { return true }
  return false
}

export function * match (lens, focus) {
  for (const { match } of lens(focus)) {
    yield match
  }
}

export function replace (lens, focus, value) {
  for (const { replace } of lens(focus)) {
    return replace(value)
  }
  return focus
}

export function * exec (lens, focus, fn) {
  for (const { match, replace } of lens(focus)) {
    yield replace(fn(match))
  }
}
