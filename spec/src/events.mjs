// src/events.mjs — 关键会话事件 schema（**草案**，消费容错超集）。
// 形状对齐 harness 会话事件（session.jsonl.zstd / sessionQuery.readSession）；
// 容错：未知字段剥离；严格性属于 harness 生产者（M2）。
// 精确形状参考：harness docs/subsystems/{approval,permission-presets,tools}.md。

import { z } from 'zod'

const eventBase = {
  seq: z.number().int().nonnegative(),
  time: z.number().int().nonnegative(),
}

export const toolCallEventSchema = z.object({
  type: z.literal('tool/call'),
  ...eventBase,
  data: z.object({
    turn: z.number().int().positive(),
    step: z.number().int().positive(),
    callId: z.string().min(1),
    name: z.string().min(1),
    arguments: z.string(), // 模型产出的原始 JSON 字符串
  }),
})

export const toolResultEventSchema = z.object({
  type: z.literal('tool/result'),
  ...eventBase,
  data: z.object({
    callId: z.string().min(1),
    isError: z.boolean().optional(),
    error: z.string().optional(),
  }).passthrough(), // 成功载荷形状由工具定义，容错保留
})

// approval/asked 与 approval/decided 成对审计记录（harness user-approval；
// log-only，模型不可见）。此处容错超集——data 全保留。
function approvalEvent(type) {
  return z.object({
    type: z.literal(type),
    ...eventBase,
    data: z.record(z.string(), z.unknown()),
  })
}
export const approvalAskedEventSchema = approvalEvent('approval/asked')
export const approvalDecidedEventSchema = approvalEvent('approval/decided')

// 权限预设切换（harness permission-presets；log-only 用户意图）。
export const permissionPresetEventSchema = z.object({
  type: z.literal('permission/preset'),
  ...eventBase,
  data: z.object({
    preset: z.string().min(1),
  }).passthrough(),
})

// checkpoint/*（rewind 的自适应门事件：宿主收录该类型或 ignorable 信封才写）。
export const checkpointEventSchema = z.object({
  type: z.string().regex(/^checkpoint\//u),
  ...eventBase,
  data: z.record(z.string(), z.unknown()),
})
