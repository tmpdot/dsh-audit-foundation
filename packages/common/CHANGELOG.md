# Changelog — dsh-audit-common

本包变更记录（[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)）。

## [0.1.0] - 2026-08

### Added

- `workspace.mjs`：工作区键 / 快照根解析 / 快照目录名（迁移自
  dsh-checkpoint-diff 0.5.x lib/workspace.mjs）。
- `labels.mjs`：意图标签（迁移自 lib/labels.mjs）。
- `diff-engine.mjs`：行级 LCS diff 引擎（迁移自 lib/diff/engine.mjs）。
- `pathguard.mjs`：写路径安全纯函数（提取自 lib/rollback.mjs 路径校验部分）。
- `hash.mjs`（新增）：内容寻址（contentHash）/ 记录哈希链（recordHash /
  stableStringify）。
- `constants.mjs`：词汇表（迁移自 lib/constants.mjs）。
- 测试：36 项（迁移 4 组 + 新增 pathguard/hash）。
