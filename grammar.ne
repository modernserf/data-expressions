@lexer lexer

sep[ITEM, SEP] -> $ITEM ($SEP $ITEM {% _2 %}):* {% cons %}
               |  null                          {% () => [] %}

Expr    -> AltExpr  {% id %}

# operators
AltExpr  -> AltExpr "|" AndExpr   {% tag("Alt", "left", _, "right") %}
         |  AndExpr               {% id %}
AndExpr  -> AndExpr "&" CompExpr  {% tag("And", "left", _, "right") %}
         |  CompExpr              {% id %}
CompExpr -> CompExpr BaseExpr     {% tag("Comp", "left", "right") %}
         |  BaseExpr              {% id %}

BaseExpr -> "(" Expr ")"          {% _2 %}
         |  "{" ObjectEntries "}" {% tag("Object", _, "value") %}
         |  "[" ArrayEntries "]"  {% tag("Array", _, "value") %}
         |  "." Key Opt           {% tag("Key", _, "value", "optional") %}
         |  "*"                   {% tag("Spread") %}
         |  "**"                  {% tag("Recursive") %}
         |  %placeholder          {% value %}
         |  %dqstring             {% value %}
         |  %int                  {% value %}

ObjectEntries -> sep[Entry, ","]  {% id %}
Entry         -> Key ":" Expr     {% tag("Entry", "key", _, "value") %}
ArrayEntries  -> sep[Expr, ","]   {% id %}

Key   -> %dqstring                {% value %}
      |  %ident                   {% value %}
      |  %int                     {% value %}
      |  %placeholder             {% value %}
Opt   -> "?":?                    {% ([str]) => !!str %}

@{%
const moo = require("moo");
const lexer = moo.compile({
  int: { match: /-?\d+/, value: (x) => Number(x) },
  ident: /[A-Za-z_$][A-Za-z0-9_$]*/,
  placeholder: { match: /<\d+>/, value: (x) => Number(x.slice(1, -1)) },
  dqstring: { match: /"(?:\\"|[^"\n])+"/, value: (x) => x.slice(1, -1) },
  op: /[|&(){}[\].,:?]|\*+/,
  ws: { match: /[ \t\n]+/, lineBreaks: true },
})

const next = lexer.next.bind(lexer)
lexer.next = () => {
    let tok
    while ((tok = next()) && tok.type === 'ws') {}
    return tok
}

const _ = null;
function tag (type, ...params) {
  return (args) =>
    args.reduce((coll, arg, i) => {
      if (params[i]) {
        coll[params[i]] = arg;
      }
      return coll;
    }, {type});
}
function _2 (args) {
  return args[1];
}
function cons ([h, t]) {
  return [h, ...t].map(id);
}
function value ([{ type, value }]) { return { type, value } }
%}
