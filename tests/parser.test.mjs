/**
 * parser.test.mjs — 픽스처 14개를 프로파일 자동 감지로 읽어 문항 수·경고·구조를 검증한다.
 * 기대값은 전부 픽스처를 실제로 읽어 확정한 값이다.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { parseSource, parseProject } from '../src/parser.js';
import { BUILTIN_PROFILES, compileProfile, validateProfile } from '../src/format.js';

const FIX = fileURLToPath(new URL('./fixtures/', import.meta.url));

/** 픽스처 원문. */
function text(name) {
  return fs.readFileSync(`${FIX}${name}`, 'utf8');
}

/** 픽스처 하나를 프로파일 자동 감지로 읽는다. */
function read(name, extra = {}) {
  return parseSource({ id: 's1', name, text: text(name), profileId: 'auto', ...extra }, null, {});
}

/** 블록 트리를 훑어 조건에 맞는 블록을 모은다. */
function collect(blocks, pick, out = []) {
  for (const b of blocks || []) {
    if (pick(b)) out.push(b);
    if (b.type === 'box') collect(b.blocks, pick, out);
  }
  return out;
}

/* ── 1. 픽스처별 문항 수·프로파일·경고 ───────────────── */

const EXPECTED = [
  { file: 'kor_grammar.md', count: 3, profile: 'batch', warnings: 0 },
  { file: 'kor_grammar_view.md', count: 3, profile: 'batch', warnings: 0 },
  { file: 'kor_reading_set.md', count: 5, profile: 'batch', warnings: 1, allow: '문항 내용이 없는 블록을 건너뜁니다' },
  { file: 'kor_lit.md', count: 75, profile: 'batch', warnings: 0 },
  { file: 'eng_batch.md', count: 3, profile: 'batch', warnings: 0 },
  { file: 'eng_insert.md', count: 3, profile: 'batch', warnings: 0 },
  { file: 'math_batch.md', count: 4, profile: 'batch', warnings: 0 },
  { file: 'math_merged.md', count: 28, profile: 'batch', warnings: 0 },
  { file: 'chem_batch3.md', count: 4, profile: 'batch', warnings: 0 },
  { file: 'chem_batch9.md', count: 4, profile: 'batch', warnings: 0 },
  { file: 'chem_batch12.md', count: 4, profile: 'batch', warnings: 0 },
  { file: 'chem_batch15.md', count: 4, profile: 'batch', warnings: 0 },
  { file: 'kor_mdheading.md', count: 3, profile: 'mdheading', warnings: 0 },
  { file: 'kor_mdheading2.md', count: 3, profile: 'mdheading', warnings: 0 },
];

test('픽스처 14개의 문항 수·감지된 프로파일·허용 경고', () => {
  assert.equal(EXPECTED.length, 14);
  for (const spec of EXPECTED) {
    const res = read(spec.file);
    assert.equal(res.problems.length, spec.count, `${spec.file} 문항 수`);
    assert.equal(res.profileId, spec.profile, `${spec.file} 프로파일`);
    assert.equal(res.warnings.length, spec.warnings, `${spec.file} 경고: ${res.warnings.join(' / ')}`);
    if (spec.allow) assert.ok(res.warnings[0].includes(spec.allow), `${spec.file} 경고 문장`);
    for (const p of res.problems) {
      assert.equal(p.key, `s1#${p.index}`);
      assert.equal(p.sourceId, 's1');
    }
  }
});

test('과목은 소스 전체에서 한 번 추정된다', () => {
  assert.equal(read('kor_lit.md').problems[0].subject, '국어');
  assert.equal(read('eng_batch.md').problems[0].subject, '영어');
  assert.equal(read('chem_batch9.md').problems[0].subject, '화학');
  assert.equal(read('kor_mdheading.md').problems[0].subject, '국어');
  assert.equal(read('kor_lit.md', { subject: '수학' }).problems[0].subject, '수학');
});

/* ── 2. 지문 위치·계승 ───────────────────────────── */

test('kor_grammar — 발문 뒤 지문(afterStem)과 지문 계승', () => {
  const { problems } = read('kor_grammar.md');
  assert.equal(problems[0].passagePosition, 'before');
  assert.equal(problems[0].passage.inherited, false);

  assert.equal(problems[1].passagePosition, 'afterStem');
  assert.equal(problems[1].passage.inherited, false);
  assert.equal(problems[1].passage.ownerKey, 's1#1');

  assert.equal(problems[2].passage.inherited, true);
  assert.equal(problems[2].passage.ownerKey, 's1#1');
  // 계승 지문은 복사가 아니라 같은 blocks를 가리킨다.
  assert.equal(problems[2].passage.blocks, problems[1].passage.blocks);
});

test('kor_reading_set — 두 묶음의 지문 계승과 <u> 원문 보존', () => {
  const { problems } = read('kor_reading_set.md');
  assert.deepEqual(problems.map((p) => p.srcNum), ['16', '17', '18', '19', '20']);
  assert.deepEqual(problems.map((p) => p.passage.ownerKey), ['s1#0', 's1#0', 's1#0', 's1#3', 's1#3']);
  assert.deepEqual(problems.map((p) => p.passage.inherited), [false, true, true, false, true]);

  const marked = problems[0].passage.blocks.find((b) => b.type === 'p' && b.text.includes('<u>'));
  assert.ok(marked, '지문에 <u> 문단이 있어야 한다');
  assert.ok(marked.text.includes('㉠<u>피드백(Feedback) 제어 시스템</u>'), '태그가 원문 그대로여야 한다');
});

/* ── 3. 정답 ─────────────────────────────────────── */

test('정답 값과 다중 여부', () => {
  const grammar = read('kor_grammar.md').problems;
  assert.deepEqual(grammar.map((p) => p.answer.values), [[2], [1], [1, 2, 3, 4]]);
  assert.deepEqual(grammar.map((p) => p.answer.multi), [false, false, true]);

  const eng = read('eng_batch.md').problems;
  assert.deepEqual(eng.map((p) => p.answer.values), [[4], [2, 3, 4], [1]]);
  assert.equal(eng[1].answer.multi, true);
  assert.deepEqual(eng.map((p) => p.srcNum), ['01', '02', '03']);

  // _view 파일은 해설·정답이 없다 — 경고 없이 정답만 비어 있어야 한다.
  for (const p of read('kor_grammar_view.md').problems) assert.equal(p.answer, null);
});

/* ── 4. 선지 ─────────────────────────────────────── */

test('eng_insert — 인라인 선지 5개는 라벨만 갖는다', () => {
  const p = read('eng_insert.md').problems[0];
  assert.equal(p.choiceLayout, 'inline');
  assert.equal(p.choices.length, 5);
  assert.deepEqual(p.choices.map((c) => c.label), ['①', '②', '③', '④', '⑤']);
  assert.deepEqual(p.choices.map((c) => c.text), ['', '', '', '', '']);
  assert.ok(p.stem.some((b) => b.type === 'inserted'), '4칸 들여쓴 삽입 문장이 inserted 블록이어야 한다');
});

test('숫자 선지 라벨은 ①②③으로 정규화된다(plain 프로파일)', () => {
  const src = {
    id: 's1',
    name: 'plain.md',
    profileId: 'plain',
    text: [
      '1. 다음 중 옳은 것은?',
      '(1) 첫째',
      '(2) 둘째',
      '(3) 셋째',
      '(4) 넷째',
      '(5) 다섯째',
      '정답: 3',
    ].join('\n'),
  };
  const res = parseSource(src, compileProfile(BUILTIN_PROFILES.plain), {});
  assert.equal(res.problems.length, 1);
  assert.deepEqual(res.problems[0].choices.map((c) => c.label), ['①', '②', '③', '④', '⑤']);
  assert.deepEqual(res.problems[0].answer.values, [3]);
});

test('plain 프로파일 — [지문]…[/지문]과 "답 ③"', () => {
  const src = {
    id: 's2',
    name: 'plain2.md',
    profileId: 'plain',
    text: [
      '1) 윗글의 내용으로 옳은 것은?',
      '[지문]',
      '첫 문단이다.',
      '둘째 문단이다.',
      '[/지문]',
      '① 하나',
      '② 둘',
      '③ 셋',
      '④ 넷',
      '⑤ 다섯',
      '답 ③',
    ].join('\n'),
  };
  const res = parseSource(src, compileProfile(BUILTIN_PROFILES.plain), {});
  const p = res.problems[0];
  assert.equal(p.passage.blocks.length, 2);
  assert.deepEqual(p.answer.values, [3]);
});

/* ── 5. 표·도형 ──────────────────────────────────── */

test('chem 픽스처의 표 행·열 수와 도형 수·위치', () => {
  const b12 = read('chem_batch12.md').problems;
  assert.deepEqual(b12.map((p) => p.figures.length), [1, 1, 0, 0]);
  assert.deepEqual(b12.map((p) => p.figures.map((f) => f.where)), [['stem'], ['stem'], [], []]);

  const t0 = collect(b12[0].stem, (b) => b.type === 'table')[0];
  assert.equal(t0.header.length, 6);
  assert.equal(t0.rows.length, 3);
  assert.equal(t0.rows[0].length, 6);
  assert.equal(t0.header[0], '용액');

  const t2 = collect(b12[2].stem, (b) => b.type === 'table')[0];
  assert.equal(t2.header.length, 5);
  assert.equal(t2.rows.length, 2);

  const b15 = read('chem_batch15.md').problems;
  assert.deepEqual(b15.map((p) => p.figures.length), [1, 1, 0, 1]);
  const t15 = collect(b15[2].stem, (b) => b.type === 'table')[0];
  assert.equal(t15.header.length, 4);
  assert.equal(t15.rows.length, 3);

  for (const name of ['chem_batch3.md', 'chem_batch9.md']) {
    const problems = read(name).problems;
    assert.deepEqual(problems.map((p) => p.figures.length), [1, 1, 1, 1], name);
    for (const p of problems) assert.equal(p.figures[0].idx, 0);
  }
});

test('kor_grammar 2번 — <표> 박스 안 파이프 표', () => {
  const p = read('kor_grammar.md').problems[1];
  const table = collect(p.stem, (b) => b.type === 'table')[0];
  assert.equal(table.header.length, 4);
  assert.equal(table.rows.length, 5);
  assert.equal(table.rows[0].length, 4);
});

/* ── 6. 프로파일 자동 감지 ────────────────────────── */

test('자동 감지는 mdheading 픽스처에서 mdheading을 고른다', () => {
  for (const name of ['kor_mdheading.md', 'kor_mdheading2.md']) {
    assert.equal(read(name).profileId, 'mdheading');
    // profileId가 "batch"로 적혀 있어도 더 잘 읽히는 내장 프로파일로 갈아탄다.
    assert.equal(read(name, { profileId: 'batch' }).profileId, 'mdheading');
    // detect:false면 선언한 프로파일만 쓴다.
    const forced = parseSource(
      { id: 's1', name, text: text(name), profileId: 'batch' },
      compileProfile(BUILTIN_PROFILES.batch),
      { detect: false },
    );
    assert.equal(forced.profileId, 'batch');
    assert.equal(forced.problems.length, 4, 'batch로 읽으면 정답표까지 문항으로 잘못 읽힌다');
  }
});

test('batch 픽스처는 자동 감지에서도 batch를 지킨다', () => {
  for (const name of ['kor_grammar.md', 'eng_insert.md', 'math_batch.md', 'chem_batch3.md']) {
    assert.equal(read(name).profileId, 'batch', name);
  }
});

test('표만 있는 파일은 0문항 + 안내 경고', () => {
  const table = [
    '# 시간 기록부 — problem-2026-9-9',
    '',
    '| 배치 | 문항 | 소요시간 | 결과 |',
    '|:---:|:---:|:---:|:---|',
    '| Batch 1 | 1번 | 미보고 | 정답 (④) |',
    '| Batch 1 | 2번 | 미보고 | 정답 (④) |',
  ].join('\n');
  const res = parseSource({ id: 's9', name: '시간기록.md', text: table, profileId: 'auto' }, null, {});
  assert.equal(res.problems.length, 0);
  assert.equal(res.warnings.length, 1);
  assert.equal(res.warnings[0], '문항으로 읽을 수 없어 건너뜁니다(구분선·[문제]·선지 없음)');
  assert.equal(res.header.title, '시간 기록부 — problem-2026-9-9');
});

/* ── 7. mdheading 상세 ──────────────────────────── */

test('mdheading — 헤더 필드·제목·시간·메타', () => {
  const res = read('kor_mdheading.md');
  assert.equal(res.header.title, 'Batch 14 — 품사 통용 (원본)');
  assert.equal(res.header.fields['영역'], '국어 문법 심화 — 단어(형태론) [품사 통용]');
  assert.equal(res.header.fields['시행일'], '2026-09-09');
  assert.ok(res.header.fields['문항 수'].startsWith('3문항'));

  const [p1, p2, p3] = res.problems;
  assert.deepEqual(res.problems.map((p) => p.srcNum), ['1', '2', '3']);
  assert.deepEqual(res.problems.map((p) => p.time), ['2분', '4분', '4분']);
  assert.equal(p1.title, '품사 통용과 띄어쓰기 판정 (기본 소재 안)');
  assert.equal(p2.title, '품사 통용의 기능적·통사적 검증 (심화)');
  assert.equal(p3.title, '품사 통용의 사전 등재 방식과 경계 현상 (초심화 — 다중 선택형)');
  for (const p of res.problems) {
    assert.ok(p.meta['변형 유형'], `${p.key}: 변형 유형 메타가 있어야 한다`);
    assert.equal(p.meta['풀이 권장 시간'], undefined, '시간 키는 meta가 아니라 time으로 간다');
  }
});

test('mdheading — 정답표가 문항 번호로 붙는다', () => {
  const md = read('kor_mdheading.md').problems;
  assert.deepEqual(md.map((p) => p.answer.values), [[5], [3], [1, 2, 4]]);
  assert.deepEqual(md.map((p) => p.answer.multi), [false, false, true]);
  assert.equal(md[2].answer.raw, '①, ②, ④');

  const md2 = read('kor_mdheading2.md').problems;
  assert.deepEqual(md2.map((p) => p.answer.values), [[5], [3], [1, 2, 3, 4, 5]]);
  // (ALL KILL) 같은 꼬리는 raw에 남는다.
  assert.equal(md2[2].answer.raw, '①, ②, ③, ④, ⑤ (ALL KILL)');

  for (const p of md) {
    assert.equal(p.explanation.sections.length, 1);
    assert.equal(p.explanation.sections[0].name, '풀이');
    // `- ` / `  - ` 들여쓰기 목록은 한 층으로 평탄화된다.
    const blocks = p.explanation.sections[0].blocks;
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].type, 'list');
    assert.equal(blocks[0].items.length, 7);
  }
});

test('mdheading — 펜스 [지문]은 도형이 아니라 지문', () => {
  const [p1, p2, p3] = read('kor_mdheading.md').problems;
  assert.equal(p1.figures.length, 0);
  assert.equal(p1.passagePosition, 'afterStem');
  assert.equal(p1.passage.inherited, false);
  assert.equal(p1.passage.blocks.length, 4);
  assert.ok(p1.passage.blocks[0].text.startsWith('국어에서 동일한 형태의 단어가'));
  assert.ok(!p1.passage.blocks.some((b) => b.text === '[지문]'), '첫 줄 [지문]은 지워진다');

  // [보기 1]/[보기 2] 펜스는 지문이 아니라 box.fenceHead로 <보기> 상자가 된다.
  assert.equal(p2.passage, null);
  assert.equal(p2.figures.length, 0);
  const boxes = p2.stem.filter((b) => b.type === 'box');
  assert.deepEqual(boxes.map((b) => b.title), ['보기 1', '보기 2']);
  assert.ok(boxes[1].blocks.length >= 5, '[보기 2] 펜스 안 문단들이 상자 안 블록으로 들어간다');

  assert.equal(p3.figures.length, 0);
  assert.equal(p3.passage.blocks.length, 5);
});

test('mdheading — 인용줄(> )을 벗겨 <보기>와 선지를 읽는다', () => {
  const [p1, , p3] = read('kor_mdheading.md').problems;
  const box = collect(p1.stem, (b) => b.type === 'box')[0];
  assert.equal(box.title, '보기');
  const list = box.blocks.find((b) => b.type === 'list');
  assert.equal(list.marker, 'ㄱ');
  assert.equal(list.items.length, 6);
  assert.deepEqual(list.markers, ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ']);
  assert.ok(list.items[0].startsWith('대궐 **만큼**'), '굵게 표기는 원문 그대로 남는다');

  // 3번은 선지 자체가 `> ①` 인용줄로 온다.
  assert.equal(p3.choices.length, 5);
  assert.deepEqual(p3.choices.map((c) => c.label), ['①', '②', '③', '④', '⑤']);
  assert.ok(p3.choices[0].text.startsWith("'크다'가"));
  assert.equal(collect(p3.stem, (b) => b.type === 'box').length, 0, '빈 <보기> 상자는 만들지 않는다');
});

test('mdheading — 정답표와 문항이 어긋나면 양쪽 다 경고', () => {
  const src = [
    '# 시험',
    '',
    '---',
    '',
    '### [문항 1] 첫 문항',
    '- **풀이 권장 시간**: 2분',
    '',
    '옳은 것은?',
    '',
    '① 하나',
    '② 둘',
    '③ 셋',
    '④ 넷',
    '⑤ 다섯',
    '',
    '---',
    '',
    '## [정답 및 정밀 해설]',
    '',
    '### [문항 7 정답]: ②',
    '- **정답 선지 해설**:',
    '  - ②번: 그렇다.',
  ].join('\n');
  const res = parseSource({ id: 's1', name: 'x.md', text: src, profileId: 'mdheading' }, null, {});
  assert.equal(res.problems.length, 1);
  assert.equal(res.problems[0].answer, null);
  assert.ok(res.warnings.some((w) => w.includes('[문항 7 정답]에 맞는 문항이 없습니다')));
  assert.ok(res.warnings.some((w) => w.includes('정답표에 [문항 1 정답] 항목이 없습니다')));
});

/* ── 8. 프로파일 스키마 ──────────────────────────── */

test('mdheading은 내장 프로파일이며 스키마 검증을 통과한다', () => {
  assert.deepEqual(Object.keys(BUILTIN_PROFILES), ['batch', 'mdheading', 'plain']);
  for (const [id, json] of Object.entries(BUILTIN_PROFILES)) {
    const v = validateProfile(json);
    assert.equal(v.ok, true, `${id}: ${JSON.stringify(v.errors)}`);
  }
  assert.equal(BUILTIN_PROFILES.mdheading.name, '마크다운 문항 헤딩(### [문항 N])');
  assert.ok(BUILTIN_PROFILES.mdheading.description.length > 0);

  // 새 필드는 batch에서 null이고 컴파일 결과에도 그대로 비어 있다.
  const batch = compileProfile(BUILTIN_PROFILES.batch);
  assert.equal(batch.metaLine, null);
  assert.equal(batch.quotePrefix, null);
  assert.equal(batch.answerKey, null);
  assert.equal(batch.timeKeys, null);
  assert.equal(batch.passage.fenceHead, null);

  const md = compileProfile(BUILTIN_PROFILES.mdheading);
  assert.ok(md.metaLine instanceof RegExp);
  assert.ok(md.quotePrefix instanceof RegExp);
  assert.ok(md.answerKey.entry instanceof RegExp);
  assert.ok(md.passage.fenceHead instanceof RegExp);
  assert.deepEqual(md.timeKeys, ['풀이 권장 시간', '권장 풀이 시간', '풀이시간', '시간']);
});

test('validateProfile은 새 필드의 잘못을 짚는다', () => {
  const bad = validateProfile({ id: 'x', metaLine: '^-\\s*(.*)$', timeKeys: '시간', answerKey: { start: '^##' } });
  assert.equal(bad.ok, false);
  const fields = bad.errors.map((e) => e.field);
  assert.ok(fields.includes('metaLine'));
  assert.ok(fields.includes('timeKeys'));
  assert.ok(fields.includes('answerKey.entry'));

  const badRe = validateProfile({ id: 'y', quotePrefix: '^(>' });
  assert.equal(badRe.ok, false);
  assert.ok(badRe.errors.some((e) => e.field === 'quotePrefix'));
});

/* ── 9. parseProject — 경고 접두 규칙 ─────────────── */

test('parseProject — 소스명은 최상위 경고에만 한 번 붙는다', () => {
  const project = {
    sources: [
      { id: 's1', name: 'kor_reading_set.md', text: text('kor_reading_set.md'), profileId: 'batch', order: 0, enabled: true },
      { id: 's2', name: '시간기록.md', text: '# 기록\n\n| a | b |\n|---|---|\n| 1 | 2 |\n', profileId: 'batch', order: 1, enabled: true },
      { id: 's3', name: '꺼진소스.md', text: text('kor_grammar.md'), profileId: 'batch', order: 2, enabled: false },
    ],
    numbering: { mode: 'sequential', start: 1, pad: 0 },
  };
  const doc = parseProject(project);
  assert.equal(doc.problems.length, 5, '꺼진 소스는 읽지 않는다');
  assert.deepEqual(doc.sources.map((s) => s.count), [5, 0]);
  assert.deepEqual(doc.sources.map((s) => s.profileId), ['batch', 'batch']);

  for (const s of doc.sources) {
    for (const w of s.warnings) assert.ok(!w.startsWith(`${s.name}:`), `sources[].warnings에는 소스명이 없어야 한다 — ${w}`);
  }
  for (const w of doc.warnings) {
    assert.ok(/^(kor_reading_set\.md|시간기록\.md): /u.test(w), `최상위 경고에는 소스명이 한 번 — ${w}`);
    assert.ok(!/^(\S+\.md): \1: /u.test(w), `소스명이 두 번 붙으면 안 된다 — ${w}`);
  }
  assert.ok(doc.warnings.includes('시간기록.md: 문항으로 읽을 수 없어 건너뜁니다(구분선·[문제]·선지 없음)'));
});

test('parseProject — 번호·단원·지문 범위까지 채운다', () => {
  const project = {
    sources: [{ id: 's1', name: 'kor_mdheading.md', text: text('kor_mdheading.md'), profileId: 'auto', order: 0, enabled: true }],
    numbering: { mode: 'sequential', start: 1, pad: 0 },
  };
  const doc = parseProject(project);
  assert.equal(doc.sources[0].profileId, 'mdheading');
  assert.deepEqual(doc.problems.map((p) => p.num), [1, 2, 3]);
  assert.deepEqual(doc.problems.map((p) => p.unit), ['국어 문법 심화', '국어 문법 심화', '국어 문법 심화']);
  assert.deepEqual(doc.problems.map((p) => p.subunit), ['품사 통용', '품사 통용', '품사 통용']);
  assert.deepEqual(doc.problems[0].groupRange, { from: 1, to: 1 });
  assert.equal(doc.warnings.length, 0);
});

test('parseProject — 번호는 단원 그룹 순서(조판 순서)를 따라 단조 증가한다', () => {
  const project = JSON.parse(fs.readFileSync(new URL('./fixtures/project_kor.json', import.meta.url), 'utf8'));
  const doc = parseProject(project);
  const nums = doc.problems.filter((p) => !p.excluded).map((p) => p.num);
  assert.equal(nums[0], 1);
  assert.ok(nums.every((n, i) => i === 0 || n === nums[i - 1] + 1), '본문 순서와 번호가 어긋난다');
  const units = doc.problems.map((p) => p.unit);
  const firstIdx = new Map();
  units.forEach((u, i) => { if (!firstIdx.has(u)) firstIdx.set(u, i); });
  const lastIdx = new Map();
  units.forEach((u, i) => lastIdx.set(u, i));
  for (const u of firstIdx.keys()) {
    const inside = units.slice(firstIdx.get(u), lastIdx.get(u) + 1);
    assert.ok(inside.every((x) => x === u), `단원 "${u}"의 문항이 흩어져 있다`);
  }
});

test('parseProject — hiddenUnits에 속한 문항은 제외되고 활성 문항만 1번부터 번호가 매겨진다', () => {
  const project = {
    sources: [{ id: 's1', name: 'kor_mdheading.md', text: text('kor_mdheading.md'), profileId: 'auto', order: 0, enabled: true }],
    numbering: { mode: 'sequential', start: 1, pad: 0 },
    units: {
      hiddenUnits: ['국어 문법 심화'],
    },
  };
  const doc = parseProject(project);
  assert.equal(doc.problems.length, 3);
  assert.ok(doc.problems.every((p) => p.excluded === true));
  assert.ok(doc.problems.every((p) => p.num === null && p.numText === ''));
});
