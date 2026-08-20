// test/hash.test.mjs — 内容寻址与哈希链单测（M7）。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contentHash, recordHash, sha256Hex, stableStringify } from '../src/hash.mjs'

test('sha256Hex: stable and content-sensitive', () => {
  assert.equal(sha256Hex('hello'), '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  assert.equal(sha256Hex('hello'), sha256Hex('hello'))
  assert.notEqual(sha256Hex('hello'), sha256Hex('hellp'))
})

test('stableStringify: object key order does not change the string (arrays keep order)', () => {
  assert.equal(stableStringify({ a: 1, b: 2 }), stableStringify({ b: 2, a: 1 }))
  assert.equal(stableStringify({ a: { c: 3, b: 2 } }), stableStringify({ a: { b: 2, c: 3 } }))
  assert.notEqual(stableStringify({ a: [1, 2] }), stableStringify({ a: [2, 1] }), '数组顺序是语义')
})

test('recordHash: stable, sensitive, and excludes chain fields by default', () => {
  const record = { id: 'r1', sessionId: 's', seq: 1, time: 100, prevHash: 'a'.repeat(64) }
  assert.equal(recordHash(record), recordHash({ ...record, prevHash: 'b'.repeat(64) }),
    'prevHash 默认剔除：链字段变化不影响载荷哈希')
  assert.equal(recordHash(record), recordHash({ ...record, id: 'r1' }))
  assert.notEqual(recordHash(record), recordHash({ ...record, seq: 2 }))
})

test('contentHash: order-independent, content- and rel-sensitive', () => {
  const filesA = [
    { rel: 'b.txt', content: 'beta' },
    { rel: 'a.txt', content: 'alpha' },
  ]
  const filesB = [
    { rel: 'a.txt', content: 'alpha' },
    { rel: 'b.txt', content: 'beta' },
  ]
  assert.equal(contentHash(filesA), contentHash(filesB), 'rel 顺序无关')
  assert.notEqual(contentHash(filesA), contentHash([
    { rel: 'a.txt', content: 'alpha!' },
    { rel: 'b.txt', content: 'beta' },
  ]), '内容敏感')
  assert.notEqual(contentHash(filesA), contentHash([
    { rel: 'a.txt', content: 'alpha' },
    { rel: 'b/c.txt', content: 'beta' },
  ]), 'rel 敏感')
})
