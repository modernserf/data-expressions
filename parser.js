const { Parser, Grammar } = require('nearley')
const grammar = require('./grammar.build.js')
const lenses = require('./lenses.js')

function parse (strs, items) {
  const parser = new Parser(Grammar.fromCompiled(grammar))
  for (i = 0; i < strs.length; i++) {
    parser.feed(strs[i])
    if (items[i]) { parser.feed(`<${i}>`) }
  }
  const { results } = parser
  if (results.length !== 1) { throw new Error('Parsing failed') }
  return results[0]
}

function compile (ast, items) {
  switch (ast.type) {
    default:
      throw new Error('Unknown AST Node')
  }
}

function dx (strs, ...items) {
  return compile(parse(strs, items), items)
}

module.exports = { parse, compile, dx }
