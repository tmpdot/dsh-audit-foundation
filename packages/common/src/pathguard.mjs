// src/pathguard.mjs — 写路径安全纯函数（M6：所有写路径共用的唯一实现）。
// migrated from dsh-checkpoint-diff@0.5.x (lib/rollback.mjs —— 路径校验部分提取)
//
// 拒绝：`..` 穿越、绝对路径（含盘符）、符号链接逃逸、受保护段（.git/.dsh）。
// 任何写路径（回滚、生产者快照、审计记录、导出落盘）必须经此校验，
// 禁止各写路径各写一份（M6 判定标准）。

import path from 'node:path'

/** 恢复规划中文件条目的动作词汇（API/UI/命令共用）。 */
export const ROLLBACK_ACTIONS = Object.freeze({
  RESTORE: 'restore',
  UNCHANGED: 'unchanged',
  SKIP: 'skip',
})

/** 写路径绝不写入的受保护首段（防御性：篡改记录/清单可能携带这些路径）。 */
export const PROTECTED_FIRST_SEGMENTS = Object.freeze(['.git', '.dsh'])

/**
 * 规范化/校验一个目标相对路径（'/' 分隔；反斜杠按分隔符处理）。
 * 拒绝：空串、绝对路径（含盘符）、'..' 段、纯 '.'。多余分隔符与 '.' 段折叠。
 * @param {unknown} input - 用户/API 提供的相对路径。
 * @returns {string} 规范化的 '/' 相对路径。
 */
export function normalizeTargetPath(input) {
  if (typeof input !== 'string' || input.length === 0) {
    throw new Error('path must be a non-empty string')
  }
  if (/^[/\\]/u.test(input) || /^[a-zA-Z]:[\\/]/u.test(input)) {
    throw new Error(`unsafe path: ${JSON.stringify(input)} (absolute paths are refused)`)
  }
  const segments = input.split(/[\\/]+/u)
  const out = []
  for (const segment of segments) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      throw new Error(`unsafe path: ${JSON.stringify(input)} (parent traversal is refused)`)
    }
    out.push(segment)
  }
  if (out.length === 0) {
    throw new Error(`unsafe path: ${JSON.stringify(input)} (must name a file inside the workspace)`)
  }
  return out.join('/')
}

/**
 * 路径是否落入受保护目录（.git / .dsh，任意深度、任意大小写的段）。
 * 写路径绝不写这些：.git 是仓库/快照对象库，.dsh 是宿主状态目录。
 * @param {string} rel - 规范化 '/' 相对路径。
 * @returns {boolean}
 */
export function isProtectedRel(rel) {
  return rel.split('/').some((segment) => PROTECTED_FIRST_SEGMENTS.includes(segment.toLowerCase()))
}

/**
 * 把 '/' 相对路径解析到工作区根内（越界即抛）。
 * @param {string} root - 工作区绝对根。
 * @param {string} rel - 规范化 '/' 相对路径。
 * @returns {string} 工作区内的绝对路径。
 */
export function resolveInside(root, rel) {
  const safe = normalizeTargetPath(rel)
  const abs = path.resolve(root, ...safe.split('/'))
  const check = path.relative(root, abs)
  if (check === '' || check.startsWith('..') || path.isAbsolute(check)) {
    throw new Error(`path escapes the workspace: ${JSON.stringify(rel)}`)
  }
  return abs
}

/**
 * 恢复分类：对目标路径列表逐条给出动作。
 * - 不在快照文件集 → 记入 missing（调用方决定报错）；
 * - 受保护路径（.git/.dsh）→ skip（reason）；
 * - 解析不到工作区根内 → skip（reason）；
 * - 其余按 statusOf 的判定：changed/missing → restore，否则 unchanged。
 * @param {object} args
 * @param {Map<string, {rel: string, mode?: number}>} args.snapshotByRel - 快照文件集。
 * @param {string[]} args.requested - 目标 rel 列表（已规范化；缺省整节点时=全部快照 rel）。
 * @param {(rel: string) => 'changed'|'unchanged'} args.statusOf - 工作区侧差异判定。
 * @param {(rel: string) => boolean} [args.inside] - rel 是否解析在工作区根内。
 * @returns {{files: Array<{rel: string, action: string, reason?: string, mode?: number}>, missing: string[]}}
 */
export function classifyRollback({ snapshotByRel, requested, statusOf, inside }) {
  const files = []
  const missing = []
  for (const rel of requested) {
    const entry = snapshotByRel.get(rel)
    if (entry === undefined) {
      missing.push(rel)
      continue
    }
    if (isProtectedRel(rel)) {
      files.push({ rel, action: ROLLBACK_ACTIONS.SKIP, reason: 'protected path (.git/.dsh) is never restored' })
      continue
    }
    if (inside !== undefined && !inside(rel)) {
      files.push({ rel, action: ROLLBACK_ACTIONS.SKIP, reason: 'outside the workspace root' })
      continue
    }
    const status = statusOf(rel)
    files.push({
      rel,
      action: status === 'changed' ? ROLLBACK_ACTIONS.RESTORE : ROLLBACK_ACTIONS.UNCHANGED,
      ...(entry.mode !== undefined ? { mode: entry.mode } : {}),
    })
  }
  return { files, missing }
}

/**
 * 每工作区串行锁（进程内）：同一 key 的任务排队执行；前序失败不阻断后序。
 * @param {Map<string, Promise<unknown>>} chains - 锁表（调用方持有）。
 * @param {string} key - 工作区键。
 * @param {() => Promise<T>} task - 任务。
 * @returns {Promise<T>} 任务结果。
 * @template T
 */
export function withKeyLock(chains, key, task) {
  const previous = chains.get(key) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(task)
  const tail = next.then(() => undefined, () => undefined)
    .then(() => { if (chains.get(key) === tail) chains.delete(key) })
  chains.set(key, tail)
  return next
}
