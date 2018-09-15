// Generated automatically by nearley, version 2.15.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }
 const { lexer, _, tag, _2, cons, value } = require("./grammar-util.js"); var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "Expr", "symbols": ["AltExpr"], "postprocess": id},
    {"name": "AltExpr", "symbols": ["AltExpr", {"literal":"|"}, "AndExpr"], "postprocess": tag("Alt", "left", _, "right")},
    {"name": "AltExpr", "symbols": ["AndExpr"], "postprocess": id},
    {"name": "AndExpr", "symbols": ["AndExpr", {"literal":"&"}, "SeqExpr"], "postprocess": tag("And", "left", _, "right")},
    {"name": "AndExpr", "symbols": ["SeqExpr"], "postprocess": id},
    {"name": "SeqExpr", "symbols": ["SeqExpr", "BaseExpr"], "postprocess": tag("Seq", "left", "right")},
    {"name": "SeqExpr", "symbols": ["BaseExpr"], "postprocess": id},
    {"name": "BaseExpr", "symbols": [{"literal":"("}, "Expr", {"literal":")"}], "postprocess": _2},
    {"name": "BaseExpr", "symbols": [{"literal":"{"}, "Object", {"literal":"}"}], "postprocess": tag("Object", _, "value")},
    {"name": "BaseExpr$ebnf$1", "symbols": ["Rest"], "postprocess": id},
    {"name": "BaseExpr$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "BaseExpr", "symbols": [{"literal":"["}, "Array", "BaseExpr$ebnf$1", {"literal":"]"}], "postprocess": tag("Array", _, "value", "rest")},
    {"name": "BaseExpr", "symbols": [{"literal":"."}, "Key", "Opt"], "postprocess": tag("Key", _, "value", "optional")},
    {"name": "BaseExpr", "symbols": [{"literal":"."}, "Slice"], "postprocess": _2},
    {"name": "BaseExpr", "symbols": [{"literal":"*"}], "postprocess": tag("Spread")},
    {"name": "BaseExpr", "symbols": [{"literal":"**"}], "postprocess": tag("Recursive")},
    {"name": "BaseExpr", "symbols": [{"literal":"_"}], "postprocess": tag("ID")},
    {"name": "BaseExpr", "symbols": [(lexer.has("placeholder") ? {type: "placeholder"} : placeholder)], "postprocess": value},
    {"name": "BaseExpr", "symbols": [(lexer.has("dqstring") ? {type: "dqstring"} : dqstring)], "postprocess": value},
    {"name": "BaseExpr", "symbols": [(lexer.has("int") ? {type: "int"} : int)], "postprocess": value},
    {"name": "Object$macrocall$2", "symbols": ["Entry"]},
    {"name": "Object$macrocall$3", "symbols": [{"literal":","}]},
    {"name": "Object$macrocall$1$ebnf$1", "symbols": []},
    {"name": "Object$macrocall$1$ebnf$1$subexpression$1", "symbols": ["Object$macrocall$3", "Object$macrocall$2"], "postprocess": _2},
    {"name": "Object$macrocall$1$ebnf$1", "symbols": ["Object$macrocall$1$ebnf$1", "Object$macrocall$1$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Object$macrocall$1", "symbols": ["Object$macrocall$2", "Object$macrocall$1$ebnf$1"], "postprocess": cons},
    {"name": "Object$macrocall$1", "symbols": [], "postprocess": () => []},
    {"name": "Object", "symbols": ["Object$macrocall$1"], "postprocess": id},
    {"name": "Entry", "symbols": ["Key", "Opt", {"literal":":"}, "Expr"], "postprocess": tag("Entry", "key", "optional", _, "value")},
    {"name": "Array$macrocall$2", "symbols": ["Expr"]},
    {"name": "Array$macrocall$3", "symbols": [{"literal":","}]},
    {"name": "Array$macrocall$1$ebnf$1", "symbols": []},
    {"name": "Array$macrocall$1$ebnf$1$subexpression$1", "symbols": ["Array$macrocall$3", "Array$macrocall$2"], "postprocess": _2},
    {"name": "Array$macrocall$1$ebnf$1", "symbols": ["Array$macrocall$1$ebnf$1", "Array$macrocall$1$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Array$macrocall$1", "symbols": ["Array$macrocall$2", "Array$macrocall$1$ebnf$1"], "postprocess": cons},
    {"name": "Array$macrocall$1", "symbols": [], "postprocess": () => []},
    {"name": "Array", "symbols": ["Array$macrocall$1"], "postprocess": id},
    {"name": "Rest", "symbols": [{"literal":"..."}, "Expr"], "postprocess": _2},
    {"name": "Slice$ebnf$1", "symbols": ["Key"], "postprocess": id},
    {"name": "Slice$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Slice$ebnf$2", "symbols": ["Key"], "postprocess": id},
    {"name": "Slice$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Slice", "symbols": [{"literal":"["}, "Slice$ebnf$1", {"literal":":"}, "Slice$ebnf$2", {"literal":"]"}], "postprocess": tag("Slice", _, "from", _, "to")},
    {"name": "Key", "symbols": [(lexer.has("dqstring") ? {type: "dqstring"} : dqstring)], "postprocess": value},
    {"name": "Key", "symbols": [(lexer.has("ident") ? {type: "ident"} : ident)], "postprocess": value},
    {"name": "Key", "symbols": [(lexer.has("int") ? {type: "int"} : int)], "postprocess": value},
    {"name": "Key", "symbols": [(lexer.has("placeholder") ? {type: "placeholder"} : placeholder)], "postprocess": value},
    {"name": "Opt$ebnf$1", "symbols": [{"literal":"?"}], "postprocess": id},
    {"name": "Opt$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Opt", "symbols": ["Opt$ebnf$1"], "postprocess": ([str]) => !!str}
]
  , ParserStart: "Expr"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
