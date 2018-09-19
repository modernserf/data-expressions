@{%
  import { _, tag, _2, cons, token, type, lit } from "./grammar-util.js";
  const int = type("int");
  const ident = type("ident");
  const dqstring = type("dqstring");
  const value = type("value");
  const func = type("func");
  const regex = type("regex");
  const star2 = lit('**')
  const spread = lit('...')
%}
@preprocessor esmodule

sep[ITEM, SEP] -> $ITEM ($SEP $ITEM {% _2 %}):* {% cons %}
               |  null                          {% () => [] %}

Expr     -> AltExpr  {% id %}

# operators
AltExpr  -> AltExpr "|" SeqExpr   {% tag("Alt", "left", _, "right") %}
         |  SeqExpr               {% id %}
SeqExpr  -> SeqExpr BaseExpr      {% tag("Seq", "left", "right") %}
         |  SeqExpr "!"           {% tag("Cut", "value") %}
         |  SeqExpr "&"           {% tag("And", "value") %}
         |  BaseExpr              {% id %}

BaseExpr -> "(" Expr ")"          {% _2 %}
         |  "{" Object "}"        {% tag("Object", _, "value") %}
         |  "[" Array "]"         {% tag("Array", _, "value",) %}
         |  "." Key Opt           {% tag("Key", _, "value", "optional") %}
         |  "." Int Opt           {% tag("Index", _, "value", "optional") %}
         |  "." Slice             {% _2 %}
         |  %star2                {% tag("Recursive") %}
         |  "*"                   {% tag("Spread") %}
         |  "_"                   {% tag("ID") %}
         |  %value                {% token %}
         |  %dqstring             {% token %}
         |  %int                  {% token %}
         |  %func                 {% token %}
         |  %regex                {% token %}

Object   -> sep[Entry, ","]       {% id %}
Entry    -> Key Opt ":" Expr      {% tag("Entry", "key", "optional", _, "value") %}
         |  %spread Expr          {% tag("RestEntry", _, "value") %}
Array    -> sep[ArrEntry, ","]    {% id %}
ArrEntry -> Expr                  {% tag("ArrEntry", "value") %}
         |  %spread Expr          {% tag("RestEntry", _, "value") %}

Slice -> "[" Int:? ":" Int:? "]"  {% tag("Slice", _, "from", _, "to") %}

Int   -> %int                     {% token %}
Key   -> %dqstring                {% token %}
      |  %ident                   {% token %}
Opt   -> "?":?                    {% ([str]) => !!str %}
