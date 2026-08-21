# Changelog — dsh-audit-spec

本包变更记录（[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)）。
版本语义：0.x 慢节奏；1.0.0 = MDP + 域 spec + CONTRACT 完备且冻结（AGENTS.md #8）。

## [Unreleased]

### Added

- `views.mjs`（草案 v1，D9）：视图模型 schema——timeline-node（三源合并 +
  degraded/notes 降级标注 + badges 判定徽标预留）、diff-view（A/M/D +
  hunks + truncated）、audit-view（复用 audit 域词汇，M0）、evidence-view
  （JSON/MD，D7 范围）。对标立场见 docs/technical-selections.md T4-4。
- `cdp-snapshots.mjs`：新增 manifest.json 自描述 schema（CDP_MANIFEST_VERSION /
  ref / tree / files[{rel,size,hash}] / prevHash / kind；tree = contentHash(files)）。
- `audit.mjs`：新增审计策略 schema `auditPolicySchema`（F19——enabled /
  categories 过滤 / retention 配额，逐出语义对齐 common retention.mjs）。
- 测试：视图模型 7 项（views.test.mjs）+ manifest 2 项 + 审计策略 3 项
  （domains.test.mjs）。

### Changed

- MDP 新增"总纲：生态优先，行业标准第二"（标准是手段、生态是目的；采纳标准损害
  生态对齐时偏离并记录理由，"部分对齐"为默认立场；锚点 technical-selections
  规则 5）。README / 设计文档同步定位表述。

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
