// Generated automatically by nearley, version 2.15.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

const moo = require("moo");
const lexer = moo.compile({
  ws: { match: /[ \t\n]+/, lineBreaks: true },
  int: { match: /-?\d+/, transform: (x) => Number(x) },
  ident: /[A-Za-z_$][A-Za-z0-9_$]*/,
  placeholder: { match: /<\d+>/, transform: (x) => Number(x.slice(1, -1)) },
  dqstring: { match: /"[^"\n]|(?:\\")"/, transform: (x) => x.slice(1, -1) },
  op: /[|&(){}[\].*,?:]+/
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
function value (x) { return x[0].value; }
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "Program", "symbols": ["_", "Expr", "_"], "postprocess": _2},
    {"name": "Expr", "symbols": ["AltExpr"], "postprocess": id},
    {"name": "AltExpr$subexpression$1", "symbols": ["_", {"literal":"|"}, "_"]},
    {"name": "AltExpr", "symbols": ["AltExpr", "AltExpr$subexpression$1", "AndExpr"], "postprocess": op("Alt")},
    {"name": "AltExpr", "symbols": ["AndExpr"], "postprocess": id},
    {"name": "AndExpr$subexpression$1", "symbols": ["_", {"literal":"&"}, "_"]},
    {"name": "AndExpr", "symbols": ["AndExpr", "AndExpr$subexpression$1", "CompExpr"], "postprocess": op("And")},
    {"name": "AndExpr", "symbols": ["CompExpr"], "postprocess": id},
    {"name": "CompExpr", "symbols": ["CompExpr", "_", "BaseExpr"], "postprocess": op("Comp")},
    {"name": "CompExpr", "symbols": ["BaseExpr"], "postprocess": id},
    {"name": "BaseExpr$subexpression$1", "symbols": [{"literal":"("}, "_"]},
    {"name": "BaseExpr", "symbols": ["BaseExpr$subexpression$1", "Expr", "_", {"literal":")"}], "postprocess": _2},
    {"name": "BaseExpr$subexpression$2", "symbols": [{"literal":"{"}, "_"]},
    {"name": "BaseExpr", "symbols": ["BaseExpr$subexpression$2", "ObjectEntries", "_", {"literal":"}"}], "postprocess": tag("Object", null, "value")},
    {"name": "BaseExpr$subexpression$3", "symbols": [{"literal":"["}, "_"]},
    {"name": "BaseExpr", "symbols": ["BaseExpr$subexpression$3", "ArrayEntries", "_", {"literal":"]"}], "postprocess": tag("Array", null, "value")},
    {"name": "BaseExpr", "symbols": [{"literal":"."}, "Key", "Opt"], "postprocess": tag("Key", null, "value", "optional")},
    {"name": "BaseExpr", "symbols": [{"literal":"."}, "Int", "Opt"], "postprocess": tag("Index", null, "value", "optional")},
    {"name": "BaseExpr", "symbols": [{"literal":"..."}], "postprocess": tag("Spread")},
    {"name": "BaseExpr", "symbols": [{"literal":"*"}], "postprocess": tag("Recursive")},
    {"name": "BaseExpr$subexpression$4", "symbols": [(lexer.has("placeholder") ? {type: "placeholder"} : placeholder)], "postprocess": value},
    {"name": "BaseExpr", "symbols": ["BaseExpr$subexpression$4"], "postprocess": tag("Placeholder", "index")},
    {"name": "ObjectEntries$macrocall$2", "symbols": ["Entry"]},
    {"name": "ObjectEntries$macrocall$3$subexpression$1", "symbols": ["_", {"literal":","}, "_"]},
    {"name": "ObjectEntries$macrocall$3", "symbols": ["ObjectEntries$macrocall$3$subexpression$1"]},
    {"name": "ObjectEntries$macrocall$1$ebnf$1", "symbols": []},
    {"name": "ObjectEntries$macrocall$1$ebnf$1$subexpression$1", "symbols": ["ObjectEntries$macrocall$3", "ObjectEntries$macrocall$2"], "postprocess": _2},
    {"name": "ObjectEntries$macrocall$1$ebnf$1", "symbols": ["ObjectEntries$macrocall$1$ebnf$1", "ObjectEntries$macrocall$1$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ObjectEntries$macrocall$1", "symbols": ["ObjectEntries$macrocall$2", "ObjectEntries$macrocall$1$ebnf$1"], "postprocess": cons},
    {"name": "ObjectEntries$macrocall$1", "symbols": [], "postprocess": () => []},
    {"name": "ObjectEntries", "symbols": ["ObjectEntries$macrocall$1"], "postprocess": id},
    {"name": "Entry$subexpression$1", "symbols": ["_", {"literal":":"}, "_"]},
    {"name": "Entry", "symbols": ["Key", "Entry$subexpression$1", "Expr"], "postprocess": tag("Entry", "key", null, "value")},
    {"name": "ArrayEntries$macrocall$2", "symbols": ["Expr"]},
    {"name": "ArrayEntries$macrocall$3$subexpression$1", "symbols": ["_", {"literal":","}, "_"]},
    {"name": "ArrayEntries$macrocall$3", "symbols": ["ArrayEntries$macrocall$3$subexpression$1"]},
    {"name": "ArrayEntries$macrocall$1$ebnf$1", "symbols": []},
    {"name": "ArrayEntries$macrocall$1$ebnf$1$subexpression$1", "symbols": ["ArrayEntries$macrocall$3", "ArrayEntries$macrocall$2"], "postprocess": _2},
    {"name": "ArrayEntries$macrocall$1$ebnf$1", "symbols": ["ArrayEntries$macrocall$1$ebnf$1", "ArrayEntries$macrocall$1$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ArrayEntries$macrocall$1", "symbols": ["ArrayEntries$macrocall$2", "ArrayEntries$macrocall$1$ebnf$1"], "postprocess": cons},
    {"name": "ArrayEntries$macrocall$1", "symbols": [], "postprocess": () => []},
    {"name": "ArrayEntries", "symbols": ["ArrayEntries$macrocall$1"], "postprocess": id},
    {"name": "Int", "symbols": [(lexer.has("int") ? {type: "int"} : int)], "postprocess": value},
    {"name": "Key", "symbols": [(lexer.has("dqstring") ? {type: "dqstring"} : dqstring)], "postprocess": value},
    {"name": "Key", "symbols": [(lexer.has("ident") ? {type: "ident"} : ident)], "postprocess": value},
    {"name": "Key", "symbols": [(lexer.has("placeholder") ? {type: "placeholder"} : placeholder)], "postprocess": value},
    {"name": "Opt$ebnf$1$subexpression$1", "symbols": ["_", {"literal":"?"}]},
    {"name": "Opt$ebnf$1", "symbols": ["Opt$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "Opt$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Opt", "symbols": ["Opt$ebnf$1"], "postprocess": ([str]) => !!str},
    {"name": "_$ebnf$1", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": id},
    {"name": "_$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "_", "symbols": ["_$ebnf$1"]},
    {"name": "__", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]}
]
  , ParserStart: "Program"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
