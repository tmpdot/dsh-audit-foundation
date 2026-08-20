# 技术选型登记表（Technical Selections Register）

> **用途**：本仓库所有关键技术选型的一站式登记与决策状态——用户要求"文档里能看见
> 关键技术选型"，这张表就是落点。**任何新选型必须先登记、后执行（或执行即登记）**。
> 工作流经用户 2026-08-20 批准（完整版），决策记录见
> `docs/bundle-foundation-design.md`（§10）。

---

## 1. 工作流（已拍板，用户 2026-08-20 批准）

**判定分层：**

| 层级 | 定义 | 处置 | 记录要求 |
|---|---|---|---|
| **T1** | 正式标准（RFC / ISO / OASIS / W3C / FIPS 等） | **直接执行**，不询问用户 | 标准名 + 版本 + 链接 |
| **T2** | 事实标准（无正式号但行业普遍采用：JSON Lines、git 对象模型、unified diff 等） | **直接执行**，不询问用户 | 名称 + 参考链接 |
| **T3** | 行业惯例（无标准无名称但主流一致：追加式日志、哈希链、内容寻址、UTC epoch-ms 等） | 直接执行 | 惯例描述 + 代表案例 |
| **T4** | 无标准无惯例（字段命名、schema 形状、视图模型形状、配额语义等） | ① 收集 DSH 生态相似插件方案 ② 收集行业相近方案 → 记录对标立场 → **先按最佳判断执行** → 进"待决策"清单 | 对标结论 + 立场（对齐/部分对齐/不采用）+ 理由 + 链接 |

**规则：**

1. **核实**：判定 T1/T2 必须用 web_search 核实标准原文与当前版本，链接进登记表；
   不凭记忆写标准。
2. **冲突**：多标准竞争（如字段命名 ECS vs OCSF）→ 采纳行业主导者为主，其余映射为
   可选字段，记录取舍理由。
3. **闸门**：T4 中影响**对外契约形状**（域 schema / 视图模型 / 端点）的选型，
   **必须在契约冻结（1.0.0 门槛）前拍板**；内部实现细节执行后决策即可，不设闸门。
4. **提醒**：每个涉及选型的回合结束，回复末尾列"待你决策"项；提交前检查登记表，
   有新增 T4 在提交说明里点名；HANDOFF.md 同步待决策清单。

---

## 2. 待你决策清单（T4，★ = 契约冻结前必须拍板）

| # | 主题 | 当前状态 | 对标立场 | 闸门 |
|---|---|---|---|---|
| T4-1 | 快照载体 | 草案已选 copy 目录 + manifest（理由：绕开 git gc 回收，rewind 教训；双捕获去重 M8）；布局 helper + manifest schema 已落地（2026-08），**待你拍板** | **已收集**。生态：rewind copy provider（快照目录 + manifest.json，本仓同构布局）。行业：git 对象模型（[内容寻址 loose objects](https://git-scm.com/book/zh/v2/Git-内部原理-Git-对象)，未引用对象被 gc 回收——rewind 踩过的坑）、restic（[CDC 内容定义分块 + 快照去重](https://restic.net/blog/2015-09-12/restic-foundation1-cdc/)）、casync（[内容寻址分块归档](https://github.com/systemd/casync)）。**立场：部分对齐**——采纳"目录快照 + manifest 自描述 + 内容寻址 ref（sha256）"（与 git/restic/casync 同源理念）；不采用 git loose-object 存储（gc 回收风险）与块级 CDC（基础范围不承诺，留给生态） | ★ |
| T4-2 | schema 校验器 | zod ^4.4.3（spec 唯一依赖，骨架期已用） | 待补收集：JSON Schema + ajv（行业事实标准）、io-ts、valibot | — |
| T4-3 | 审计记录字段命名 | audit 域草案 v1 + 审计策略（F19）+ ledger 派生纯函数已落地（2026-08）；**待你拍板** | **已收集**。行业：OCSF（[category/class/type_id 分类结构](https://fleak.ai/blog/ocsf-anatomy)，OASIS 活跃演进 1.4+）、ECS（[event.category/action/outcome 分类字段](https://www.elastic.co/guide/en/ecs/8.8/ecs-using-the-categorization-fields.html)）、CEF（管道分隔 SIEM 传统格式，[规范](https://www.microfocus.com/documentation/arcsight/arcsight-smartconnectors-8.3/pdf-docbook/CEF-Specification.pdf)）、syslog（RFC 5424 文本协议）。**立场：部分对齐**——采用"category（宽）+ eventType（harness 事件原文）"两层分类（与 OCSF category/class、ECS category/action 同构）；不采用 CEF/syslog 文本协议（存储域不同）；eventType 保留 harness 原文、不另造编号（M8） | ★ |
| T4-4 | 视图模型形状 | 草案 v1 已落地 `spec/src/views.mjs`（2026-08，含测试）；字段形状待你拍板 | **已收集**。生态：dsh-checkpoint-diff 时间线面板词汇（records[].id/degraded/branchId、files[].path+status A/M/D、truncated/totalFiles、markers）——草案为其超集。行业：无统一视图契约（Kibana / Sentry / Grafana 均产品内契约；OCSF / [ECS 分类字段](https://www.elastic.co/guide/en/ecs/8.8/ecs-using-the-categorization-fields.html) 为存储/传输层 schema）；unified diff 为文本层 T2 事实格式（[diff 包解析 git 方言](https://cdn.jsdelivr.net/npm/diff@9.0.0/README.md)），结构化 diff JSON 无标准（[jsondiffpatch deltas](https://raw.githubusercontent.com/benjamine/jsondiffpatch/master/docs/deltas.md) 为社区格式）。**立场：不采用**行业产品 JSON；字段沿用本仓库域词汇（camelCase），hunk 语义对齐 unified diff | ★ |

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
| S7 | 快照载体 | copy 目录 + manifest（不写 git refs） | T4 | 见 T4-1 | **草案已落地（布局 helper + manifest schema v1），待拍板** | 2026-08 |
| S8 | schema 校验器 | zod v4 | T4 | 见 T4-2 | **待决策** | 2026-08 |
| S9 | 审计记录字段命名 | audit 域草案 v1（category/eventType/payload/prevHash/身份字段） | T4 | 见 T4-3 | **草案 v1 已细化（policy schema + ledger 骨架），待拍板** | 2026-08 |
| S10 | 视图模型 | D9 方向已定（spec 导出视图 schema，`dsh-audit-ui` 只消费视图模型） | T4 | 见 T4-4 | **草案已落地（views.mjs v1），待拍板** | 2026-08 |
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
