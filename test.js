const tape = require('tape')
const {
  test, match, replace, exec,
  id, key, index, slice, where, value, regex, spread, recursive,
  collect, project, alt, and, pipe, array, object
} = require('./index')
const { parse, dx } = require('./parser')
const p = (strs, ...items) => parse(strs, items)

tape('id', (t) => {
  const [res] = match(id, { foo: 1 })
  t.deepEquals(res, { foo: 1 },
    'id.match returns itself')
  const out = replace(id, { foo: 1 }, { bar: 2 })
  t.deepEquals(out, { bar: 2 },
    'id.replace returns the new value')
  t.end()
})

tape('key', (t) => {
  const [res] = match(key('foo'), { foo: { bar: 1 } })
  t.deepEquals(res, { bar: 1 },
    'key.match returns the field at key')
  const out = replace(key('foo'), { foo: { bar: 1 } }, { quux: 2 })
  t.deepEquals(out, { foo: { quux: 2 } },
    'key.replace returns the object with key updated')
  t.false(test(key('baz')), { foo: { bar: 1 } },
    'key.test fails if key not present')
  t.end()
})

tape('key.optional', (t) => {
  const out = replace(key.optional('baz'), { foo: { bar: 1 } }, { quux: 2 })
  t.deepEquals(out, { foo: { bar: 1 }, baz: { quux: 2 } },
    'key.optional.replace inserts values at a new key')
  t.end()
})

tape('index', (t) => {
  const [res] = match(index(1), ['foo', 'bar', 'baz'])
  t.deepEquals(res, 'bar',
    'index.match gets array items')
  const [res2] = match(index(-1), ['foo', 'bar', 'baz'])
  t.deepEquals(res2, 'baz',
    'index.match gets item from end with negative index')
  t.false(test(index(5), ['foo', 'bar', 'baz']),
    'index.match does not return when out of range')
  const out = replace(index(1), ['foo', 'bar', 'baz'], 'quux')
  t.deepEquals(out, ['foo', 'quux', 'baz'],
    'index.replace updates array items')
  const out2 = replace(index(-1), ['foo', 'bar', 'baz'], 'quux')
  t.deepEquals(out2, ['foo', 'bar', 'quux'],
    'index.replace works with negative index')
  const out3 = replace(index(5), ['foo', 'bar', 'baz'], 'quux')
  t.deepEquals(out3, ['foo', 'bar', 'baz'],
    'index.replace does not beyond end of list')
  t.end()
})

tape('index.optional', (t) => {
  const [...res] = match(index.optional(10), ['foo', 'bar', 'baz'])
  t.deepEquals(res, [undefined],
    'index.optional.match always yields, even if result is undefined')
  const out = replace(index.optional(5), ['foo', 'bar', 'baz'], 'quux')
  t.deepEquals(out, ['foo', 'bar', 'baz', undefined, undefined, 'quux'],
    'index.optional.replace adds past the end of a list')
  t.end()
})

tape('slice', (t) => {
  const [res] = match(slice(1), ['foo', 'bar', 'baz'])
  t.deepEquals(res, ['bar', 'baz'])
  const out = replace(slice(1, 3), ['foo', 'bar', 'baz', 'quux'], ['flerb'])
  t.deepEquals(out, ['foo', 'flerb', 'quux'])
  t.end()
})

tape('where', (t) => {
  const gt10 = (x) => x > 10
  const [res] = match(where(gt10), 100)
  t.deepEquals(res, 100,
    'where.match returns focus on success')
  t.false(test(where(gt10), 5),
    'where.match does not return on failure')
  const out = replace(where(gt10), 100, 200)
  t.deepEquals(out, 200,
    'where.replace returns value on success')
  const out2 = replace(where(gt10), 5, 200)
  t.deepEquals(out2, 5,
    'where.replace returns focus on failure')
  t.end()
})

tape('value', (t) => {
  const sym = Symbol('a symbol')
  const [res] = match(value(sym), sym)
  t.deepEquals(res, sym)
  const out = replace(value(sym), sym, 'foo')
  t.deepEquals(out, 'foo')
  t.end()
})

tape('regex', (t) => {
  const [res] = match(regex(/f../), 'foobar')
  t.deepEquals(res, 'foo')
  const out = replace(regex(/f../), 'foobar', 'baz')
  t.deepEquals(out, 'bazbar')
  const [...res2] = match(regex(/h./g), 'ha ho he hi')
  t.deepEquals(res2, ['ha', 'ho', 'he', 'hi'])
  t.comment('TODO: reasonable behavior for regex/g.replace')
  t.end()
})

tape('spread', (t) => {
  const [...res] = match(spread, [1, 2, 3])
  t.deepEquals(res, [1, 2, 3],
    'spread array')
  const [...res2] = match(spread, { foo: 1, bar: 2, baz: 3 })
  t.deepEquals(res2, [1, 2, 3],
    'spread object')
  const [...out] = exec(spread, [1, 2, 3], (x) => x + 1)
  t.deepEquals(out, [
    [2, 2, 3],
    [1, 3, 3],
    [1, 2, 4]
  ])
  const [...out2] = exec(spread, { foo: 1, bar: 2, baz: 3 }, (x) => x + 1)
  t.deepEquals(out2, [
    { foo: 2, bar: 2, baz: 3 },
    { foo: 1, bar: 3, baz: 3 },
    { foo: 1, bar: 2, baz: 4 }
  ])
  t.end()
})

tape('recursive', (t) => {
  const [...matches] = match(recursive, { foo: 1, bar: [2, { baz: 3 }] })
  t.deepEquals(matches, [
    { foo: 1, bar: [2, { baz: 3 }] },
    1,
    [2, { baz: 3 }],
    2,
    { baz: 3 },
    3
  ], 'recursive.match returns all items traversed in breadth-first order')
  const [...out] = exec(recursive, { foo: 1, bar: [2, { baz: 3 }] }, () => 'quux')
  t.deepEquals(out, [
    'quux',
    { foo: 'quux', bar: [2, { baz: 3 }] },
    { foo: 1, bar: 'quux' },
    { foo: 1, bar: ['quux', { baz: 3 }] },
    { foo: 1, bar: [2, 'quux'] },
    { foo: 1, bar: [2, { baz: 'quux' }] }
  ], 'recursive.replace returns multiple items')
  t.end()
})

tape('alt', (t) => {
  const lens = alt(key('foo'), key('bar'))
  const [res] = match(lens, { foo: 1, baz: 3 })
  t.deepEquals(res, 1,
    'alt.match returns first on success')
  const [res2] = match(lens, { bar: 2, baz: 3 })
  t.deepEquals(res2, 2,
    'alt.match returns second if first fails')
  t.false(test(lens, { baz: 3 }),
    'alt.match fails if both fail')
  const out = replace(lens, { foo: 1, baz: 3 }, 10)
  t.deepEquals(out, { foo: 10, baz: 3 },
    'alt.replace on first item')
  const out2 = replace(lens, { bar: 2, baz: 3 }, 10)
  t.deepEquals(out2, { bar: 10, baz: 3 },
    'alt.replace on second item')
  const [...out3] = exec(lens, { foo: 1, bar: 2, baz: 3 }, () => 10)
  t.deepEquals(out3, [
    { foo: 10, bar: 2, baz: 3 },
    { foo: 1, bar: 10, baz: 3 }
  ], 'alt.replace returns multiple items on success')
  t.end()
})

tape('and', (t) => {
  const lens = and(key('foo'), key('bar'))
  const [res] = match(lens, { foo: 1, bar: 2 })
  t.deepEquals(res, 2)
  t.false(test(lens, { bar: 2, quux: 3 }))
  const out = replace(lens, { foo: 1, bar: 2 }, 4)
  t.deepEquals(out, { foo: 1, bar: 4 })
  t.end()
})

tape('collect', (t) => {
  const lens = collect(alt(key('foo'), key('bar')))
  const [res] = match(lens, { foo: 1, bar: 2, baz: 3 })
  t.deepEquals(res, [1, 2],
    'collect.match returns an array of results')
  const [res2] = match(lens, { foo: 1, quux: 2 })
  t.deepEquals(res2, [1],
    'collect.match propagates failure')
  const out = replace(lens, { foo: 1, bar: 2, baz: 3 }, 10)
  t.deepEquals(out, [
    { foo: 10, bar: 2, baz: 3 },
    { foo: 1, bar: 10, baz: 3 }
  ], 'collect.replace returns an array of results')
  t.end()
})

tape('project', (t) => {
  const lens = project((x) => x.toUpperCase())
  const [res] = match(lens, 'foo')
  t.deepEquals(res, 'FOO')
  const out = replace(lens, 'foo', 'bar')
  t.deepEquals(out, 'bar')
  t.end()
})

tape('pipe', (t) => {
  const lens = pipe(key('foo'), key('bar'))
  const [res] = match(lens, { foo: { bar: 1 } })
  t.deepEquals(res, 1,
    'pipe.match traverses structures')
  const out = replace(lens, { foo: { bar: 1 } }, 2)
  t.deepEquals(out, { foo: { bar: 2 } },
    'pipe.replace traverses structures')
  const lens2 = pipe(recursive, key('bar'))
  const out2 = replace(lens2, { foo: { quux: { flerb: { bar: 1 } } } }, 2)
  t.deepEquals(out2, { foo: { quux: { flerb: { bar: 2 } } } },
    'pipe.replace recursive updates')
  t.end()
})

tape('array', (t) => {
  const lens = array([value('foo'), where((x) => typeof x === 'number')])
  const [res] = match(lens, ['foo', 1])
  t.deepEquals(res, ['foo', 1])
  const out = replace(lens, ['foo', 1], ['bar', 10])
  t.deepEquals(out, ['bar', 10])
  t.comment('TODO: `rest` parameter for matching tails; use slice?')
  t.end()
})

tape('object', (t) => {
  const lens = object({
    foo: where((x) => x > 0),
    bar: where((x) => typeof x === 'string')
  })
  const focus = { foo: 10, bar: 'a string', baz: ['else'] }
  const [res] = match(lens, focus)
  t.deepEquals(res, { foo: 10, bar: 'a string' })
  const out = replace(lens, focus, { foo: 20, bar: 'flerb' })
  t.deepEquals(out, { foo: 20, bar: 'flerb', baz: ['else'] })
  t.end()
})

tape('template string', (t) => {
  const [res] = match(dx`.foo`, { foo: 1 })
  t.deepEquals(res, 1)
  const [...res2] = match(dx`.foo | .bar`, { foo: 1, bar: 2 })
  t.deepEquals(res2, [1, 2])
  const [res3] = match(dx`.foo .bar`, { foo: { bar: 3 } })
  t.deepEquals(res3, 3)
  const [res4] = match(dx`.foo .0`, { foo: ['bar', 'baz'] })
  t.deepEquals(res4, 'bar')
  t.end()
})

tape('parser', (t) => {
  const ast = p`.foo`
  t.deepEquals(ast, { type: 'Key', value: { type: 'ident', value: 'foo' }, optional: false })
  const ast2 = p`.${123}?`
  t.deepEquals(ast2, { type: 'Key', value: { type: 'placeholder', value: 0 }, optional: true })
  const ast3 = p`.1`
  t.deepEquals(ast3, { type: 'Key', value: { type: 'int', value: 1 }, optional: false })
  t.end()
})
