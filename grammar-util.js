const moo = require('moo')
const lexer = moo.compile({
  int: { match: /-?\d+/, value: (x) => Number(x) },
  ident: /[A-Za-z_$][A-Za-z0-9_$]*/,
  placeholder: { match: /<\d+>/, value: (x) => Number(x.slice(1, -1)) },
  dqstring: { match: /"(?:\\"|[^"\n])+"/, value: (x) => x.slice(1, -1) },
  op: /[|&(){}[\],:?_]|\*+|\.+/,
  ws: { match: /[ \t\n]+/, lineBreaks: true }
})

const next = lexer.next.bind(lexer)
lexer.next = () => {
  let tok
  while ((tok = next()) && tok.type === 'ws') {}
  return tok
}

const _ = null
function tag (type, ...params) {
  return (args) =>
    args.reduce((coll, arg, i) => {
      if (params[i]) {
        coll[params[i]] = arg
      }
      return coll
    }, { type })
}
function _2 (args) {
  return args[1]
}
function cons ([h, t]) {
  return [h, ...t].map(([x]) => x)
}
function value ([{ type, value }]) { return { type, value } }

module.exports = { lexer, _, tag, _2, cons, value }
