const assert = require('node:assert/strict')
const { test } = require('node:test')
const { pathToFileURL } = require('node:url')
const path = require('node:path')
const root = path.dirname(require.resolve('zod-v3/package.json'))
for (const [label, load] of [
  ['v3 CommonJS', () => require('zod-v3')],
  ['v3 ESM', () => import(pathToFileURL(path.join(root, 'index.js')))],
  ['bundled v4 CommonJS', () => require('zod-v3/v4')],
  ['bundled v4 ESM', () => import(pathToFileURL(path.join(root, 'v4/index.js')))],
]) {
  test(`${label}: bounded arrays reject oversized input before walking elements`, async () => {
    const { z } = await load()
    let visited = 0
    const element = z.string().transform((value) => {
      visited++
      return value.toUpperCase()
    })
    for (const schema of [z.array(element).max(2), z.array(element).length(2)]) {
      const result = schema.safeParse(Array(10000).fill('safe'))
      assert.equal(result.success, false)
      assert.equal(result.error.issues[0].code, 'too_big')
      assert.equal(visited, 0)
      const asyncResult = await schema.safeParseAsync(Array(10000).fill('safe'))
      assert.equal(asyncResult.success, false)
      assert.equal(visited, 0)
    }
    assert.deepEqual(z.array(element).max(2).parse(['one', 'two']), ['ONE', 'TWO'])
    assert.equal(visited, 2)
  })
  test(`${label}: bounded sets reject before parsing their entries`, async () => {
    const { z } = await load()
    let visited = 0
    const schema = z
      .set(
        z.string().transform((value) => {
          visited++
          return value
        }),
      )
      .max(1)
    assert.equal(schema.safeParse(new Set(['one', 'two'])).success, false)
    assert.equal(visited, 0)
    assert.deepEqual(schema.parse(new Set(['one'])), new Set(['one']))
  })
}
test('bundled v4 preserves overwrite-before-bound semantics', () => {
  const { z } = require('zod-v3/v4')
  assert.deepEqual(
    z
      .array(z.string())
      .overwrite((items) => items.slice(0, 1))
      .max(1)
      .parse(['one', 'two']),
    ['one'],
  )
})
