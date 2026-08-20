// src/hash.mjs — 内容寻址与哈希链（M7）。零依赖（node:crypto）。
//
// 用途：快照内容寻址（同内容 = 同 ref，双捕获去重）、记录哈希链
// （prevHash 检测重排/缺失/篡改）、证据导出可验证哈希。
// "可验证 ≠ 不可篡改"：本模块只算哈希，不密封、不签名（签名是可选扩展，
// 密钥管理未定，v1 不承诺）。

import { createHash } from 'node:crypto'

/** sha256 hex（string 或 Buffer）。 */
export function sha256Hex(input) {
  return createHash('sha256').update(input).digest('hex')
}

/**
 * 规范化 JSON 字符串化（键排序 + 无空白）：同一对象的哈希与属性顺序无关。
 * @param {unknown} value
 * @returns {string}
 */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
}

/**
 * 记录哈希：规范化 JSON 的 sha256。默认剔除哈希链字段（prevHash/hash），
 * 因为链上验证需要"不含自身链字段"的载荷哈希。
 * @param {object} record - 记录对象。
 * @param {string[]} [exclude] - 剔除字段名（默认 ['prevHash', 'hash']）。
 * @returns {string} 64 位 hex。
 */
export function recordHash(record, exclude = ['prevHash', 'hash']) {
  const copy = {}
  for (const [key, value] of Object.entries(record)) {
    if (!exclude.includes(key)) copy[key] = value
  }
  return sha256Hex(stableStringify(copy))
}

/**
 * 快照内容清单哈希（内容寻址 ref 的候选算法）：规范化 rel 顺序 + 逐文件
 * 内容哈希拼接后整体哈希。同内容（含 rel 与字节）→ 同 ref。
 * @param {Array<{rel: string, content: string|Buffer}>} files - 快照文件集。
 * @returns {string} 64 位 hex。
 */
export function contentHash(files) {
  const lines = [...files]
    .sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))
    .map((entry) => `${entry.rel}\u0000${sha256Hex(entry.content)}`)
  return sha256Hex(lines.join('\n'))
}
