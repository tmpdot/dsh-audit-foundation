// src/diff-engine.mjs — 行级 diff 引擎（纯函数，零依赖）。
// migrated from dsh-checkpoint-diff@0.5.x (lib/diff/engine.mjs)
//
// 经典 LCS 动态规划：Uint32Array 全表 + 回溯。单元数上限 LCS_CELL_LIMIT，
// 超过即降级为"全删全加"（超大文件只报告整体替换，不卡进程）。
// 输出 ops 与 rewind 前身原型同构：{type:'ctx'|'del'|'add', text, a?, b?}，
// a/b 为源文件 1 基行号（ctx 行同时携带 a/b；del 只带 a；add 只带 b）。

import { DIFF_OPS, LCS_CELL_LIMIT } from './constants.mjs'

/** 按 \n 切分（保留空行；不保留行尾 \n）。 */
function splitLines(text) {
  if (text.length === 0) return []
  const lines = text.split('\n')
  if (lines.at(-1) === '') lines.pop() // 尾部换行不产生空行
  return lines
}

/**
 * 两文本的行级 diff。
 * @param {string} aText - 旧内容。
 * @param {string} bText - 新内容。
 * @returns {{ops: Array<{type: string, text: string, a?: number, b?: number}>, truncated: boolean}}
 *   ops 为有序操作（可拼接还原 b）；truncated 表示是否降级过。
 */
export function diffLines(aText, bText) {
  const a = splitLines(aText)
  const b = splitLines(bText)
  return diffLineArrays(a, b)
}

/**
 * 两行数组的 diff（测试直接注入行数组）。
 * @param {string[]} a - 旧行。
 * @param {string[]} b - 新行。
 * @returns {{ops: Array<object>, truncated: boolean}}
 */
export function diffLineArrays(a, b) {
  const n = a.length
  const m = b.length
  const cells = (n + 1) * (m + 1)
  if (cells > LCS_CELL_LIMIT) {
    const ops = [
      ...a.map((text, index) => ({ type: DIFF_OPS.DELETE, text, a: index + 1 })),
      ...b.map((text, index) => ({ type: DIFF_OPS.ADD, text, b: index + 1 })),
    ]
    return { ops, truncated: true }
  }

  // dp[i][j] = a[0..i) 与 b[0..j) 的 LCS 长度；一维滚动行的全表（Uint32Array 紧凑）。
  const width = m + 1
  const dp = new Uint32Array(cells)
  for (let i = 1; i <= n; i += 1) {
    const row = i * width
    const prev = row - width
    const ai = a[i - 1]
    for (let j = 1; j <= m; j += 1) {
      dp[row + j] = ai === b[j - 1]
        ? dp[prev + j - 1] + 1
        : Math.max(dp[prev + j], dp[row + j - 1])
    }
  }

  // 回溯：从 (n, m) 向 (0, 0)，等价于从旧→新的编辑序列。
  const ops = []
  let i = n
  let j = m
  while (i > 0 && j > 0) {
    const ai = a[i - 1]
    const bj = b[j - 1]
    if (ai === bj) {
      ops.push({ type: DIFF_OPS.CONTEXT, text: ai, a: i, b: j })
      i -= 1
      j -= 1
    } else if (dp[i * width + j - 1] >= dp[(i - 1) * width + j]) {
      ops.push({ type: DIFF_OPS.ADD, text: bj, b: j })
      j -= 1
    } else {
      ops.push({ type: DIFF_OPS.DELETE, text: ai, a: i })
      i -= 1
    }
  }
  while (i > 0) {
    ops.push({ type: DIFF_OPS.DELETE, text: a[i - 1], a: i })
    i -= 1
  }
  while (j > 0) {
    ops.push({ type: DIFF_OPS.ADD, text: b[j - 1], b: j })
    j -= 1
  }
  ops.reverse()
  return { ops, truncated: false }
}

/**
 * 内容是否为二进制（含 NUL；GUI/命令据此标注，不做行 diff）。
 * @param {string|Buffer} content - 文件内容。
 * @returns {boolean}
 */
export function isBinary(content) {
  const source = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8')
  return source.includes(0)
}
