// src/cdp-snapshots.mjs — 'cdp-snapshots' 域 v1 记录 schema（**草案**，
// spec-first：生产者实现前先定形状，M0）。零 DSH 依赖（纯 zod）。
//
// 语义（见 DOMAINS.md §2）：耐久层变更前快照（tier=durable，M9）、追加式
// 记录（只增不改）、内容寻址 ref（同内容 = 同 ref，天然去重）、哈希链
// prevHash（检测重排/缺失/篡改，M7；签名因密钥管理未定，v1 不承诺）。
// provider 固定 'copy'——不写 git refs，绕开 gc 回收问题（decoupling-design
// §4 Phase A-3）。

import { z } from 'zod'

export const CDP_SNAPSHOTS_DOMAIN = 'cdp-snapshots'
export const CDP_SNAPSHOTS_TABLE = 'snapshots'
export const CDP_SNAPSHOTS_SOURCE = 'cdp'
export const CDP_SNAPSHOTS_TIER = 'durable'
export const CDP_SNAPSHOT_REF_RE = /^[0-9a-f]{64}$/u
export const CDP_SNAPSHOT_KINDS = ['manual', 'auto', 'guard', 'mutation']

export const cdpSnapshotRecordSchema = z.object({
  id: z.string().min(1), // 记录 id（uuid）
  sessionId: z.string().min(1),
  cwd: z.string().min(1),
  seq: z.number().int().nonnegative(), // 会话内序号
  time: z.number().int().nonnegative(), // epoch 毫秒
  provider: z.literal('copy'), // 只写目录快照，不写 git refs
  triggerTool: z.string().min(1),
  turn: z.number().int().positive(),
  step: z.number().int().positive(),
  files: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
  ref: z.string().regex(CDP_SNAPSHOT_REF_RE), // 内容寻址：快照内容 sha256
  kind: z.enum(CDP_SNAPSHOT_KINDS), // 词汇对齐 checkpoints v2
  source: z.literal(CDP_SNAPSHOTS_SOURCE), // M9：来源标注
  tier: z.literal(CDP_SNAPSHOTS_TIER), // M9：持久性层级（耐久层）
  prevHash: z.string().regex(/^[0-9a-f]{64}$/u).nullable(), // 哈希链；首条 null
  tree: z.string().regex(/^[0-9a-f]{64}$/u).optional(), // 快照清单树哈希
  note: z.string().optional(),
  sessionBoundary: z.number().int().nonnegative().optional(),
})
