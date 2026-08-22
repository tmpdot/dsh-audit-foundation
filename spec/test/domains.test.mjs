// test/domains.test.mjs — 草案域 schema 单测（cdp-snapshots v1 / audit v1 /
// 事件容错超集）。草案状态：形状可演进，本测试锁定当前草案语义。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  approvalAskedEventSchema,
  approvalDecidedEventSchema,
  approvalPolicyEventSchema,
  auditPolicySchema,
  auditRecordSchema,
  cdpSnapshotManifestSchema,
  cdpSnapshotRecordSchema,
  checkpointEventSchema,
  permissionPresetEventSchema,
  sandboxModeEventSchema,
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

test('events: tool/result in harness shape (message.callId, error {name,code}) passes', () => {
  // harness 实际形状（源码核实 2026-08-22）：callId 在 data.message.callId
  const parsed = toolResultEventSchema.parse({
    type: 'tool/result', seq: 3, time: 101,
    data: {
      turn: 1, step: 2,
      message: { callId: 'c3', content: [{ type: 'text', text: 'ok' }], isError: false },
      error: { name: 'ToolError', code: 'E_FAIL' },
      meta: { diff: [] },
    },
  })
  assert.equal(parsed.data.message.callId, 'c3')
  assert.equal(parsed.data.error.code, 'E_FAIL')
  // 早期形状顶层 callId 仍兼容（容错超集）
  assert.throws(() => toolResultEventSchema.parse({ type: 'tool/result', seq: 3, data: { message: {} } }))
})

test('events: approval/asked + approval/decided pair with tolerant data', () => {
  const asked = approvalAskedEventSchema.parse({ type: 'approval/asked', seq: 1, time: 1, data: { agent: 'a' } })
  const decided = approvalDecidedEventSchema.parse({ type: 'approval/decided', seq: 2, time: 2, data: { outcome: 'allowed-once' } })
  assert.equal(asked.type, 'approval/asked')
  assert.equal(decided.data.outcome, 'allowed-once')
})

test('events: approval/policy and sandbox/mode validate harness vocabulary', () => {
  const policy = approvalPolicyEventSchema.parse({ type: 'approval/policy', seq: 1, time: 1, data: { policy: 'never' } })
  assert.equal(policy.data.policy, 'never')
  assert.throws(() => approvalPolicyEventSchema.parse({ type: 'approval/policy', seq: 1, data: { policy: 'maybe' } }))
  const mode = sandboxModeEventSchema.parse({
    type: 'sandbox/mode', seq: 2, time: 2, data: { mode: 'workspace-write', source: 'delegation' },
  })
  assert.equal(mode.data.mode, 'workspace-write')
  assert.equal(mode.data.source, 'delegation')
  assert.throws(() => sandboxModeEventSchema.parse({ type: 'sandbox/mode', seq: 2, data: { mode: 'full' } }))
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

// ---- cdp manifest.json（copy 载体快照目录自描述）----

// 与 dsh-audit-common contentHash 同算法的测试内复刻（spec 测试不得依赖 common）。
function manifestTree(files) {
  const lines = [...files]
    .sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))
    .map((f) => `${f.rel}\u0000${f.hash}`)
  return createHash('sha256').update(lines.join('\n')).digest('hex')
}

test('cdp manifest v1: accepts a well-formed self-describing manifest', () => {
  const files = [
    { rel: 'b.txt', size: 2, hash: H64 },
    { rel: 'a.txt', size: 1, hash: H64 },
  ]
  const parsed = cdpSnapshotManifestSchema.parse({
    formatVersion: 1, id: 'uuid-1', createdAt: 1000, ref: H64,
    tree: manifestTree(files), files, prevHash: null, kind: 'mutation',
  })
  assert.equal(parsed.formatVersion, 1)
  assert.equal(parsed.tree, manifestTree(files)) // tree = contentHash(files)
  assert.equal(parsed.kind, 'mutation')
})

test('cdp manifest v1: validates version/ref/tree/hash/kind vocabulary', () => {
  const files = [{ rel: 'a.txt', size: 1, hash: H64 }]
  const base = {
    formatVersion: 1, id: 'uuid-1', createdAt: 1, ref: H64,
    tree: H64, files, prevHash: null, kind: 'auto',
  }
  assert.throws(() => cdpSnapshotManifestSchema.parse({ ...base, formatVersion: 2 }))
  assert.throws(() => cdpSnapshotManifestSchema.parse({ ...base, ref: 'short' }))
  assert.throws(() => cdpSnapshotManifestSchema.parse({ ...base, tree: 'x' }))
  assert.throws(() => cdpSnapshotManifestSchema.parse({ ...base, files: [{ rel: '', size: 1, hash: H64 }] }))
  assert.throws(() => cdpSnapshotManifestSchema.parse({ ...base, files: [{ rel: 'a', size: -1, hash: H64 }] }))
  assert.throws(() => cdpSnapshotManifestSchema.parse({ ...base, kind: 'bogus' }))
})

// ---- audit 策略（F19：记录什么 / 留多久）----

test('audit policy: defaults enable all categories with unlimited retention', () => {
  const parsed = auditPolicySchema.parse({})
  assert.equal(parsed.enabled, true)
  assert.equal(parsed.categories, undefined)
  assert.equal(parsed.retention, undefined)
})

test('audit policy: filters categories and caps retention', () => {
  const parsed = auditPolicySchema.parse({
    enabled: false,
    categories: ['approval', 'permission'],
    retention: { maxRecords: 100, maxBytes: 1024 },
  })
  assert.equal(parsed.enabled, false)
  assert.deepEqual(parsed.categories, ['approval', 'permission'])
  assert.equal(parsed.retention.maxRecords, 100)
})

test('audit policy: rejects unknown categories and negative limits', () => {
  assert.throws(() => auditPolicySchema.parse({ categories: ['policy'] }))
  assert.throws(() => auditPolicySchema.parse({ retention: { maxRecords: -1 } }))
  assert.throws(() => auditPolicySchema.parse({ retention: { maxBytes: 1.5 } }))
})
