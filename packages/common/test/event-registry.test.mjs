// test/event-registry.test.mjs — 事件类型注册表单测（T4-3 数字映射地基）。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createEventTypeRegistry,
  PROVISIONAL_CODE_MIN,
  PROVISIONAL_SEEDS,
  eventTypeRegistry,
  eventTypeId,
  eventTypeForId,
  isRegisteredEventType,
  isFrozenEventType,
  defineEventTypes,
} from '../src/index.mjs'

test('seeds: harness events we consume are registered with private-range codes, not frozen', () => {
  const types = eventTypeRegistry.eventTypes()
  for (const seed of PROVISIONAL_SEEDS) {
    assert.ok(types.includes(seed.eventType), `missing seed ${seed.eventType}`)
    assert.equal(eventTypeId(seed.eventType), seed.code)
    assert.equal(eventTypeForId(seed.code), seed.eventType)
    assert.equal(isRegisteredEventType(seed.eventType), true)
    assert.equal(isFrozenEventType(seed.eventType), false, 'seeds must not be frozen')
    assert.ok(seed.code >= PROVISIONAL_CODE_MIN, 'seeds live in the private provisional range')
  }
  assert.equal(eventTypeRegistry.snapshot().frozenCount, 0)
})

test('round-trip: text ↔ code is bijective for registered entries', () => {
  for (const seed of PROVISIONAL_SEEDS) {
    assert.equal(eventTypeForId(eventTypeId(seed.eventType)), seed.eventType)
  }
})

test('define: registers new entries; frozen flag governs isFrozen', () => {
  const registry = createEventTypeRegistry()
  registry.define([{ eventType: 'official/demo', code: 1, frozen: true }])
  assert.equal(registry.eventTypeId('official/demo'), 1)
  assert.equal(registry.isFrozen('official/demo'), true)
  assert.equal(registry.eventTypeForId(1), 'official/demo')
  assert.deepEqual(registry.frozenEventTypes(), ['official/demo'])
})

test('define: identical re-registration is idempotent (hot-reload safe); conflicts throw', () => {
  const registry = createEventTypeRegistry()
  registry.define([{ eventType: 'a/x', code: 1 }])
  registry.define([{ eventType: 'a/x', code: 1 }]) // 幂等：相同条目重复注册不报错
  assert.throws(() => registry.define([{ eventType: 'a/x', code: 2 }]), /conflicting eventType/)
  assert.throws(() => registry.define([{ eventType: 'a/x', code: 1, frozen: true }]), /conflicting eventType/)
  assert.throws(() => registry.define([{ eventType: 'b/x', code: 1 }]), /duplicate code/)
})

test('define: invalid entries throw (empty text, non-positive / non-integer code, non-array)', () => {
  const registry = createEventTypeRegistry()
  assert.throws(() => registry.define([{ eventType: '', code: 1 }]), TypeError)
  assert.throws(() => registry.define([{ eventType: 'a', code: 0 }]), TypeError)
  assert.throws(() => registry.define([{ eventType: 'a', code: 1.5 }]), TypeError)
  assert.throws(() => registry.define([{ eventType: 'a', code: '1' }]), TypeError)
  assert.throws(() => registry.define('nope'), TypeError)
  assert.throws(() => registry.define([null]), TypeError)
})

test('strictFrozenRange: frozen entries cannot use the foundation-private provisional range', () => {
  const registry = createEventTypeRegistry([], { strictFrozenRange: true })
  assert.throws(
    () => registry.define([{ eventType: 'x/y', code: PROVISIONAL_CODE_MIN, frozen: true }]),
    RangeError,
  )
  // 非 frozen（临时）条目允许私有区间；frozen 走官方码（< 区间起点）合法。
  registry.define([{ eventType: 'tmp/z', code: PROVISIONAL_CODE_MIN }])
  registry.define([{ eventType: 'official/z', code: PROVISIONAL_CODE_MIN - 1, frozen: true }])
})

test('unknown events: no code, not frozen, passthrough-friendly (M8: any plugin operation is storable)', () => {
  assert.equal(eventTypeId('brand-new/plugin-op'), undefined)
  assert.equal(eventTypeForId(123456), undefined)
  assert.equal(isRegisteredEventType('brand-new/plugin-op'), false)
  assert.equal(isFrozenEventType('brand-new/plugin-op'), false)
})

test('snapshot: read-only copy of entries with counts', () => {
  const snap = eventTypeRegistry.snapshot()
  assert.equal(snap.count, PROVISIONAL_SEEDS.length)
  assert.equal(snap.frozenCount, 0)
  assert.deepEqual(Object.keys(snap.entries[0]).sort(), ['code', 'eventType', 'frozen'])
  assert.throws(() => {
    snap.entries.push({ eventType: 'x', code: 1, frozen: false })
  }, TypeError) // Object.freeze 防意外改表
})

test('defineEventTypes: app-level registration hook mutates the default instance (idempotent)', () => {
  // 官方映射落地后的集成点：追加 frozen 条目 → 派生钩子自动开始产出 id。
  // 默认实例是共享单例，条目只增不改；重复注册相同条目幂等（热重载安全）。
  defineEventTypes([{ eventType: 'official/hook-demo', code: 42, frozen: true }])
  defineEventTypes([{ eventType: 'official/hook-demo', code: 42, frozen: true }]) // 幂等
  assert.equal(isFrozenEventType('official/hook-demo'), true)
  assert.equal(eventTypeId('official/hook-demo'), 42)
  assert.throws(
    () => defineEventTypes([{ eventType: 'official/hook-demo', code: 43, frozen: true }]),
    /conflicting eventType/,
  )
})
