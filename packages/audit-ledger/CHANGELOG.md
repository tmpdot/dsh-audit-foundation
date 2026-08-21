# Changelog — dsh-audit-ledger

本包变更记录（[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)）。
版本语义：0.x 慢节奏；插件壳落地后随 harness 验证节奏发布。

## [Unreleased]

### Added

- 骨架：包结构 + 写路径声明（README，M6）。
- `src/derive.mjs`（纯函数，零 DSH 依赖）：harness 会话事件 → audit 记录
  草案派生（tool 成对 / approval 成对 / permission / snapshot；未知事件跳过；
  rollback / guard 为预留位）。
- **T4-3 数字映射地基（2026-08-21）**：`deriveAuditDrafts` 增加 `registry`
  注入选项（缺省 `dsh-audit-common` 默认事件注册表），仅 **frozen**（官方
  背书）事件附加 `eventTypeId`，`eventType` 原文永远保留——官方映射落地 =
  注册 frozen 条目即自动产出，存储与消费方零改动。新增 `dsh-audit-common`
  workspace 依赖。
- 测试：7 项（derive.test.mjs，含 T4-3 门禁两例：frozen 附加码 / 未冻结与
  未知事件无码透传）。
