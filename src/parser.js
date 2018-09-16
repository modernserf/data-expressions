import grammar from './grammar.build.js'
import { key as keyPattern, id, index, slice, value, array, object, regex, seq, alt, and, spread, recursive } from './patterns.js'
import * as operations from './operations.js'
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

function getKeyVal (node, items) {
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

const mapEntries = (node, items) => {
  return node.map(({ type, key, value, optional }) => {
    if (type !== 'Entry') { throw new Error('Expected Entry Node') }
    return [getKeyVal(key, items), compile(value, items), optional]
  })
}

const op = (lens, node, items) =>
  lens(compile(node.left, items), compile(node.right, items))

const opt = (lens, optional) => optional ? lens.optional : lens

function lensForInterpolation (val) {
  switch (typeof val) {
    case 'function':
      return val
    case 'object':
      if (val === null) { return value(null) }
      if (Array.isArray(val)) { return array(val) }
      if (val instanceof RegExp) { return regex(val) }
      return object(val)
    default:
      return value(val)
  }
}

export function compile (node, items) {
  switch (node.type) {
    case 'Alt':
      return op(alt, node, items)
    case 'And':
      return op(and, node, items)
    case 'Seq':
      return op(seq, node, items)
    case 'Object':
      return object(mapEntries(node, items))
    case 'Array':
      return array(node.values.map((n) => compile(n, items)))
    case 'Key': {
      let key = getKeyVal(node.value, items)
      if (typeof key === 'string') {
        return opt(keyPattern)(key)
      } else {
        return opt(index)(key)
      }
    }
    case 'Slice': {
      let from = node.from ? getKeyVal(node.from) : undefined
      let to = node.to ? getKeyVal(node.to) : undefined
      return slice(from, to)
    }
    case 'Spread':
      return spread
    case 'Recursive':
      return recursive
    case 'ID':
      return id
    case 'dqstring':
    case 'int':
      return value(node.value)
    case 'placeholder':
      return lensForInterpolation(items[node.value])
    default:
      throw new Error('Unknown AST Node')
  }
}

export function dx (strs, ...items) {
  const gen = compile(parse(strs, items), items)
  gen.test = (focus) => operations.test(gen, focus)
  gen.match = (focus) => operations.match(gen, focus)
  gen.replace = (focus, value) => operations.replace(gen, focus, value)
  gen.exec = (focus, fn) => operations.exec(gen, focus, fn)
  return gen
}

const p = (strs, ...items) => parse(strs, items)
p.Key = (value, optional = false) => ({ type: 'Key', value, optional })
p.ident = (value) => ({ type: 'ident', value })
p.ph = (value) => ({ type: 'placeholder', value })
p.int = (value) => ({ type: 'int', value })
p.dqstring = (value) => ({ type: 'dqstring', value })
p.Spread = { type: 'Spread' }
p.Recursive = { type: 'Recursive' }
p.Array = (value, rest = null) => ({ type: 'Array', value, rest })
p.Seq = (left, right) => ({ type: 'Seq', left, right })
p.Slice = (from, to) => ({ type: 'Slice', from, to })
p.Entry = (key, value, optional = false) => ({ type: 'Entry', key, value, optional })
p.Object = (value) => ({ type: 'Object', value })

export function test_parser (t) {
  t.deepEquals(p`.foo`, p.Key(p.ident('foo')))
  t.deepEquals(p`.${123}?`, p.Key(p.ph(0), true))
  t.deepEquals(p`.1`, p.Key(p.int(1)))
  t.deepEquals(p`."foo bar"?`, p.Key(p.dqstring('foo bar'), true))
  t.deepEquals(p`*`, p.Spread)
  t.deepEquals(p`**`, p.Recursive)
  t.throws(() => p`***`)
  t.deepEquals(p`[]`, p.Array([]))
  t.deepEquals(p`[.foo ]`, p.Array([p.Key(p.ident('foo'))]))
  t.deepEquals(p`[${0} ...${0}]`, p.Array([p.ph(0)], p.ph(1)))
  t.deepEquals(p`.foo*`, p.Seq(p.Key(p.ident('foo')), p.Spread))
  t.deepEquals(p`**.bar`, p.Seq(p.Recursive, p.Key(p.ident('bar'))))
  t.deepEquals(p`.[:2]`, p.Slice(null, p.int(2)))
  t.deepEquals(p`.[1:2]`, p.Slice(p.int(1), p.int(2)))
  t.deepEquals(p`{x: 1, y?: 2}`, p.Object([
    p.Entry(p.ident('x'), p.int(1)),
    p.Entry(p.ident('y'), p.int(2), true)
  ]))
  t.end()
}

// TODO: use method form, put on landing page
// demos are integration tests
export function test_template_string (t) {
  const { match } = operations
  const [res] = match(dx`.foo`, { foo: 1 })
  t.deepEquals(res, 1)
  const [...res2] = match(dx`.foo | .bar`, { foo: 1, bar: 2 })
  t.deepEquals(res2, [1, 2])
  const [res3] = match(dx`.foo .bar`, { foo: { bar: 3 } })
  t.deepEquals(res3, 3)
  const [res4] = match(dx`.foo .0`, { foo: ['bar', 'baz'] })
  t.deepEquals(res4, 'bar')
  const [res5] = match(dx`.foo.0`, { foo: ['bar', 'baz'] })
  t.deepEquals(res5, 'bar')
  t.end()
}
