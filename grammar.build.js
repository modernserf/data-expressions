// Generated automatically by nearley, version 2.15.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

const moo = require("moo");
const lexer = moo.compile({
  int: { match: /-?\d+/, value: (x) => Number(x) },
  ident: /[A-Za-z_$][A-Za-z0-9_$]*/,
  placeholder: { match: /<\d+>/, value: (x) => Number(x.slice(1, -1)) },
  dqstring: { match: /"(?:\\"|[^"\n])+"/, value: (x) => x.slice(1, -1) },
  op: /[|&(){}[\].,:?_]|\*+/,
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
var grammar = {
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
    {"name": "BaseExpr", "symbols": [{"literal":"{"}, "ObjectEntries", {"literal":"}"}], "postprocess": tag("Object", _, "value")},
    {"name": "BaseExpr", "symbols": [{"literal":"["}, "ArrayEntries", {"literal":"]"}], "postprocess": tag("Array", _, "value")},
    {"name": "BaseExpr", "symbols": [{"literal":"."}, "Key", "Opt"], "postprocess": tag("Key", _, "value", "optional")},
    {"name": "BaseExpr", "symbols": [{"literal":"."}, "Slice"], "postprocess": _2},
    {"name": "BaseExpr", "symbols": [{"literal":"*"}], "postprocess": tag("Spread")},
    {"name": "BaseExpr", "symbols": [{"literal":"**"}], "postprocess": tag("Recursive")},
    {"name": "BaseExpr", "symbols": [{"literal":"_"}], "postprocess": tag("ID")},
    {"name": "BaseExpr", "symbols": [(lexer.has("placeholder") ? {type: "placeholder"} : placeholder)], "postprocess": value},
    {"name": "BaseExpr", "symbols": [(lexer.has("dqstring") ? {type: "dqstring"} : dqstring)], "postprocess": value},
    {"name": "BaseExpr", "symbols": [(lexer.has("int") ? {type: "int"} : int)], "postprocess": value},
    {"name": "ObjectEntries$macrocall$2", "symbols": ["Entry"]},
    {"name": "ObjectEntries$macrocall$3", "symbols": [{"literal":","}]},
    {"name": "ObjectEntries$macrocall$1$ebnf$1", "symbols": []},
    {"name": "ObjectEntries$macrocall$1$ebnf$1$subexpression$1", "symbols": ["ObjectEntries$macrocall$3", "ObjectEntries$macrocall$2"], "postprocess": _2},
    {"name": "ObjectEntries$macrocall$1$ebnf$1", "symbols": ["ObjectEntries$macrocall$1$ebnf$1", "ObjectEntries$macrocall$1$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ObjectEntries$macrocall$1", "symbols": ["ObjectEntries$macrocall$2", "ObjectEntries$macrocall$1$ebnf$1"], "postprocess": cons},
    {"name": "ObjectEntries$macrocall$1", "symbols": [], "postprocess": () => []},
    {"name": "ObjectEntries", "symbols": ["ObjectEntries$macrocall$1"], "postprocess": id},
    {"name": "Entry", "symbols": ["Key", "Opt", {"literal":":"}, "Expr"], "postprocess": tag("Entry", "key", "optional", _, "value")},
    {"name": "ArrayEntries$macrocall$2", "symbols": ["Expr"]},
    {"name": "ArrayEntries$macrocall$3", "symbols": [{"literal":","}]},
    {"name": "ArrayEntries$macrocall$1$ebnf$1", "symbols": []},
    {"name": "ArrayEntries$macrocall$1$ebnf$1$subexpression$1", "symbols": ["ArrayEntries$macrocall$3", "ArrayEntries$macrocall$2"], "postprocess": _2},
    {"name": "ArrayEntries$macrocall$1$ebnf$1", "symbols": ["ArrayEntries$macrocall$1$ebnf$1", "ArrayEntries$macrocall$1$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ArrayEntries$macrocall$1", "symbols": ["ArrayEntries$macrocall$2", "ArrayEntries$macrocall$1$ebnf$1"], "postprocess": cons},
    {"name": "ArrayEntries$macrocall$1", "symbols": [], "postprocess": () => []},
    {"name": "ArrayEntries", "symbols": ["ArrayEntries$macrocall$1"], "postprocess": id},
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
