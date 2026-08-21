// src/event-registry.mjs — 事件类型注册表（纯函数 + 数据，零 DSH 依赖）。
// T4-3 演进地基（见 docs/technical-selections.md T4-3）：audit 域 eventType
// 当前保留 harness 事件原文透传（"一切皆插件"的代价——任何插件的自身操作必须
// 能原样存储）；未来方向是"公开的插件操作 → 数字映射"（官方背书/社区凝聚力）。
//
// 迁移成本随历史数据积累与代码固化而上升，而追加式账本 + 哈希链决定了旧记录
// 永远不能重写——因此迁移必须是**读路径/派生路径**的事，绝不是数据重写。本模块
// 就是那条读路径的唯一入口：一切"eventType ↔ 数字码"的解析都从这里走，未来
// 官方映射落地时只改注册数据、翻冻结标志，消费方零改动。
//
// 约定（写入即永久，防呆）：
// - `eventType` 原文是存储层的**永久主键**，任何情况下不重写、不替换；
// - `eventTypeId` 是**加法字段**：只有 frozen（官方/社区契约冻结）的事件才会
//   出现在持久记录里（derive.mjs 的派生钩子按 isFrozenEventType 门禁）；
// - 私有保留区间：code >= PROVISIONAL_CODE_MIN (0xE000) 为基座临时预留空间，
//   只用于预置种子与读路径展示，**永不落盘**；官方码约定 < 0xE000；
// - 未注册事件（任何插件的新操作）一律原文透传、无码——不报错、不发明语义（M8）。

/**
 * 私有保留区间的起点。>= 此值的码一律视为"基座临时/未冻结"，
 * 任何写路径不得持久化（与 isFrozenEventType 双保险）。
 */
export const PROVISIONAL_CODE_MIN = 0xe000

/**
 * 预置种子：当前基座实际消费的 harness 事件词汇（frozen: false）。
 * 形状对齐 spec/src/events.mjs 与 audit-ledger/src/derive.mjs 的消费集合；
 * checkpoint/* 是命名空间（regex），注册表只登记已观测到的具体子类型，
 * 其余 checkpoint/X 未注册 → 原文透传。
 *
 * 本表同时是"向官方建议"的清单底稿：这些就是基座正在消费、需要官方背书
 * 数字码的事件（见 DOMAINS.md §3 对生态的提案）。
 */
export const PROVISIONAL_SEEDS = Object.freeze([
  { eventType: 'tool/call', code: 0xe001 },
  { eventType: 'tool/result', code: 0xe002 },
  { eventType: 'approval/asked', code: 0xe003 },
  { eventType: 'approval/decided', code: 0xe004 },
  { eventType: 'permission/preset', code: 0xe005 },
  { eventType: 'checkpoint/snapshot', code: 0xe006 },
  { eventType: 'checkpoint/restore', code: 0xe007 },
])

/**
 * 创建事件类型注册表（独立实例，测试可用工厂自建，互不污染）。
 * @param {Array<{eventType: string, code: number, frozen?: boolean}>} [entries]
 * @param {{strictFrozenRange?: boolean}} [options] - strictFrozenRange=true 时
 *   强制 frozen 条目 code < PROVISIONAL_CODE_MIN（官方码不进私有保留区）。
 * @returns {{
 *   define: (entries: Array<object>) => void,
 *   eventTypeId: (eventType: string) => number|undefined,
 *   eventTypeForId: (id: number) => string|undefined,
 *   isRegistered: (eventType: string) => boolean,
 *   isFrozen: (eventType: string) => boolean,
 *   eventTypes: () => Array<string>,
 *   frozenEventTypes: () => Array<string>,
 *   snapshot: () => object,
 * }}
 */
export function createEventTypeRegistry(entries = [], { strictFrozenRange = false } = {}) {
  const byText = new Map() // eventType -> { code, frozen }
  const byCode = new Map() // code -> eventType

  /**
   * 注册/追加条目。稳定性是硬约束（同文本永远同码、同码永远同文本）：
   * - 完全相同条目（eventType/code/frozen 全等）→ 幂等跳过（插件热重载安全）；
   * - eventType 冲突（同文本不同码/冻结标志）或 code 冲突（同码不同文本）→ 抛错。
   * @param {Array<{eventType: string, code: number, frozen?: boolean}>} newEntries
   */
  function define(newEntries) {
    if (!Array.isArray(newEntries)) throw new TypeError('entries must be an array')
    for (const entry of newEntries) {
      if (entry === null || typeof entry !== 'object') throw new TypeError('entry must be an object')
      const { eventType, code, frozen = false } = entry
      if (typeof eventType !== 'string' || eventType.length === 0) {
        throw new TypeError(`invalid eventType: ${String(eventType)}`)
      }
      if (!Number.isInteger(code) || code <= 0) {
        throw new TypeError(`invalid code for ${eventType}: ${String(code)} (must be positive integer)`)
      }
      if (strictFrozenRange && frozen && code >= PROVISIONAL_CODE_MIN) {
        throw new RangeError(
          `frozen code for ${eventType} (${code}) must be < ${PROVISIONAL_CODE_MIN} ` +
          '(official codes stay out of the foundation-private provisional range)',
        )
      }
      const existing = byText.get(eventType)
      if (existing !== undefined) {
        if (existing.code === code && existing.frozen === Boolean(frozen)) continue // 幂等
        throw new Error(
          `conflicting eventType ${eventType}: already ${existing.code}/${existing.frozen}, ` +
          `got ${code}/${frozen}`,
        )
      }
      if (byCode.has(code)) {
        throw new Error(`duplicate code ${code} for eventType ${eventType} (already ${byCode.get(code)})`)
      }
      byText.set(eventType, { code, frozen: Boolean(frozen) })
      byCode.set(code, eventType)
    }
  }

  /**
   * 事件类型原文 → 数字码；未注册返回 undefined（调用方按"无码"处理）。
   * @param {string} eventType
   * @returns {number|undefined}
   */
  function eventTypeId(eventType) {
    return byText.get(eventType)?.code
  }

  /**
   * 数字码 → 事件类型原文；未注册返回 undefined。
   * @param {number} id
   * @returns {string|undefined}
   */
  function eventTypeForId(id) {
    return byCode.get(id)
  }

  /** 是否已注册（无论 frozen 与否）。 */
  function isRegistered(eventType) {
    return byText.has(eventType)
  }

  /** 是否已冻结（官方/社区契约背书，可落盘）。未注册返回 false。 */
  function isFrozen(eventType) {
    return byText.get(eventType)?.frozen === true
  }

  /** 全部已注册事件类型（注册序）。 */
  function eventTypes() {
    return [...byText.keys()]
  }

  /** 仅冻结事件类型（注册序）。 */
  function frozenEventTypes() {
    return [...byText.entries()].filter(([, v]) => v.frozen).map(([k]) => k)
  }

  /** 只读快照（调试/导出用；修改副本不影响注册表）。 */
  function snapshot() {
    return {
      entries: Object.freeze(
        [...byText.entries()].map(([eventType, v]) => ({ eventType, code: v.code, frozen: v.frozen })),
      ),
      count: byText.size,
      frozenCount: frozenEventTypes().length,
    }
  }

  define(entries)
  return Object.freeze({
    define,
    eventTypeId,
    eventTypeForId,
    isRegistered,
    isFrozen,
    eventTypes,
    frozenEventTypes,
    snapshot,
  })
}

// 默认实例：预置种子 + 私有区间硬约束。应用侧新增官方码用 defineEventTypes()。
export const eventTypeRegistry = createEventTypeRegistry(PROVISIONAL_SEEDS, { strictFrozenRange: true })

/** 便捷函数（委托默认实例）：事件类型 → 数字码（未注册/未冻结也返回预置码，仅读路径展示用）。 */
export function eventTypeId(eventType) {
  return eventTypeRegistry.eventTypeId(eventType)
}

/** 便捷函数：数字码 → 事件类型原文。 */
export function eventTypeForId(id) {
  return eventTypeRegistry.eventTypeForId(id)
}

/** 便捷函数：是否已注册。 */
export function isRegisteredEventType(eventType) {
  return eventTypeRegistry.isRegistered(eventType)
}

/** 便捷函数：是否已冻结（官方背书、允许落盘的唯一判据）。 */
export function isFrozenEventType(eventType) {
  return eventTypeRegistry.isFrozen(eventType)
}

/**
 * 应用侧注册入口：官方映射落地后在此追加 frozen 条目（如
 * defineEventTypes([{ eventType: 'tool/call', code: 1, frozen: true }])），
 * 派生钩子自动开始产出 eventTypeId，存储与旧记录零改动。
 */
export function defineEventTypes(entries) {
  eventTypeRegistry.define(entries)
}
