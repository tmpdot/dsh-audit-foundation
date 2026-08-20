# Changelog — dsh-audit-spec

本包变更记录（[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)）。
版本语义：0.x 慢节奏；1.0.0 = MDP + 域 spec + CONTRACT 完备且冻结（AGENTS.md #8）。

## [0.1.0] - 2026-08

### Added

- MDP 正式规范（M0–M9 + 合规自证清单）。
- CONTRACT：域消费契约（checkpoints v1/v2 容错超集）、恢复安全契约（六不变量）、
  API 表面约定（GET 门禁 + POST 白名单 + 64 KiB 上限）。
- DOMAINS：checkpoints（稳定）/ cdp-snapshots v1（草案）/ audit v1（草案）
  / 事件词汇（草案）。
- `checkpoints.mjs`：checkpoints 域记录 zod 校验器（迁移自 dsh-checkpoint-diff
  0.5.x 的 lib/domain-schema.mjs）。
- `cdp-snapshots.mjs`（草案）：耐久快照记录（内容寻址 ref / prevHash 哈希链 /
  source+tier 必填）。
- `audit.mjs`（草案）：审计聚合记录（category / eventType / payload / prevHash）。
- `events.mjs`（草案）：tool/call、tool/result、approval/asked+decided、
  permission/preset、checkpoint/* 容错超集。
- 测试：14 项（checkpoints 6 + 草案域 8）。
