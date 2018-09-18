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

const compileEntry = (items) => ({ type, key, value, optional }) => {
  switch (type) {
    case 'Entry':
      return { type: 'Entry', key: getKeyVal(key, items), value: compile(value, items), optional }
    case 'ArrEntry':
      return { type: 'ArrEntry', value: compile(value, items) }
    case 'RestEntry':
      return { type: 'RestEntry', value: compile(value, items) }
    default:
      throw new Error('Expected Entry Node')
  }
}

const op = (lens, node, items) =>
  lens(compile(node.left, items), compile(node.right, items))

const opt = (lens, optional) => optional ? lens.optional : lens

function lensForInterpolation (val) {
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

export function compile (node, items) {
  switch (node.type) {
    case 'Alt':
      return op(alt, node, items)
    case 'Seq':
      return op(seq, node, items)
    case 'And':
      return and(compile(node.value, items))
    case 'Cut':
      return limit(compile(node.value, items), 1)
    case 'Object':
      return objectShape(node.value.map(compileEntry(items)))
    case 'Array':
      return arrayShape(node.value.map(compileEntry(items)))
    case 'Key': {
      let key = getKeyVal(node.value, items)
      if (typeof key === 'string') {
        return opt(keyPattern, node.optional)(key)
      } else {
        return opt(index, node.optional)(key)
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
  return decoratePattern(compile(parse(strs, items), items))
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
