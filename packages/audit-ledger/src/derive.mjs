// src/derive.mjs — harness 会话事件 → audit 记录派生（纯函数，零 DSH 依赖，
// CI 可测）。消费 harness 事件，不发明平行语义（M8）；类别归属见
// DOMAINS.md §3：tool/call+result → tool、approval 成对 + approval/policy →
// approval、permission/preset + sandbox/mode → permission、checkpoint/* → snapshot。
//
// 只产出"语义核"（category / eventType / payload / 身份字段）；id / seq /
// time / prevHash 由 ledger 写路径在落盘时补齐（追加式 + 哈希链，M7）。
// rollback / guard 类别为预留位（生态事件，基础范围不发明平行语义）。
// 容错超集：未知事件跳过（不报错）；payload 缺失字段不产出（M2/M5）。
//
// 事件源：harness **持久会话事件**（KNOWN_SESSION_EVENT_TYPES，源码核实
// 2026-08-22）——观察路径为 session/event（查 event.type）或 sessionQuery，
// 不是 ctx.on('tool/*')；tool/result 的 callId 在 data.message.callId
// （顶层 callId 为早期形状，兼容保留）。
//
// T4-3 数字映射地基（见 docs/technical-selections.md T4-3）：eventType 原文
// 永远保留（存储层永久主键）；eventTypeId 是**加法字段**，仅当事件类型已
// frozen（官方背书）时附加——registry 通过 options 注入（缺省 common 默认
// 实例），未来官方映射落地只需注册 frozen 条目，派生钩子自动开始产出，
// 旧记录零重写、消费方零改动（迁移是读路径的事）。

import { eventTypeRegistry } from 'dsh-audit-common'

/**
 * 把单个 harness 会话事件归类为 audit 语义核；未知事件返回 null。
 * @param {object} event - 会话事件（形状见 dsh-audit-spec events.mjs）。
 * @returns {{category: string, eventType: string, payload: object,
 *   turn?: number, step?: number, callId?: string}|null}
 */
export function classifyEvent(event) {
  if (event === null || typeof event !== 'object' || typeof event.type !== 'string') return null
  const data = event.data ?? {}
  switch (event.type) {
    case 'tool/call':
      return {
        category: 'tool',
        eventType: 'tool/call',
        payload: { name: data.name, arguments: data.arguments },
        turn: data.turn,
        step: data.step,
        callId: data.callId,
      }
    case 'tool/result':
      return {
        category: 'tool',
        eventType: 'tool/result',
        // isError：顶层（早期形状）或 message 层（harness 实际形状）兼容；
        // error：顶层 { name, code }（harness）或早期字符串。
        payload: pickDefined(
          { ...data, isError: data.isError ?? data.message?.isError },
          ['isError', 'error'],
        ),
        turn: data.turn,
        step: data.step,
        callId: data.callId ?? data.message?.callId, // harness 实际形状：message.callId
      }
    case 'approval/asked':
      return { category: 'approval', eventType: 'approval/asked', payload: data }
    case 'approval/decided':
      return { category: 'approval', eventType: 'approval/decided', payload: data }
    case 'approval/policy':
      return { category: 'approval', eventType: 'approval/policy', payload: data }
    case 'permission/preset':
      return { category: 'permission', eventType: 'permission/preset', payload: data }
    case 'sandbox/mode':
      return { category: 'permission', eventType: 'sandbox/mode', payload: data }
    default:
      return event.type.startsWith('checkpoint/')
        ? { category: 'snapshot', eventType: event.type, payload: data }
        : null
  }
}

/**
 * 会话事件序列 → audit 记录草案序列（保持事件顺序；未知事件跳过）。
 * @param {Array<object>} events - 会话事件序列（追加序）。
 * @param {{sessionId?: string, registry?: object}} [options] -
 *   sessionId 缺省取事件自带字段；registry 为事件类型注册表（缺省 common
 *   默认实例，需含 eventTypeId/isFrozen 方法；测试可注入独立工厂实例）。
 * @returns {Array<{sessionId: string, category: string, eventType: string,
 *   eventTypeId?: number, source: 'harness', turn?: number, step?: number,
 *   callId?: string, payload: object}>}
 */
export function deriveAuditDrafts(events, { sessionId, registry = eventTypeRegistry } = {}) {
  if (!Array.isArray(events)) throw new TypeError('events must be an array')
  const drafts = []
  for (const event of events) {
    const classified = classifyEvent(event)
    if (classified === null) continue
    const draft = {
      sessionId: sessionId ?? event?.sessionId ?? '',
      category: classified.category,
      eventType: classified.eventType,
      source: 'harness',
      payload: classified.payload ?? {},
    }
    // T4-3：仅 frozen（官方背书）事件附加数字码；原文始终保留。未注册/
    // 未冻结 → 无码透传，不报错（"一切皆插件"，M8）。
    if (registry.isFrozen(classified.eventType)) {
      draft.eventTypeId = registry.eventTypeId(classified.eventType)
    }
    if (Number.isInteger(classified.turn) && classified.turn > 0) draft.turn = classified.turn
    if (Number.isInteger(classified.step) && classified.step > 0) draft.step = classified.step
    if (typeof classified.callId === 'string' && classified.callId.length > 0) {
      draft.callId = classified.callId
    }
    drafts.push(draft)
  }
  return drafts
}

/** 从对象中挑选存在且非 undefined 的键（JSON 可序列化，无 undefined 字段）。 */
function pickDefined(object, keys) {
  const picked = {}
  for (const key of keys) {
    if (object[key] !== undefined) picked[key] = object[key]
  }
  return picked
}
