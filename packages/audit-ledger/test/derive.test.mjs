// test/derive.test.mjs — 事件 → audit 记录派生纯函数单测（D5 基础范围）。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyEvent, deriveAuditDrafts } from '../src/index.mjs'

const toolCall = {
  type: 'tool/call', seq: 1, time: 10,
  data: { turn: 1, step: 2, callId: 'c1', name: 'write', arguments: '{"file_path":"a.txt"}' },
}
const toolResult = {
  type: 'tool/result', seq: 2, time: 11,
  data: { callId: 'c1', isError: false, output: 'ok' },
}

test('classify: tool/call and tool/result map to category tool with identity fields', () => {
  const call = classifyEvent(toolCall)
  assert.equal(call.category, 'tool')
  assert.equal(call.eventType, 'tool/call')
  assert.deepEqual(call.payload, { name: 'write', arguments: '{"file_path":"a.txt"}' })
  assert.equal(call.callId, 'c1')
  assert.equal(call.turn, 1)
  assert.equal(call.step, 2)

  const result = classifyEvent(toolResult)
  assert.equal(result.category, 'tool')
  assert.equal(result.eventType, 'tool/result')
  assert.deepEqual(result.payload, { isError: false }) // 未知载荷字段不产出（容错）
  assert.equal(result.callId, 'c1')
})

test('classify: approval pair, permission/preset and checkpoint/* map by category', () => {
  assert.equal(classifyEvent({ type: 'approval/asked', data: { agent: 'a' } }).category, 'approval')
  assert.equal(classifyEvent({ type: 'approval/decided', data: { outcome: 'allowed-once' } }).category, 'approval')
  assert.equal(classifyEvent({ type: 'permission/preset', data: { preset: 'workspace-write' } }).category, 'permission')
  assert.equal(classifyEvent({ type: 'checkpoint/snapshot', data: { id: 'x' } }).category, 'snapshot')
  assert.equal(classifyEvent({ type: 'checkpoint/restore' }).category, 'snapshot')
})

test('classify: unknown events and malformed input return null (tolerant, M2/M5)', () => {
  assert.equal(classifyEvent({ type: 'fs/write-intent' }), null)
  assert.equal(classifyEvent(null), null)
  assert.equal(classifyEvent({}), null)
  assert.equal(classifyEvent('nope'), null)
})

test('derive: keeps order, assigns sessionId/source, skips unknown events', () => {
  const drafts = deriveAuditDrafts(
    [toolCall, { type: 'fs/write-intent', data: {} }, toolResult, { type: 'approval/decided', data: {} }],
    { sessionId: 'sess-1' },
  )
  assert.deepEqual(drafts.map((d) => d.eventType), ['tool/call', 'tool/result', 'approval/decided'])
  for (const draft of drafts) {
    assert.equal(draft.sessionId, 'sess-1')
    assert.equal(draft.source, 'harness')
  }
  assert.equal(drafts[0].callId, 'c1')
  assert.equal(drafts[0].turn, 1)
})

test('derive: sessionId falls back to event field; validates input', () => {
  const drafts = deriveAuditDrafts([{ type: 'permission/preset', sessionId: 's-2', data: { preset: 'read-only' } }])
  assert.equal(drafts[0].sessionId, 's-2')
  assert.throws(() => deriveAuditDrafts('x'), TypeError)
  assert.deepEqual(deriveAuditDrafts([]), [])
})
