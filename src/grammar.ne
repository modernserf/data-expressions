@{% import { lexer, _, tag, _2, cons, value } from "./grammar-util.js"; %}
@lexer lexer
@preprocessor esmodule

sep[ITEM, SEP] -> $ITEM ($SEP $ITEM {% _2 %}):* {% cons %}
               |  null                          {% () => [] %}

Expr     -> AltExpr  {% id %}

# operators
AltExpr  -> AltExpr "|" AndExpr   {% tag("Alt", "left", _, "right") %}
         |  AndExpr               {% id %}
AndExpr  -> AndExpr "&" SeqExpr   {% tag("And", "left", _, "right") %}
         |  SeqExpr               {% id %}
SeqExpr  -> SeqExpr BaseExpr      {% tag("Seq", "left", "right") %}
         |  SeqExpr "!"           {% tag("Cut", "value") %}
         |  BaseExpr              {% id %}

BaseExpr -> "(" Expr ")"          {% _2 %}
         |  "{" Object "}"        {% tag("Object", _, "value") %}
         |  "[" Array "]"         {% tag("Array", _, "value",) %}
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
         |  "..." Expr            {% tag("RestEntry", _, "value") %}
Array    -> sep[ArrEntry, ","]    {% id %}
ArrEntry -> Expr                  {% tag("ArrEntry", "value") %}
         |  "..." Expr            {% tag("RestEntry", _, "value") %}

Slice -> "[" Int:? ":" Int:? "]"  {% tag("Slice", _, "from", _, "to") %}

Int   -> %int                     {% value %}
      |  %placeholder             {% value %}
Key   -> %dqstring                {% value %}
      |  %ident                   {% value %}
      |  %int                     {% value %}
      |  %placeholder             {% value %}
Opt   -> "?":?                    {% ([str]) => !!str %}
