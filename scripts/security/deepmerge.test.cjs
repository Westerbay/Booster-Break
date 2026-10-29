const assert = require("node:assert/strict");
const { test } = require("node:test");
const merge = require("deepmerge");

test("untrusted merge keys cannot change the returned prototype", () => {
  const source = JSON.parse('{"__proto__":{"isAdmin":true},"name":"safe"}');
  for (const target of [Object.create(null), { nested: null }, JSON.parse('{"__proto__":null}')]) {
    const result = merge(target, source);
    assert.equal(Object.getPrototypeOf(result), Object.prototype);
    assert.equal(result.isAdmin, undefined);
    assert.equal(result.name, "safe");
  }
  const nested = merge({ nested: null }, { nested: source });
  assert.equal(nested.nested.isAdmin, undefined);
  assert.equal({}.isAdmin, undefined);
});

test("poisoned target keys cannot change the returned prototype", () => {
  const result = merge(JSON.parse('{"__proto__":{"isAdmin":true},"enabled":true}'), {});
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(result.isAdmin, undefined);
  assert.equal(result.enabled, true);
});

test("ordinary merging, symbols, arrays and custom array merging are preserved", () => {
  const key = Symbol("setting");
  const target = { nested: { a: 1 }, values: [1], [key]: "before" };
  const source = { nested: { b: 2 }, values: [2], [key]: "after" };
  assert.deepEqual(merge(target, source), { nested: { a: 1, b: 2 }, values: [1, 2], [key]: "after" });
  assert.deepEqual(target.values, [1]);
  assert.deepEqual(merge.all([{ a: 1 }, { b: 2 }]), { a: 1, b: 2 });
  assert.deepEqual(merge([1], [2], { arrayMerge: (_, source) => source }), [2]);
});
