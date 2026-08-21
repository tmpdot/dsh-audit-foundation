# Changelog — dsh-audit-spec

本包变更记录（[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)）。
版本语义：0.x 慢节奏；1.0.0 = MDP + 域 spec + CONTRACT 完备且冻结（AGENTS.md #8）。

## [Unreleased]

### Added

- **T4-3 迁移地基（2026-08-21）**：`audit.mjs` 记录 schema 与 `views.mjs`
  audit-view 记录 schema 增加可选 `eventTypeId`（正整数，**加法字段**、向后
  兼容）——`eventType` 原文是存储层永久主键，任何情况下不重写；`eventTypeId`
  仅当事件类型在 `dsh-audit-common` 的 `event-registry.mjs` 中已注册且 frozen
  （官方背书）时由派生钩子附加。迁移 = 读路径的事（换注册数据 + 翻标志），
  旧记录永不补写；未注册/未冻结事件原文透传无码（M8"一切皆插件"）。详见
  docs/technical-selections.md T4-3。
- `views.mjs`（草案 v2，D9；2026-08-21 T4-4 拍板）：视图模型 schema——timeline-node
  （三源合并 + degraded/notes 降级标注 + badges 判定徽标预留）、diff-view
  （path + status added/modified/deleted + hunks + truncated）、audit-view
  （复用 audit 域词汇，M0）、evidence-view（JSON/MD，D7 范围）。**排除
  dsh-checkpoint-diff 面板词汇**（branchId / A-M-D 等），字段按直观性 +
  UI 渲染性能重设计（平铺自包含、预计算统计、截断/总数前置、稳定 id、
  epoch 毫秒、预派生 title/summary）。对标立场见 docs/technical-selections.md T4-4。
- **T4 拍板记录（2026-08-21）**：T4-1 快照载体（copy + manifest + sha256）用户同意；
  T4-3 审计字段命名当前保留 eventType 原文（"一切皆插件"的代价），发展方向为
  公开的插件操作 → 数字映射（社区凝聚力 / 官方背书）；T4-4 视图模型形状如上。
  详见 docs/technical-selections.md §2（当前待决策仅剩 T4-2）。
- `cdp-snapshots.mjs`：新增 manifest.json 自描述 schema（CDP_MANIFEST_VERSION /
  ref / tree / files[{rel,size,hash}] / prevHash / kind；tree = contentHash(files)）。
- `audit.mjs`：新增审计策略 schema `auditPolicySchema`（F19——enabled /
  categories 过滤 / retention 配额，逐出语义对齐 common retention.mjs）。
- 测试：视图模型 7 项（views.test.mjs）+ manifest 2 项 + 审计策略 3 项
  （domains.test.mjs）。

### Changed

- **MDP 总纲验收标准扩展**（2026-08-21）：每轮涉及生态面对决策必须回答"观察到了
  什么、修订了什么、保护了什么"；生态对齐验证双层（兼容性下界 = 真实插件可接入，
  质量上界 = 规范作者对 MDP + 行业对标判断）；核心立场"观察一切、默认不采纳"。
  新增违例：跟随最流行插件形状而不做判断（先发决定规范）。运行机制文档：
  `docs/ecosystem-observation.md`（反馈环 + 观察日志，2026-08-21 合入）。
- technical-selections 规则 5 同步扩展（2026-08-21）：偏离行须带可证伪断言 +
  验证方法；社区形状进候选池（§4），绝不自动晋升。
- AGENTS.md 开发循环增加生态观察条款（2026-08-21）：每轮迭代先看观察日志、
  登记新观察、偏离可证伪。
- MDP 新增"总纲：生态优先，行业标准第二"（标准是手段、生态是目的；采纳标准损害
  生态对齐时偏离并记录理由，"部分对齐"为默认立场；锚点 technical-selections
  规则 5）。README / 设计文档同步定位表述。
- **文档语言翻转（英文正本）**：README / MDP / 设计文档 / 技术选型表改英文正本，
  中文版移至 `*.zh-CN.md`（标注"正本为英文"）；M10 双语原则更新为"英文默认 +
  中文翻译"。CONTRACT / DOMAINS / AGENTS / 各包 README 双语化待续。

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
