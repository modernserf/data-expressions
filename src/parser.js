// DatEx uses tagged template strings to generate patterns. These strings are fed into a parser that uses a [Nearley](https://nearley.js.org/) grammar to parse them into an AST. This AST is then compiled into a pattern, which then is decorated with the `test`, `match`, `replace` etc methods.
import grammar from './grammar.build.js'
import { key as keyPattern, id, index, slice, value, arrayShape, objectShape, regex, seq, alt, and, spread, recursive, limit } from './patterns.js'
import { decoratePattern } from './operations.js'
const { Parser, Grammar } = require('nearley')
const moo = require('moo')

export const lexer = moo.compile({
  int: { match: /-?\d+/, value: (x) => Number(x) },
  op: /[|&(){}[\],:?!_]|\*+|\.+/,
  ident: /[A-Za-z_$][A-Za-z0-9_$]*/,
  dqstring: { match: /"(?:\\"|[^"\n])+"/, value: (x) => x.slice(1, -1) },
  ws: { match: /[ \t\n]+/, lineBreaks: true }
})

export function parse (strs, items) {
  const parser = new Parser(Grammar.fromCompiled(grammar))
  for (let i = 0; i < strs.length; i++) {
    const str = strs[i]
    for (const tok of lexer.reset(str)) {
      if (tok.type === 'ws') {
        continue
      } else if (tok.type === 'op') {
        parser.feed([tok.value])
      } else {
        parser.feed([tok])
      }
    }
    if (items.length <= i) { continue }
    parser.feed([nodeForInterpolation(items[i])])
  }

  const { results } = parser
  if (results.length !== 1) {
    console.error({ results })
    throw new Error('Parsing failed')
  }
  return results[0]
}

function nodeForInterpolation (item) {
  const type = typeof item
  if (type === 'string') {
    return { type: 'dqstring', value: item }
  } else if (type === 'number' && Math.floor(item) === item) {
    return { type: 'int', value: item }
  } else {
    return { type: 'jsvalue', value: item }
  }
}

// helper patterns
function jsValue (val) {
  switch (typeof val) {
    case 'function':
      return val
    case 'object':
      if (val instanceof RegExp) { return regex(val) }
      return value(val)
    default:
      return value(val)
  }
}

const opt = (pattern) => (value, optional) =>
  optional ? pattern.optional(value) : pattern(value)

// compilers
const exprTypes = (nodeTypes) => (node) => {
  const [pattern, nodeShape] = nodeTypes[node.type]
  if (!nodeShape) { return pattern }
  const args = Object.entries(nodeShape).map(([key, type]) => {
    if (node[key] === null) { return undefined }
    return compilers[type](node[key])
  })
  return pattern(...args)
}

const compilers = {
  raw: (x) => x,
  value: ({ value }) => value,
  entries: (entries) =>
    entries.map(({ type, key, value, optional }) => ({
      type,
      key: key && compilers.value(key),
      value: compilers.expr(value),
      optional
    })),
  expr: exprTypes({
    Alt: [alt, { left: 'expr', right: 'expr' }],
    Seq: [seq, { left: 'expr', right: 'expr' }],
    And: [and, { value: 'expr' }],
    Cut: [limit, { value: 'expr' }],
    Object: [objectShape, { value: 'entries' }],
    Array: [arrayShape, { value: 'entries' }],
    Key: [opt(keyPattern), { value: 'value', optional: 'raw' }],
    Index: [opt(index), { value: 'value', optional: 'raw' }],
    Slice: [slice, { from: 'value', to: 'value' }],
    Spread: [spread],
    Recursive: [recursive],
    ID: [id],
    dqstring: [value, { value: 'raw' }],
    int: [value, { value: 'raw' }],
    jsvalue: [jsValue, { value: 'raw' }]
  })
}

export const dx = (strs, ...items) =>
  decoratePattern(compilers.expr(parse(strs, items)))

// The `p` function takes the same arguments as `dx`, but returns the parsed syntax tree instead of the compiled pattern.
function setupParseTester () {
  const p = (strs, ...items) => parse(strs, items)
  p.Key = (value, optional = false) => ({ type: 'Key', value, optional })
  p.Index = (value, optional = false) => ({ type: 'Index', value, optional })
  p.ident = (value) => ({ type: 'ident', value })
  p.js = (value) => ({ type: 'jsvalue', value })
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
  expect(p`.${123}?`).toEqual(p.Index(p.int(123), true))
  expect(p`.1`).toEqual(p.Index(p.int(1)))
  expect(p`."foo bar"?`).toEqual(p.Key(p.dqstring('foo bar'), true))
  expect(p`*`).toEqual(p.Spread)
  expect(p`**`).toEqual(p.Recursive)
  expect(() => p`***`).toThrow()
  expect(p`[]`).toEqual(p.Array())
  expect(p`[.foo ]`).toEqual(p.Array(p.ArrEntry(p.Key(p.ident('foo')))))
  expect(p`[${0}, ...${1}]`).toEqual(p.Array(p.ArrEntry(p.int(0)), p.RestEntry(p.int(1))))
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
        p.Index(p.int(1)),
        p.Index(p.int(2))
      )),
      p.Index(p.int(3))
    ))
}
