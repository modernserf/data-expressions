export const _ = null
export function tag (type, ...params) {
  return (args) =>
    args.reduce((coll, arg, i) => {
      if (params[i]) {
        coll[params[i]] = arg
      }
      return coll
    }, { type })
}
export function _2 (args) {
  return args[1]
}
export function cons ([h, t]) {
  return [h, ...t].map(([x]) => x)
}
export function value ([{ type, value }]) { return { type, value } }

export const type = (type) => ({ test: (x) => x.type === type })
export const lit = (literal) => ({ literal })
