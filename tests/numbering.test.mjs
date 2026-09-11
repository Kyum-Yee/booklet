/**
 * numbering.test.mjs — 번호 정리(sequential · source · perUnit)와 지문 범위 [n~m] 검증.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { assignNumbers, groupRanges, formatNum } from '../src/numbering.js';
import { parseSource } from '../src/parser.js';

const FIX = fileURLToPath(new URL('./fixtures/', import.meta.url));

/** 번호 시험용 최소 문항. */
function stub(index, srcNum, unit = '', excluded = false) {
  return {
    key: `s1#${index}`,
    sourceId: 's1',
    index,
    srcNum,
    num: null,
    unit,
    subunit: '',
    excluded,
    passage: null,
    warnings: [],
  };
}

/* ── formatNum ──────────────────────────────────── */

test('formatNum — pad만큼 0을 채운다', () => {
  assert.equal(formatNum(7, 0), '7');
  assert.equal(formatNum(7, 2), '07');
  assert.equal(formatNum(123, 2), '123');
});

/* ── sequential ─────────────────────────────────── */

test('sequential — 등장 순으로 1부터, start·pad를 따른다', () => {
  const problems = [stub(0, '5'), stub(1, '1'), stub(2, null)];
  assignNumbers(problems, { mode: 'sequential', start: 1, pad: 0 });
  assert.deepEqual(problems.map((p) => p.num), [1, 2, 3]);
  assert.deepEqual(problems.map((p) => p.numText), ['1', '2', '3']);

  assignNumbers(problems, { mode: 'sequential', start: 9, pad: 2 });
  assert.deepEqual(problems.map((p) => p.num), [9, 10, 11]);
  assert.deepEqual(problems.map((p) => p.numText), ['09', '10', '11']);
});

test('sequential — 제외된 문항은 번호를 건너뛴다', () => {
  const problems = [stub(0, '1'), stub(1, '2', '', true), stub(2, '3')];
  assignNumbers(problems, { mode: 'sequential', start: 1 });
  assert.deepEqual(problems.map((p) => p.num), [1, null, 2]);
});

/* ── source ─────────────────────────────────────── */

test('source — "01"은 1로 읽는다', () => {
  const problems = [stub(0, '01'), stub(1, '02'), stub(2, '03')];
  assignNumbers(problems, { mode: 'source', start: 1, pad: 2 });
  assert.deepEqual(problems.map((p) => p.num), [1, 2, 3]);
  assert.deepEqual(problems.map((p) => p.numText), ['01', '02', '03']);
  assert.deepEqual(problems.flatMap((p) => p.warnings), []);
});

test('source — 중복·역행·결측은 보정하고 경고를 남긴다', () => {
  const problems = [stub(0, '5'), stub(1, '5'), stub(2, '2'), stub(3, null)];
  assignNumbers(problems, { mode: 'source', start: 1 });
  assert.deepEqual(problems.map((p) => p.num), [5, 6, 7, 8]);
  assert.equal(problems[0].warnings.length, 0);
  assert.ok(problems[1].warnings[0].includes('겹쳐'), problems[1].warnings[0]);
  assert.ok(problems[2].warnings[0].includes('앞 문항보다 작아'), problems[2].warnings[0]);
  assert.ok(problems[3].warnings[0].includes('원문 번호가 없어'), problems[3].warnings[0]);
  for (const p of problems) for (const w of p.warnings) assert.ok(w.startsWith(`${p.key}: `));
});

test('source — 번호 충돌을 잡아낸다', () => {
  const text = `---
[문제]
1 (2분)
발문 1
① a ② b ③ c ④ d ⑤ e
[해설]
[정답] 1
---
[문제]
1 (2분)
발문 2
① a ② b ③ c ④ d ⑤ e
[해설]
[정답] 1`;
  const { problems } = parseSource({ id: 's1', name: 'collision.md', text, profileId: 'batch' }, null, {});
  assert.equal(problems.length, 2);
  assignNumbers(problems, { mode: 'source', start: 1 });
  const nums = problems.map((p) => p.num);
  assert.deepEqual(nums, [1, 2], '보정 뒤에는 번호가 오름차순이어야 한다');
  assert.equal(new Set(nums).size, 2, '번호가 겹치면 안 된다');
  assert.ok(problems.some((p) => p.warnings.length > 0), '겹치는 원문 번호가 있으므로 경고가 있어야 한다');
});

/* ── perUnit ────────────────────────────────────── */

test('perUnit — 대단원마다 start부터 다시 센다', () => {
  const problems = [
    stub(0, '1', 'Ⅰ. 기체'), stub(1, '2', 'Ⅰ. 기체'),
    stub(2, '3', 'Ⅱ. 용액'), stub(3, '4', 'Ⅱ. 용액'), stub(4, '5', 'Ⅱ. 용액'),
  ];
  assignNumbers(problems, { mode: 'perUnit', start: 1 });
  assert.deepEqual(problems.map((p) => p.num), [1, 2, 1, 2, 3]);

  assignNumbers(problems, { mode: 'perUnit', start: 101, pad: 0 });
  assert.deepEqual(problems.map((p) => p.num), [101, 102, 101, 102, 103]);
});

test('perUnit — groups를 주면 그 순서대로 센다', () => {
  const a = stub(0, '1', 'Ⅱ. 용액');
  const b = stub(1, '2', 'Ⅱ. 용액');
  const c = stub(2, '3', 'Ⅰ. 기체');
  const groups = [
    { unit: 'Ⅰ. 기체', subunits: [{ subunit: '', problems: [c] }] },
    { unit: 'Ⅱ. 용액', subunits: [{ subunit: '', problems: [a, b] }] },
  ];
  assignNumbers([a, b, c], { mode: 'perUnit', start: 1 }, groups);
  assert.equal(c.num, 1);
  assert.equal(a.num, 1);
  assert.equal(b.num, 2);
});

/* ── groupRanges ────────────────────────────────── */

test('groupRanges — 같은 지문을 쓰는 문항의 [n~m]', () => {
  const text = fs.readFileSync(`${FIX}kor_reading_set.md`, 'utf8');
  const { problems } = parseSource({ id: 's1', name: 'kor_reading_set.md', text, profileId: 'auto' }, null, {});
  assignNumbers(problems, { mode: 'sequential', start: 1 });
  groupRanges(problems);
  assert.deepEqual(problems.map((p) => p.groupRange), [
    { from: 1, to: 3 }, { from: 1, to: 3 }, { from: 1, to: 3 },
    { from: 4, to: 5 }, { from: 4, to: 5 },
  ]);
  // 같은 묶음은 같은 객체를 공유한다.
  assert.equal(problems[0].groupRange, problems[2].groupRange);
});

test('groupRanges — 지문 없는 문항은 groupRange가 null', () => {
  const problems = [stub(0, '1'), stub(1, '2')];
  assignNumbers(problems, { mode: 'sequential', start: 1 });
  groupRanges(problems);
  assert.deepEqual(problems.map((p) => p.groupRange), [null, null]);
});
