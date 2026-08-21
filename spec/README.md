# dsh-audit-spec —— Trust Anchor 规范包（非插件）

- [`MDP.md`](MDP.md)：最小设计原则（正式规范：总纲（生态优先，标准从属）+
  M0–M10 + 合规自证清单）。
- [`CONTRACT.md`](CONTRACT.md)：基座契约（域消费 / 恢复底线 / API 表面约定）。
- [`DOMAINS.md`](DOMAINS.md)：域规范与事件词汇（checkpoints 稳定；
  cdp-snapshots / audit 草案；事件容错超集；视图模型 v1 草案）。
- `src/*.mjs`：纯 zod 校验器，从包导出（`import { checkpointRecordSchema } from 'dsh-audit-spec'`）。
  零 DSH 依赖，CI 可测。视图模型见 `src/views.mjs`（D9：UI 只消费视图模型，
  不读存储域）。

状态：0.1.0（草案期）。冻结 = 1.0.0 门槛（AGENTS.md #8）。
