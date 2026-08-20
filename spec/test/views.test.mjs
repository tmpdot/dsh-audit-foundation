// test/views.test.mjs — 视图模型 schema 单测（D9 草案 v1）。
// 锁语义：容错超集（未知字段剥离）、词汇对齐域草案（M0/M8）、
// 降级标注与可验证性展示字段（M5/M7）。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  AUDIT_CATEGORIES,
  auditViewRecordSchema,
  auditViewSchema,
  diffFileSchema,
  diffViewSchema,
  evidenceViewSchema,
  timelineNodeSchema,
} from '../src/index.mjs'

const H64 = 'a'.repeat(64)

function node(partial = {}) {
  return {
    id: 'n1',
    seq: 0,
    time: 1000,
    source: 'cdp',
    tier: 'durable',
    ...partial,
  }
}

test('timeline-node: accepts a well-formed cdp node and strips unknown fields', () => {
  const parsed = timelineNodeSchema.parse(node({
    kind: 'mutation', triggerTool: 'edit', files: 2, bytes: 200, ref: H64,
    label: 'mutation before edit', branchId: 'fork-1', extra: { junk: true },
  }))
  assert.equal(parsed.source, 'cdp')
  assert.equal(parsed.tier, 'durable')
  assert.equal(parsed.branchId, 'fork-1')
  assert.equal('extra' in parsed, false) // 容错超集：未知字段剥离
})

test('timeline-node: supports degraded/notes (M5) and badges (F16 reserved)', () => {
  const parsed = timelineNodeSchema.parse(node({
    source: 'rewind', tier: 'temporary', degraded: true,
    notes: ['snapshot object missing (gc)'],
    badges: [{ text: 'denied', kind: 'denied' }],
  }))
  assert.equal(parsed.degraded, true)
  assert.deepEqual(parsed.notes, ['snapshot object missing (gc)'])
  assert.deepEqual(parsed.badges, [{ text: 'denied', kind: 'denied' }])
})

test('timeline-node: validates source/tier/kind vocabulary and ref shape', () => {
  for (const source of ['cdp', 'rewind', 'trace']) {
    assert.doesNotThrow(() => timelineNodeSchema.parse(node({ source, tier: 'temporary' })))
  }
  assert.throws(() => timelineNodeSchema.parse(node({ source: 'session' })))
  assert.throws(() => timelineNodeSchema.parse(node({ source: 'cdp', tier: 'volatile' })))
  assert.throws(() => timelineNodeSchema.parse(node({ kind: 'bogus' })))
  assert.throws(() => timelineNodeSchema.parse(node({ ref: 'short' })))
  assert.throws(() => timelineNodeSchema.parse(node({ seq: -1 })))
})

function diffFile(partial = {}) {
  return {
    rel: 'a.txt',
    action: 'M',
    stats: { added: 1, deleted: 1 },
    ...partial,
  }
}

test('diff-view: accepts files with A/M/D actions and hunk line types', () => {
  const parsed = diffViewSchema.parse({
    fromRef: 'abc123', toRef: 'latest',
    files: [
      diffFile({ action: 'A', stats: { added: 3, deleted: 0, unchanged: 0 } }),
      diffFile({
        rel: 'b.txt', action: 'M',
        hunks: [{ oldStart: 1, oldLines: 2, newStart: 1, newLines: 3,
          lines: [{ t: 'ctx', text: 'x' }, { t: 'del', text: 'y' }, { t: 'add', text: 'z' }] }],
      }),
      diffFile({ rel: 'c.txt', action: 'D', stats: { added: 0, deleted: 5 } }),
    ],
    summary: { added: 3, deleted: 6, files: 3 },
  })
  assert.equal(parsed.files[1].hunks[0].lines[2].t, 'add')
  assert.equal(parsed.summary.files, 3)
})

test('diff-view: rejects unknown actions, bad hunk headers and bad line types', () => {
  assert.throws(() => diffViewSchema.parse({ fromRef: 'a', toRef: 'b', files: [diffFile({ action: 'X' })], summary: {} }))
  assert.throws(() => diffFileSchema.parse(diffFile({ action: 'M', hunks: [{ oldStart: 0, oldLines: 0, newStart: 1, newLines: 1, lines: [] }] })))
  assert.throws(() => diffFileSchema.parse(diffFile({ action: 'M', hunks: [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines: [{ t: 'bad', text: 'x' }] }] })))
})

test('audit-view: record reuses audit domain vocabulary (M0, no re-declaration)', () => {
  const parsed = auditViewRecordSchema.parse({
    id: 'a1', time: 1000, category: 'approval', eventType: 'approval/decided',
    source: 'harness', summary: 'allow once', verified: true, prevHash: H64,
  })
  assert.equal(parsed.category, 'approval')
  assert.equal(parsed.verified, true)
  // 词汇与 audit 域同源：域词汇新增时视图模型自动跟进
  assert.ok(AUDIT_CATEGORIES.includes(parsed.category))
  assert.throws(() => auditViewRecordSchema.parse({
    id: 'a2', time: 1000, category: 'policy', eventType: 'x', source: 'harness',
  }))
})

test('audit-view: page shape with chain head and full-chain verification', () => {
  const parsed = auditViewSchema.parse({
    records: [{ id: 'a1', time: 1, category: 'tool', eventType: 'tool/call', source: 'harness' }],
    total: 1, headHash: H64, verified: true,
  })
  assert.equal(parsed.total, 1)
  assert.equal(parsed.verified, true)
  assert.throws(() => auditViewSchema.parse({ records: [], total: 0, headHash: 'x' }))
})

test('evidence-view: JSON+MD only (D7); artifact hash required (M7)', () => {
  const parsed = evidenceViewSchema.parse({
    format: 'json', exportedAt: 1000, records: 5, artifactHash: H64,
    scope: { sessionId: 's1' }, range: { fromTime: 0, toTime: 1000 },
  })
  assert.equal(parsed.format, 'json')
  assert.deepEqual(parsed.scope, { sessionId: 's1' })
  assert.throws(() => evidenceViewSchema.parse({ format: 'sarif', exportedAt: 1, records: 0, artifactHash: H64 }))
  assert.throws(() => evidenceViewSchema.parse({ format: 'md', exportedAt: 1, records: 0, artifactHash: 'bad' }))
})
