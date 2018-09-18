export function matchAll (pattern, focus) {
  const gen = pattern(focus)

  const { value, done } = gen.next()

  const matched = !done
  const firstMatch = matched ? value.match : undefined

  return {
    matched,
    result: firstMatch,
    * [Symbol.iterator] () {
      if (!matched) { return }
      yield firstMatch
      for (const { match } of gen) {
        yield match
      }
    }
  }
}

export function test (pattern, focus) {
  return matchAll(pattern, focus).matched
}

export function match (pattern, focus) {
  return matchAll(pattern, focus).result
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
  pattern.match = (focus) => match(pattern, focus)
  pattern.matchAll = (focus) => matchAll(pattern, focus)
  pattern.replace = (focus, value) => replace(pattern, focus, value)
  pattern.updateAll = (focus, value) => updateAll(pattern, focus, value)
  return pattern
}
