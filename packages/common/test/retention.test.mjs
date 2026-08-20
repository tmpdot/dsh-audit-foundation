// test/retention.test.mjs — 保留策略纯函数单测（M9：配额逐出语义）。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeRetention } from '../src/index.mjs'

const recs = (n) => Array.from({ length: n }, (_, i) => ({ id: `r${i}`, seq: i, bytes: 10 }))

test('retention: keeps newest maxSnapshots, evicts oldest with reason count', () => {
  const { keep, evict } = computeRetention(recs(5), { maxSnapshots: 3 })
  assert.deepEqual(keep.map((r) => r.id), ['r2', 'r3', 'r4'])
  assert.deepEqual(evict, [
    { id: 'r0', reason: 'count' },
    { id: 'r1', reason: 'count' },
  ])
})

test('retention: evicts oldest until total bytes fit maxBytes', () => {
  const records = [
    { id: 'a', seq: 0, bytes: 100 },
    { id: 'b', seq: 1, bytes: 50 },
    { id: 'c', seq: 2, bytes: 50 },
  ]
  const { keep, evict } = computeRetention(records, { maxBytes: 120 })
  assert.deepEqual(keep.map((r) => r.id), ['b', 'c'])
  assert.deepEqual(evict, [{ id: 'a', reason: 'bytes' }])
})

test('retention: both limits apply; count reason wins when both hit', () => {
  const records = [
    { id: 'a', seq: 0, bytes: 200 },
    { id: 'b', seq: 1, bytes: 100 },
    { id: 'c', seq: 2, bytes: 100 },
    { id: 'd', seq: 3, bytes: 100 },
  ]
  const { keep, evict } = computeRetention(records, { maxSnapshots: 2, maxBytes: 150 })
  // 数量保留 c,d；字节 200 > 150 → 再逐出 c → 只剩 d
  assert.deepEqual(keep.map((r) => r.id), ['d'])
  assert.deepEqual(evict, [
    { id: 'a', reason: 'count' },
    { id: 'b', reason: 'count' },
    { id: 'c', reason: 'bytes' },
  ])
})

test('retention: zero limits evict everything; absent limits keep everything', () => {
  const { keep, evict } = computeRetention(recs(3), { maxSnapshots: 0 })
  assert.deepEqual(keep, [])
  assert.equal(evict.length, 3)
  assert.equal(evict[0].reason, 'count')
  const all = computeRetention(recs(3), {})
  assert.equal(all.keep.length, 3)
  assert.equal(all.evict.length, 0)
})

test('retention: sorts unsorted input by seq and tolerates missing bytes', () => {
  const records = [
    { id: 'new', seq: 5, bytes: 10 },
    { id: 'old', seq: 1 }, // bytes 缺失按 0
    { id: 'mid', seq: 3, bytes: 10 },
  ]
  const { keep, evict } = computeRetention(records, { maxSnapshots: 2, maxBytes: 5 })
  // 数量保留最新两条（seq 5,3）→ old 逐出 count；字节 20 > 5 → mid、new 逐出 bytes
  assert.deepEqual(keep, [])
  assert.deepEqual(evict, [
    { id: 'old', reason: 'count' },
    { id: 'mid', reason: 'bytes' },
    { id: 'new', reason: 'bytes' },
  ])
})

test('retention: validates limits and record shape', () => {
  assert.throws(() => computeRetention('x', {}), TypeError)
  assert.throws(() => computeRetention([], { maxSnapshots: -1 }), TypeError)
  assert.throws(() => computeRetention([], { maxBytes: 1.5 }), TypeError)
  assert.throws(() => computeRetention([{ id: 1 }], {}), TypeError)
  assert.throws(() => computeRetention([null], {}), TypeError)
  assert.deepEqual(computeRetention([], { maxSnapshots: 0 }), { keep: [], evict: [] })
})
