// test/workspace.test.mjs — 快照根目录解析（src/workspace.mjs）单测。
// migrated from dsh-checkpoint-diff@0.5.x (test/workspace.test.mjs)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { homedir } from 'node:os'
import path from 'node:path'
import {
  cdpSnapshotDir,
  cdpWorkspaceDir,
  resolveCdpSnapshotRoot,
  resolveSnapshotDir,
  snapshotKeyDir,
  workspaceKeyOf,
} from '../src/workspace.mjs'

const HOME = path.resolve('fake-home')

test('resolveSnapshotDir keeps an explicit absolute snapshotDir as-is', () => {
  const dir = path.resolve('tmp', 'snaps')
  assert.equal(resolveSnapshotDir(dir, HOME), path.normalize(dir))
})

test('resolveSnapshotDir resolves a relative snapshotDir against an injected $DSH_HOME', () => {
  assert.equal(resolveSnapshotDir('snaps', HOME), path.join(HOME, 'snaps'))
})

test('resolveSnapshotDir defaults to $DSH_HOME/dsh-checkpoint-rewind when snapshotDir is empty', () => {
  assert.equal(resolveSnapshotDir('', HOME), path.join(HOME, 'dsh-checkpoint-rewind'))
})

test('resolveSnapshotDir defaults to ~/.dsh/dsh-checkpoint-rewind when neither snapshotDir nor $DSH_HOME is set', () => {
  const previous = process.env.DSH_HOME
  delete process.env.DSH_HOME
  try {
    assert.equal(resolveSnapshotDir(''), path.join(homedir(), '.dsh', 'dsh-checkpoint-rewind'))
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
  }
})

test('cdp layout: resolveCdpSnapshotRoot under injected $DSH_HOME and default ~/.dsh', () => {
  assert.equal(resolveCdpSnapshotRoot(HOME), path.join(HOME, 'dsh-audit-foundation', 'snapshots'))
  const previous = process.env.DSH_HOME
  delete process.env.DSH_HOME
  try {
    assert.equal(
      resolveCdpSnapshotRoot(),
      path.join(homedir(), '.dsh', 'dsh-audit-foundation', 'snapshots'),
    )
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
  }
})

test('cdp layout: workspace dir derives from snapshotKeyDir; uuid dir rejects path injection', () => {
  const root = path.join(HOME, 'snapshots')
  const key = workspaceKeyOf('D:\\ws')
  const dir = cdpWorkspaceDir(root, key)
  assert.equal(dir, path.join(root, snapshotKeyDir(key)))
  const uuid = '123e4567-e89b-12d3-a456-426614174000'
  assert.equal(cdpSnapshotDir(root, key, uuid), path.join(dir, uuid))
  for (const bad of ['../evil', 'C:\\evil', 'not-a-uuid', '', '123e4567e89b12d3a456426614174000']) {
    assert.throws(() => cdpSnapshotDir(root, key, bad), TypeError)
  }
})
