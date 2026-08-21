# Trust Anchor — dsh-audit-foundation

> **English**: [README.md](README.md) · 本文为中文翻译版，正本为英文。

> **Trust Anchor**：DeepSeek Harness 生态的**安全与审计基座**。
> 一套原则（MDP）、一套规范（spec）、一组最小职责插件——把
> "策略 → 执行 → 证据 → 存储 → 查询 → 呈现 → 响应 → 审计消费"
> 全流程的接口钉死，让生态插件**严丝合缝**：不多做功能、不少做功能、接口合理暴露。

## 理念：生态优先，行业标准第二

**标准是手段，生态是目的。** 本项目默认遵循行业标准（正式/事实/惯例，见
`docs/technical-selections.md` 的 T1–T3——标准本身是生态资产：互操作、工具链、
可发现性）；但当采纳标准会**损害生态对齐**——接口可对齐性、harness 事件词汇
不被扭曲、消费者的组合性——时，**偏离标准并记录理由，"部分对齐"是默认立场**。
范本：审计字段部分对齐 OCSF/ECS 但保留 harness 事件原文；快照载体不采用 git
loose-object，以免数据被 gc 回收。

生态缺的不是更多功能，而是**可对齐的接口**：本基座把接口钉死、从包导出、免费
提供校验器（M0）——这就是"多做了/少做了/接口暴露不合理"通病的解药。

生态对齐是**动态调整过程，不是静态断言**（机制见
[`docs/ecosystem-observation.md`](docs/ecosystem-observation.zh-CN.md)）：
每轮记录真实插件的接入方式与踩坑（观察日志）、只修订 spec 语义、验证双层——
真实插件接入是**兼容性下界**（必要条件），设计权威在规范作者、对照 MDP 与
行业对标判断（**质量上界**）。社区形状只是"恰好存在的方案"，绝不自动成为基准：
**观察一切，默认不采纳**。

## 定位

- **规范锚点**：最小设计原则（[`spec/MDP.zh-CN.md`](spec/MDP.zh-CN.md)）与域规范
  （[`spec/DOMAINS.md`](spec/DOMAINS.md)、[`spec/CONTRACT.md`](spec/CONTRACT.md)）
  是生态可遵循、可校验的标准——不是协商的产物，是参考实现 + 从包导出的
  zod 校验器（M0：禁止同构重声明）。
- **参考实现**：本仓库每个包都是 MDP 最严格的遵循者（dogfooding）。
- **不担心重复造轮子**：生态里边界不清、接口不自洽的插件位，由本基座用
  规范化的参考实现覆盖；harness 核心已有的轮子（sandbox / approval /
  storageDomain / sessionQuery）直接复用，不重复。

## 仓库结构

```
spec/                    规范包（npm: dsh-audit-spec，非插件）
  MDP.md                 最小设计原则（正式规范：总纲（生态优先，标准从属）+ M0–M10）
  CONTRACT.md            基座契约（域消费 / 回滚底线 / API 表面）
  DOMAINS.md             域规范：checkpoints（稳定）/ cdp-snapshots v1（草案）/
                         audit v1（草案）+ 事件词汇
  src/                   纯 zod 校验器（从包导出，零 DSH 依赖）
packages/
  common/                公共纯函数库（npm: dsh-audit-common，零 DSH 依赖）
    workspace            工作区键 / 快照布局（rewind 兼容 + 迁移来源）
    labels               意图标签（工具调用 → 人类可读 label）
    diff-engine          行级 LCS diff 引擎
    pathguard            写路径安全纯函数（M6：所有写路径共用）
    hash                 内容寻址 / 哈希链（M7）
  …（生产者 / 审计记录 / 时间线 / 回滚 / 导出 / 护栏 —— 规划中）
```

## 包清单（规划，见 docs/bundle-foundation-design.md）

| 包 | 职责（一个关注点） | 写路径 |
|---|---|---|
| `dsh-audit-spec` | 规范 + 校验器 | 无 |
| `dsh-audit-common` | 纯函数库 | 无 |
| `dsh-checkpoint-producer`（规划） | 耐久变更前快照 + 哈希链 + 保留策略 | 自有域 `cdp-snapshots` + 自有目录 |
| `dsh-audit-ledger`（骨架已建，D5 已拍板） | 审计事件聚合记录（派生纯函数已落地；插件壳规划中） | 自有域 `audit` |
| `dsh-checkpoint-timeline` / `rollback` / `dsh-trace` / `dsh-evidence-export` / `dsh-guard-hints`（规划） | 消费侧拆分（从 dsh-checkpoint-diff 迁移） | 仅回滚写工作区 |
| `dsh-audit-ui`（规划，D9） | 呈现组件（时间线/diff/审计视图/导出预览），只消费 spec 视图模型，不读存储域 | 无 |

## 状态

骨架 v0.1（2026-08）：根配置 + spec 包（checkpoints 校验器迁移完成；
cdp-snapshots / audit / events 为草案 schema）+ common 包（workspace / labels /
diff-engine / pathguard / hash 迁移完成）。决策记录见
[docs/bundle-foundation-design.zh-CN.md](docs/bundle-foundation-design.zh-CN.md)（D1 命名
`dsh-audit-foundation`、D2 monorepo、D3 diff 轻维护 + 复用；方向确认已拍板：
D4 不做门禁、D5 ledger 首期基础范围、D6 签名不承诺、D7 SARIF 留给生态、
D9 UI 与数据分离 + 可复用 UI；D8 GitHub 建仓待办）。

## 开发

```bash
pnpm install
pnpm test          # 全部包（node --test，--test-isolation=none）
```

发布：`npm publish`（每包独立）；`dsh-plugin` dist-tag；spec 冻结 = 1.0.0 门槛。
