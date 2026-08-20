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
- **快照布局（草案）**：
  `$DSH_HOME/dsh-audit-foundation/snapshots/<workspaceKeyHash16>/<uuid>/`
  （copy 语义，与 `dsh-audit-common` workspace.mjs 同构算法）。
- **保留策略（草案）**：独立 `maxSnapshots`/`maxBytes`（宽松默认 200 / 1 GiB）
  + 手动清理；归档 vs 逐出分离（M9）。

## 3. `audit` 域 —— 草案 v1（审计记录，规划中，D5 待拍板）

- **状态**：草案（`dsh-audit-ledger` 是否首期实现待拍板；schema 先行）。
- **定位**：把 harness 关键事件聚合为追加式审计记录：`approval/asked` +
  `approval/decided` 成对、`permission/preset`、`tool/call` + `tool/result`、
  `checkpoint/*`、恢复（rollback）应用——**消费 harness 事件，不发明平行
  语义**（M4/M8）；payload 保留事件 data 快照。
- **记录 schema**：`src/audit.mjs`。要点：
  - `category`：approval | permission | tool | snapshot | rollback | guard；
  - `eventType`：harness 事件类型原文；
  - `payload`：事件 data 的 JSON 快照（可序列化）；
  - `prevHash` 哈希链（M7）；
  - 身份字段（turn/step/sessionId）对齐 harness 事件形状。
- **对生态的提案**：判定类数据（allow/deny/waived）的接口形状——监督插件
  （如 dsh-supervisor）有稳定接口则消费，否则文档化约定 + 预留（M3）。

## 4. 事件词汇（消费容错超集，草案）

`src/events.mjs`：`tool/call`、`tool/result`、`approval/asked`、
`approval/decided`、`permission/preset`、`checkpoint/*` 的 zod 校验。
形状对齐 harness 会话事件（`session.jsonl.zstd` / `sessionQuery.readSession`）；
容错超集——未知字段剥离，精确严格性属于 harness 生产者。
