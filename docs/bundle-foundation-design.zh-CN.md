# 安全与审计基座：组合包建库设计草案（2026-08）

> **English**: [bundle-foundation-design.md](bundle-foundation-design.md) · 本文为
> 中文翻译版，正本为英文。

> **来源**：dsh-checkpoint-diff/docs/bundle-foundation-design.md（2026-08 迁入本
> 仓库 docs/，作为建库决策记录；旧仓库副本保留不动）。

> **状态**：草案 v0.5。已拍板：**D1（`dsh-audit-foundation`，理念名 Trust Anchor）**、
> **D2（monorepo）**、**D3（diff 轻维护 + 代码复用）**、**D4（不做门禁）**、
> **D5（audit-ledger 首期做，基础范围）**、**D6（签名不承诺，接口位预留）**、
> **D7（SARIF 留给其他插件）**、**D8（仓库已建于 `tmpdot/dsh-audit-foundation`，
> 个人命名空间，协作模式保留）**、**D9（UI 与数据分离：视图模型契约 + 可复用 UI）**、
> **技术选型工作流（T1–T4 分层，用户 2026-08-20 批准完整版，登记表
> `docs/technical-selections.md`，见 §10）**。
> 方向确认（用户 2026-08 指示）：
> ① 项目本体是**生态标准**（接口规范 + 数据存储格式），统一上下游；② 参照
> **当前主流审计实现方案**，仅做基础功能、设计边界清晰的组件，可选扩展留给其他插件；
> ③ 呈现层 **UI 与数据分离**，UI 接口暴露，其他插件可用相同数据结构复用 UI（见 §9）；
> ④ 理念校准（2026-08）：**生态优先，行业标准第二**——标准是手段、生态是目的；
>    采纳标准损害生态对齐时偏离并记录理由，"部分对齐"为默认立场（锚点：MDP
>    总纲 / technical-selections 规则 5 / README"理念"节）。
> 前置推论已读：`docs/roadmap-tasks.md`（任务书/T1–T20）、
> `docs/3-traceability-vs-audit.md`（方向裁决：溯源 vs 审计三层）、
> `docs/decoupling-design.md`（Phase A/B 详案）、`docs/contract.md`（消费侧契约）。
> 本文按用户 2026-08 最新指示修正两处旧前提：
> **① 不再担心重复造轮子与功能覆盖**（生态"已占"不再是回避理由）；
> **② 不与上游协商**（rewind/harness 协商通道不可用），改为**制定最小设计原则（MDP）让生态遵循**——
> 现有插件"功能做得好，但多做了或少做了功能、少了接口、接口暴露不合理"的通病，
> 靠规范 + 参考实现解决，不靠谈判。

---

## 0. 决策摘要：要不要新开项目

**结论：新开项目（独立仓库，monorepo 多包），以组合包为起点直接建"库"。**

组合包 = 自建生产者（审计记录层）+ 消费者（溯源呈现层）+ 规范包（spec）。它不是
`dsh-checkpoint-diff` 的下一阶段，而是**安全与审计的独立基座**。理由：

| # | 理由 | 说明 |
|---|---|---|
| 1 | **写路径分离，安全模型单一** | 生产者写自有域（新写路径）与消费者"只读+回滚例外"是两种信任面。塞进 diff 仓库 = AGENTS.md #1 第二次扩展（decoupling-design §5 已提示需评审）。独立仓库让每个包的安全边界保持单一、可审计 |
| 2 | **规范需要中立锚点** | MDP + 域 spec + 事件 schema + 契约是"标准库"身份，不属于任何单个插件的附属文档 |
| 3 | **版本节奏独立** | diff 0.x 慢节奏（caret 锁 minor，每次 minor 要改 profile）。基座需要自己的版本线（spec 冻结才能谈 1.0.0） |
| 4 | **生态发现** | 独立包名（`dsh-*` 前缀）+ `dsh-plugin` dist-tag + 插件市场（mydsh.dev / dsh-market 等 1500+ 插件生态）收录，独立仓库才可被生态消费 |
| 5 | **重造轮子无罪** | 用户已裁定：生态"已占"的位（审计A/B）不再回避。基座自建核心，生态要么遵循 MDP、要么被参考实现覆盖 |

**形态（D2 已拍板：monorepo）**：单仓库双区——`packages/`（最小职责插件）+ `spec/`
（规范：MDP 文档、域 schema、事件 schema、契约）。与任务书 T11（单仓库双包 vs 独立仓库）
的差异：不止"生产者+消费者"两包，而是 **N 个最小职责插件 + 1 个规范包**（§6）。

**命名（D1 已拍板）**：仓库/包名 **`dsh-audit-foundation`**；理念名 **Trust Anchor**——
README 开篇定位语（"Trust Anchor：安全与审计基座"），不进入包名（避开 PKI 标准术语
trust anchor 的撞名误会，评估见 §8 D1）。

**定位一句话**：*一套原则（MDP）、一套规范（spec）、一组最小职责插件，把"策略 → 执行 →
证据 → 存储 → 查询 → 呈现 → 响应 → 审计消费"全流程的接口钉死，让生态插件严丝合缝。*

---

## 1. 最小设计原则（MDP）v0.1 —— 生态规范核心

> 每条原则 = 一句话定义 + 判定标准（可检查他人插件是否合规）+ 违例示例 + 合规示例。
> 原则编号稳定（M0–M10），修订只增语义不改编号（契约式演进）。

### M0. 接口先于实现（Spec-first）
- **定义**：任何**产生数据**的插件，必须从包导出其数据 schema（存储域 spec / 事件类型 /
  服务签名 / 文件布局）；消费者**禁止同构重声明**。
- **判定**：`import schema from 'pkg/domain-spec'` 可用；消费者的校验器是导入而非复制。
- **违例**：rewind 不导出 checkpoints 域 spec → diff 被迫在 `lib/domain.mjs` 同构重声明
  （v1/v2 折腾一轮，contract.md §1 明记）。**这正是"少了接口"的教科书案例。**
- **合规**：基座所有域 schema 从包导出（复用 `domain-schema.mjs` 纯 zod 模式，任务书 T2/T13）。

### M1. 最小职责（One concern per plugin）
- **定义**：一个插件只承担一个横切关注点（审计、快照、轨迹、时间线、回滚、导出、护栏…）。
- **判定**："拆掉它，其余功能仍然自洽"→ 它没做多；"少了他，生态无同类"→ 它没做少。
- **违例**：diff 一包装下 timeline/trace/rollback/export 四个关注点（历史包袱，基座内拆开）。
- **合规**：见 §6 插件清单；判断"多做/少做"用这条。

### M2. 数据所有权（Producer owns the schema）
- **定义**：谁写数据，谁拥有 schema 与语义；消费者只读 + **容错超集**（严格性属于生产者）。
- **判定**：记录 schema 的必填/可选集在生产者的包里；消费者文档写明"容错，不校验严格性"。
- **合规**：contract.md §1.1 已立范（"严格性属于生产者 rewind"）。

### M3. 接口最小但完备（Minimum exposure, complete coverage）
- **定义**：不多暴露一个没人用的接口（防耦合膨胀）；不少暴露一个消费者需要的接口（防猜/防重声明）。
- **判定**：每个公开接口有**实际消费者或书面提案**；每个跨插件数据有 schema（M0）。
  接口形状稳定后进契约（contract.md 同款），变更进 CHANGELOG + minor 版本。
- **违例**：dsh-supervisor 的判定数据（allow/deny/waived）无稳定接口形状 → 消费者只能
  预留+文档约定（任务书 T8 已降级处理）。**"少接口"的另一案例。**

### M4. 横切关注点独立成插件（Cross-cutting concerns are plugins）
- **定义**：审计、权限、路径校验、哈希、标签、配额、时间源等横切关注点各自独立，
  **不内嵌**进功能插件；多个插件共享的能力走事件/服务接口，不互相 inject 实现。
- **判定**：任何一个关注点换实现（如哈希算法、标签策略）时，只换对应插件，其余不动。
- **合规**：harness 先例——`fs/write-intent` 事件门让 fs-observation-policy 可加可卸
  （"layered permission/audit/sandbox interception belongs on `tools/execute`"）；
  user-approval 的 `approval/asked`+`approval/decided` 成对审计记录独立于消费方。

### M5. 失败关闭 + 降级诚实（Fail closed, degrade honestly）
- **定义**：服务缺席 → 显式降级（degraded 标注、错误归因点名）或失败关闭；**绝不静默**。
- **判定**：每个可缺席依赖都有降级矩阵（任务书/contract.md §1.5 已立范）。
- **合规**：diff 的 degraded 标记 / bad-object 点名 / trace 重放 drift 的 `notes` 报告。

### M6. 写路径单一且边界显式（One explicit write path）
- **定义**：每个插件的写路径必须在 README/SECURITY 明示；路径校验（拒绝 `..`/绝对路径/
  符号链接逃逸/受保护段）是公共横切组件，不是各写路径各写一份。
- **判定**：SECURITY.md 可逐条对账；跨插件写路径校验逻辑同源（共享纯函数，非复制）。
- **合规**：diff 的 rollback 六不变量（contract.md §2.2）即"边界显式"范本。

### M7. 可验证性（Verifiability）
- **定义**：数据可哈希、可重放、可重建：内容寻址（同内容=同 ref）、追加式记录、
  哈希链（检测重排/缺失/篡改）、轨迹重放（任意两点重建内容）。
- **判定**：任何证据类数据都有"验证它没被改/没丢"的只读手段；文档写明"可验证 ≠ 不可篡改"。
- **范围**：哈希链内置（生态无边界清晰插件，任务书 9.5 已定）；签名因密钥管理未定不承诺。

### M8. 组合优先，禁止 fork（Compose, don't fork）
- **定义**：复用 harness 事件与服务（`fs/*-intent`、`tools/*`、`storageDomain`、
  `sessionQuery`、`approval`、`webServer`）；与同类共存时**双捕获 + 内容寻址去重**，
  绝不 fork 上游代码、绝不改上游仓库。
- **判定**：包依赖表里没有"复制粘贴的上游源码"；共存场景有去重测试。

### M9. 保留策略显式（Retention is explicit）
- **定义**：任何存储的易失性语义（临时/持久/耐久 tier）必须文档化并**标注在数据上**；
  配额逐出、gc 回收、可清记录都是语义的一部分，不是缺陷。
- **违例**：rewind 配额逐出/`/rewind clear`/gc 回收从不文档化 → 下游靠 degraded 事后发现。
- **合规**：节点 tier 标注（来源 + 持久性层级，任务书 T4）；审计域用"归档 vs 逐出"分离。

### M10. 生态友好发布（Ecosystem-friendly release）
- **定义**：包名 `dsh-*`；`exports` 导出 spec 与纯函数；README 双语；契约文档**事实性
  描述 + 主动提案小节**（任务书 T3）；dist-tag `dsh-plugin`；变更进 CHANGELOG。
- **判定**：新插件无需读源码即可对接（schema/布局/语义文档齐全）。

---

## 2. 安全与审计全流程（端到端）

```
策略 Policy → 执行 Enforcement → 证据 Evidence → 存储 Storage
   → 查询 Query → 呈现 Presentation → 响应 Response → 审计消费 Audit consumption
```

| 阶段 | 干什么 | 数据 | 接口 | 责任方 |
|---|---|---|---|---|
| **策略** | 权限预设（sandbox mode + approval policy 捆绑）、护栏策略、审计目标（记录什么/留多久） | `permission/preset` 事件、config | `ctx.permissionPresets`（harness 已有） | harness 核心（已有）→ 基座补"审计策略" |
| **执行** | sandbox 执行、approval 门、fs 意图门、工具管道拦截 | `sandbox/mode`、`approval/asked+decided`、`fs/*-intent`、`tool/call+result` | 事件门 + `ctx.approval`（已有） | harness 核心（已有），基座不重复 |
| **证据** | 变更前快照、轨迹（会话日志）、审计事件成对记录 | 快照（git 对象/copy 目录）、`session.jsonl.zstd`、checkpoint/* 事件 | 存储域 + 快照目录布局 + 事件类型 | **rewind（可选）/ 基座生产者（自建）** + harness |
| **存储** | 记录落盘：域（sqlite/json）、快照目录、追加式日志 | checkpoints / cdp-snapshots / audit 域 | `ctx.storageDomain`（已有）+ 域 spec（自建导出） | 基座生产者 + harness storage |
| **查询** | 时间线提取、多源合并、轨迹重放、session 查询 | 时间线节点、重放内容 | `sessionQuery`（已有）、时间线 API | 基座消费者 + session-query |
| **呈现** | GUI 面板、命令面、HTTP API | **视图模型**（spec 导出，UI 不读存储域，D9） | 视图模型契约 + GET 端点（webServer）+ `dsh-audit-ui` 组件 | 基座消费者 + spec |
| **响应** | 回滚（预览→应用→撤销）、fork、清理 | 工作区文件、undo 内存态 | rollback/rollback-undo 端点 | 基座消费者（唯一写路径） |
| **审计消费** | 证据导出（JSON/MD/SARIF）、可验证哈希、判定徽标、报告/热力图 | 导出产物、哈希、allow/deny/waived | 导出端点 + 判定数据消费接口（预留） | 基座（导出）+ 生态（判定源） |

**关键认识**：harness 核心已覆盖策略/执行/存储底座（sandbox、approval、storageDomain、
session-query），**基座不重复造这些轮子**；基座的独有位是**证据层（耐久快照）、查询层
（多源时间线）、响应层（安全回滚）与审计消费层（导出+可验证性）**——以及把它们钉死的
**规范层（MDP + spec）**。用户裁定"不担心重复造轮子"适用于：生态里那些**边界不清、
接口不自洽**的插件位（审计A/B 的散装实现），基座用规范化的参考实现覆盖它们。

---

## 3. 功能清单与接口判定（F 表）

> 判定规则（回答"是否需要接口"）：**数据跨插件边界流动 → 需要接口**（域 spec / 事件类型 /
> 服务签名 / 文件布局 / HTTP 端点）；**只在一个插件内部 → 不需要接口**（内部模块即可）；
> **横切关注点（多个插件共享）→ 需要接口，且独立成插件（M4）**。

| # | 功能 | 产生数据/组件 | 需要接口？ | 接口形状 / 拥有者 | 插件归属 | 状态 |
|---|---|---|---|---|---|---|
| F1 | 权限预设切换 | `permission/preset` 事件 | 已有 | harness `ctx.permissionPresets` | harness | 已有 |
| F2 | 审批门（one-shot） | `approval/asked`+`decided` 成对审计 | 已有 | harness `ctx.approval` | harness | 已有 |
| F3 | sandbox 执行/升级 | `sandbox/mode` | 已有 | harness `ctx.shell` | harness | 已有 |
| F4 | fs 意图门（读改先读） | `fs/*-intent` 事件 | 已有 | harness 事件门（single-slot） | harness | 已有 |
| F5 | **变更前快照（耐久）** | `cdp-snapshots` 域 + 快照目录 | **需要（自建）** | 域 spec 从包导出（M0）；布局 `$DSH_HOME/<pkg>/snapshots/<key16>/<uuid>/`；记录含来源+tier 元数据 | 生产者 | 设计期（任务书 T13–T16） |
| F6 | 快照捕获器 | 捕获事件序列 | 需要 | 复用 harness `fs/*-intent`+`tools/pre-execute`；**无自有事件**（观察型直通） | 生产者 | 设计期（T14） |
| F7 | **审计记录（成对事件聚合）** | `audit` 域：关键事件（审批判定/权限切换/工具调用/快照）聚合 + 哈希链 | **需要（自建）** | 域 spec 导出；事件类型对齐 harness 已有类型（不发明新语义） | 审计记录插件 | 新提案（§6 P4） |
| F8 | 哈希链校验 | 每记录前驱哈希 | 需要 | 域 spec 的一部分（记录 schema 字段） | 生产者/审计记录 | 设计期（T15） |
| F9 | 保留策略（配额/清理） | 逐出规则 | 需要 | 域 spec 文档化 tier + 配额语义（M9） | 生产者 | 设计期（T16） |
| F10 | 轨迹重放（无快照兜底） | 重放内容序列 | 已有（消费） | `sessionQuery.readSession` + zstd 布局（只读） | 消费者（trace） | 已实现（0.5.0） |
| F11 | 多源时间线（cdp ⊕ rewind ⊕ trace） | 时间线节点（来源+tier 标注） | **需要** | 节点模型 + 寻址语义（现有契约 §1.3 沿用）；跨源 diff 对齐规则 | 消费者（timeline） | 设计期（T17） |
| F12 | 逐文件行级 diff | diff 视图 | 已有 | LCS 引擎（内部模块，无需接口） | 消费者（timeline） | 已实现 |
| F13 | 安全回滚 + 单次撤销 | 工作区写入、undo 内存态 | 已有 | POST 端点 + 六不变量契约 | 消费者（rollback） | 已实现 |
| F14 | **证据导出**（JSON/MD/SARIF） | 自包含导出产物 | **需要（自建）** | `GET /api/evidence-export` + `/diff --export`；产物可哈希可归档 | 导出插件 | 设计期（T5） |
| F15 | 可验证性哈希（展示） | 节点/产物哈希 | **需要** | 哈希算法 + 展示位置标准化（M7；"哈希≠密封"） | 导出插件 | 设计期（T6） |
| F16 | 判定徽标消费（allow/deny/waived） | 节点徽标 | **需要（预留）** | **接口形状待生态对齐**——按 M3 判定：无稳定接口 → 文档化约定 + 预留，不硬编码（T8 立场不变） | 消费者（timeline） | 预留 |
| F17 | 异常变更提示 / 热力图 | 异常标记、画像数据 | 需要 | 只读 API + 面板；定位"提示"非"门禁"（T10 立场不变） | 护栏提示插件 | 设计期（T10） |
| F18 | 护栏（敏感路径触碰等） | 提示/标记 | 需要 | 复用 `tools/execute` 监听（guard 先例：repeat-tool-reminder 的 additionalContexts 模式） | 护栏提示插件 | 新提案 |
| F19 | 审计策略（记录什么/留多久） | 策略配置 | 需要 | config schema + 策略事件（对齐 `permission/preset` 模式） | 审计记录插件 | 新提案 |
| F20 | 会话标题/血缘 | 标题、fork 分支 | 已有 | `sessionQuery.readTitle/traceSession`（可选服务，getter 现取） | 消费者 | 已实现 |
| F21 | **视图模型契约 + 可复用 UI** | timeline-view / diff-view / audit-view / evidence-view；UI 组件包 | **需要（自建）** | 视图 schema 从 spec 导出（M0）；`dsh-audit-ui` 只消费视图模型、不读存储域（D9） | 呈现层 + spec | 已拍板（D9） |

---

## 4. 横切关注点清单（需要接口的地方，M4 的落地表）

| 横切关注点 | 现状 | 基座动作 | 接口形状 |
|---|---|---|---|
| 审计事件记录 | harness 有 approval 成对审计；checkpoint/* 走自适应门 | 聚合为审计域（F7），**消费** harness 事件，不发明新事件 | `audit` 域 spec（导出） |
| 路径校验 | rollback 内嵌一套 | **提取为公共纯函数包**（拒绝 `..`/绝对/链接逃逸/受保护段），所有写路径共用 | 纯函数库（导出，零 DSH 依赖） |
| 时间/时钟 | 各插件自取 | 统一 epoch-ms 语义进 spec（不建服务，只定语义） | 文档约定 |
| 身份（session/turn/step/agent） | 事件自带 | 进审计记录 schema（对齐 harness 事件形状） | 域 spec |
| 内容寻址/哈希 | 生产者用（去重）；导出用（可验证） | 同算法两个用途，**单一实现** | 纯函数库（导出） |
| 意图标签 | labels.mjs 已实现 | 保留在消费者（呈现关注点）；spec 只定"标签从哪来"的输入契约 | 文档约定 |
| 配额/保留 | rewind 内嵌（不文档化） | 生产者自管 + tier 元数据（M9） | 域 spec + 命令 |
| 降级/错误归因 | degraded/点名已实现 | 作为 M5 验收标准写进 MDP，不新建组件 | 文档约定 |
| HTTP 面 | GET 门禁 + 两个 POST | 全部新端点沿用；导出端点 GET-only | 契约文档 |
| 配置 | Schemastery per-plugin | 每插件独立 config；审计策略（F19）单独 | config schema |

---

## 5. 最小职责插件划分（组合包清单）

```
                    ┌─────────────────────────────────────┐
                    │  spec 包（非插件：MDP + 域 schema + 事件 schema + 契约 + zod 校验器）│
                    └──────────────┬──────────────────────┘
                                   │ 导出规范（M0：禁止同构重声明）
   ┌───────────────┬───────────────┼──────────────────┬─────────────────┐
   ▼               ▼               ▼                  ▼                 ▼
生产者            审计记录         消费者(timeline)    消费者(rollback)   导出
dsh-checkpoint-   dsh-audit-      dsh-checkpoint-    dsh-checkpoint-   dsh-evidence-
producer          ledger          timeline           rollback          export
(写: cdp-         (写: audit 域    (读: 三源合并       (写: 工作区回滚      (读: 证据导出
 snapshots 域+     + 哈希链)       + trace + diff)     + 撤销; 唯一写路径)  + 可验证哈希)
 目录; 捕获器;                      ▲                    ▲
 哈希链; 保留)                      └─── 复用 ────────────┘
                                   harness: storageDomain / sessionQuery /
                                   webServer / fs/*-intent / tools/*
```

| 包 | 职责（一个关注点） | 写路径 | 依赖（只 inject 需要的） | 对应任务书 |
|---|---|---|---|---|
| `dsh-checkpoint-producer` | 耐久变更前快照 + 内容寻址 + 哈希链 + 保留策略 | 自有域 `cdp-snapshots` + 自有目录（M6 校验） | `storageDomain`、`fs/*-intent`、`tools/pre-execute`（观察型直通） | T13–T16 |
| `dsh-audit-ledger`（新） | 审计事件聚合记录（approval 判定/权限切换/工具调用/快照）成对入 `audit` 域 + 哈希链 | 自有域 `audit` | `sessions`（事件消费）、`storageDomain` | 新（覆盖生态散装审计A） |
| `dsh-checkpoint-timeline` | 多源时间线 + 行级 diff + 意图标签 + 判定徽标消费 | 无 | `storageDomain`、`sessionQuery`（getter 现取） | T4/T8/T11/T17 |
| `dsh-checkpoint-rollback` | 安全回滚 + 预览 + 单次撤销 | 工作区（六不变量） | `webServer` | 现有（拆分） |
| `dsh-trace` | 轨迹重放（时间线/区间 diff/回溯） | 无 | `sessionQuery`、zstd 直读兜底 | 现有（拆分） |
| `dsh-evidence-export` | 证据导出（JSON/MD/SARIF?）+ 可验证哈希 | 无 | `webServer` | T5–T7 |
| `dsh-guard-hints`（新） | 异常变更/敏感路径**提示**（只读，非门禁） | 无 | `tools/*` 监听（additionalContexts 模式） | T10/F18 |
| `dsh-audit-ui`（新） | 呈现组件（时间线/diff/审计视图/导出预览），**只消费 spec 视图模型**（D9） | 无 | spec 视图 schema（不读存储域） | D9 |
| `spec/`（非插件） | MDP 文档 + 域 schema + 事件 schema + **视图模型 schema** + 契约 + zod 校验器导出 | 无 | 零 DSH 依赖（纯 zod） | T1–T3/T13 |

**拆分原则**（为什么这样拆）：每个包可独立安装、独立安全模型（写路径表一目了然）、
独立版本线；消费者三包（timeline/rollback/trace）内部模块现成（`lib/` 已是纯函数分层），
拆分主要是**发布单元**拆分，代码搬家成本低。

**与现有仓库的关系（D3 已拍板：轻维护 + 复用）**：`dsh-checkpoint-diff` 的 `lib/` 纯函数层
（domain-schema、workspace、labels、diff/engine、rollback、trace/*）**迁入**新仓库对应包；
diff 仓库**继续维护**（0.5.x 补丁线：bug 修复与安全补丁，有人用就投入时间），新功能只在新
仓库做。迁移原则：**复用不复制**——模块迁入新仓后旧仓不再演进该模块（只留补丁），避免
双份维护；共享逻辑以新仓包为准，旧仓按需依赖或同步补丁。

---

## 6. 生态策略：规范先行，不协商

用户裁定"没有能力协商"→ 生态策略从任务书 §8.4 的"三策并列"收敛为**一策**：

1. **规范先行**：MDP + 域 spec + 事件 schema 以 `spec/` 包公开（npm + 仓库），
   zod 校验器随包导出——任何插件可 `import` 校验自己的记录是否符合标准。
2. **参考实现**：组合包自己是最严格的遵循者（dogfooding）；每一个 MDP 违例示例
   （rewind 不导出 spec、supervisor 无稳定判定接口）在参考实现里都有合规对应。
3. **不协商、不等待**：rewind 保持"可选遗留源"（共存双捕获去重，T17），
   不再等上游导出 spec（T9 降级为差异文档化）；生态插件（supervisor 等）的判定数据
   有稳定接口就消费（F16），没有就文档化约定 + 预留。
4. **对生态的贡献**：契约文档保持事实性 + "对生态的提案"小节（T3 保留）；
   插件市场收录（M10）；`dsh-plugin` dist-tag。

**对生态有利的第一性（理念校准 2026-08：生态优先，行业标准第二）**：**标准是手段，
生态是目的**。生态缺的不是更多功能，而是**可对齐的接口**；基座把接口钉死、导出、
免费提供校验器——这就是"少接口/多接口/错接口"通病的解药。默认遵循行业标准（标准
是生态资产），但当标准与生态对齐冲突（接口可对齐性 / harness 事件词汇 / 消费者
组合性）时，**偏离标准、记录理由，"部分对齐"为默认立场**——T4-3 审计字段（保留
eventType harness 原文）与 T4-1 快照载体（不采用 git loose-object）即范本。
**方向确认（用户 2026-08）**：项目本体是**生态标准**（接口规范 + 数据存储格式），
统一上下游；参照当前主流审计实现方案（追加式记录 + 哈希链 + 可查询可导出），
仅做基础功能、边界清晰，可选扩展（门禁/签名/SARIF/增强可视化）留给其他插件。

---

## 7. 与任务书 roadmap 的关系（重排）

| 任务书 | 在新项目中的位置 |
|---|---|
| T1–T3（基线小件） | 新仓库首期（spec 包：MDP 文档 + exports `./domain-spec` + 契约提案小节） |
| T4（tier 标注） | 消费者 timeline 包 |
| T5–T7（导出+哈希） | `dsh-evidence-export` 包 |
| T8（判定徽标） | timeline 包，立场不变（预留+文档化约定） |
| T9（rewind 协商） | **取消**（用户裁定不协商），降级为差异文档化 |
| T10（查得深） | `dsh-guard-hints` 包（提示非门禁） |
| T11–T19（组合包） | 即本设计 §5 的包划分（T11 已拍板：monorepo D2 + 轻维护复用 D3） |
| T20（1.0.0 门槛） | 契约冻结评审在新仓库 spec 包：MDP + 域 spec + 契约完备 → 1.0.0 |

---

## 8. 待决策点（需拍板）

| # | 决策点 | 推荐 | 备选 |
|---|---|---|---|
| D1 | 新仓库命名 | **`dsh-audit-foundation`** ✅ 已拍板（语义最准、零术语冲突；理念名 **Trust Anchor** 仅用于文档定位语，不进入包名——trust anchor 是 RFC 6024 / X.509 的 PKI 标准术语，作包名会误导安全/GRC 受众） | 已评估：`dsh-security-foundation` / `dsh-cornerstone` / `dsh-baseline` / trust-anchor 变体（均不选） |
| D2 | 仓库形态 | **monorepo**（packages/ + spec/） ✅ 已拍板 | — |
| D3 | 现有 diff 仓库去向 | **轻维护 + 代码复用** ✅ 已拍板：0.5.x 补丁线继续（bug/安全补丁，有人用就投入时间）；`lib/` 纯函数层迁入新仓对应包（复用不复制，迁出后旧仓不再演进该模块） | 冻结 / 薄壳转发（不选） |
| D4 | 审计B（门禁/策略执行）做不做 | **不做门禁** ✅ 已拍板（harness approval/sandbox 已是门；护栏只做提示 F18；方向确认②：仅基础功能，扩展留给生态） | 做最小门禁（违背 M1：与 harness 职责重叠） |
| D5 | `dsh-audit-ledger`（审计域）是否首期做 | **首期做** ✅ 已拍板（审计A 是基座核心承诺；生态散装实现不达标）。**基础范围**：成对事件聚合 + 哈希链 + 保留策略；高级分析/聚合报表留给生态 | 二期（先 producer+consumer） |
| D6 | 签名/防篡改 | **不承诺** ✅ 已拍板（密钥管理未定，M7 只到哈希链；签名留给生态插件，接口位预留） | 预留接口位 |
| D7 | SARIF 导出 | **首期只 JSON+MD** ✅ 已拍板（方向确认②：可选扩展留给其他插件，SARIF 不再写受众判断记录） | 首期全做 |
| D8 | 命名空间归属 | **个人命名空间 `tmpdot`** ✅ 已拍板（2026-08-21：仓库建于 `github.com/tmpdot/dsh-audit-foundation`；协作模式保留——提交身份由各贡献者本地 git 配置自行决定；当时未建独立组织，如后续多仓所有权需要可再议） | 新建**组织**（推迟，建仓时未选） |
| D9 | 呈现层：UI 与数据分离 | **分离 + 暴露 UI 接口** ✅ 已拍板（方向确认③）：视图模型 schema 进 spec 包；`dsh-audit-ui` 组件只消费视图模型；其他插件同数据结构可复用 UI（详见 §9） | UI 与数据耦合（不选：生态无法复用） |

---

## 9. 呈现层决策（D9 已拍板：UI 与数据分离，UI 接口可复用）

**决策**：呈现层拆成两层——**视图模型（数据契约）** 与 **UI 组件（视图）**，各自独立
发布；UI **只消费视图模型，绝不直接读存储域**。视图模型属于 spec（项目本体是接口规范
与数据存储格式，UI 是附带的参考实现）。

- **视图模型契约（view schemas，进 spec 包）**：`timeline-view`（时间线节点/徽标）、
  `diff-view`（逐文件行级 diff）、`audit-view`（审计记录）、`evidence-view`（导出预览）；
  zod 校验器从 `dsh-audit-spec` 导出（M0：禁止同构重声明）。
- **数据流单向**：存储域 → 查询/聚合（common 纯函数）→ 视图模型（JSON）→
  GET 端点 / slot props → UI 组件。域布局变更不影响 UI，反之亦然。
- **UI 包 `dsh-audit-ui`（规划）**：时间线 / diff / 审计视图 / 导出预览等客户端组件；
  只接收视图模型作 props；零写路径；独立版本线；README 标注每个组件的视图模型输入。
- **复用规则（M3 落地）**：生态插件持有同构数据（自有域或 harness 事件）时，自行派生
  视图模型后即可挂载基座 UI；数据校验失败 → 显式降级/报错（M5），不做数据猜测。
- **首期范围（方向确认②）**：只做基础视图（时间线 + diff + 审计记录 + 导出预览）；
  热力图、画像等增强可视化按需后置，留给生态插件。

## 10. 技术选型工作流（已拍板 2026-08-20，用户批准完整版）

任何关键技术选型按四层判定登记到 `docs/technical-selections.md`（该文档头部为
完整工作流与规则，这里是摘要）：

- **T1 正式标准 / T2 事实标准** → **直接执行，不询问**（执行时用 web_search
  核实原文与当前版本，链接进登记表）；
- **生态优先例外（校准 2026-08）**：T1–T3 默认执行，但采纳标准损害生态对齐
  （接口可对齐性 / harness 事件词汇 / 消费者组合性）时**偏离并记录理由**，
  "部分对齐"为默认立场（登记表规则 5；§6）；
- **T3 行业惯例** → 直接执行，记录惯例描述与代表案例；
- **T4 无标准** → 收集①DSH 生态相似插件方案 ②行业相近方案 → 记录对标立场
  （对齐/部分对齐/不采用 + 理由 + 链接）→ 先按最佳判断执行 → 进"待决策"清单
  → 按闸门提醒用户拍板；
- **闸门**：影响对外契约形状（域 schema / 视图模型 / 端点）的 T4 必须在契约
  冻结（1.0.0 门槛）前清零；内部实现细节执行后决策即可；
- **提醒**：涉及选型的回合结束列"待你决策"；提交前检查登记表，新增 T4 在提交
  说明点名；待决策清单保持同步（登记表 §2 为权威来源）。

当前 T4 待决策：schema 校验器（T4-2）——详见登记表 §2（T4-1/3/4 已于 2026-08-21 拍板）。

## 附：本文档与现有文档的关系

- 不取代 roadmap-tasks.md / 3-traceability-vs-audit.md / decoupling-design.md / contract.md；
  它们是推论的来源与细节，本文是**建库决策 + 原则 + 划分**的汇总草案。
- 拍板后：D1–D8 决策记录回填本文；spec 包落地时 MDP 移入 spec/ 作为正式规范；
  AGENTS.md 非协商条款在**新仓库**重新起草（旧仓库条款不动）。
