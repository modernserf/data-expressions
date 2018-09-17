export function test (pattern, focus) {
  for (const _ of pattern(focus)) { return true }
  return false
}

// todo: rename as `match`
export function match1 (pattern, focus) {
  for (const { match } of pattern(focus)) {
    return match
  }
}

// todo: rename as `matchAll`
export function * match (pattern, focus) {
  for (const { match } of pattern(focus)) {
    yield match
  }
}

export function replace (pattern, focus, value) {
  for (const { replace } of pattern(focus)) {
    return replace(value)
  }
  return focus
}

export function * updateAll (pattern, focus, fn) {
  for (const { match, replace } of pattern(focus)) {
    yield replace(fn(match))
  }
}

export function decoratePattern (pattern) {
  pattern.test = (focus) => test(pattern, focus)
  pattern.match = (focus) => match1(pattern, focus)
  pattern.matchAll = (focus) => match(pattern, focus)
  pattern.replace = (focus, value) => replace(pattern, focus, value)
  pattern.updateAll = (focus, value) => updateAll(pattern, focus, value)
  return pattern
}
