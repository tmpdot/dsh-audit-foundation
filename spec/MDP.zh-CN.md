# 最小设计原则（MDP）—— 正式规范

> **English**: [MDP.md](MDP.md) · 本文为中文翻译版，正本为英文。

> **Trust Anchor**（dsh-audit-foundation）的规范核心。适用对象：
> 本仓库所有包（必须自证合规）+ 生态插件（建议遵循）。
> 每条原则 = 定义 + 判定标准（可检查他人插件是否合规）+ 违例示例 + 合规示例。
> 原则编号稳定（M0–M10），修订只增语义不改编号（契约式演进）。
> 价值排序见"总纲"（生态优先，行业标准第二），位于编号原则之上。
> 起源：`docs/bundle-foundation-design.md` §1（dsh-checkpoint-diff 仓库，2026-08）。

## 如何判定一个插件"符合 MDP"

插件必须能逐条回答以下判定标准；本仓库的参考实现（spec / common / 各插件包）
就是逐条合规的样板。任何"功能做得好但接口不自洽"的插件（多做了或少做了
功能、少了接口、接口暴露不合理），至少违反 M0–M4 之一。

---

## 总纲. 生态优先，行业标准第二（Ecosystem first, standards serve）

> 价值排序，位于 M0–M10 之上：适用于本仓库全部决策（选型 / 设计 / 发布）
> 与生态插件的设计建议，各原则是它的落地。

- **定义**：**标准是手段，生态是目的**。正式/事实标准与行业惯例（技术选型表
  T1–T3）默认遵循——标准本身是生态资产（互操作、工具链、可发现性）；但当采纳
  标准会**损害生态对齐**——接口可对齐性（M0/M3）、harness 事件词汇不被扭曲
  （M8）、消费者的组合性——时，**偏离标准并记录理由，"部分对齐"为默认立场**。
- **判定**：每个涉及标准的决策能回答"采纳它利于生态的哪一点？偏离它保护了生态
  的哪一点？"；任何未全量对齐的行必须写明"偏离了什么、保护了什么"（技术选型表
  立场列），**不留隐性偏离**。
- **违例**：为对齐某行业标准而把 harness 事件原文改造成标准编号（牺牲 M8 词汇
  原义）；为"标准合规"强迫消费者迁移或同构重声明。
- **合规**：T4-3 审计字段分类"部分对齐 OCSF/ECS，eventType 保留 harness 原文"；
  T4-1 快照载体不采用 git loose-object（gc 回收风险，数据不消失优先）。

---

## M0. 接口先于实现（Spec-first）

- **定义**：任何**产生数据**的插件，必须从包导出其数据 schema（存储域 spec /
  事件类型 / 服务签名 / 文件布局）；消费者**禁止同构重声明**。
- **判定**：`import schema from 'pkg/domain-spec'` 可用；消费者的校验器是
  导入而非复制。
- **违例**：dsh-checkpoint-rewind 不导出 checkpoints 域 spec → 消费者被迫
  同构重声明（v1/v2 折腾一轮）。这是"少了接口"的教科书案例。
- **合规**：本仓库所有域 schema 从 `dsh-audit-spec` 导出（纯 zod、零 DSH 依赖）。

## M1. 最小职责（One concern per plugin）

- **定义**：一个插件只承担一个横切关注点（审计、快照、轨迹、时间线、回滚、
  导出、护栏…）。
- **判定**："拆掉它，其余功能仍然自洽"→ 它没做多；"少了他，生态无同类"→
  它没做少。
- **违例**：dsh-checkpoint-diff 一包装下 timeline/trace/rollback/export 四个
  关注点（历史包袱——基座内拆开，发布单元按关注点拆分）。
- **合规**：见 README 包清单：每个包一个写路径、一张依赖表、一个关注点。

## M2. 数据所有权（Producer owns the schema）

- **定义**：谁写数据，谁拥有 schema 与语义；消费者只读 + **容错超集**
  （严格性属于生产者）。
- **判定**：记录 schema 的必填/可选集在生产者的包里；消费者文档写明
  "容错，不校验严格性"。
- **合规**：checkpoints 消费 schema（`spec/src/checkpoints.mjs`）即容错超集
  范本：v1/v2 记录都接受，严格性留给生产者。

## M3. 接口最小但完备（Minimum exposure, complete coverage）

- **定义**：不多暴露一个没人用的接口（防耦合膨胀）；不少暴露一个消费者
  需要的接口（防猜、防重声明）。
- **判定**：每个公开接口有**实际消费者或书面提案**；每个跨插件数据有 schema
  （M0）。接口形状稳定后进契约；变更进 CHANGELOG + minor 版本。
- **违例**：dsh-supervisor 的判定数据（allow/deny/waived）无稳定接口形状 →
  消费者只能"预留 + 文档化约定"。
- **合规**：本仓库每个草案 schema 都标注状态（稳定/草案）与"给谁的接口"。

## M4. 横切关注点独立成插件（Cross-cutting concerns are plugins）

- **定义**：审计、权限、路径校验、哈希、标签、配额、时间源等横切关注点各自
  独立，**不内嵌**进功能插件；多个插件共享的能力走事件/服务接口，不互相
  inject 实现。
- **判定**：任何一个关注点换实现（如哈希算法、标签策略）时，只换对应插件，
  其余不动。
- **合规**：harness 先例——`fs/write-intent` 事件门让 fs-observation-policy
  可加可卸；user-approval 的 `approval/asked`+`approval/decided` 成对审计
  独立于消费方。本仓库：pathguard / hash 是独立纯函数包（M6/M7 落地）。

## M5. 失败关闭 + 降级诚实（Fail closed, degrade honestly）

- **定义**：服务缺席 → 显式降级（degraded 标注、错误归因点名）或失败关闭；
  **绝不静默**。
- **判定**：每个可缺席依赖都有降级矩阵（contract 文档），且降级路径有测试。
- **合规**：dsh-checkpoint-diff 的 degraded 标记 / bad-object 点名 / 轨迹
  重放 drift 的 `notes` 报告（迁移进基座的消费者包时保留）。

## M6. 写路径单一且边界显式（One explicit write path）

- **定义**：每个插件的写路径必须在 README/SECURITY 明示；路径校验（拒绝
  `..` / 绝对路径 / 符号链接逃逸 / 受保护段）是**公共横切组件**，不是各写
  路径各写一份。
- **判定**：SECURITY.md 可逐条对账；跨插件写路径校验逻辑同源（共享纯函数，
  非复制）。
- **合规**：回滚六不变量（`spec/CONTRACT.md` §2）即"边界显式"范本；
  `dsh-audit-common` 的 pathguard 是唯一路径校验实现。

## M7. 可验证性（Verifiability）

- **定义**：数据可哈希、可重放、可重建：内容寻址（同内容=同 ref）、追加式
  记录、哈希链（检测重排/缺失/篡改）、轨迹重放（任意两点重建内容）。
- **判定**：任何证据类数据都有"验证它没被改/没丢"的只读手段；文档写明
  "可验证 ≠ 不可篡改"（哈希不密封、不签名，签名是可选扩展）。
- **合规**：`dsh-audit-common` 的 hash（contentHash / recordHash）；
  cdp-snapshots 域的 `prevHash` 哈希链（草案）。

## M8. 组合优先，禁止 fork（Compose, don't fork）

- **定义**：复用 harness 事件与服务（`fs/*-intent`、`tools/*`、
  `storageDomain`、`sessionQuery`、`approval`、`webServer`）；与同类共存时
  **双捕获 + 内容寻址去重**，绝不 fork 上游代码、绝不改上游仓库。
- **判定**：包依赖表里没有"复制粘贴的上游源码"；共存场景有去重测试。
- **合规**：本仓库只迁移**自有代码**（dsh-checkpoint-diff 的 lib/，文件头
  注明来源）；rewind 是只读上游参考，绝不修改。

## M9. 保留策略显式（Retention is explicit）

- **定义**：任何存储的易失性语义（临时/持久/耐久 tier）必须文档化并
  **标注在数据上**；配额逐出、gc 回收、可清记录都是语义的一部分，不是缺陷。
- **判定**：存储 schema 带 tier/来源元数据；文档写明"什么情况下数据会消失"。
- **违例**：rewind 配额逐出 / `/rewind clear` / gc 回收从不文档化 → 下游靠
  degraded 标记事后发现。
- **合规**：cdp-snapshots 域 `source`/`tier` 必填（草案）；节点标注
  来源 + 持久性层级。

## M10. 生态友好发布（Ecosystem-friendly release）

- **定义**：包名 `dsh-*`；`exports` 导出 spec 与纯函数；README 双语（**英文默认 +
  中文翻译**）；契约文档**事实性描述 + 主动提案小节**；dist-tag `dsh-plugin`；变更进
  CHANGELOG（Keep a Changelog）。
- **判定**：新插件无需读源码即可对接（schema / 布局 / 语义文档齐全）。
- **合规**：`dsh-audit-spec` 的 exports 即样板。

---

## 合规自证清单（每包必填）

1. 数据 schema 从包导出（M0）——有 schema 的文件即有导出 + 测试。
2. 职责一句话写进 README 首段（M1）——一句说不清 = 职责不单一。
3. 写路径表（M6）——无写路径写"无"。
4. 降级矩阵（M5）——每个可选依赖一行。
5. 来源声明（M8）——迁移模块文件头注明。
6. 易失性语义（M9）——存储类包必填。
