# 域规范（DOMAINS）

> 本基座声明的存储域与事件词汇。**状态语义**：
> `稳定` = 消费契约冻结（进 CONTRACT.md §1）；
> `草案` = spec-first 定形中，未实现（生产者实现前先定形状，M0）。
> 校验器全部从 `dsh-audit-spec` 导出（`src/*.mjs`，纯 zod、零 DSH 依赖）。

## 1. `checkpoints` 域 —— 稳定（消费契约）

- **状态**：稳定。生产者 = dsh-checkpoint-rewind（0.4.0 v1 / 0.5.0 v2），
  本基座是**只读消费者**（容错超集，严格性属于生产者，M2）。
- **记录 schema**：`src/checkpoints.mjs`（v1/v2 双版本容错）。
- **快照布局**（copy provider）：
  `$DSH_HOME/dsh-checkpoint-rewind/<workspaceKeyHash16>/<uuid>/` + `manifest.json`；
  workspaceKey 算法见 `dsh-audit-common` 的 `workspace.mjs`（与 rewind 同构）。
- **易失性语义（M9，事实）**：配额逐出（默认 50 快照/512 MiB）、`/rewind clear`
  可清记录、git 未引用对象约 2 周被 gc 回收——消费方必须标注 degraded。
- **对生态的提案**：rewind 导出域 spec；文档化逐出/易失性语义；可选追加式
  耐久模式（协商通道，本基座不等待——见 cdp-snapshots）。

## 2. `cdp-snapshots` 域 —— 草案 v1（生产者，规划中）

- **状态**：草案（spec-first，生产者 `dsh-checkpoint-producer` 规划中）。
- **定位**：耐久层变更前快照（M9 tier=durable），不依赖 rewind 的易失性语义；
  与 rewind 共存时**双捕获 + 内容寻址去重**（M8）。
- **记录 schema**：`src/cdp-snapshots.mjs`。要点：
  - 追加式（记录只增不改）；`prevHash` 哈希链（首条 null）检测重排/缺失/篡改（M7）；
  - `ref` = 快照内容 sha256（内容寻址：同内容 = 同 ref）；
  - `provider` 固定 `'copy'`（不写 git refs，绕开 gc 回收问题）；
  - `source: 'cdp'` + `tier: 'durable'` 必填（M9 标注）；
  - `kind` 词汇对齐 checkpoints v2（manual/auto/guard/mutation）。
- **快照布局（草案 v1，已落地）**：
  `$DSH_HOME/dsh-audit-foundation/snapshots/<workspaceKeyHash16>/<uuid>/manifest.json`
  ——布局解析纯函数在 `dsh-audit-common` workspace.mjs（`resolveCdpSnapshotRoot` /
  `cdpWorkspaceDir` / `cdpSnapshotDir`，uuid 形状校验防路径注入，M6）；manifest
  自描述 schema 在 `src/cdp-snapshots.mjs`（`formatVersion` / `ref` / `tree` /
  `files[{rel,size,hash}]` / `prevHash` / `kind`；`tree` = `contentHash(files)`，
  与 common hash.mjs 同算法）。
- **保留策略（草案）**：独立 `maxSnapshots`/`maxBytes`（宽松默认 200 / 1 GiB）
  + 手动清理；归档 vs 逐出分离（M9）。

## 3. `audit` 域 —— 草案 v1（审计记录，D5 已拍板：首期实现，基础范围）

- **状态**：草案 v1（schema + 审计策略 + 派生纯函数已落地 2026-08；
  `dsh-audit-ledger` 插件壳规划中——纯函数层零 DSH 依赖，CI 可测）。
- **定位**：把 harness 关键事件聚合为追加式审计记录：`approval/asked` +
  `approval/decided` 成对、`approval/policy`（策略切换）、`permission/preset` +
  `sandbox/mode`（权限/模式切换）、`tool/call` + `tool/result`、
  `checkpoint/*`（基座自有扩展）、恢复（rollback）应用——**消费 harness
  事件，不发明平行语义**（M4/M8）；payload 保留事件 data 快照。
  **事件源为 harness 持久会话事件**（KNOWN_SESSION_EVENT_TYPES，源码核实
  2026-08-22）：观察路径是 `session/event`（查 `event.type`）或
  `sessionQuery`，**不是** `ctx.on('tool/*')`（那是实时 Cordis 事件，二者
  不同面——如 `approval/request` 是实时 waterfall 分派，`approval/asked`+
  `decided` 是它落盘的持久审计对，成对且 turn 内闭合，按 `id` 配对）。
- **审计策略（F19）**：`auditPolicySchema`（`src/audit.mjs`）——`enabled`
  总开关 / `categories` 过滤（缺省全录）/ `retention` 配额（缺省不限；
  逐出语义对齐 `dsh-audit-common` 的 `computeRetention`，数量/字节独立生效、
  逐出最旧）。
- **事件 → 记录派生**：`dsh-audit-ledger` 的 `src/derive.mjs`（纯函数，零 DSH
  依赖）——harness 事件归类（tool/call+result → tool、approval 成对 +
  approval/policy → approval、permission/preset + sandbox/mode → permission、
  checkpoint/* → snapshot），未知事件跳过；只产语义核，`id/seq/time/prevHash`
  由写路径落盘补齐（M7）。
  **rollback / guard 类别为预留位**（生态事件，基础范围不发明平行语义；
  guard 命名对齐 harness `packages/guard` 包族——loop-hygiene guard，
  核心服务/扩展点的自包含消费者，非可替换能力）。
  T4-3 数字映射地基：注册表经 options 注入（缺省 `dsh-audit-common` 默认
  实例），仅 **frozen**（官方背书）事件附加 `eventTypeId`，原文永远保留。
- **记录 schema**：`src/audit.mjs`。要点：
  - `category`：approval | permission | tool | snapshot | rollback | guard；
  - `eventType`：harness 事件类型原文（**存储层永久主键**，任何情况下不重写）；
  - `eventTypeId?`：数字码（T4-3 演进**加法字段**，向后兼容）——仅当事件类型
    在 `dsh-audit-common` 的 `event-registry.mjs` 中已注册且 **frozen**（官方
    背书）时由派生钩子附加；旧记录永不补写、不迁移（追加式账本 + 哈希链，
    迁移是**读路径**的事）。未注册/未冻结事件 → 原文透传、无码（"一切皆
    插件"，M8）；
  - `payload`：事件 data 的 JSON 快照（可序列化）；
  - `prevHash` 哈希链（M7）；
  - 身份字段（turn/step/sessionId）对齐 harness 事件形状。
- **对生态的提案**：判定类数据（allow/deny/waived）的接口形状——监督插件
  （如 dsh-supervisor）有稳定接口则消费，否则文档化约定 + 预留（M3）。
- **对生态的提案（数字映射，待官方）**：harness 官方为公开事件词汇背书稳定
  数字码（如 `tool/call → 1`），基座即可消费并逐步在派生层附加 `eventTypeId`
  ——**建议底稿即 `dsh-audit-common` 的 `PROVISIONAL_SEEDS`**（当前基座消费的
  事件清单）；落地方式：官方发布映射 → 基座以 `defineEventTypes` 注册 frozen
  条目 → 派生钩子自动产出数字码，存储与旧记录零改动（详见
  docs/technical-selections.md T4-3）。

## 4. 事件词汇（消费容错超集，草案）

`src/events.mjs`：`tool/call`、`tool/result`、`approval/asked`、
`approval/decided`、`approval/policy`、`permission/preset`、`sandbox/mode`、
`checkpoint/*` 的 zod 校验。harness 词汇均经源码核实（2026-08-22，
KNOWN_SESSION_EVENT_TYPES + user-approval / permission-presets /
sandbox-policy / core-tools 的 SessionEventMap 声明）：`tool/result` 的
`callId` 在 `data.message.callId`（顶层为早期形状，容错兼容）；`approval/*`
成对（asked+decided，`id` 配对）且 turn 内闭合，`approval/policy` 最后一条
为当前策略；`permission/preset` 贯通写入 `sandbox/mode`（模式切换）。
`checkpoint/*` 为**基座自有扩展事件**（producer 插件发出，非 harness 词汇）。
形状对齐 harness 会话事件（`session.jsonl.zstd` / `sessionQuery.readSession`）；
容错超集——未知字段剥离，精确严格性属于 harness 生产者。

## 5. 视图模型（view schemas）—— 草案 v1（D9：UI 与数据分离）

- **状态**：草案 v2（schema 已落地 `src/views.mjs`，2026-08；2026-08-21
  T4-4 拍板：排除 dsh-checkpoint-diff 词汇，字段按直观性 + UI 渲染性能
  重设计；UI 组件 `dsh-audit-ui` 规划中）。
- **定位**：呈现层数据契约：`timeline-view`（时间线节点/徽标）、`diff-view`
  （逐文件行级 diff）、`audit-view`（审计记录视图）、`evidence-view`（导出预览）。
  **UI 组件只消费视图模型**（不直接读存储域）；其他插件按同一视图模型喂数据
  即可复用同一套 UI（D9）。
- **数据流单向**：存储域 → 查询/聚合（纯函数）→ 视图模型（JSON）→ GET 端点 /
  slot props → UI 组件。
- **词汇对齐（M0/M8）**：来源/层级/类型/动作枚举沿用域草案（cdp-snapshots /
  checkpoints v2 / audit / events）；audit 视图直接复用 audit 域词汇导出，
  不重声明。
- **对标立场（见 docs/technical-selections.md T4-4，2026-08-21 已拍板）**：
  **排除 dsh-checkpoint-diff 面板词汇**（degraded / branchId / A-M-D /
  markers——单一实现者的历史词汇，非生态标准，不得成为规范基线）；字段按
  **直观性 + UI 渲染性能**独立设计（平铺自包含记录、预计算统计、截断/总数
  前置、稳定字符串 id、epoch 毫秒数值、预派生 title/summary）；行业无统一
  视图契约（Kibana / Sentry / Grafana 均产品内契约；OCSF / ECS 为存储/
  传输层 schema）——不采用行业产品 JSON。
- **校验器**：`src/views.mjs` 从 `dsh-audit-spec` 导出（M0）。
