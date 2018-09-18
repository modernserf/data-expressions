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
    console.error(results)
    throw new Error('Parsing failed')
  }
  return results[0]
}

function compileKey (node, { items }) {
  switch (node.type) {
    case 'dqstring':
    case 'ident':
    case 'int':
      return node.value
    case 'placeholder':
      const pvalue = items[node.value]
      if (['string', 'number'].includes(typeof pvalue)) {
        return pvalue
      }
  }
  throw new Error('Invalid key type')
}

const compileEntry = ({ type, key, value, optional }, compile) => {
  switch (type) {
    case 'Entry':
      return { type: 'Entry', key: compileKey(key, compile), value: compile(value), optional }
    case 'ArrEntry':
      return { type: 'ArrEntry', value: compile(value) }
    case 'RestEntry':
      return { type: 'RestEntry', value: compile(value) }
    default:
      throw new Error('Expected Entry Node')
  }
}

function compilePlaceholder (node, { items }) {
  const val = items[node.value]
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

const infix = (pattern) => (node, compile) =>
  pattern(compile(node.left), compile(node.right))
const postfix = (pattern) => (node, compile) =>
  pattern(compile(node.value))
const collection = (pattern) => (node, compile) =>
  pattern(node.value.map((node) => compileEntry(node, compile)))

const opt = (pattern, optional) => optional ? pattern.optional : pattern

function compile (node, items) {
  const compiler = (n) => compile(n, items)
  compiler.items = items
  if (!compilers[node.type]) {
    throw new Error('Unknown AST Node')
  }
  return compilers[node.type](node, compiler)
}

const compilers = {
  Alt: infix(alt),
  Seq: infix(seq),
  And: postfix(and),
  Cut: postfix(limit),
  Object: collection(objectShape),
  Array: collection(arrayShape),
  Key: (node, compiler) => {
    let key = compileKey(node.value, compile)
    if (typeof key === 'string') {
      return opt(keyPattern, node.optional)(key)
    } else {
      return opt(index, node.optional)(key)
    }
  },
  Slice: (node, compiler) => {
    let from = node.from ? compileKey(node.from, compiler) : undefined
    let to = node.to ? compileKey(node.to, compiler) : undefined
    return slice(from, to)
  },
  Spread: () => spread,
  Recursive: () => recursive,
  ID: () => id,
  dqstring: (node) => value(node.value),
  int: (node) => value(node.value),
  placeholder: compilePlaceholder
}

const rootCompile = (node, items) => compile(node, items)

export function dx (strs, ...items) {
  return decoratePattern(rootCompile(parse(strs, items), items))
}

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

export function test_parser (expect) {
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

export function test_template_string (expect) {
  expect(dx`.foo`.match({ foo: 1 })).toEqual(1)
  expect([...dx`.foo | .bar`.matchAll({ foo: 1, bar: 2 })]).toEqual([1, 2])
  expect(dx`.foo .bar`.match({ foo: { bar: 3 } })).toEqual(3)
  expect(dx`.foo .0`.match({ foo: ['bar', 'baz'] })).toEqual('bar')
  expect(dx`.foo.0`.match({ foo: ['bar', 'baz'] })).toEqual('bar')
}
