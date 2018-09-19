import grammar from './grammar.build.js'
import { key as keyPattern, id, index, slice, value, arrayShape, objectShape, regex, seq, alt, and, spread, recursive, limit } from './patterns.js'
import { decoratePattern } from './operations.js'
const { Parser, Grammar } = require('nearley')

export function parse (strs, items) {
  const parser = new Parser(Grammar.fromCompiled(grammar))
  for (let i = 0; i < strs.length; i++) {
    parser.feed(strs[i])
    if (items.length > i) { parser.feed(`<${i}>`) }
  }
  const { results } = parser
  if (results.length !== 1) {
    throw new Error('Parsing failed', results)
  }
  return results[0]
}

// helper patterns
function placeholderValue (val) {
  if (!val) { throw new Error('missing value') }
  switch (typeof val) {
    case 'function':
      return val
    case 'object':
      if (val instanceof RegExp) { return regex(val) }
      throw new Error('unknown object type')
      // return value(val)
    default:
      return value(val)
  }
}
function keyOrIndex (value, optional) {
  let pattern = { string: keyPattern, number: index }[typeof value]
  if (!pattern) {
    throw new Error('Invalid key type')
  }
  pattern = optional ? pattern.optional : pattern
  return pattern(value)
}

// compilers
const exprTypes = (nodeTypes) => (node, items) => {
  if (!nodeTypes[node.type]) {
    throw new Error('Unknown Expr Node')
  }
  const [pattern, nodeShape] = nodeTypes[node.type]
  if (!nodeShape) { return pattern }
  const args = Object.entries(nodeShape).map(([key, type]) => {
    if (node[key] === null) { return undefined }
    return compilers[type](node[key], items)
  })
  return pattern(...args)
}

const compilers = {
  value: (value) => value,
  placeholder: (index, items) => items[index],
  key: ({ type, value }, items) => {
    switch (type) {
      case 'dqstring':
      case 'ident':
      case 'int':
        return value
      case 'placeholder':
        return compilers.placeholder(value, items)
    }
    throw new Error('Invalid key type')
  },
  entries: (entries, items) =>
    entries.map(({ type, key, value, optional }) => ({
      type,
      key: key && compilers.key(key, items),
      value: compilers.expr(value, items),
      optional
    })),
  expr: exprTypes({
    Alt: [alt, { left: 'expr', right: 'expr' }],
    Seq: [seq, { left: 'expr', right: 'expr' }],
    And: [and, { value: 'expr' }],
    Cut: [limit, { value: 'expr' }],
    Object: [objectShape, { value: 'entries' }],
    Array: [arrayShape, { value: 'entries' }],
    Key: [keyOrIndex, { value: 'key', optional: 'value' }],
    Slice: [slice, { from: 'key', to: 'key' }],
    Spread: [spread],
    Recursive: [recursive],
    ID: [id],
    dqstring: [value, { value: 'value' }],
    int: [value, { value: 'value' }],
    placeholder: [placeholderValue, { value: 'placeholder' }]
  })
}

export const dx = (strs, ...items) =>
  decoratePattern(compilers.expr(parse(strs, items), items))

// The `p` function takes the same arguments as `dx`, but returns the parsed syntax tree instead of the compiled pattern.
function setupParseTester () {
  const p = (strs, ...items) => parse(strs, items)
  p.Key = (value, optional = false) => ({ type: 'Key', value, optional })
  p.ident = (value) => ({ type: 'ident', value })
  p.ph = (value) => ({ type: 'placeholder', value })
  p.int = (value) => ({ type: 'int', value })
  p.dqstring = (value) => ({ type: 'dqstring', value })
  p.Spread = { type: 'Spread' }
  p.Recursive = { type: 'Recursive' }
  p.Array = (...value) => ({ type: 'Array', value })
  p.Object = (...value) => ({ type: 'Object', value })
  p.Seq = (left, right) => ({ type: 'Seq', left, right })
  p.Slice = (from, to) => ({ type: 'Slice', from, to })
  p.Entry = (key, value, optional = false) => ({ type: 'Entry', key, value, optional })
  p.ArrEntry = (value) => ({ type: 'ArrEntry', value })
  p.RestEntry = (value) => ({ type: 'RestEntry', value })
  p.Cut = (value) => ({ type: 'Cut', value })
  return p
}

export function test_parser (expect) {
  const p = setupParseTester()
  expect(p`.foo`).toEqual(p.Key(p.ident('foo')))
  expect(p`.${123}?`).toEqual(p.Key(p.ph(0), true))
  expect(p`.1`).toEqual(p.Key(p.int(1)))
  expect(p`."foo bar"?`).toEqual(p.Key(p.dqstring('foo bar'), true))
  expect(p`*`).toEqual(p.Spread)
  expect(p`**`).toEqual(p.Recursive)
  expect(() => p`***`).toThrow()
  expect(p`[]`).toEqual(p.Array())
  expect(p`[.foo ]`).toEqual(p.Array(p.ArrEntry(p.Key(p.ident('foo')))))
  expect(p`[${0}, ...${0}]`).toEqual(p.Array(p.ArrEntry(p.ph(0)), p.RestEntry(p.ph(1))))
  expect(p`.foo*`).toEqual(p.Seq(p.Key(p.ident('foo')), p.Spread))
  expect(p`**.bar`).toEqual(p.Seq(p.Recursive, p.Key(p.ident('bar'))))
  expect(p`.[-1:]`).toEqual(p.Slice(p.int(-1), null))
  expect(p`.[:2]`).toEqual(p.Slice(null, p.int(2)))
  expect(p`.[1:2]`).toEqual(p.Slice(p.int(1), p.int(2)))
  expect(p`{x: 1, y?: 2}`).toEqual(p.Object(
    p.Entry(p.ident('x'), p.int(1)),
    p.Entry(p.ident('y'), p.int(2), true)
  ))
  expect(p`.1 .2 ! .3`).toEqual(
    p.Seq(
      p.Cut(p.Seq(
        p.Key(p.int(1)),
        p.Key(p.int(2))
      )),
      p.Key(p.int(3))
    ))
}
