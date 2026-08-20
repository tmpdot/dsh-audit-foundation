# Changelog — dsh-audit-ledger

本包变更记录（[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)）。
版本语义：0.x 慢节奏；插件壳落地后随 harness 验证节奏发布。

## [Unreleased]

### Added

- 骨架：包结构 + 写路径声明（README，M6）。
- `src/derive.mjs`（纯函数，零 DSH 依赖）：harness 会话事件 → audit 记录
  草案派生（tool 成对 / approval 成对 / permission / snapshot；未知事件跳过；
  rollback / guard 为预留位）。
- 测试：5 项（derive.test.mjs）。
