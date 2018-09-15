@lexer lexer

sep[ITEM, SEP] -> $ITEM ($SEP $ITEM {% _2 %}):* {% cons %}
               |  null                          {% () => [] %}

Program -> _ Expr _ {% _2 %}
Expr    -> AltExpr  {% id %}

# operators
AltExpr  -> AltExpr (_ "|" _) AndExpr     {% op("Alt") %}
         |  AndExpr                       {% id %}
AndExpr  -> AndExpr (_ "&" _) CompExpr    {% op("And") %}
         |  CompExpr                      {% id %}
CompExpr -> CompExpr _ BaseExpr           {% op("Comp") %}
         |  BaseExpr                      {% id %}

BaseExpr -> ("(" _) Expr _ ")"            {% _2 %}
         |  ("{" _) ObjectEntries _ "}"   {% tag("Object", null, "value") %}
         |  ("[" _) ArrayEntries _ "]"    {% tag("Array", null, "value") %}
         |  "." Key Opt                   {% tag("Key", null, "value", "optional") %}
         |  %spread                       {% tag("Spread") %}
         |  %recursive                    {% tag("Recursive") %}
         |  %placeholder                  {% value %}
         |  %dqstring                     {% value %}
         |  %int                          {% value %}

ObjectEntries -> sep[Entry , (_ "," _)]   {% id %}
Entry         -> Key (_ ":" _) Expr       {% tag("Entry", "key", null, "value") %}
ArrayEntries  -> sep[Expr, (_ "," _)]     {% id %}

Key   -> %dqstring                        {% value %}
      |  %ident                           {% value %}
      |  %int                             {% value %}
      |  %placeholder                     {% value %}
Opt   -> (_ "?"):?                        {% ([str]) => !!str %}

_  -> %ws:?
__ -> %ws

@{%
const moo = require("moo");
const lexer = moo.compile({
  ws: { match: /[ \t\n]+/, lineBreaks: true },
  int: { match: /-?\d+/, value: (x) => Number(x) },
  ident: /[A-Za-z_$][A-Za-z0-9_$]*/,
  placeholder: { match: /<\d+>/, value: (x) => Number(x.slice(1, -1)) },
  dqstring: { match: /"[^"\n]|(?:\\")"/, value: (x) => x.slice(1, -1) },
  recursive: /\*\*/,
  spread: /\*/,
  op: /[|&(){}[\].,?:]+/
})

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
function join (args) {
  if (typeof args === "string") { return args; }
  return args.reduce((l, r) => l + join(r), "");
}
function cons ([h, t]) {
  return [h, ...t].map(id);
}
function value ([{ type, value }]) { return { type, value } }
%}
