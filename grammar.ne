@lexer lexer

sep[ITEM, SEP] -> $ITEM ($SEP $ITEM {% _2 %}):* {% cons %}
               |  null                          {% () => [] %}

Expr    -> AltExpr  {% id %}

# operators
AltExpr  -> AltExpr "|" AndExpr   {% op("Alt") %}
         |  AndExpr               {% id %}
AndExpr  -> AndExpr "&" CompExpr  {% op("And") %}
         |  CompExpr              {% id %}
CompExpr -> CompExpr _ BaseExpr   {% op("Comp") %}
         |  BaseExpr              {% id %}

BaseExpr -> "(" Expr ")"          {% _2 %}
         |  "{" ObjectEntries "}" {% tag("Object", null, "value") %}
         |  "[" ArrayEntries "]"  {% tag("Array", null, "value") %}
         |  "." Key Opt           {% tag("Key", null, "value", "optional") %}
         |  %spread               {% tag("Spread") %}
         |  %recursive            {% tag("Recursive") %}
         |  %placeholder          {% value %}
         |  %dqstring             {% value %}
         |  %int                  {% value %}

ObjectEntries -> sep[Entry, ","]  {% id %}
Entry         -> Key ":" Expr     {% tag("Entry", "key", null, "value") %}
ArrayEntries  -> sep[Expr, ","]   {% id %}

Key   -> %dqstring                {% value %}
      |  %ident                   {% value %}
      |  %int                     {% value %}
      |  %placeholder             {% value %}
Opt   -> "?":?                    {% ([str]) => !!str %}

_  -> null

@{%
const moo = require("moo");
const lexer = moo.compile({
  int: { match: /-?\d+/, value: (x) => Number(x) },
  ident: /[A-Za-z_$][A-Za-z0-9_$]*/,
  placeholder: { match: /<\d+>/, value: (x) => Number(x.slice(1, -1)) },
  dqstring: { match: /"(?:\\"|[^"\n])+"/, value: (x) => x.slice(1, -1) },
  recursive: /\*\*/,
  spread: /\*/,
  op: /[|&(){}[\].,:?]/,
  ws: { match: /[ \t\n]+/, lineBreaks: true },
})

const next = lexer.next.bind(lexer)
lexer.next = () => {
    let tok
    while ((tok = next()) && tok.type === 'ws') {}
    return tok
}

function tag (type, ...params) {
  return (args) =>
    args.reduce((coll, arg, i) => {
      if (params[i]) {
        coll[params[i]] = arg;
      }
      return coll;
    }, {type});
}
function op(type) {
  return tag(type, "left", null, "right");
}
function _2 (args) {
  return args[1];
}
function cons ([h, t]) {
  return [h, ...t].map(id);
}
function value ([{ type, value }]) { return { type, value } }
%}
