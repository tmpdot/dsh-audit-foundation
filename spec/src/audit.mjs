// src/audit.mjs — 'audit' 域 v1 记录 schema（**草案**，D5 待拍板：审计聚合
// 记录是否首期实现；schema 先行，M0）。零 DSH 依赖（纯 zod）。
//
// 语义（见 DOMAINS.md §3）：把 harness 关键事件聚合为追加式审计记录——
// approval/asked+decided 成对、permission/preset、tool/call+result、
// checkpoint/*、恢复应用。**消费 harness 事件，不发明平行语义**（M4/M8）；
// payload 保留事件 data 快照（JSON 可序列化）；prevHash 哈希链（M7）。

import { z } from 'zod'

export const AUDIT_DOMAIN = 'audit'
export const AUDIT_TABLE = 'records'
export const AUDIT_CATEGORIES = ['approval', 'permission', 'tool', 'snapshot', 'rollback', 'guard']
export const AUDIT_SOURCES = ['harness', 'cdp']

export const auditRecordSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  seq: z.number().int().nonnegative(), // 审计域内序号（追加序）
  time: z.number().int().nonnegative(), // epoch 毫秒
  category: z.enum(AUDIT_CATEGORIES),
  eventType: z.string().min(1), // harness 事件类型原文（如 'approval/decided'）
  source: z.enum(AUDIT_SOURCES), // 事件来源（harness 会话事件 / cdp 自产）
  turn: z.number().int().positive().optional(), // 身份字段对齐 harness 形状
  step: z.number().int().positive().optional(),
  callId: z.string().min(1).optional(), // 工具调用 id（对齐 tool/call）
  payload: z.record(z.string(), z.unknown()), // 事件 data 快照（JSON 可序列化）
  prevHash: z.string().regex(/^[0-9a-f]{64}$/u).nullable(), // 哈希链；首条 null
})

// 审计策略（F19，dsh-audit-ledger 的 config schema；归 spec，M0）：
// 记录什么（categories 过滤）+ 留多久（retention 配额，逐出语义对齐
// dsh-audit-common 的 computeRetention：数量/字节独立生效、逐出最旧）。
export const auditPolicySchema = z.object({
  enabled: z.boolean().default(true), // 总开关（false = 不写审计域）
  categories: z.array(z.enum(AUDIT_CATEGORIES)).optional(), // 缺省 = 全部记录
  retention: z.object({
    maxRecords: z.number().int().nonnegative().nullable().optional(), // null/缺省 = 不限
    maxBytes: z.number().int().nonnegative().nullable().optional(),
  }).optional(),
})
