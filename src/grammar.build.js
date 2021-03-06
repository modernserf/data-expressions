// Generated automatically by nearley, version 2.15.1
// http://github.com/Hardmath123/nearley
function id(x) { return x[0]; }

  import { _, tag, _2, cons, token, type, lit } from "./grammar-util.js";
  const int = type("int");
  const ident = type("ident");
  const dqstring = type("dqstring");
  const value = type("value");
  const func = type("func");
  const regex = type("regex");
  const star2 = lit('**')
  const spread = lit('...')
let Lexer = undefined;
let ParserRules = [
    {"name": "Expr", "symbols": ["AltExpr"], "postprocess": id},
    {"name": "AltExpr", "symbols": ["AltExpr", {"literal":"|"}, "SeqExpr"], "postprocess": tag("Alt", "left", _, "right")},
    {"name": "AltExpr", "symbols": ["SeqExpr"], "postprocess": id},
    {"name": "SeqExpr", "symbols": ["SeqExpr", "BaseExpr"], "postprocess": tag("Seq", "left", "right")},
    {"name": "SeqExpr", "symbols": ["SeqExpr", {"literal":"!"}], "postprocess": tag("Cut", "value")},
    {"name": "SeqExpr", "symbols": ["SeqExpr", {"literal":"&"}], "postprocess": tag("And", "value")},
    {"name": "SeqExpr", "symbols": ["BaseExpr"], "postprocess": id},
    {"name": "BaseExpr", "symbols": [{"literal":"("}, "Expr", {"literal":")"}], "postprocess": _2},
    {"name": "BaseExpr", "symbols": [{"literal":"{"}, "Object", {"literal":"}"}], "postprocess": tag("Object", _, "value")},
    {"name": "BaseExpr", "symbols": [{"literal":"["}, "Array", {"literal":"]"}], "postprocess": tag("Array", _, "value",)},
    {"name": "BaseExpr", "symbols": [{"literal":"."}, "Key", "Opt"], "postprocess": tag("Key", _, "value", "optional")},
    {"name": "BaseExpr", "symbols": [{"literal":"."}, "Int", "Opt"], "postprocess": tag("Index", _, "value", "optional")},
    {"name": "BaseExpr", "symbols": [{"literal":"."}, "Slice"], "postprocess": _2},
    {"name": "BaseExpr", "symbols": [star2], "postprocess": tag("Recursive")},
    {"name": "BaseExpr", "symbols": [{"literal":"*"}], "postprocess": tag("Spread")},
    {"name": "BaseExpr", "symbols": [{"literal":"_"}], "postprocess": tag("ID")},
    {"name": "BaseExpr", "symbols": [value], "postprocess": token},
    {"name": "BaseExpr", "symbols": [dqstring], "postprocess": token},
    {"name": "BaseExpr", "symbols": [int], "postprocess": token},
    {"name": "BaseExpr", "symbols": [func], "postprocess": token},
    {"name": "BaseExpr", "symbols": [regex], "postprocess": token},
    {"name": "Object$macrocall$2", "symbols": ["Entry"]},
    {"name": "Object$macrocall$3", "symbols": [{"literal":","}]},
    {"name": "Object$macrocall$1$ebnf$1", "symbols": []},
    {"name": "Object$macrocall$1$ebnf$1$subexpression$1", "symbols": ["Object$macrocall$3", "Object$macrocall$2"], "postprocess": _2},
    {"name": "Object$macrocall$1$ebnf$1", "symbols": ["Object$macrocall$1$ebnf$1", "Object$macrocall$1$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Object$macrocall$1", "symbols": ["Object$macrocall$2", "Object$macrocall$1$ebnf$1"], "postprocess": cons},
    {"name": "Object$macrocall$1", "symbols": [], "postprocess": () => []},
    {"name": "Object", "symbols": ["Object$macrocall$1"], "postprocess": id},
    {"name": "Entry", "symbols": ["Key", "Opt", {"literal":":"}, "Expr"], "postprocess": tag("Entry", "key", "optional", _, "value")},
    {"name": "Entry", "symbols": [spread, "Expr"], "postprocess": tag("RestEntry", _, "value")},
    {"name": "Array$macrocall$2", "symbols": ["ArrEntry"]},
    {"name": "Array$macrocall$3", "symbols": [{"literal":","}]},
    {"name": "Array$macrocall$1$ebnf$1", "symbols": []},
    {"name": "Array$macrocall$1$ebnf$1$subexpression$1", "symbols": ["Array$macrocall$3", "Array$macrocall$2"], "postprocess": _2},
    {"name": "Array$macrocall$1$ebnf$1", "symbols": ["Array$macrocall$1$ebnf$1", "Array$macrocall$1$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Array$macrocall$1", "symbols": ["Array$macrocall$2", "Array$macrocall$1$ebnf$1"], "postprocess": cons},
    {"name": "Array$macrocall$1", "symbols": [], "postprocess": () => []},
    {"name": "Array", "symbols": ["Array$macrocall$1"], "postprocess": id},
    {"name": "ArrEntry", "symbols": ["Expr"], "postprocess": tag("ArrEntry", "value")},
    {"name": "ArrEntry", "symbols": [spread, "Expr"], "postprocess": tag("RestEntry", _, "value")},
    {"name": "Slice$ebnf$1", "symbols": ["Int"], "postprocess": id},
    {"name": "Slice$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Slice$ebnf$2", "symbols": ["Int"], "postprocess": id},
    {"name": "Slice$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Slice", "symbols": [{"literal":"["}, "Slice$ebnf$1", {"literal":":"}, "Slice$ebnf$2", {"literal":"]"}], "postprocess": tag("Slice", _, "from", _, "to")},
    {"name": "Int", "symbols": [int], "postprocess": token},
    {"name": "Key", "symbols": [dqstring], "postprocess": token},
    {"name": "Key", "symbols": [ident], "postprocess": token},
    {"name": "Opt$ebnf$1", "symbols": [{"literal":"?"}], "postprocess": id},
    {"name": "Opt$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Opt", "symbols": ["Opt$ebnf$1"], "postprocess": ([str]) => !!str}
];
let ParserStart = "Expr";
export default { Lexer, ParserRules, ParserStart };
