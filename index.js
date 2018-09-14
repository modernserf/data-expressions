const { optional, id, key, index, where, spread, recursive, collect, alt, and, pipe, object, project } = require('./lenses.js')

class TokenizeError extends Error {}
class UnexpectedEndOfInput extends Error {}
class BadOperator extends Error {}
class ParseError extends Error {}

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
  and: /(\s*&\s*)/,
  alt: /(\s*\|\s*)/,
  optional: /(\s*\?)/,
  lParen: /(\(\s*)/,
  rParen: /(\)\s*)/,
  whitespace: /(\s+)/,
  error: /(.+)/
}

// operator precedence: `.foo .bar | .baz` -> `((.foo .bar) | .baz)`
const ops = {
  alt: { precedence: 1, operator: alt, arity: 2 },
  and: { precedence: 2, operator: and, arity: 2 },
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
  and,
  alt,
  pipe,
  object,
  dx
}
