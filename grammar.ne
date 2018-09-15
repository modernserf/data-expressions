@lexer lexer

sep[ITEM, SEP] -> $ITEM ($SEP $ITEM {% _2 %}):* {% cons %}
               |  null                          {% () => [] %}

Expr     -> AltExpr  {% id %}

# operators
AltExpr  -> AltExpr "|" AndExpr   {% tag("Alt", "left", _, "right") %}
         |  AndExpr               {% id %}
AndExpr  -> AndExpr "&" SeqExpr   {% tag("And", "left", _, "right") %}
         |  SeqExpr               {% id %}
SeqExpr  -> SeqExpr BaseExpr      {% tag("Seq", "left", "right") %}
         |  BaseExpr              {% id %}

BaseExpr -> "(" Expr ")"          {% _2 %}
         |  "{" Object "}"        {% tag("Object", _, "value") %}
         |  "[" Array Rest:? "]"  {% tag("Array", _, "value", "rest") %}
         |  "." Key Opt           {% tag("Key", _, "value", "optional") %}
         |  "." Slice             {% _2 %}
         |  "*"                   {% tag("Spread") %}
         |  "**"                  {% tag("Recursive") %}
         |  "_"                   {% tag("ID") %}
         |  %placeholder          {% value %}
         |  %dqstring             {% value %}
         |  %int                  {% value %}

Object   -> sep[Entry, ","]       {% id %}
Entry    -> Key Opt ":" Expr      {% tag("Entry", "key", "optional", _, "value") %}
Array    -> sep[Expr, ","]        {% id %}
Rest     -> "..." Expr            {% _2 %}

Slice -> "[" Key:? ":" Key:? "]"  {% tag("Slice", _, "from", _, "to") %}

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
  op: /[|&(){}[\],:?_]|\*+|\.+/,
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
