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
