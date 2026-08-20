// test/pathguard.test.mjs — 写路径安全纯函数单测（M6：所有写路径共用）。
// 用例提取自 dsh-checkpoint-diff test/rollback.test.mjs（路径校验部分）。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {
  classifyRollback,
  isProtectedRel,
  normalizeTargetPath,
  resolveInside,
  ROLLBACK_ACTIONS,
  withKeyLock,
} from '../src/pathguard.mjs'

test('normalizeTargetPath: normalizes separators and dot segments', () => {
  assert.equal(normalizeTargetPath('src/a.js'), 'src/a.js')
  assert.equal(normalizeTargetPath('src\\a.js'), 'src/a.js')
  assert.equal(normalizeTargetPath('./src//a.js'), 'src/a.js')
  assert.equal(normalizeTargetPath('a/./b'), 'a/b')
})

test('normalizeTargetPath: refuses absolute paths, drive letters and traversal', () => {
  assert.throws(() => normalizeTargetPath('/etc/passwd'), /absolute/)
  assert.throws(() => normalizeTargetPath('\\etc'), /absolute/)
  assert.throws(() => normalizeTargetPath('D:/x.txt'), /absolute/)
  assert.throws(() => normalizeTargetPath('C:\\x'), /absolute/)
  assert.throws(() => normalizeTargetPath('../x'), /parent traversal/)
  assert.throws(() => normalizeTargetPath('a/../../b'), /parent traversal/)
  assert.throws(() => normalizeTargetPath('.'), /must name a file/)
  assert.throws(() => normalizeTargetPath(''), /non-empty/)
  assert.throws(() => normalizeTargetPath(undefined), /non-empty/)
  assert.throws(() => normalizeTargetPath(42), /non-empty/)
})

test('isProtectedRel: .git/.dsh refused at any depth, any case', () => {
  assert.equal(isProtectedRel('.git/config'), true)
  assert.equal(isProtectedRel('.dsh/state'), true)
  assert.equal(isProtectedRel('src/.git/HEAD'), true)
  assert.equal(isProtectedRel('src/.DSH/x'), true)
  assert.equal(isProtectedRel('src/a.js'), false)
  assert.equal(isProtectedRel('git-file.txt'), false)
})

test('resolveInside: resolves inside the root, refuses escapes', () => {
  const root = path.resolve('ws')
  assert.equal(resolveInside(root, 'src/a.js'), path.join(root, 'src', 'a.js'))
  assert.equal(resolveInside(root, 'a.txt'), path.join(root, 'a.txt'))
  // 穿越在 normalize 阶段即被拒（'..' 段 → unsafe path）。
  assert.throws(() => resolveInside(root, '../out.txt'), /unsafe path/)
})

test('classifyRollback: restore/unchanged/skip/missing per entry', () => {
  const snapshotByRel = new Map([
    ['a.txt', { rel: 'a.txt' }],
    ['b.txt', { rel: 'b.txt' }],
    ['c.txt', { rel: 'c.txt' }],
    ['.git/config', { rel: '.git/config' }], // 受保护条目必须存在于快照集才会走 skip 分支
  ])
  const result = classifyRollback({
    snapshotByRel,
    requested: ['a.txt', 'b.txt', 'c.txt', 'missing.txt', '.git/config'],
    statusOf: (rel) => (rel === 'a.txt' ? 'changed' : 'unchanged'),
  })
  const byRel = Object.fromEntries(result.files.map((entry) => [entry.rel, entry]))
  assert.equal(byRel['a.txt'].action, ROLLBACK_ACTIONS.RESTORE)
  assert.equal(byRel['b.txt'].action, ROLLBACK_ACTIONS.UNCHANGED)
  assert.equal(byRel['c.txt'].action, ROLLBACK_ACTIONS.UNCHANGED)
  assert.equal(byRel['.git/config'].action, ROLLBACK_ACTIONS.SKIP)
  assert.deepEqual(result.missing, ['missing.txt'])
})

test('classifyRollback: inside check skips out-of-root entries', () => {
  const snapshotByRel = new Map([['x.txt', { rel: 'x.txt' }]])
  const result = classifyRollback({
    snapshotByRel,
    requested: ['x.txt'],
    statusOf: () => 'changed',
    inside: () => false,
  })
  assert.equal(result.files[0].action, ROLLBACK_ACTIONS.SKIP)
})

test('withKeyLock: serializes per-key tasks', async () => {
  const chains = new Map()
  const order = []
  const task = (name, delay) => () => new Promise((resolve) => {
    setTimeout(() => { order.push(name); resolve(name) }, delay)
  })
  const first = withKeyLock(chains, 'ws', task('first', 20))
  const second = withKeyLock(chains, 'ws', task('second', 1))
  await Promise.all([first, second])
  assert.deepEqual(order, ['first', 'second'], '同 key 必须串行（先入先出）')
  assert.equal(chains.size, 0, '锁表最终清空')
})
