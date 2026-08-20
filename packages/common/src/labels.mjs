// src/labels.mjs — 快照意图命名（纯函数，零 DSH 依赖）。
// migrated from dsh-checkpoint-diff@0.5.x (lib/labels.mjs)
//
// 检查点记录只有 triggerTool/turn/step，人类可读性差。本模块按 (turn, step)
// 从会话日志的 tool/call 事件反查"模型当时在做什么"，产出人类可读 label：
//   工具名 + 目标参数（如 "edit README.md"、"bash pnpm test"）。
//
// 命名缩短（label 过长的三处来源）：
//   - 文件型工具（write/edit/str_replace_editor/read 的 file_path/path/file）：
//     绝对路径 → 相对会话工作区的路径（cwd 由调用方传入；相对路径保持原样；
//     仍超长时退化为仅文件名）。
//   - 命令型工具（bash/pwsh/terminal_send 的 command）：整条命令 → 简写
//     （命令名 + 首个非 flag 参数；参数形如路径时套用路径缩短）。规则保守，
//     未知命令同样受益——"命令名 + 首参"本身已远短于整条命令。
//   - 展示名别名：str_replace_editor → edit（与项目词汇一致）；只读标注压缩
//     为符号 Ⓡ。
// 缩短一律基于"去掉前缀与次要参数"而非截断尾巴——文件名/命令名不丢。
//
// 事件契约（dsh-session 的 SessionEventMap，只读消费）：
//   tool/call: { seq, time, data: { turn, step, callId, name, arguments } }
//   arguments 是模型产出的原始 JSON 字符串（未解析），解析失败即无目标。
//
// 匹配优先级（labelForRecord）：
//   1. name 与 triggerTool 精确相等的调用（tools/pre-execute 触发的捕获）；
//   2. fs/*-intent 触发的捕获 → 本步第一个"变更型工具"调用
//      （rewind 的 mutationTools 名单；快照在首次变更前捕获，取第一个最贴近）；
//   3. 本步第一个 tool/call（只读调用也给出上下文）；
//   4. 无调用 → 回退到 triggerTool 原文。
// 优雅降级：事件缺失/步骤已被压缩/会话已重启 → 现有格式不受影响。

import path from 'node:path'
import { MUTATION_TOOLS, PRE_REWIND_TRIGGER } from './constants.mjs'

/** label 中目标参数的最大字符数（超长截断，命令输出与下拉框保持单行）。 */
export const LABEL_TARGET_MAX = 48

// 工具名 → 显示名别名（会话日志里的原始工具名对人不友好时在此收敛）。
const DISPLAY_NAMES = Object.freeze({ str_replace_editor: 'edit' })

// 目标键 → 处理类别：路径（相对化/文件名）| 命令（简写）；其余键原文截断。
const PATH_TARGET_KEYS = new Set(['file_path', 'file', 'path'])
const COMMAND_TARGET_KEYS = new Set(['command'])

// 工具名 → 目标参数键的偏好顺序（首命中生效）。未列出的工具用 DEFAULT_TARGET_KEYS。
const TARGET_KEYS = Object.freeze({
  write: ['file_path', 'path', 'file'],
  edit: ['file_path', 'path', 'file'],
  str_replace_editor: ['file_path', 'path', 'file'],
  read: ['file_path', 'path', 'file'],
  glob: ['pattern', 'path'],
  grep: ['pattern', 'path'],
  bash: ['command'],
  pwsh: ['command'],
  terminal_send: ['command'],
  web_search: ['query'],
  workflow: ['name'],
})
const DEFAULT_TARGET_KEYS = ['file_path', 'path', 'file', 'command', 'pattern', 'query', 'url', 'name']

/**
 * 工具名 → 展示名（别名收敛；未知工具原样）。
 * @param {string} name - 原始工具名。
 * @returns {string}
 */
export function displayToolName(name) {
  return DISPLAY_NAMES[name] ?? name
}

/**
 * 绝对路径 → 相对路径（位于 cwd 下时）；不在 cwd 下时返回规范化的绝对路径；
 * cwd 缺失返回 undefined（调用方按"无法相对化"处理）。
 * 分隔符统一为 '/';与 cwd 相同返回 ''。
 * @param {string} rawPath - 原始路径。
 * @param {string|undefined} cwd - 会话工作区绝对路径。
 * @returns {string|undefined}
 */
export function relativizePath(rawPath, cwd) {
  if (cwd === undefined) return undefined
  const normalized = rawPath.split(/[\\/]/u).join('/')
  const base = cwd.split(/[\\/]/u).join('/')
  if (normalized === base) return ''
  if (normalized.startsWith(`${base}/`)) return normalized.slice(base.length + 1)
  // 跨平台绝对路径判定：POSIX 的 path.isAbsolute 不识别 Windows 盘符，盘符路径
  // 绝不能按相对路径拼进 cwd（否则 'D:/x.txt' 会变成 '<cwd>/D:/x.txt'）。
  if (path.isAbsolute(normalized) || /^[A-Za-z]:\//u.test(normalized)) return normalized
  const resolved = path.resolve(normalized)
  return resolved.split(/[\\/]/u).join('/')
}

/** 是否相对路径（无盘符、无前导分隔符）。 */
function isRelativePath(text) {
  return !/^[A-Za-z]:[\\/]/u.test(text) && !text.startsWith('/') && !text.startsWith('\\')
}

/** 末段（'/' 或 '\' 分割后的最后一段）。 */
function basenameOf(text) {
  const parts = String(text).split(/[\\/]/u)
  return parts[parts.length - 1] ?? ''
}

/**
 * 路径目标缩短：相对路径保持原样；绝对路径在 cwd 下 → 相对；仍超
 * LABEL_TARGET_MAX → 仅文件名（长路径时文件名才是有信息量的部分）。
 * @param {string} raw - 原始路径。
 * @param {string|undefined} cwd - 会话工作区（缺失时只做文件名退化）。
 * @returns {string}
 */
export function shortenPath(raw, cwd) {
  const text = String(raw)
  let candidate = isRelativePath(text) ? text : relativizePath(text, cwd)
  if (candidate === undefined) candidate = text
  if (candidate.length > LABEL_TARGET_MAX) {
    const base = basenameOf(candidate)
    if (base.length > 0 && base !== candidate) candidate = base
  }
  return candidate
}

/** 去掉首尾引号（命令 token 清洗）。 */
function stripQuotes(token) {
  return token.replace(/^["']+|["']+$/gu, '')
}

/** 是否形如路径（含分隔符 / 扩展名 / 盘符）。 */
function looksLikePath(text) {
  return /[\\/]/u.test(text) || /\.[A-Za-z0-9]{1,5}$/u.test(text) || /^[A-Za-z]:/u.test(text)
}

/**
 * 命令目标缩短：命令名 + 首个非 flag 参数（参数形如路径时套用路径缩短），
 * 其余 token 丢弃——label 只是提示，完整命令在 tooltip/会话日志里。
 * 例：`pnpm test --filter x` → `pnpm test`；`Set-Content README.md -Enc utf8`
 * → `Set-Content README.md`；`ls -la` → `ls`。
 * @param {string} text - 整条命令。
 * @param {string|undefined} cwd - 会话工作区（路径参数相对化用）。
 * @returns {string}
 */
export function shortenCommand(text, cwd) {
  const tokens = String(text).replace(/\s+/gu, ' ').trim().split(' ')
  if (tokens.length === 0) return ''
  const first = stripQuotes(tokens[0])
  if (tokens.length === 1) return first
  const second = stripQuotes(tokens[1])
  if (second.startsWith('-')) return first
  if (looksLikePath(second)) return `${first} ${shortenPath(second, cwd)}`
  return `${first} ${second}`
}

/**
 * 参数文本 → 目标参数（单行、按类别缩短、截断）。无目标返回 undefined。
 * @param {string} name - 工具名。
 * @param {string|undefined} argsText - 模型产出的原始 arguments JSON 字符串。
 * @param {string|undefined} [cwd] - 会话工作区（路径相对化；缺失时退化为文件名/原文）。
 * @returns {string|undefined} 目标文本。
 */
export function extractTarget(name, argsText, cwd) {
  let args
  if (typeof argsText === 'string' && argsText.length > 0) {
    try {
      args = JSON.parse(argsText)
    } catch {
      args = undefined
    }
  }
  if (args === null || typeof args !== 'object' || Array.isArray(args)) return undefined
  const keys = TARGET_KEYS[name] ?? DEFAULT_TARGET_KEYS
  for (const key of keys) {
    const value = args[key]
    if (typeof value !== 'string' || value.length === 0) continue
    if (PATH_TARGET_KEYS.has(key)) return cleanTarget(shortenPath(value, cwd))
    if (COMMAND_TARGET_KEYS.has(key)) return cleanTarget(shortenCommand(value, cwd))
    return cleanTarget(value)
  }
  return undefined
}

/** 目标文本清洗：空白折叠为单空格 + 长度截断。 */
export function cleanTarget(value) {
  let text = String(value).replace(/\s+/gu, ' ').trim()
  if (text.length > LABEL_TARGET_MAX) text = `${text.slice(0, LABEL_TARGET_MAX - 1)}…`
  return text
}

/**
 * 工具调用 → label 文本（"展示名 目标" 或仅有展示名）。
 * @param {string} name - 工具名。
 * @param {string|undefined} argsText - arguments JSON 字符串。
 * @param {string|undefined} [cwd] - 会话工作区（路径相对化）。
 * @returns {string}
 */
export function toolCallLabel(name, argsText, cwd) {
  const target = extractTarget(name, argsText, cwd)
  const display = displayToolName(name)
  return target === undefined ? display : `${display} ${target}`
}

/**
 * 事件日志 → (turn:step) → 工具调用列表 的索引。
 * 只收录字段形状完整的 tool/call；其余事件与垃圾行静默跳过。
 * @param {Iterable<object>|undefined} events - session.events（或其投影）。
 * @returns {Map<string, Array<{name: string, arguments: string|undefined, seq: number, time: number}>>}
 */
export function indexToolCalls(events) {
  const index = new Map()
  for (const event of events ?? []) {
    if (event === null || typeof event !== 'object' || event.type !== 'tool/call') continue
    const data = event.data
    if (data === null || typeof data !== 'object') continue
    const { turn, step, name } = data
    if (typeof turn !== 'number' || typeof step !== 'number') continue
    if (typeof name !== 'string' || name.length === 0) continue
    const key = `${turn}:${step}`
    let list = index.get(key)
    if (list === undefined) {
      list = []
      index.set(key, list)
    }
    list.push({
      name,
      arguments: typeof data.arguments === 'string' ? data.arguments : undefined,
      seq: typeof event.seq === 'number' ? event.seq : 0,
      time: typeof event.time === 'number' ? event.time : 0,
    })
  }
  return index
}

/**
 * 一条检查点（或其视图）→ 意图 label。
 * @param {object} record - 记录或 recordView（需含 turn/step/triggerTool）。
 * @param {Map<string, Array<object>>} index - indexToolCalls 的产物。
 * @param {string|undefined} [cwd] - 记录归属工作区（路径相对化；缺失时原样）。
 * @returns {string|undefined} label；无法推导时 undefined（调用方回退现有格式）。
 */
export function labelForRecord(record, index, cwd) {
  if (record === null || typeof record !== 'object') return undefined
  const { turn, step, triggerTool } = record
  if (triggerTool === PRE_REWIND_TRIGGER) return 'rewind guard'
  if (typeof turn !== 'number' || typeof step !== 'number') return undefined
  const calls = index.get(`${turn}:${step}`)
  if (calls === undefined || calls.length === 0) {
    return typeof triggerTool === 'string' && triggerTool.length > 0 ? triggerTool : undefined
  }
  const exact = calls.find((call) => call.name === triggerTool)
  if (exact !== undefined) return toolCallLabel(exact.name, exact.arguments, cwd)
  if (triggerTool === 'fs/write-intent' || triggerTool === 'fs/edit-intent') {
    const mutation = calls.find((call) => MUTATION_TOOLS.includes(call.name))
    if (mutation !== undefined) return toolCallLabel(mutation.name, mutation.arguments, cwd)
  }
  return toolCallLabel(calls[0].name, calls[0].arguments, cwd)
}

/**
 * 为一批记录视图附加意图 label（原对象不变，返回新视图数组）。
 * @param {Array<object>} views - recordView 产物。
 * @param {Iterable<object>|undefined} events - session.events。
 * @param {string|undefined} [cwd] - 会话工作区（路径相对化）。
 * @returns {Array<object>} 带 label 字段的视图（无法推导时 label 为 undefined）。
 */
export function withLabels(views, events, cwd) {
  const index = indexToolCalls(events)
  return views.map((view) => ({ ...view, label: labelForRecord(view, index, cwd) }))
}
