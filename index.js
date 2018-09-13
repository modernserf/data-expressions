class TokenizeError extends Error {}
class UnexpectedEndOfInput extends Error {}
class BadOperator extends Error {}
class ParseError extends Error {}

function * id (focus) {
  yield { match: focus, replace: (value) => value }
}

const optional = (gen) => gen.optional

// TODO:
// slices: `[start:end]`
// spread / collect (match only)
// type checkers
// object builders
// `where` clauses
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

const where = (fn) => function * (focus) {
  if (fn(focus)) {
    yield { match: focus, replace: (value) => value }
  }
}

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

// `${x} , ${y}`
const fork = (x, y) => function * (focus) {
  yield * x(focus)
  yield * y(focus)
}

// return y if x succeds
// `${x} & ${y}`

const alt = (x, y) => function * (focus) {
  let done = false
  for (const res of x(focus)) {
    done = true
    yield res
  }
  if (!done) {
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

function lensForInterpolation (value) {
  switch (typeof value) {
    case 'string':
      return key(value)
    case 'number':
      return index(value)
    // TODO: regex?
  }
  return value
}

const joinRegex = (res) => new RegExp(res.map((re) => {
  const str = re.toString()
  return str.substring(1, str.length - 1)
}).join('|'), 'y')

const tokens = {
  key: /\.([A-Za-z_$][A-Za-z0-9_$]*)/,
  index: /\.(-?[0-9]+)/,
  descent: /(\.\.)/,
  alt: /(\s*\|\s*)/,
  fork: /(\s*,\s*)/,
  optional: /(\?)/,
  lParen: /(\(\s*)/,
  rParen: /(\)\s*)/,
  whitespace: /(\s+)/,
  error: /(.+)/
}

// operator precedence: `.foo .bar | .baz , .quux` -> `((.foo .bar) | .baz) , quux`
const ops = {
  fork: { precedence: 1, operator: fork, arity: 2 },
  alt: { precedence: 2, operator: alt, arity: 2 },
  whitespace: { precedence: 3, operator: pipe, arity: 2 },
  optional: { precedence: 4, operator: optional, arity: 1 },
  lParen: { precedence: 0, name: 'lParen' },
  rParen: { precedence: 5, clearUntil: 'lParen' }
}

const re = joinRegex(Object.values(tokens))
const reKeys = [null].concat(Object.keys(tokens))
const tokenFor = (match) => {
  for (let i = 1; i < reKeys.length; i++) {
    const value = match[i]
    const name = reKeys[i]
    if (value) {
      switch (name) {
        case 'key':
          return key(value)
        case 'index':
          return index(Number(value))
        case 'descent':
          return recursive
        case 'error':
          throw new TokenizeError(match)
        default:
          return ops[name]
      }
    }
  }
  throw new TokenizeError(match)
}

function * tokenize (str) {
  re.lastIndex = 0
  while (true) {
    const match = re.exec(str)
    if (!match) { return }
    yield tokenFor(match)
  }
}

const last = (xs) => xs[xs.length - 1]

const apply = (output, operator) => {
  if (operator.arity > output.length) {
    throw new BadOperator(output, operator)
  }
  const args = output.splice(-operator.arity, operator.arity).reverse()
  output.push(operator.operator(...args))
}

function parse (tokens) {
  const output = []
  const operators = []
  tokens.reverse()
  for (const token of tokens) {
    // pop operator stack until matching item
    if (token.clearUntil) {
      while (operators.length) {
        const op = operators.pop()
        if (op.name === token.clearUntil) { break }
        apply(output, op)
      }
      throw new UnexpectedEndOfInput()
    // pop operator stack
    } else if (token.operator && operators.length && last(operators).precedence <= token.precedence) {
      apply(output, operators.pop())
      operators.push(token)
    // push operator
    } else if (token.operator) {
      operators.push(token)
    // value
    } else {
      output.push(token)
    }
  }
  // clear operators stack
  while (operators.length) {
    apply(output, operators.pop())
  }
  if (output.length !== 1) {
    throw new ParseError(tokens, output)
  }
  return output[0]
}

function dx (strings, ...parts) {
  const tokens = strings.reduce((coll, str, i) => {
    return coll.concat([...tokenize(str)], lensForInterpolation(parts[i]) || [])
  }, [])
  return parse(tokens)
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

module.exports = {
  test,
  match,
  replace,
  exec,
  id,
  key,
  index,
  where,
  spread,
  recursive,
  collect,
  project,
  fork,
  alt,
  pipe,
  dx
}
