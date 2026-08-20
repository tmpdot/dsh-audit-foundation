// test/labels.test.mjs — 快照意图命名单测（纯函数）。
// migrated from dsh-checkpoint-diff@0.5.x (test/labels.test.mjs)
//
// 覆盖：tool/call 索引、目标参数提取（工具名 → 键偏好/清洗/截断）、
// 记录 → label 的匹配优先级（精确名 > fs-intent → 变更型工具 > 步内首个调用
// > triggerTool 回退）、rewind guard 标注、withLabels 附加。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  cleanTarget,
  displayToolName,
  extractTarget,
  indexToolCalls,
  labelForRecord,
  relativizePath,
  shortenCommand,
  shortenPath,
  toolCallLabel,
  withLabels,
} from '../src/labels.mjs'

// recordView 来自消费者层（dsh-checkpoint-diff lib/checkpoints.mjs，未迁移）；
// withLabels 只读 view 的 turn/step/triggerTool 并展开，identity 视图等价。
function recordView(view) {
  return { ...view }
}

function toolCall(turn, step, name, argsText, seq = 0) {
  return { type: 'tool/call', seq, time: seq, data: { turn, step, callId: `c${seq}`, name, arguments: argsText } }
}

function record(partial) {
  const base = {
    id: partial.id ?? 'aaaaaaaa-1111-2222-3333-444444444444',
    turn: partial.turn ?? 1,
    step: partial.step ?? 1,
    triggerTool: partial.triggerTool ?? 'write',
  }
  return { ...base, ...partial }
}

test('indexToolCalls groups by turn:step and skips unrelated/garbage events', () => {
  const events = [
    { type: 'turn/start', seq: 0, time: 0, data: { turn: 1 } },
    toolCall(1, 1, 'read', '{"file_path":"a.txt"}', 1),
    toolCall(1, 2, 'write', '{"file_path":"b.txt"}', 2),
    toolCall(2, 1, 'bash', '{"command":"pnpm test"}', 3),
    null,
    { type: 'tool/call', seq: 4, time: 4, data: null },
    { type: 'tool/call', seq: 5, time: 5, data: { turn: 'x', step: 1, name: 'edit' } }, // 非数字 turn
    { type: 'tool/call', seq: 6, time: 6, data: { turn: 9, step: 9, name: '' } }, // 空名
  ]
  const index = indexToolCalls(events)
  assert.equal(index.size, 3)
  assert.deepEqual(index.get('1:1').map((call) => call.name), ['read'])
  assert.deepEqual(index.get('1:2').map((call) => call.name), ['write'])
  assert.deepEqual(index.get('2:1').map((call) => call.name), ['bash'])
  assert.equal(index.get('9:9'), undefined)
  assert.equal(indexToolCalls(undefined).size, 0)
  assert.equal(indexToolCalls([]).size, 0)
})

test('extractTarget: per-tool key preference, fallback keys, cleaning and truncation', () => {
  assert.equal(extractTarget('edit', '{"file_path":"src/a.js","path":"ignored"}'), 'src/a.js')
  assert.equal(extractTarget('write', '{"path":"b.txt"}'), 'b.txt')
  assert.equal(extractTarget('bash', '{"command":"pnpm  test\\n--filter x"}'), 'pnpm test') // 命令简写：命令名+首参
  assert.equal(extractTarget('grep', '{"pattern":"turn/start"}'), 'turn/start')
  // 未列出工具用默认键顺序。
  assert.equal(extractTarget('read_file', '{"file_path":"x","name":"y"}'), 'x')
  // 无目标 / 非法参数 → undefined。
  assert.equal(extractTarget('bash', '{}'), undefined)
  assert.equal(extractTarget('bash', '{not json'), undefined)
  assert.equal(extractTarget('bash', undefined), undefined)
  assert.equal(extractTarget('bash', '["array"]'), undefined)
  // 截断 + 单行。
  assert.equal(extractTarget('edit', JSON.stringify({ file_path: 'a'.repeat(200) })), `${'a'.repeat(47)}…`)
  assert.match(cleanTarget('  multi\n  line  '), /^multi line$/)
})

test('extractTarget: 文件目标在 cwd 下 → 相对路径（方向 2）', () => {
  const cwd = 'D:/Work/proj'
  assert.equal(extractTarget('edit', JSON.stringify({ file_path: 'D:\\Work\\proj\\src\\a.js' }), cwd), 'src/a.js')
  assert.equal(extractTarget('write', JSON.stringify({ file_path: 'D:/Work/proj/notes.md' }), cwd), 'notes.md')
  // 相对路径参数原样保留。
  assert.equal(extractTarget('edit', JSON.stringify({ file_path: 'src/a.js' }), cwd), 'src/a.js')
  // 不在 cwd 下的绝对路径 → 文件名退化（仍超长时）。
  assert.equal(
    extractTarget('read', JSON.stringify({ file_path: 'D:/Elsewhere/very/long/directory/structure/file.txt' }), cwd),
    'file.txt',
  )
  // cwd 缺失 → 短绝对路径保持原样（无法相对化）。
  assert.equal(extractTarget('edit', JSON.stringify({ file_path: 'D:/Work/proj/src/a.js' })), 'D:/Work/proj/src/a.js')
})

test('shortenPath: 相对保持 / 相对化 / 超长退化为文件名', () => {
  assert.equal(shortenPath('src/a.js', 'D:/Work/proj'), 'src/a.js')
  assert.equal(shortenPath('D:\\Work\\proj\\src\\a.js', 'D:/Work/proj'), 'src/a.js')
  assert.equal(shortenPath('D:/Work/proj', 'D:/Work/proj'), '') // 与 cwd 相同
  // 相对路径超长 → 文件名（截断前先保信息）。
  assert.equal(shortenPath('src/components/SomeComponentWithAQuiteLongName.js', undefined), 'SomeComponentWithAQuiteLongName.js')
  // 短绝对路径 + 无 cwd → 原样。
  assert.equal(shortenPath('D:/x/a.js', undefined), 'D:/x/a.js')
  assert.equal(relativizePath('D:/Work/proj/src/a.js', 'D:/Work/proj'), 'src/a.js')
  assert.equal(relativizePath('D:/Work/proj/src/a.js', undefined), undefined)
  // 工作区外的 Windows 盘符绝对路径：POSIX 的 path.isAbsolute 不认盘符，
  // 必须跨平台保持原样（不能拼进 cwd）。
  assert.equal(relativizePath('D:/Other/x.txt', 'D:/Work/proj'), 'D:/Other/x.txt')
  assert.equal(relativizePath('D:\\Other\\x.txt', 'D:/Work/proj'), 'D:/Other/x.txt')
})

test('shortenCommand: 命令名 + 首参；flag 丢弃；路径参数套路径缩短（方向 3）', () => {
  assert.equal(shortenCommand('pnpm test --filter x', undefined), 'pnpm test')
  assert.equal(shortenCommand('git status --short', undefined), 'git status')
  assert.equal(shortenCommand('ls -la', undefined), 'ls')
  assert.equal(shortenCommand('python -m pytest', undefined), 'python')
  assert.equal(shortenCommand('rm unused.txt', 'D:/Work/proj'), 'rm unused.txt')
  assert.equal(shortenCommand('Set-Content D:\\Work\\proj\\README.md -Encoding utf8', 'D:/Work/proj'), 'Set-Content README.md')
  assert.equal(shortenCommand('echo "hello world"', undefined), 'echo hello')
  assert.equal(shortenCommand('node', undefined), 'node')
  assert.equal(shortenCommand('  ', undefined), '')
})

test('displayToolName: str_replace_editor 收敛为 edit', () => {
  assert.equal(displayToolName('str_replace_editor'), 'edit')
  assert.equal(displayToolName('edit'), 'edit')
  assert.equal(displayToolName('bash'), 'bash')
  assert.equal(toolCallLabel('str_replace_editor', '{"file_path":"a.txt","old_string":"x","new_string":"y"}'), 'edit a.txt')
  assert.equal(
    toolCallLabel('str_replace_editor', '{"file_path":"D:\\\\Work\\\\proj\\\\a.txt","old_string":"x","new_string":"y"}', 'D:/Work/proj'),
    'edit a.txt',
  )
})

test('toolCallLabel: name + target, or bare name', () => {
  assert.equal(toolCallLabel('edit', '{"file_path":"README.md"}'), 'edit README.md')
  assert.equal(toolCallLabel('bash', '{"command":"pnpm test"}'), 'bash pnpm test')
  assert.equal(toolCallLabel('web_search', '{"query":"npm publish"}'), 'web_search npm publish')
  assert.equal(toolCallLabel('bash', '{}'), 'bash')
  assert.equal(toolCallLabel('bash', undefined), 'bash')
})

test('labelForRecord: exact tool-name match wins', () => {
  const index = indexToolCalls([
    toolCall(1, 1, 'read', '{"file_path":"a.txt"}', 1),
    toolCall(1, 1, 'write', '{"file_path":"b.txt"}', 2),
  ])
  // triggerTool 是 tools/pre-execute 传入的真实工具名 → 精确匹配 write。
  assert.equal(labelForRecord(record({ turn: 1, step: 1, triggerTool: 'write' }), index), 'write b.txt')
})

test('labelForRecord: fs-intent triggers prefer the first mutating tool call', () => {
  const index = indexToolCalls([
    toolCall(1, 1, 'read', '{"file_path":"a.txt"}', 1),
    toolCall(1, 1, 'write', '{"file_path":"b.txt"}', 2),
    toolCall(1, 1, 'grep', '{"pattern":"x"}', 3),
  ])
  // fs/write-intent 无精确名匹配 → 第一个变更型工具（write）。
  assert.equal(labelForRecord(record({ turn: 1, step: 1, triggerTool: 'fs/write-intent' }), index), 'write b.txt')
  assert.equal(labelForRecord(record({ turn: 1, step: 1, triggerTool: 'fs/edit-intent' }), index), 'write b.txt')
})

test('labelForRecord: fallbacks — first call, bare triggerTool, guard', () => {
  // 无精确匹配也非 fs-intent → 步内首个调用（含只读工具）。
  const index = indexToolCalls([toolCall(1, 1, 'read', '{"file_path":"a.txt"}', 1)])
  assert.equal(labelForRecord(record({ turn: 1, step: 1, triggerTool: 'bash' }), index), 'read a.txt')
  // 该 (turn,step) 无调用 → triggerTool 原文。
  assert.equal(labelForRecord(record({ turn: 9, step: 9, triggerTool: 'bash' }), index), 'bash')
  // 事件缺失（索引为空）→ triggerTool 原文。
  assert.equal(labelForRecord(record({ turn: 1, step: 1, triggerTool: 'fs/write-intent' }), new Map()), 'fs/write-intent')
  // 记录形状不完整 → undefined（调用方回退现有格式）。
  assert.equal(labelForRecord({}, new Map()), undefined)
  assert.equal(labelForRecord(undefined, new Map()), undefined)
  // guard 记录固定标注。
  assert.equal(labelForRecord(record({ triggerTool: 'rewind' }), index), 'rewind guard')
})

test('withLabels: attaches labels to record views without mutating them', () => {
  const events = [
    toolCall(1, 1, 'edit', '{"file_path":"README.md"}', 1),
    toolCall(2, 1, 'bash', '{"command":"pnpm test"}', 2),
  ]
  const views = [
    recordView(record({ id: 'a', turn: 1, step: 1, triggerTool: 'fs/edit-intent' })),
    recordView(record({ id: 'b', turn: 2, step: 1, triggerTool: 'bash' })),
    recordView(record({ id: 'c', turn: 7, step: 7, triggerTool: 'write' })),
  ]
  const labeled = withLabels(views, events)
  assert.equal(labeled[0].label, 'edit README.md')
  assert.equal(labeled[1].label, 'bash pnpm test')
  assert.equal(labeled[2].label, 'write') // 无调用 → triggerTool
  assert.equal('label' in views[0], false, '原视图不被修改')
  assert.equal(views[0].triggerTool, 'fs/edit-intent')
  // 事件为 undefined（会话不可用）→ label 全部回退 triggerTool。
  const degraded = withLabels(views, undefined)
  assert.equal(degraded[0].label, 'fs/edit-intent')
  assert.equal(degraded[1].label, 'bash')
})
