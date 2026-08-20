// test/diff-engine.test.mjs — 行级 diff 引擎单测。
// migrated from dsh-checkpoint-diff@0.5.x (test/diff-engine.test.mjs)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { diffLines, diffLineArrays, isBinary } from '../src/diff-engine.mjs'

/** 把 ops 拼接回新文本（与 diffLines 输出互逆的验证）。 */
function applyOps(aText, ops, bText) {
  const out = []
  for (const op of ops) {
    if (op.type === 'ctx' || op.type === 'add') out.push(op.text)
  }
  return out.join('\n') + (bText.endsWith('\n') && out.length > 0 ? '\n' : '')
}

test('identical texts produce pure context ops', () => {
  const { ops, truncated } = diffLines('a\nb\nc\n', 'a\nb\nc\n')
  assert.equal(truncated, false)
  assert.deepEqual(ops, [
    { type: 'ctx', text: 'a', a: 1, b: 1 },
    { type: 'ctx', text: 'b', a: 2, b: 2 },
    { type: 'ctx', text: 'c', a: 3, b: 3 },
  ])
})

test('empty old text produces pure adds', () => {
  const { ops } = diffLines('', 'x\ny\n')
  assert.deepEqual(ops, [
    { type: 'add', text: 'x', b: 1 },
    { type: 'add', text: 'y', b: 2 },
  ])
})

test('empty new text produces pure deletes', () => {
  const { ops } = diffLines('x\ny\n', '')
  assert.deepEqual(ops, [
    { type: 'del', text: 'x', a: 1 },
    { type: 'del', text: 'y', a: 2 },
  ])
})

test('single-line replacement', () => {
  const { ops } = diffLines('A-v1\n', 'A-v2\n')
  assert.deepEqual(ops, [
    { type: 'del', text: 'A-v1', a: 1 },
    { type: 'add', text: 'A-v2', b: 1 },
  ])
})

test('insertion preserves surrounding context with correct line numbers', () => {
  const { ops } = diffLines('a\nc\n', 'a\nb\nc\n')
  assert.deepEqual(ops, [
    { type: 'ctx', text: 'a', a: 1, b: 1 },
    { type: 'add', text: 'b', b: 2 },
    { type: 'ctx', text: 'c', a: 2, b: 3 },
  ])
})

test('deletion preserves surrounding context', () => {
  const { ops } = diffLines('a\nb\nc\n', 'a\nc\n')
  assert.deepEqual(ops, [
    { type: 'ctx', text: 'a', a: 1, b: 1 },
    { type: 'del', text: 'b', a: 2 },
    { type: 'ctx', text: 'c', a: 3, b: 2 },
  ])
})

test('ops are reversible: applying them to old text yields new text', () => {
  const cases = [
    ['', ''],
    ['', 'x\n'],
    ['x\n', ''],
    ['one\ntwo\nthree\n', 'one\n1.5\nthree\nfour\n'],
    ['a\nb\nc\nd\ne\n', 'a\nc\nd\nf\n'],
  ]
  for (const [a, b] of cases) {
    const { ops } = diffLines(a, b)
    assert.equal(applyOps(a, ops, b), b, `reversal failed for ${JSON.stringify(a)} → ${JSON.stringify(b)}`)
  }
})

test('empty lines are preserved as distinct lines', () => {
  const { ops } = diffLines('a\n\nb\n', 'a\n\n\nb\n')
  // 空行的对齐存在多种等价 LCS 解（tie-breaking 选择其一）——断言语义性质：
  // 可逆性 + 恰好一个空行插入 + 两个空行上下文。
  assert.equal(applyOps('a\n\nb\n', ops, 'a\n\n\nb\n'), 'a\n\n\nb\n')
  const adds = ops.filter((op) => op.type === 'add')
  const ctxs = ops.filter((op) => op.type === 'ctx')
  assert.equal(adds.length, 1)
  assert.equal(adds[0].text, '')
  assert.equal(ctxs.filter((op) => op.text === '').length, 1) // 旧侧唯一的空行对齐到新侧之一
  assert.deepEqual(ops.map((op) => op.type), ['ctx', 'add', 'ctx', 'ctx'])
})

test('cell limit exceeded degrades to full delete + full add', () => {
  const a = Array.from({ length: 2500 }, (_, index) => `a${index}`)
  const b = Array.from({ length: 2500 }, (_, index) => `b${index}`)
  const { ops, truncated } = diffLineArrays(a, b)
  assert.equal(truncated, true)
  assert.equal(ops.length, a.length + b.length)
  assert.equal(ops.filter((op) => op.type === 'del').length, a.length)
  assert.equal(ops.filter((op) => op.type === 'add').length, b.length)
})

test('binary detection', () => {
  assert.equal(isBinary(Buffer.from([0x00, 0x01])), true)
  assert.equal(isBinary(Buffer.from('plain text\n')), false)
  assert.equal(isBinary('plain text\n'), false)
})
