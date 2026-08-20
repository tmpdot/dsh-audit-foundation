// src/checkpoints.mjs — 'checkpoints' 域记录的 zod schema（纯模块，仅依赖
// zod，可被单元测试直接 import——零 DSH 依赖）。
// migrated from dsh-checkpoint-diff@0.5.x (lib/domain-schema.mjs)
//
// 与 dsh-checkpoint-rewind 的 lib/domain.mjs 同构重声明（域 spec 未从 rewind
// 包导出，exports 只有 '.'）。rewind 0.4.0 用域 v1（可选 forkSeq）；0.5.0 升
// v2（kind/config 必填，tree/note/sessionBoundary 可选，移除 forkSeq）。
//
// 本基座是只读消费者：schema 采用**容错超集**——v1/v2 记录都能通过校验，
// 严格性属于生产者（rewind）（M2）。version 变更即废弃整介质（预发布立场，
// 无迁移），打开时按错误码在两版本间回退（见各消费者 index.mjs 的
// tablePromise）。

import { z } from 'zod'

/** 两版共有且必填的核心字段（v1 与 v2 记录都满足）。 */
const coreFields = {
  id: z.string().min(1),
  sessionId: z.string().min(1),
  cwd: z.string().min(1),
  seq: z.number().int().nonnegative(),
  time: z.number().int().nonnegative(),
  provider: z.enum(['git', 'copy']),
  triggerTool: z.string().min(1),
  turn: z.number().int().positive(),
  step: z.number().int().positive(),
  files: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
  ref: z.string().min(1),
}

/**
 * 消费容错 schema（v2 域用）：核心字段必填；v1 的 stepEndSeq/forkSeq 与 v2 的
 * kind/config/tree/note/sessionBoundary 全部可选——新旧记录都能读。
 * 未知的未来字段被 zod 默认剥离（消费方不依赖未声明字段）。
 */
export const checkpointRecordSchema = z.object({
  ...coreFields,
  stepEndSeq: z.number().int().nonnegative().optional(),
  forkSeq: z.number().int().nonnegative().optional(),
  kind: z.enum(['manual', 'auto', 'guard', 'mutation']).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  tree: z.string().regex(/^[0-9a-f]{40,64}$/iu).nullable().optional(),
  note: z.string().optional(),
  sessionBoundary: z.number().int().nonnegative().optional(),
})

/** v1 记录 schema（rewind 0.4.0 的逐字段一致形态）。 */
export const checkpointRecordSchemaV1 = z.object({
  ...coreFields,
  stepEndSeq: z.number().int().nonnegative().optional(),
  forkSeq: z.number().int().nonnegative().optional(),
})
