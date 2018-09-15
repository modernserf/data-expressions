const { Parser, Grammar } = require('nearley')
const grammar = require('./grammar.build.js')
const lenses = require('./lenses.js')

function parse (strs, items) {
  const parser = new Parser(Grammar.fromCompiled(grammar))
  for (let i = 0; i < strs.length; i++) {
    parser.feed(strs[i])
    if (items[i]) { parser.feed(`<${i}>`) }
  }
  const { results } = parser
  if (results.length !== 1) {
    console.error(results)
    throw new Error('Parsing failed')
  }
  return results[0]
}

function getKeyString (node, items) {
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
  return node.reduce((m, { type, key, value }) => {
    if (type !== 'Entry') { throw new Error('Expected Entry Node') }
    m[getKeyString(key, items)] = compile(value, items)
    return m
  }, {})
}

const op = (lens, node, items) =>
  lens(compile(node.left, items), compile(node.right, items))

const opt = (lens, optional) => optional ? lens.optional : lens

function lensForInterpolation (val) {
  switch (typeof val) {
    case 'function':
      return val
    case 'object':
      if (val === null) { return lenses.value(null) }
      if (Array.isArray(val)) { return lenses.array(val) }
      if (val instanceof RegExp) { return lenses.regex(val) }
      return lenses.object(val)
    default:
      return lenses.value(val)
  }
}

function compile (node, items) {
  switch (node.type) {
    case 'Alt':
      return op(lenses.alt, node, items)
    case 'And':
      return op(lenses.and, node, items)
    case 'Comp':
      return op(lenses.pipe, node, items)
    case 'Object':
      return lenses.object(mapEntries(node, items))
    case 'Array':
      return lenses.array(node.values.map((n) => compile(n, items)))
    case 'Key':
      let key = getKeyString(node.value, items)
      if (typeof key === 'string') {
        return opt(lenses.key)(key)
      } else {
        return opt(lenses.index)(key)
      }
    case 'Spread':
      return lenses.spread
    case 'Recursive':
      return lenses.recursive
    case 'dqstring':
    case 'int':
      return lenses.value(node.value)
    case 'placeholder':
      return lensForInterpolation(items[node.value])
    default:
      throw new Error('Unknown AST Node')
  }
}

function dx (strs, ...items) {
  return compile(parse(strs, items), items)
}

module.exports = { parse, compile, dx }
