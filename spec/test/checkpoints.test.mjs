// test/checkpoints.test.mjs — checkpoints 域记录 schema 单测（纯 zod，CI 可跑：
// 不 import @deepseek-ai/dsh-storage-domain，只测 src/checkpoints.mjs）。
// migrated from dsh-checkpoint-diff@0.5.x (test/domain-schema.test.mjs)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkpointRecordSchema, checkpointRecordSchemaV1 } from '../src/checkpoints.mjs'

function core(partial = {}) {
  return {
    id: 'id-1',
    sessionId: 'sess',
    cwd: 'D:\\ws',
    seq: 5,
    time: 1000,
    provider: 'copy',
    triggerTool: 'edit',
    turn: 1,
    step: 1,
    files: 2,
    bytes: 200,
    ref: 'ref',
    ...partial,
  }
}

test('consumer schema accepts rewind 0.5.0 v2 records (kind/config required upstream)', () => {
  const parsed = checkpointRecordSchema.parse(core({
    kind: 'mutation',
    config: { provider: 'copy' },
    tree: null,
    note: 'hello',
    sessionBoundary: 42,
  }))
  assert.equal(parsed.kind, 'mutation')
  assert.deepEqual(parsed.config, { provider: 'copy' })
  assert.equal(parsed.note, 'hello')
  assert.equal(parsed.sessionBoundary, 42)
})

test('consumer schema tolerates v2 records without kind/config (read-only consumer)', () => {
  const parsed = checkpointRecordSchema.parse(core())
  assert.equal(parsed.kind, undefined)
  assert.equal(parsed.sessionBoundary, undefined)
})

test('consumer schema accepts rewind 0.4.0 v1 records (forkSeq/stepEndSeq)', () => {
  const parsed = checkpointRecordSchema.parse(core({ forkSeq: 7, stepEndSeq: 9 }))
  assert.equal(parsed.forkSeq, 7)
  assert.equal(parsed.stepEndSeq, 9)
  assert.equal(parsed.kind, undefined, 'v1 记录无 kind 也通过')
})

test('v1 schema keeps the 0.4.0 shape (forkSeq optional, no v2 fields)', () => {
  const parsed = checkpointRecordSchemaV1.parse(core({ forkSeq: 7 }))
  assert.equal(parsed.forkSeq, 7)
  const stripped = checkpointRecordSchemaV1.parse(core({ kind: 'mutation', config: {} }))
  assert.equal(stripped.kind, undefined, 'v1 schema 剥离 v2 字段')
})

test('consumer schema rejects malformed core fields loudly', () => {
  assert.throws(() => checkpointRecordSchema.parse(core({ provider: 'svn' })))
  assert.throws(() => checkpointRecordSchema.parse(core({ seq: -1 })))
  assert.throws(() => checkpointRecordSchema.parse(core({ turn: 0 })))
  assert.throws(() => checkpointRecordSchema.parse(core({ ref: '' })))
})

test('consumer schema validates v2 optional field shapes when present', () => {
  assert.throws(() => checkpointRecordSchema.parse(core({ kind: 'bogus' })))
  assert.throws(() => checkpointRecordSchema.parse(core({ sessionBoundary: -1 })))
  assert.throws(() => checkpointRecordSchema.parse(core({ tree: 'not-a-sha' })))
})
