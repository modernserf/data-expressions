const moo = require('moo')
export const lexer = moo.compile({
  int: { match: /-?\d+/, value: (x) => Number(x) },
  ident: /[A-Za-z_$][A-Za-z0-9_$]*/,
  placeholder: { match: /<\d+>/, value: (x) => Number(x.slice(1, -1)) },
  dqstring: { match: /"(?:\\"|[^"\n])+"/, value: (x) => x.slice(1, -1) },
  op: /[|&(){}[\],:?!_]|\*+|\.+/,
  ws: { match: /[ \t\n]+/, lineBreaks: true }
})

const next = lexer.next.bind(lexer)
lexer.next = () => {
  let tok
  while ((tok = next()) && tok.type === 'ws') {}
  return tok
}

export const _ = null
export function tag (type, ...params) {
  return (args) =>
    args.reduce((coll, arg, i) => {
      if (params[i]) {
        coll[params[i]] = arg
      }
      return coll
    }, { type })
}
export function _2 (args) {
  return args[1]
}
export function cons ([h, t]) {
  return [h, ...t].map(([x]) => x)
}
export function value ([{ type, value }]) { return { type, value } }
