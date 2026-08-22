# 生态观察与对齐(EO)——动态反馈过程

> **English (original)**: [ecosystem-observation.md](ecosystem-observation.md) · English is the
> source of truth; this is the Chinese translation.

> **状态**: **2026-08-21 已合入** —— MDP 总纲的规范运行机制。§7 的三条提案已于
> 2026-08-21 合入 MDP / technical-selections / AGENTS.md（本文为机制参考；规范正文
> 以那三份文档为准）。
>
> **目的**: MDP 总纲("生态优先,行业标准第二")确立了价值排序。本文定义让该排序随时间保持
> 诚实的**机制**:**生态友好是一个动态调整过程,而非静态断言。**

---

## 1. 为什么是过程,而不是定义

dsh 生态年轻且变化极快:发布数天内 `dsh-plugin` topic 下已有 700–1100+ 公开仓库,第三方目录
每天约 145 个插件更新,且已涌现 30+ 个高度同质的审计/安全插件相互竞争——而**官方治理层完全
缺失**(统一质量/安全标准、深度静态扫描、签名验证、版本兼容检测)。

在这种条件下,"什么利于生态"的静态定义几周内必然过时。能存活的是**短周期、有显式记录的
反馈环**。

---

## 2. 反馈环

| 步骤 | 动作 | 产出/证据 |
|---|---|---|
| **观察** | 记录真实生态插件的实际接入方式:manifest 形状、事件用法、输出格式、犯过的错 | 观察日志(§4);带链接的来源 |
| **修订** | 只更新 spec 语义——原则编号稳定(契约式演进);更新登记表立场列 | CHANGELOG 条目、登记表 diff |
| **发布** | 把 spec + 校验器免费发布给生态(M10:`dsh-*` 命名、exports、dist-tag) | npm 包、插件市场收录 |
| **验证** | 对真实插件做**双层验证**:**(a) 兼容性下界**——真实插件必须能接入(必要条件门槛;防止闭门造车的 spec);**(b) 质量上界**——规范作者持有设计权威,对照 MDP + 行业对标做判断;社区现状形状只是一个候选,不是基准 | 接入演练 + 判断记录 |

回到**观察**。核心立场:**观察一切,默认不采纳**——观察是 100% 的信号输入;采纳默认是 0%,每次采纳必须通过 MDP 判定并记录理由。

**验证原则(dsh-plugin-audit v0.1.x 的教训)**:该插件的哨兵读 `exec.args`,而宿主真实执行对象
携带的是 `exec.arguments`——它的测试 harness 和手工验证脚本镜像了**同一个**错误假设,所以
绿灯什么也证明不了。

> 当测试替身与生产由同一假设驱动时,绿灯什么也证明不了。验证要对着宿主的真实源码形状,
> 而不是对着自己的理解。

**信号,而非权威。** 观察记录"存在什么",但观察本身不赋予权威。"存在"只是候选,绝不是基准。
社区插件的接口形状是"恰好存在的方案"——未必是最好的方案。若让任意插件作者在基准设计上占
100% 权重,等于让患者开药方:这正是 MDP 要治的病(缺失/错误/过度的接口,M0–M4)。先发不等于
正确;先例不等于权威。每一轮必须区分两个问题:

- **"生态能接得上吗?"** —— 兼容性;必要条件;由真实插件驱动(下界)。
- **"这个设计对吗?"** —— 质量;由规范作者对照 MDP + 行业对标判断;社区形状只是候选,
  永远不是基准(上界)。

---

## 3. 仲裁默认值(反馈环的初始参数,非最终真理)

当总纲的三个维度冲突时(接口可对齐性 M0/M3、harness 事件词汇 M8、消费者组合性 M3),使用
以下默认权重——**初始参数,随观察调整**:

1. **harness 事件词汇(M8)** —— 硬约束:绝不扭曲宿主原始事件名称与语义。
2. **现役消费者零迁移(M3)** —— 硬约束:无同构重声明、无强制迁移。
3. **新插件接入成本** —— 软约束:降低接入摩擦为佳,但不具决定性。
4. **第三方互操作(T1–T3 标准)** —— 软约束:partial alignment 为默认立场。

任何偏离此顺序的决策,必须连同触发它的观察一起记录(生态里发生了什么、我们看到了什么)。

社区形状进入**候选池**(镜像 technical-selections §4 对标参考池)——它们是判断的输入,
绝不自动晋升为规范。

---

## 4. 观察日志(2026-08-21 播种)

> 日志条目是**候选信号**,不是规范。晋升为规范须通过 MDP 判定 + 记录理由。

| 日期 | 观察对象 | 接入方式 | 错误/缺口 | 触发的 spec 修订 | 保护的点 |
|---|---|---|---|---|---|
| 2026-08 | dsh-plugin-audit v0.1.x | `tools/pre-execute` 哨兵 | 猜错宿主形状:`exec.args` vs `exec.arguments`(P0) | 对宿主真实形状验证 | M8/M3 接口形状导出 |
| 2026-08 | 30+ 审计/安全插件 | 各自 ad-hoc 输出格式 | 每个插件自定报告/verdict 形状 → 数据孤岛 | 共享审计域 schema | M0 禁止同构重声明 |
| 2026-08 | 审计/安全插件类别 | 权限画像 / verdict JSON | 安装无权限声明环节;`dsh plugin add` 即获全权限 | 共享权限画像事件格式 | M4/M8 消费 harness 事件 |
| 2026-08 | 存储类插件(普遍) | quota/eviction 不文档化 | 数据消失语义事后才发现 | tier/provenance 标注 | M9/M5 语义显式 |
| 2026-08 | dsh-checkpoint-diff 时间线面板词汇 | 被复用为视图模型草案基线（branchId / A-M-D / markers） | 单一实现者的历史词汇险些成为规范基线 | 视图契约独立重设计（直观 + 渲染性能，T4-4 于 2026-08-21 拍板）；单一实现者词汇不是标准 | M0/M3 接口形状权威 |
| 2026-08 | audit 域 `eventType` 原文透传（T4-3） | harness 事件以原文存入 `audit.records.eventType` | 迁移到数字映射的成本随历史积累与代码固化上升——而追加式账本 + 哈希链禁止重写旧记录（数据迁移不可能，不只是昂贵） | 读路径迁移地基（2026-08-21）：`common/event-registry.mjs` 注册表 + 预置种子（私有区间、永不落盘）+ `isFrozenEventType` 写门禁；记录/视图 schema 增加可选 `eventTypeId`（加法、向后兼容）；派生钩子仅对 frozen/官方事件附加数字码——官方映射落地 = 换数据 + 翻标志，消费方零改动 | M8 词汇永久保留原文；存储格式冻结；未知事件原文透传无码（M8"一切皆插件"） |
| 2026-08-22 | dsh-plugin-dev 技能 `references/` — Harness 官方插件开发标准库（文档站 2026-08 快照：plugin-anatomy / services / events / config / context-api / three-roles / tools / llm-adapter / plugin-forms / packaging / workspace-package / seams） | 权威参考：插件三形态 + Fiber、服务 inject vs `ctx.get()` 可选依赖、事件词汇与分发模式、三角色 seam、tools 流水线、bundle/profile 交付、monorepo 命名与角色词表 | ① approval 事件：官方表面为 `approval/request`（waterfall 一次性决策；无回答方 fail-closed）——基座审计域记录成对 `approval/asked`+`approval/decided`（来源 user-approval）→ **2026-08-22 已对照 harness 源码核实：两者并存——`approval/request` 是实时 waterfall 分派，`approval/asked`+`decided` 是它落盘的持久会话审计对（turn 内闭合、按 id 配对）；审计词汇正确，文档已标注**；② `tool/call`、`tool/result` 等是**持久会话事件**——须经 `session/event`（检查 `event.type`）或 sessionQuery 观察，不是 `ctx.on('tool/*')` → audit-ledger 事件源路径定为 session/event / sessionQuery；③ `checkpoint/*` 非 harness 词汇——DOMAINS §4 已标注为基座自有扩展事件；④ 交付形态为 bundle（`dsh.bundle` + cordis.patch.yml）+ profile（`dsh.profile`），patch 层按行胜出（非深度合并）；git 安装需自包含 prepare 脚本 + pnpm `allowBuilds` 授权 + 锁定 commit → 已吸收进 AGENTS.md 发布流程 | 对照 harness 源码核实 approval 词汇（`packages/interaction/user-approval` + `core/session/src/known-event-types.ts`：52 个持久事件类型）；修正 tool/result 形状（`callId` 在 `data.message.callId`）；消费词汇增补 `approval/policy` + `sandbox/mode` 并进 PROVISIONAL_SEEDS（0xe008/0xe009）；DOMAINS §3/§4 + events.mjs + derive.mjs 更新并补测试；AGENTS.md 发布流程 + fs 词汇精确化（`fs/write-intent`/`fs/edit-intent`/`fs/observed`） | M8 词汇以 harness 实际发出为准——已核实，不发明平行语义；审计 `eventType` 原文永久为存储主键 |

---

## 5. 可证伪性:从理由到可测试的断言

登记表中任何未完全对齐的行,除立场理由外,必须附带**可证伪断言 + 验证方法**,例如:

> 断言:新插件可以不读源码完成接入(schema/布局/语义文档完备)。
> 验证:仅凭 README + 导出 schema 完成接入演练(M10 验收标准)。
> 注:真实插件演练是**必要**条件(兼容性下界),而非充分条件——仅兼容不会让某个形状晋升为
> 规范;设计质量须另行对照 MDP 判断(质量上界)。

> 断言(T4-3 地基):未来采纳官方数字映射的成本是一次数据交换 + 标志翻转,绝不是记录重写
> 或消费方代码改动。
> 验证:(a) 无 frozen 条目时 `deriveAuditDrafts` 输出与地基前形状一致(`eventTypeId` 缺省,
> 无可见变化);(b) 经 `defineEventTypes` 注册 frozen 条目后,派生钩子零改动开始产出
> `eventTypeId`(由 `packages/common/test/event-registry.test.mjs` 与
> `packages/audit-ledger/test/derive.test.mjs` 覆盖)。
> 可证伪反例:任何历史记录被重写,或任何消费方需改动才能消费新码,即证伪该设计。

一个无法用可证伪方式陈述的偏离,不是决策,而是借口。

---

## 6. 与现有文档的关系

- **MDP 总纲**:确立价值排序(why)。本文:运行机制(how)。
- **technical-selections.md 规则 5**:立场记录义务。本文:记什么(观察+修订+保护)与如何验证。
- **README "Philosophy" 节**:面向开发者的定位表述。本文:其背后的过程。

---

## 7. 规范状态(2026-08-21 已合入)

以下三条提案已于 2026-08-21 全部合入:

1. **MDP 总纲验收标准**(合入 `spec/MDP.md`):每个涉及生态面对决策的回合必须回答
   "观察到了什么、修订了什么、保护了什么";验证双层(兼容性下界 + 质量上界);
   核心立场"观察一切,默认不采纳"。新增违例示例:跟随最流行插件的形状而不做判断
   (让先发决定规范)。
2. **technical-selections.md 规则 5**(已合入):每个偏离行携带可证伪断言 + 验证方法;
   双层验证(真实插件接入是兼容性下界,权重永远不是 100%);社区形状进候选池(§4),
   绝不自动晋升。
3. **AGENTS.md 开发循环**(已合入):引用本文作为观察通道输入;每轮更新观察日志
   (登记新观察到的社区接入方式/错误,附链接)。
