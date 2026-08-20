# Trust Anchor 基座契约（Contract）

> 本契约描述 Trust Anchor（dsh-audit-foundation）对外承诺的实际行为，供其他
> 插件、工具与 AI 参考——**描述事实，不是对生态的要求**；"对生态的提案"见
> 各域草案文档（DOMAINS.md）。语义变更进 CHANGELOG 并在版本号中体现。
> 起源：dsh-checkpoint-diff 的 `docs/contract.md`（消费侧契约），迁入基座后
> 扩展为**全流程契约**：域消费、恢复底线、API 表面。1.0.0 = 本契约 + MDP +
> 域 spec 完备且冻结（AGENTS.md #8）。

## 1. 域消费契约（Storage-domain consumption）

### 1.1 记录模型（`checkpoints` 域）

域 `checkpoints`，单表 `checkpoints`，键为检查点 `id`。**双版本消费**：
rewind 0.4.0 使用域 version 1，0.5.0 使用 version 2——消费者按 v2 打开
（介质不存在时创建 v2），介质为 v1 时回退 v1 打开；生产者在场时复用其已打开
的域（任意版本）。记录 schema（zod，**容错超集**，见 `spec/src/checkpoints.mjs`）：

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | string | 检查点 id（git provider 为对象 sha，copy provider 为 UUID） |
| `sessionId` | string | 归属会话 |
| `cwd` | string | 归属工作区（绝对路径） |
| `seq` | int ≥ 0 | 会话内序号 |
| `time` | int ≥ 0 | epoch 毫秒 |
| `provider` | `'git' \| 'copy'` | 快照载体 |
| `triggerTool` | string | 触发该检查点的工具名 |
| `turn` / `step` | int > 0 | 触发位置（会话轮次/步） |
| `files` / `bytes` | int ≥ 0 | 快照规模（文件数/字节） |
| `ref` | string | provider 引用（git: 40/64 hex；copy: UUID） |
| `stepEndSeq?` | int ≥ 0 | v1/v2：步结束序号 |
| `forkSeq?` | int ≥ 0 | **仅 v1**：fork 血缘序号 |
| `kind?` | `'manual'\|'auto'\|'guard'\|'mutation'` | **v2**：快照来源分类 |
| `config?` / `tree?` / `note?` / `sessionBoundary?` | — | **v2**：本基座不消费（只容忍） |

归属键 = `(sessionId, cwd)`，工作区按 `workspaceKeyOf(cwd)` 归一化。

### 1.2 快照语义

- 快照是**变更前**状态：`diff <from> <to>` 呈现 from 快照 → to 快照的差异。
- `git` provider：未引用对象，只经只读原语访问；ref 入参前按
  `^[0-9a-f]{40,64}$` 校验。
- `copy` provider：快照目录 + manifest；ref 按 UUID 校验。
- 混合 provider 两端点配对拒绝（响亮报错），不做隐式转换。

### 1.3 寻址（Addressing）

- 节点地址：id 前缀（任意长度）或字面量 `latest`（最新节点）。
- 前缀歧义 → 报错（`is ambiguous (N matches)`），绝不静默取首条。
- 项目范围下歧义时**偏好本会话记录**。

### 1.4 作用域（Scope）

- `scope=session`（默认）：当前会话 + 当前工作区键。
- `scope=project`：按工作区键合并全部会话，沿 fork 血缘（可选服务
  `sessionQuery.traceSession`）组织分支；服务缺席时**退化为扁平合并**（不报错）。

### 1.5 降级矩阵（Degradation matrix）

| 情形 | 行为 |
|---|---|
| 记录被配额剪枝 / 缺失 | 时间线不含该节点；diff/回滚报明确错误 |
| git 快照对象被 gc 回收 | 节点标记 degraded（只读探测），默认跳过；报错点名死节点 |
| 域介质为 v1 / v2 | 双版本打开：v2 优先，version-mismatch 回退 v1；复用已开域 |
| 混合 provider 配对 | 响亮拒绝 |
| `sessionQuery` 缺席 | 项目范围退化为扁平合并；轨迹/标题/血缘降级 |
| 会话日志缺失 | 意图标签回退 triggerTool 原文（不报错） |

降级原则：**绝不删除任何记录或数据**，永远给出可行动的报错（M5）。

## 2. 恢复安全契约（Restore safety contract）—— 恢复操作底线

> 以下六条是"从时间节点恢复工作区文件"这一动作**自身的承诺**（提取自
> dsh-checkpoint-diff 的 rollback 安全层，全部有测试背书）。任何实现恢复
> 的插件（回滚、撤销、生产者验证）都应遵循；是否采纳由各项目自行判断。

### 2.1 定位

恢复是**唯一写路径**，其余一律只读。恢复 = 把节点快照的文件内容写回会话
工作区（整节点或单文件）。

### 2.2 不变量（Invariants）

1. **只覆盖写，绝不删除**——节点之后新建的文件保留并报告（leftovers）；
   唯一例外见 §2.4（撤销删除恢复自己刚创建的文件）。
2. **不越界**——不写出工作区根；拒绝穿越（`..`）与绝对路径；路径上任何一环
   是符号链接即拒绝；`/\.git|\.dsh/` 段在任何深度都拒绝。
3. **不碰别的存储**——绝不写快照存储、git、会话；git 只用只读原语。
4. **git provider 前置条件**——会话 cwd 必须是仓库根，否则响亮拒绝。
5. **预览先行**——应用前必须能产出 dry-run 计划（将恢复/不变/跳过 + 遗留
   清单）；dry-run 不写盘。
6. **每工作区串行**——同一工作区的恢复操作串行执行。

### 2.3 预览与计划（Preview）

计划字段：`files[{rel, action: 'restore'|'unchanged'|'skip', reason?}]`、
`restored/unchanged/skipped` 计数、`leftovers`。预览可附带**当前工作区 →
目标快照**的逐行 diff（只读）。

### 2.4 单次撤销（Undo）

- 撤销最近一次恢复：被覆盖文件写回恢复前内容；**恢复新建的文件可以被删除**
  （"绝不删除"的唯一例外，且仅限恢复自己创建的）。
- 恢复后被改动的文件**跳过不动**（全部跳过 → 409）。
- 进程内存状态，重启失效；无 redo；删除前经过与恢复相同的路径校验。

### 2.5 为什么（理念）

| 不变量 | 对应理念 |
|---|---|
| 绝不删除 | "退得回"的底线：任何时刻都有完整现场可追究 |
| 不越界 / 不碰别的存储 | 信任边界：只承诺改变你明确授权的一个区域 |
| 预览先行 | "应用前可验证"：先看清再动手，不是事后解释 |
| 单次撤销 | 误操作有退路；撤销本身也遵守同样的安全线 |

## 3. API 表面约定（API surface conventions）

- 前缀：每插件自有 `/api` 前缀（如 `/checkpoint-diff/api`），harness
  `webServer` 同源 JSON。
- **读端点 GET-only**；写端点 POST 白名单（请求体 ≤ 64 KiB、JSON 校验）。
- 错误形状：`{ok:false, error}`；状态码语义见各插件 README。
- **稳定承诺**：寻址语义、A/M/D 语义、降级语义与恢复不变量不做破坏性变更；
  确需变更时先进 CHANGELOG 并随 minor 版本发布。

## 4. 版本与修订

- 本文档与基座版本同轨（当前 0.1.x 草案期）；修订记录在 CHANGELOG 的
  [Unreleased] 累积。
- 对契约的争议走 Issues；安全相关走 SECURITY.md 的私有上报。

## 5. 视图模型契约（View-model contract）—— 草案 v1（D9）

- 呈现层**只消费视图模型**，不直接读存储域；域布局/存储 schema 变更不影响 UI。
- 视图 schema（timeline-view / diff-view / audit-view / evidence-view）从
  `dsh-audit-spec` 导出（M0，`src/views.mjs`，2026-08 草案 v1），消费者禁止
  同构重声明；未知字段剥离（容错超集，M2）。
- GET 端点返回视图模型 JSON；`dsh-audit-ui` 组件接收视图模型作 props。
- 数据校验失败 → 显式降级/报错（M5），不做数据猜测。
- 生态插件按同一视图模型复用基座 UI（D9 复用保证；属于"对生态的提案"）。
