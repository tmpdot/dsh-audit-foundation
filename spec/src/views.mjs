// src/views.mjs — 视图模型 schema v1（**草案**，D9：UI 与数据分离）。
// 呈现层数据契约：UI 组件（dsh-audit-ui）只消费视图模型，**不直接读存储域**
// （DOMAINS.md §5 / CONTRACT.md §5）。容错超集：未知字段剥离，严格性属于
// 视图模型生产者（M2）。词汇**对齐域草案**（cdp-snapshots / checkpoints v2 /
// audit / events），不发明平行语义（M8）；M0：消费方从本包导入，禁止同构重声明。
//
// 对标记录（见 docs/technical-selections.md T4-4）：
// - 生态：dsh-checkpoint-diff 时间线面板词汇（records[].id/degraded/branchId、
//   files[].path+status A/M/D、truncated/totalFiles、markers）——本草案为其超集；
// - 行业：无统一视图契约（Kibana/Sentry/Grafana 均产品内契约；OCSF/ECS 是
//   存储/传输层 schema，非视图契约）——**不采用**行业产品 JSON，字段命名沿用
//   本仓库域词汇（camelCase）。

import { z } from 'zod'
import { AUDIT_CATEGORIES, AUDIT_SOURCES } from './audit.mjs'

const H64_RE = /^[0-9a-f]{64}$/u

// 时间线三源（F11：cdp ⊕ rewind ⊕ trace 多源合并）
export const VIEW_SOURCES = ['cdp', 'rewind', 'trace']
// M9 持久性层级（视图展示用；durable=耐久层，temporary=易失源）
export const VIEW_TIERS = ['durable', 'temporary']
// 快照来源分类，词汇对齐 checkpoints v2 / cdp-snapshots v1
export const VIEW_KINDS = ['manual', 'auto', 'guard', 'mutation']
// 文件变更动作，对齐 CONTRACT §3 的 A/M/D 语义
export const VIEW_ACTIONS = ['A', 'M', 'D']
// 导出格式（D7：首期 JSON+MD；SARIF 留给生态插件）
export const EVIDENCE_FORMATS = ['json', 'markdown']

// 时间线节点视图（F11/F16）：三源合并后的单一呈现形状；degraded/notes 为
// M5 降级标注；badges 为判定徽标预留位（F16：allow/deny/waived，生态对齐后消费）。
export const timelineNodeSchema = z.object({
  id: z.string().min(1), // 源记录 id
  seq: z.number().int().nonnegative(), // 源内序号
  time: z.number().int().nonnegative(), // epoch 毫秒
  source: z.enum(VIEW_SOURCES), // 来源（M9 标注）
  tier: z.enum(VIEW_TIERS), // 持久性层级（M9 标注）
  kind: z.enum(VIEW_KINDS).optional(), // 对齐 checkpoints v2 词汇
  triggerTool: z.string().min(1).optional(),
  files: z.number().int().nonnegative().optional(),
  bytes: z.number().int().nonnegative().optional(),
  ref: z.string().regex(H64_RE).optional(), // 内容寻址（cdp 源）
  label: z.string().optional(), // 意图标签（common/labels.mjs 产出）
  branchId: z.string().optional(), // fork 血缘（对齐 diff 面板 branchFilter）
  badges: z.array(z.object({
    text: z.string().min(1),
    kind: z.string().min(1), // 生态对齐后限定词汇（如 allow/deny/waived）
  })).optional(), // 判定徽标（F16 预留）
  degraded: z.boolean().optional(), // M5 降级标注
  notes: z.array(z.string()).optional(), // 降级/错误归因点名
})

// 行级 diff：行类型对齐 common/diff-engine（LCS）输出与 unified diff 语义。
export const diffHunkLineSchema = z.object({
  t: z.enum(['ctx', 'del', 'add']),
  text: z.string(),
})

export const diffHunkSchema = z.object({
  oldStart: z.number().int().positive(), // 对齐 unified diff 头（@@ -a,b +c,d @@）
  oldLines: z.number().int().nonnegative(),
  newStart: z.number().int().positive(),
  newLines: z.number().int().nonnegative(),
  lines: z.array(diffHunkLineSchema),
})

export const diffFileSchema = z.object({
  rel: z.string().min(1), // 相对路径
  action: z.enum(VIEW_ACTIONS), // A/M/D（对齐 CONTRACT §3）
  stats: z.object({
    added: z.number().int().nonnegative(),
    deleted: z.number().int().nonnegative(),
    unchanged: z.number().int().nonnegative().optional(),
  }),
  hunks: z.array(diffHunkSchema).optional(), // 行级变化；仅 M 文件通常携带
})

// diff 视图（F12）：from/to 寻址沿用 CONTRACT §1.3（id 前缀或 'latest'）。
export const diffViewSchema = z.object({
  fromRef: z.string().min(1),
  toRef: z.string().min(1),
  files: z.array(diffFileSchema),
  summary: z.object({
    added: z.number().int().nonnegative(),
    deleted: z.number().int().nonnegative(),
    files: z.number().int().nonnegative(),
    truncated: z.boolean().optional(), // 对齐 diff 面板截断语义
    totalFiles: z.number().int().nonnegative().optional(),
  }),
})

// 审计记录视图（F7/F8）：category/source 词汇**复用 audit 域导出**（M0，
// 不重声明）；verified 为哈希链校验结果（M7："哈希 ≠ 密封"，仅展示校验状态）。
export const auditViewRecordSchema = z.object({
  id: z.string().min(1),
  time: z.number().int().nonnegative(), // epoch 毫秒
  category: z.enum(AUDIT_CATEGORIES), // 复用 audit 域词汇
  eventType: z.string().min(1), // harness 事件类型原文
  source: z.enum(AUDIT_SOURCES), // 复用 audit 域词汇
  turn: z.number().int().positive().optional(),
  step: z.number().int().positive().optional(),
  callId: z.string().min(1).optional(),
  summary: z.string().optional(), // 人类可读摘要（呈现层派生）
  verified: z.boolean().optional(), // 单条哈希链校验结果
  prevHash: z.string().regex(H64_RE).nullable().optional(), // 链位展示
})

export const auditViewSchema = z.object({
  records: z.array(auditViewRecordSchema),
  total: z.number().int().nonnegative(),
  headHash: z.string().regex(H64_RE).nullable(), // 链头哈希（可验证性展示）
  verified: z.boolean().optional(), // 全链校验结果
})

// 证据导出视图（F14/F15）：产物可哈希可归档（M7）；format 限定 D7 首期范围。
export const evidenceViewSchema = z.object({
  format: z.enum(EVIDENCE_FORMATS),
  exportedAt: z.number().int().nonnegative(), // epoch 毫秒
  records: z.number().int().nonnegative(),
  artifactHash: z.string().regex(H64_RE), // 产物内容寻址（可验证，M7）
  scope: z.object({
    sessionId: z.string().min(1).optional(),
    workspaceKey: z.string().min(1).optional(),
  }).optional(),
  range: z.object({
    fromTime: z.number().int().nonnegative().optional(),
    toTime: z.number().int().nonnegative().optional(),
  }).optional(),
  notes: z.array(z.string()).optional(),
})
