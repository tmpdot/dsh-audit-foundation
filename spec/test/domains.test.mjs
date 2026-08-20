// test/domains.test.mjs — 草案域 schema 单测（cdp-snapshots v1 / audit v1 /
// 事件容错超集）。草案状态：形状可演进，本测试锁定当前草案语义。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  approvalAskedEventSchema,
  approvalDecidedEventSchema,
  auditRecordSchema,
  cdpSnapshotRecordSchema,
  checkpointEventSchema,
  permissionPresetEventSchema,
  toolCallEventSchema,
  toolResultEventSchema,
} from '../src/index.mjs'

const H64 = 'a'.repeat(64)

function cdpRecord(partial = {}) {
  return {
    id: 'uuid-1',
    sessionId: 'sess',
    cwd: 'D:\\ws',
    seq: 1,
    time: 1000,
    provider: 'copy',
    triggerTool: 'edit',
    turn: 1,
    step: 1,
    files: 2,
    bytes: 200,
    ref: H64,
    kind: 'mutation',
    source: 'cdp',
    tier: 'durable',
    prevHash: null,
    ...partial,
  }
}

test('cdp-snapshots v1: accepts a well-formed durable record', () => {
  const parsed = cdpSnapshotRecordSchema.parse(cdpRecord({ prevHash: H64, tree: H64, note: 'n' }))
  assert.equal(parsed.tier, 'durable')
  assert.equal(parsed.source, 'cdp')
  assert.equal(parsed.provider, 'copy')
  assert.equal(parsed.prevHash, H64)
})

test('cdp-snapshots v1: refuses non-copy providers, bad refs and bad chain fields', () => {
  assert.throws(() => cdpSnapshotRecordSchema.parse(cdpRecord({ provider: 'git' })))
  assert.throws(() => cdpSnapshotRecordSchema.parse(cdpRecord({ ref: 'not-hex' })))
  assert.throws(() => cdpSnapshotRecordSchema.parse(cdpRecord({ prevHash: 'short' })))
  assert.throws(() => cdpSnapshotRecordSchema.parse(cdpRecord({ kind: 'bogus' })))
  assert.throws(() => cdpSnapshotRecordSchema.parse(cdpRecord({ source: 'rewind' })))
  assert.throws(() => cdpSnapshotRecordSchema.parse(cdpRecord({ tier: 'temporary' })))
  assert.throws(() => cdpSnapshotRecordSchema.parse(cdpRecord({ turn: 0 })))
})

function auditRecord(partial = {}) {
  return {
    id: 'a-1',
    sessionId: 'sess',
    seq: 0,
    time: 1000,
    category: 'approval',
    eventType: 'approval/decided',
    source: 'harness',
    payload: { outcome: 'allowed-once' },
    prevHash: null,
    ...partial,
  }
}

test('audit v1: accepts a well-formed record and tolerates optional identity fields', () => {
  const parsed = auditRecordSchema.parse(auditRecord({ turn: 1, step: 1, callId: 'c1' }))
  assert.equal(parsed.category, 'approval')
  assert.equal(parsed.callId, 'c1')
  assert.deepEqual(parsed.payload, { outcome: 'allowed-once' })
})

test('audit v1: validates category/eventType/source/chain vocabulary', () => {
  for (const category of ['approval', 'permission', 'tool', 'snapshot', 'rollback', 'guard']) {
    assert.doesNotThrow(() => auditRecordSchema.parse(auditRecord({ category })))
  }
  assert.throws(() => auditRecordSchema.parse(auditRecord({ category: 'policy' })))
  assert.throws(() => auditRecordSchema.parse(auditRecord({ eventType: '' })))
  assert.throws(() => auditRecordSchema.parse(auditRecord({ source: 'plugin' })))
  assert.throws(() => auditRecordSchema.parse(auditRecord({ prevHash: 'x' })))
})

test('events: tool/call shape (arguments is the raw JSON string)', () => {
  const parsed = toolCallEventSchema.parse({
    type: 'tool/call', seq: 3, time: 100,
    data: { turn: 1, step: 2, callId: 'c3', name: 'write', arguments: '{"file_path":"a.txt"}' },
  })
  assert.equal(parsed.data.name, 'write')
  assert.throws(() => toolCallEventSchema.parse({ type: 'tool/call', seq: 3, data: { name: 'x' } }))
})

test('events: tool/result tolerates arbitrary success payloads (passthrough)', () => {
  const parsed = toolResultEventSchema.parse({
    type: 'tool/result', seq: 3, time: 101,
    data: { callId: 'c3', isError: false, anything: { nested: true } },
  })
  assert.equal(parsed.data.isError, false)
  assert.deepEqual(parsed.data.anything, { nested: true })
})

test('events: approval/asked + approval/decided pair with tolerant data', () => {
  const asked = approvalAskedEventSchema.parse({ type: 'approval/asked', seq: 1, time: 1, data: { agent: 'a' } })
  const decided = approvalDecidedEventSchema.parse({ type: 'approval/decided', seq: 2, time: 2, data: { outcome: 'allowed-once' } })
  assert.equal(asked.type, 'approval/asked')
  assert.equal(decided.data.outcome, 'allowed-once')
})

test('events: permission/preset requires a preset name; checkpoint/* accepts any type', () => {
  const parsed = permissionPresetEventSchema.parse({
    type: 'permission/preset', seq: 1, time: 1, data: { preset: 'workspace-write' },
  })
  assert.equal(parsed.data.preset, 'workspace-write')
  assert.throws(() => permissionPresetEventSchema.parse({ type: 'permission/preset', seq: 1, data: {} }))
  const checkpoint = checkpointEventSchema.parse({ type: 'checkpoint/snapshot', seq: 1, time: 1, data: { id: 'x' } })
  assert.equal(checkpoint.type, 'checkpoint/snapshot')
})
