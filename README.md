# DatEx: JavaScript Data Expressions

DatEx is a library for matching, searching, and immutably updating JavaScript data with tagged template strings.

```js
dx`.foo.bar`.test({ foo: { bar: 3 } }) // => true
dx`.foo.bar`.match({ foo: { bar: 3 } }) // => [3]
dx`.foo.bar`.replace({ foo: { bar: 3 }}, 5) // { foo: { bar: 5 } }
```

# Glossary
- **pattern**
- **focus**
- **yields** - Patterns are generators that yield `{ match, replace }`.
- **succeeds** - A pattern "succeeds" if it yields any values.


# Patterns

## Basic values
`_`
Succeeds for any focus. Useful as a placeholder in complex expressions.

`"foo"`, `123`, `${value}`
JS Primitives (strings, numbers, bools) succeed if the focus === the value. These can be used

## Keys and indexes
`.foo` , `."foo"` , `.${"foo"}`
If the focus has the property `foo`, yields `focus.foo`.

`.1` , `.${1}`
Use the value at index `1` in an array. You can also use values from the _end_ of the array, using negative indexes:
```js
dx`.-1`.replace(["foo", "bar", "baz"], 123) // => ["foo", "bar", 123]
```

`.foo?`, `.1` , `.${value}?`
A key followed by `?` will always succeed. If that key or index is not present in the object, `.test` will still return `true`, `.match` will yield `undefined`, and `.replace` will insert the value to the structure at that key or index:

```js
dx`.foo?`.replace({}, "value") // => { foo: "value" }
dx`.2?`.replace([], "value")  // => [undefined, undefined, "value"]
```

## Slices
`.[1:3]`, `.[${from}:${to}]`
Use the slice of the array or string.
```js
dx`.[1:]`.replace(["foo", "bar", "baz"], ["different", "items"])
// => ["foo", "different", "items"]
```

## Sequences
You can chain sequences of patterns:

```js
dx`.foo .bar .0`.replace({ foo: { bar: ["baz", "quux"] } }, 123)
// => { foo: { bar: [123, "quux"] } }
```
Whitespace between patterns is optional.

## Spread and recursion
`*`
Yield all values of an array or object. Subsequent patterns will filter these results:
```js
dx`* .foo`.match([{ foo: 1 }, { bar: 2 }, { foo: 3 }])
// => [1, 3]
```

`**`
Yield all values of an array or object _recursively_, including itself, in breadth-first order.

```js
dx`**`.match({ foo: [1, 2], bar: { baz: 3 } })
// => [
//  { foo: [1, 2], bar: { baz: 3 } },
//  [1, 2],
//  { baz: 3 },
//  1,
//  2,
//  3,
// ]
```

This _can_ operate on circular data structures, but will ignore repeated nodes.

## Operators
`.foo | .bar`
Try both patterns on a value. Note that `.match` returns an iterator, and will return _both_ results, if they both succeed; `.replace` will replace the _first_ that succeeds.

```js
dx`.foo | .bar`.match({ foo: 1 }) // => [1]
dx`.foo | .bar`.match({ foo: 1, bar: 2 }) // => [1, 2]
dx`.foo | .bar`.match({ bar: 2 }) // => [2]
dx`.foo | .bar`.replace({ foo: 1, bar: 2 }, 3) // => { foo: 3, bar: 2 }
dx`.foo | .bar`.replace({ baz: 1, bar: 2 }, 3) // => { baz: 1, bar: 3 }
```

`.foo & .bar`
If the left pattern succeeds, try the right pattern on the focus.

```js
dx`.foo & .bar`.match({ foo: 1 }) // => []
dx`.foo & .bar`.match({ foo: 1, bar: 2 }) // => [2]
dx`.foo & .bar`.match({ bar: 2 }) // => []
```

### Order of operations
Patterns can be grouped with parentheses. Otherwise, `.foo & .bar .baz | .quux .xyzzy` groups as `(.foo & (.bar .baz)) | (.quux .xyyzy)`.


## Objects
`{ x: ${}, y: ${}, z?: ${} }`
Succeeds if focus is an object where _all_ fields match the patterns at the corresponding key. Keys can also be _optional_ -- if the key is present in the focus, it must match; otherwise it is skipped.

```js
const pattern = dx`{x: ${dx.num}, y: ${dx.num}, z?: ${dx.num} }`
pattern.test({ x: 1, y: 2 })  // => true
pattern.test({ x: 1, y: 2, z: 3 }) // => true
pattern.test({ x: 1 }) // => false
pattern.test({ x: 1, y: "foo" }) // => false
pattern.test({ x: 1, y: 2, z: "bar" }) // => false
```

Replacement propagates _through_ the object's fields:

```js
const pattern = dx`{x: .foo, y: .bar }`
pattern.replace({ x: { foo: 1 }, y: { bar: 2 } }, { x: 10, y: 20 })
// => { x: { foo: 10 }, y: { bar: 20 } }
```
