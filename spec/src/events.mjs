// src/events.mjs — 关键会话事件 schema（**草案**，消费容错超集）。
// 形状对齐 harness **持久会话事件**（KNOWN_SESSION_EVENT_TYPES +
// user-approval / permission-presets / sandbox-policy / core-tools 的
// SessionEventMap 声明，D:\Projects\deepseek-harness 源码核实 2026-08-22）；
// 观察路径：session/event（查 event.type）或 sessionQuery，不是 ctx.on('tool/*')。
// 容错：未知字段剥离；严格性属于 harness 生产者（M2）。
// checkpoint/* 为基座自有扩展事件（producer 插件发出，非 harness 词汇）。

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

// harness 实际形状：data = { turn, step, message: { callId, content, isError }, error? {name,code}, meta? }。
// 容错超集：顶层 callId/isError 保留兼容早期形状；message.callId 为语义核（配对用）。
export const toolResultEventSchema = z.object({
  type: z.literal('tool/result'),
  ...eventBase,
  data: z.object({
    turn: z.number().int().positive().optional(),
    step: z.number().int().positive().optional(),
    callId: z.string().min(1).optional(), // 早期形状（已废弃）；配对以 message.callId 为准
    message: z.object({
      callId: z.string().min(1),
      isError: z.boolean().optional(),
    }).passthrough().optional(), // 成功载荷形状由工具定义，容错保留
    error: z.object({ name: z.string(), code: z.string() }).optional(),
    meta: z.unknown().optional(),
  }).passthrough(),
})

// approval/asked 与 approval/decided 成对审计记录（harness user-approval；
// log-only，模型不可见；成对且 turn 内闭合——id 配对）。此处容错超集。
function approvalEvent(type) {
  return z.object({
    type: z.literal(type),
    ...eventBase,
    data: z.record(z.string(), z.unknown()),
  })
}
export const approvalAskedEventSchema = approvalEvent('approval/asked')
export const approvalDecidedEventSchema = approvalEvent('approval/decided')

// 会话审批策略切换（harness user-approval；log-only；最后一条为当前策略）。
export const approvalPolicyEventSchema = z.object({
  type: z.literal('approval/policy'),
  ...eventBase,
  data: z.object({
    policy: z.union([z.literal('ask'), z.literal('never')]),
    source: z.literal('delegation').optional(),
  }).passthrough(),
})

// 会话沙箱模式切换（harness sandbox-policy；log-only；permission/preset 贯通写入）。
export const sandboxModeEventSchema = z.object({
  type: z.literal('sandbox/mode'),
  ...eventBase,
  data: z.object({
    mode: z.union([z.literal('read-only'), z.literal('workspace-write'), z.literal('danger-full-access')]),
    source: z.literal('delegation').optional(),
  }).passthrough(),
})

// 权限预设切换（harness permission-presets；log-only 用户意图）。
export const permissionPresetEventSchema = z.object({
  type: z.literal('permission/preset'),
  ...eventBase,
  data: z.object({
    preset: z.string().min(1),
  }).passthrough(),
})

// checkpoint/*（基座自有扩展事件：producer 插件发出，非 harness 词汇；
// 消费方容错超集——宿主收录该类型或 ignorable 信封才写）。
export const checkpointEventSchema = z.object({
  type: z.string().regex(/^checkpoint\//u),
  ...eventBase,
  data: z.record(z.string(), z.unknown()),
})
