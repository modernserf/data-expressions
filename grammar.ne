@{% const { lexer, _, tag, _2, cons, value } = require("./grammar-util.js"); %}
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
