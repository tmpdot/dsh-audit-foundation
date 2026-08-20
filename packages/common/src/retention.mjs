// src/retention.mjs — 保留策略纯函数（M9：配额逐出语义是数据的一部分）。
// 只计算"保留/逐出"划分，不执行任何文件操作——删除/归档是生产者写路径的
// 职责（M6；归档 vs 逐出分离，见 DOMAINS.md §2）。零依赖，CI 可测。
//
// 语义：保留**最新**记录（追加序）。数量上限 maxSnapshots 与字节上限
// maxBytes **独立生效**，任一超限即逐出最旧的记录；null/undefined = 不限；
// 0 = 逐出全部。逐出结果最旧优先，reason 取先命中的上限（count 优先）。
// 输入按追加序给出；有 seq 时按 seq 升序兜底（同 seq 保持原序）。
// 假设：记录 id 唯一。

export const RETENTION_REASONS = ['count', 'bytes']

/**
 * @param {Array<{id: string, seq?: number, bytes?: number}>} records 追加序记录
 * @param {{maxSnapshots?: number|null, maxBytes?: number|null}} [limits]
 * @returns {{keep: object[], evict: Array<{id: string, reason: 'count'|'bytes'}>}}
 *   keep 为原记录对象（追加序）；evict 最旧优先。bytes 缺失按 0 计。
 */
export function computeRetention(records, { maxSnapshots = null, maxBytes = null } = {}) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array')
  if (maxSnapshots !== null && (!Number.isInteger(maxSnapshots) || maxSnapshots < 0)) {
    throw new TypeError('maxSnapshots must be a non-negative integer or null')
  }
  if (maxBytes !== null && (!Number.isInteger(maxBytes) || maxBytes < 0)) {
    throw new TypeError('maxBytes must be a non-negative integer or null')
  }
  for (const record of records) {
    if (record === null || typeof record !== 'object' || typeof record.id !== 'string') {
      throw new TypeError('records must be objects with a string id')
    }
  }
  if (records.length === 0) return { keep: [], evict: [] }

  const ordered = records
    .map((record, index) => ({
      record,
      seq: Number.isInteger(record.seq) ? record.seq : index,
      bytes: Number.isInteger(record.bytes) && record.bytes >= 0 ? record.bytes : 0,
      index,
    }))
    .sort((a, b) => a.seq - b.seq || a.index - b.index)

  const total = ordered.length
  const reasonOf = new Map() // id -> reason（只记一次，count 优先）

  // 数量上限：只保留最新 maxSnapshots 条
  const keepNewest = maxSnapshots === null ? total : Math.min(total, maxSnapshots)
  for (let i = 0; i < total - keepNewest; i++) {
    const { record } = ordered[i]
    if (!reasonOf.has(record.id)) reasonOf.set(record.id, 'count')
  }

  // 字节上限：在数量保留集合内，从最旧起逐出直至总量不超限
  if (maxBytes !== null) {
    let used = 0
    const keptTail = ordered.slice(total - keepNewest)
    for (const entry of keptTail) used += entry.bytes
    for (const entry of keptTail) {
      if (used <= maxBytes) break
      if (!reasonOf.has(entry.record.id)) reasonOf.set(entry.record.id, 'bytes')
      used -= entry.bytes
    }
  }

  const keep = []
  const evict = []
  for (const { record } of ordered) {
    const reason = reasonOf.get(record.id)
    if (reason === undefined) keep.push(record)
    else evict.push({ id: record.id, reason })
  }
  return { keep, evict }
}
