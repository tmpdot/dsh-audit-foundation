// src/workspace.mjs — 工作区键与快照根目录解析（零依赖，与 rewind 同构）。
// migrated from dsh-checkpoint-diff@0.5.x (lib/workspace.mjs)

import { homedir } from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'

/**
 * 把会话 cwd 规范化为 workspaceKey。空/非法 cwd 得到 ''。
 * Windows 下大小写不敏感（盘符/路径大小写差异不产生两个隔离层）。
 * @param {string|undefined|null} cwd - 会话 cwd。
 * @returns {string} 规范化键。
 */
export function workspaceKeyOf(cwd) {
  if (typeof cwd !== 'string' || cwd.length === 0) return ''
  const resolved = path.resolve(cwd)
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved
}

/**
 * 解析快照根目录（copy provider 的文件快照存放处，rewind 的默认约定）。
 * - 显式绝对路径：原样规范化。
 * - 显式相对路径：相对 $DSH_HOME（有则），否则相对进程 cwd。
 * - 空值：$DSH_HOME/dsh-checkpoint-rewind；$DSH_HOME 缺失时回退
 *   ~/.dsh/dsh-checkpoint-rewind（dsh 不保证导出 $DSH_HOME，不能依赖进程环境）。
 * @param {string} snapshotDir - Config.snapshotDir。
 * @param {string|undefined} [dshHome] - 环境 $DSH_HOME（测试注入）。
 * @returns {string} 绝对路径。
 */
export function resolveSnapshotDir(snapshotDir, dshHome = process.env.DSH_HOME) {
  if (snapshotDir) {
    const base = dshHome ?? process.cwd()
    return path.isAbsolute(snapshotDir) ? path.normalize(snapshotDir) : path.resolve(base, snapshotDir)
  }
  return path.join(dshHome ?? defaultDshHome(), 'dsh-checkpoint-rewind')
}

/** 默认 Harness home：$DSH_HOME 缺失时回退 ~/.dsh（与 dsh-home-paths 的默认一致）。 */
function defaultDshHome() {
  return path.join(homedir(), '.dsh')
}

/**
 * 工作区键 → 路径安全目录名（与 rewind 的 snapshotKeyDir 同算法：sha256 前
 * 16 位十六进制，稳定且跨平台安全）。
 * @param {string} key - workspaceKeyOf(cwd)。
 * @returns {string} 目录名。
 */
export function snapshotKeyDir(key) {
  return createHash('sha256').update(key).digest('hex').slice(0, 16)
}

/**
 * 快照根 + 工作区子目录（copy 快照存放处）。
 * @param {string} snapshotDir - 快照根（绝对）。
 * @param {string} key - 工作区键。
 * @returns {string} 该工作区的快照目录。
 */
export function snapshotBaseDir(snapshotDir, key) {
  const safe = key.length > 0 ? snapshotKeyDir(key) : '_unknown'
  return path.join(path.resolve(snapshotDir), safe)
}
