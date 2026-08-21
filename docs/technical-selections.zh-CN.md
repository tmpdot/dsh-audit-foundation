# 技术选型登记表（Technical Selections Register）

> **English**: [technical-selections.md](technical-selections.md) · 本文为中文翻译版，
> 正本为英文。

> **用途**：本仓库所有关键技术选型的一站式登记与决策状态——用户要求"文档里能看见
> 关键技术选型"，这张表就是落点。**任何新选型必须先登记、后执行（或执行即登记）**。
> 工作流经用户 2026-08-20 批准（完整版），决策记录见
> `docs/bundle-foundation-design.md`（§10）。
> 理念校准（2026-08）：**生态优先，行业标准第二**——新增规则 5（生态冲突例外）；
> 原批准工作流不变。

---

## 1. 工作流（已拍板，用户 2026-08-20 批准）

**判定分层：**

| 层级 | 定义 | 处置 | 记录要求 |
|---|---|---|---|
| **T1** | 正式标准（RFC / ISO / OASIS / W3C / FIPS 等） | **直接执行**，不询问用户（生态冲突例外，见规则 5） | 标准名 + 版本 + 链接 |
| **T2** | 事实标准（无正式号但行业普遍采用：JSON Lines、git 对象模型、unified diff 等） | **直接执行**，不询问用户（生态冲突例外，见规则 5） | 名称 + 参考链接 |
| **T3** | 行业惯例（无标准无名称但主流一致：追加式日志、哈希链、内容寻址、UTC epoch-ms 等） | 直接执行（生态冲突例外，见规则 5） | 惯例描述 + 代表案例 |
| **T4** | 无标准无惯例（字段命名、schema 形状、视图模型形状、配额语义等） | ① 收集 DSH 生态相似插件方案 ② 收集行业相近方案 → 记录对标立场 → **先按最佳判断执行** → 进"待决策"清单 | 对标结论 + 立场（对齐/部分对齐/不采用）+ 理由 + 链接 |

**规则：**

1. **核实**：判定 T1/T2 必须用 web_search 核实标准原文与当前版本，链接进登记表；
   不凭记忆写标准。
2. **冲突**：多标准竞争（如字段命名 ECS vs OCSF）→ 选**对生态最有利者**（通常即
   行业主导者），其余映射为可选字段，记录取舍理由；取舍同样受规则 5（生态优先）约束。
3. **闸门**：T4 中影响**对外契约形状**（域 schema / 视图模型 / 端点）的选型，
   **必须在契约冻结（1.0.0 门槛）前拍板**；内部实现细节执行后决策即可，不设闸门。
4. **提醒**：每个涉及选型的回合结束，回复末尾列"待你决策"项；提交前检查登记表，
   有新增 T4 在提交说明里点名。待决策清单的权威来源是登记表 §2——保持同步在那里
   （HANDOFF.md 若本地使用，仅作个人工作笔记，已被 git 忽略）。
5. **生态优先（校准 2026-08）**：**标准是手段，生态是目的**。T1–T3 的"直接执行"
   仅在采纳标准**不损害生态对齐**时适用；若损害——接口可对齐性（M0/M3）、
   harness 事件词汇不被扭曲（M8）、消费者的组合性——则**偏离标准并记录理由**，
   "部分对齐"为默认立场（对齐程度 + 偏离点 + 保护了什么，进登记表立场列）。
   任何未全量对齐的行必须写清"偏离了什么、保护了生态的哪一点"，不留隐性偏离。
   **生态对齐是动态反馈过程，不是静态断言**——机制见
   `docs/ecosystem-observation.md`（观察→修订→发布→验证；观察日志即输入通道）。
   在记录义务之上还有两条硬性要求：
   - **可证伪断言**：每个未全量对齐的行，除理由外必须携带可证伪断言 + 验证方法
     （如"新插件可以不读源码接入：验证 = 仅凭 README + 导出 schema 完成演练"）。
     无法可证伪陈述的偏离不是决策，而是借口。
   - **双层验证**：真实插件接入是**兼容性下界**（必要条件，防止闭门造车），但
     权重永远不是 100%——社区插件的形状是"恰好存在的方案"，未必是最好的方案。
     设计权威在规范作者，对照 MDP + 行业对标判断（**质量上界**）。社区形状进
     候选池（§4），绝不自动晋升。核心立场：**观察一切，默认不采纳**。

---

## 2. 待你决策清单（T4，★ = 契约冻结前必须拍板）

| # | 主题 | 当前状态 | 对标立场 | 闸门 |
|---|---|---|---|---|
| T4-1 | 快照载体 | ✅ **2026-08-21 已拍板（用户同意）**——按草案采纳 copy 目录 + manifest + 内容寻址 ref（sha256）；布局 helper + manifest schema 已落地（2026-08） | **已收集**。生态：rewind copy provider（快照目录 + manifest.json，本仓同构布局）。行业：git 对象模型（[内容寻址 loose objects](https://git-scm.com/book/zh/v2/Git-内部原理-Git-对象)，未引用对象被 gc 回收——rewind 踩过的坑）、restic（[CDC 内容定义分块 + 快照去重](https://restic.net/blog/2015-09-12/restic-foundation1-cdc/)）、casync（[内容寻址分块归档](https://github.com/systemd/casync)）。**立场：部分对齐**——采纳"目录快照 + manifest 自描述 + 内容寻址 ref（sha256）"（与 git/restic/casync 同源理念）；不采用 git loose-object 存储（gc 回收风险）与块级 CDC（基础范围不承诺，留给生态） | ★ ✅ 已拍板 |
| T4-2 | schema 校验器 | zod ^4.4.3（spec 唯一依赖，骨架期已用） | 待补收集：JSON Schema + ajv（行业事实标准）、io-ts、valibot | — |
| T4-3 | 审计记录字段命名 | ✅ **2026-08-21 已拍板**——当前保留 `eventType` 原文（harness 事件名逐字存储）；**发展方向：公开的插件操作 → 数字映射**（靠社区凝聚力——规范价值提升让所有人受益——或官方背书即可行），写入审计域作为演进路径；audit 域草案 v1 + 审计策略（F19）+ ledger 派生纯函数已落地（2026-08）。**迁移地基已落地（2026-08-21）**（迁移成本随历史数据积累与代码固化上升；追加式账本 + 哈希链禁止重写历史，迁移必须是**读路径**的事、绝不是数据重写）：`dsh-audit-common` 新增 `event-registry.mjs`——注册表工厂 + 预置种子（当前消费的 harness 事件，私有保留区间 ≥ `0xE000`，永不落盘）+ `isFrozenEventType` 门禁（仅 frozen/官方条目可写）+ 幂等 `defineEventTypes`（官方映射落地 = 换数据 + 翻标志，消费方零改动）；`spec/src/{audit,views}.mjs` 增加可选 `eventTypeId`（加法字段、向后兼容；`eventType` 原文是存储层永久主键）；`dsh-audit-ledger` 派生钩子仅对 frozen 事件附加 `eventTypeId` | **已收集**。行业：OCSF（[category/class/type_id 分类结构](https://fleak.ai/blog/ocsf-anatomy)，OASIS 活跃演进 1.4+）、ECS（[event.category/action/outcome 分类字段](https://www.elastic.co/guide/en/ecs/8.8/ecs-using-the-categorization-fields.html)）、CEF（管道分隔 SIEM 传统格式，[规范](https://www.microfocus.com/documentation/arcsight/arcsight-smartconnectors-8.3/pdf-docbook/CEF-Specification.pdf)）、syslog（RFC 5424 文本协议）。**立场：部分对齐**——采用"category（宽）+ eventType（harness 事件原文）"两层分类（与 OCSF category/class、ECS category/action 同构）；不采用 CEF/syslog 文本协议（存储域不同）。eventType 保留 harness 原文、暂不另造编号——**这是"一切皆插件"的代价**（任何插件的自身操作必须能原样存储）；数字映射是生态凝聚后的未来方向 | ★ ✅ 已拍板 |
| T4-4 | 视图模型形状 | ✅ **2026-08-21 已拍板**——**排除 dsh-checkpoint-diff 词汇**（单一实现者的历史词汇，非生态标准）；字段按**直观性 + UI 渲染性能**重设计（平铺自包含记录、预计算统计、truncated/total 前置、稳定字符串 id、epoch 毫秒数值、预派生 title/summary）；草案 v2 已落地 `spec/src/views.mjs`（2026-08，含测试） | **已收集**。生态：dsh-checkpoint-diff 时间线面板词汇（records[].id/degraded/branchId、files[].path+status A/M/D、truncated/totalFiles、markers）——**不采纳**（用户 2026-08-21 裁决：排除其影响；单一实现者的面板词汇不得成为规范基线）。行业：无统一视图契约（Kibana / Sentry / Grafana 均产品内契约；OCSF / [ECS 分类字段](https://www.elastic.co/guide/en/ecs/8.8/ecs-using-the-categorization-fields.html) 为存储/传输层 schema）；unified diff 为文本层 T2 事实格式（[diff 包解析 git 方言](https://cdn.jsdelivr.net/npm/diff@9.0.0/README.md)），结构化 diff JSON 无标准（[jsondiffpatch deltas](https://raw.githubusercontent.com/benjamine/jsondiffpatch/master/docs/deltas.md) 为社区格式）。**立场：不采用**行业产品 JSON；字段沿用本仓库域词汇（camelCase、直观全词：path / status added-modified-deleted / type context-deleted-added），hunk 语义对齐 unified diff；渲染性能设计规则记录于 `spec/src/views.mjs` 头注释 | ★ ✅ 已拍板 |

---

## 3. 选型登记表

| # | 主题 | 选型 | 层级 | 依据 / 链接 | 状态 | 日期 |
|---|---|---|---|---|---|---|
| S1 | 时间戳 | 内部统一 UTC epoch 毫秒；人类可读展示用 RFC 3339 / ISO 8601 | T3（展示层 T1） | 设计文档 §4"时间/时钟"；[RFC 3339](https://www.rfc-editor.org/rfc/rfc3339) | 已执行（spec 草案语义） | 2026-08 |
| S2 | 内容寻址哈希 | SHA-256 | T1 | [FIPS 180-4](https://csrc.nist.gov/pubs/fips/180-4/final)；cdp-snapshots `ref` 字段、common/hash.mjs | 已执行 | 2026-08 |
| S3 | 哈希链 | `prevHash` 逐条链式（首条 null；检测重排/缺失/篡改） | T3 | 设计文档 M7；cdp-snapshots / audit 域草案 | 已执行（草案） | 2026-08 |
| S4 | 记录流格式 | JSON Lines（对齐 harness `session.jsonl`） | T2 | [jsonlines.org](https://jsonlines.org/) | 已执行 | 2026-08 |
| S5 | 压缩 | zstd（harness 已用 `session.jsonl.zstd`；基座仅只读消费） | T1 | [RFC 8878](https://www.rfc-editor.org/rfc/rfc8878) | 已执行（对齐 harness） | 2026-08 |
| S6 | diff 算法 | 行级 LCS（common/diff-engine，迁移自 dsh-checkpoint-diff） | T3 | 展示格式 unified diff 为 T2 惯例（[GNU diffutils 文档](https://www.gnu.org/software/diffutils/manual/)） | 已执行 | 2026-08 |
| S7 | 快照载体 | copy 目录 + manifest（不写 git refs） | T4 | 见 T4-1 | **2026-08-21 已拍板（用户同意）** | 2026-08 |
| S8 | schema 校验器 | zod v4 | T4 | 见 T4-2 | **待决策** | 2026-08 |
| S9 | 审计记录字段命名 | audit 域草案 v1（category/eventType/eventTypeId?/payload/prevHash/身份字段） | T4 | 见 T4-3 | **2026-08-21 已拍板（保留 eventType 原文；数字映射为未来方向）；迁移地基已落地（event-registry.mjs + 可选 eventTypeId + frozen 门禁）** | 2026-08 |
| S10 | 视图模型 | D9 方向已定（spec 导出视图 schema，`dsh-audit-ui` 只消费视图模型） | T4 | 见 T4-4 | **2026-08-21 已拍板（排除 dsh-checkpoint-diff 词汇；直观 + 渲染性能字段）** | 2026-08 |
| S11 | 快照布局 | `$DSH_HOME/dsh-audit-foundation/snapshots/<workspaceKeyHash16>/<uuid>/` | T3 | 与 rewind copy 布局同构（common/workspace.mjs 同算法） | 已执行（草案） | 2026-08 |
| S12 | 导出格式 | 首期 JSON + MD；SARIF 留给生态（D7） | T1（JSON/MD） | [SARIF 2.1.0 OASIS 标准](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)（生态可选位，不采用为基座首期范围） | 已决策 | 2026-08 |

---

## 4. 对标参考池（评估中，非选型）

> 行业方案备选池：执行 T4 收集时从这里取料核实，也欢迎补充。

| 候选 | 类型 | 链接 / 备注 |
|---|---|---|
| OCSF（Open Cybersecurity Schema Framework） | 正式标准（OASIS，活跃演进 1.4+） | [schema.ocsf.io](https://schema.ocsf.io/)；[1.4.0 变更说明](https://www.query.ai/resources/blogs/whats-new-ocsf-1_4_0/) |
| SARIF | 正式标准（OASIS 2.1.0，2020） | [规范原文](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html) |
| ECS（Elastic Common Schema） | 事实标准 | [www.elastic.co/guide/en/ecs](https://www.elastic.co/guide/en/ecs/current/index.html) |
| CEF（ArcSight Common Event Format） | 事实标准（SIEM 传统格式） | [ArcSight 文档](https://www.microfocus.com/documentation/arcsight/arcsight-smartconnectors-8.3/pdf-docbook/CEF-Specification.pdf) |
| syslog | 正式标准 | RFC 5424 |
| JSON Lines / NDJSON | 事实标准 | [jsonlines.org](https://jsonlines.org/) |
| git 对象模型 | 事实标准（内容寻址） | git-scm 文档 |
| restic / casync / Nix store | 行业方案（快照/内容寻址存储） | 收集 T4-1 时核实 |
