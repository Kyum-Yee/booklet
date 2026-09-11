/**
 * units.test.mjs — 대단원·소단원 도출(휴리스틱 · 헤더 필드 · 수동 지정)과 단원별 묶기 검증.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { deriveUnits, splitHeaderUnit, assignUnits, groupByUnits } from '../src/units.js';
import { parseSource } from '../src/parser.js';

const FIX = fileURLToPath(new URL('./fixtures/', import.meta.url));

/** ref만 가진 최소 문항. */
function withRef(rest, title) {
  return { key: 's1#0', sourceId: 's1', ref: { raw: '', page: null, title, srcProblem: null, rest } };
}

/* ── ref 휴리스틱 ───────────────────────────────── */

test('휴리스틱 1 — " — "로 가른다', () => {
  const u = deriveUnits(withRef('문법 심화 — 문장 홑문장·겹문장 판별', '홑문장·겹문장 판별'), null, null);
  assert.deepEqual(u, { unit: '문법 심화', subunit: '문장 홑문장·겹문장 판별', from: 'ref' });
});

test('휴리스틱 2 — "유형 01"·"연습 문제" 앞에서 가른다', () => {
  assert.deepEqual(
    deriveUnits(withRef('03 미분계수와 도함수 유형 01 평균변화율', '유형 01 평균변화율'), null, null),
    { unit: '03 미분계수와 도함수', subunit: '유형 01 평균변화율', from: 'ref' },
  );
  assert.deepEqual(
    deriveUnits(withRef('용액의 성질 연습 문제', '용액의 성질 연습 문제'), null, null),
    { unit: '용액의 성질', subunit: '연습 문제', from: 'ref' },
  );
});

test('휴리스틱 3 — 로마 숫자 대단원 번호 뒤에서 가른다', () => {
  assert.deepEqual(
    deriveUnits(withRef('Ⅱ. 용액의 성질 어는점 내림 계산 문제', ''), null, null),
    { unit: 'Ⅱ. 용액의 성질 어는점 내림', subunit: '계산 문제', from: 'ref' },
  );
});

test('휴리스틱 4 — 가르지 못하면 rest 전체가 대단원, ref 제목이 소단원', () => {
  assert.deepEqual(
    deriveUnits(withRef('{현대소설 3. 1960년대 소설 ❶}', '크리스마스 캐럴 5'), null, null),
    { unit: '현대소설 3. 1960년대 소설 ❶', subunit: '크리스마스 캐럴 5', from: 'ref' },
  );
  // rest가 비면 제목만 남는다.
  assert.deepEqual(
    deriveUnits(withRef('', '크리스마스 캐럴 5'), null, null),
    { unit: '', subunit: '크리스마스 캐럴 5', from: 'ref' },
  );
  assert.deepEqual(deriveUnits({ key: 's1#0', ref: null }, null, null), { unit: '', subunit: '', from: 'none' });
});

/* ── 헤더 필드 ──────────────────────────────────── */

test('splitHeaderUnit — " / " · " — " · " — … [소단원]"', () => {
  assert.deepEqual(splitHeaderUnit('문법 심화 / 문장'), { unit: '문법 심화', subunit: '문장' });
  assert.deepEqual(splitHeaderUnit('국어 — 문학'), { unit: '국어', subunit: '문학' });
  assert.deepEqual(
    splitHeaderUnit('국어 문법 심화 — 단어(형태론) [품사 통용]'),
    { unit: '국어 문법 심화', subunit: '품사 통용' },
  );
  // 괄호가 있으면 " / "로 가르지 않는다(원문에 슬래시가 든 단원명 보호).
  assert.deepEqual(splitHeaderUnit('기체(이상) / 실제'), { unit: '기체(이상) / 실제', subunit: '' });
  assert.deepEqual(splitHeaderUnit('Ⅰ-1. 기체의 성질'), { unit: 'Ⅰ-1. 기체의 성질', subunit: '' });
  assert.equal(splitHeaderUnit(''), null);
});

test('헤더 "단원: A / B"는 대단원 A · 소단원 B', () => {
  assert.deepEqual(
    deriveUnits({ key: 's1#0', ref: null }, null, { fields: { '단원': '문법 심화 / 문장' } }),
    { unit: '문법 심화', subunit: '문장', from: 'header' },
  );
});

test('헤더 "영역: A — B [C]"는 대단원 A · 소단원 C', () => {
  assert.deepEqual(
    deriveUnits({ key: 's1#0', ref: null }, null, { fields: { '영역': '국어 문법 심화 — 단어(형태론) [품사 통용]' } }),
    { unit: '국어 문법 심화', subunit: '품사 통용', from: 'header' },
  );
});

test('헤더 제목은 단원 도출에 쓰지 않는다', () => {
  const header = { title: 'Batch 14 — 품사 통용 (원본)', fields: {} };
  assert.deepEqual(deriveUnits({ key: 's1#0', ref: null }, null, header), { unit: '', subunit: '', from: 'none' });
});

test('ref 제목이 있으면 헤더 소단원보다 앞선다', () => {
  const header = { fields: { '단원': 'Ⅰ-1. 기체의 성질' } };
  assert.deepEqual(
    deriveUnits(withRef('기체의 성질 심화', 'ref 제목'), null, header),
    { unit: 'Ⅰ-1. 기체의 성질', subunit: 'ref 제목', from: 'header' },
  );
});

test('소스에 직접 지정한 단원이 가장 세다', () => {
  const source = { id: 's1', unit: '직접 지정', subunit: '직접 소단원' };
  assert.deepEqual(
    deriveUnits(withRef('문법 심화 — 문장', '제목'), source, { fields: { '단원': '무시됨' } }),
    { unit: '직접 지정', subunit: '직접 소단원', from: 'map' },
  );
});

/* ── assignUnits · units.map ────────────────────── */

test('units.map — 정확한 키가 s1#* 와일드카드보다 앞선다', () => {
  const problems = [
    { key: 's1#0', sourceId: 's1', ref: null, header: null },
    { key: 's1#1', sourceId: 's1', ref: null, header: null },
    { key: 's2#0', sourceId: 's2', ref: null, header: null },
  ];
  const project = {
    sources: [{ id: 's1' }, { id: 's2' }],
    units: {
      map: {
        's1#1': { unit: '콕 집은 단원', subunit: '콕 집은 소단원' },
        's1#*': { unit: '소스 전체 단원', subunit: '소스 전체 소단원' },
      },
    },
  };
  assignUnits(problems, project);
  assert.deepEqual(problems.map((p) => p.unit), ['소스 전체 단원', '콕 집은 단원', '']);
  assert.deepEqual(problems.map((p) => p.unitFrom), ['map', 'map', 'none']);
});

test('assignUnits — 픽스처의 헤더·ref로 단원이 채워진다', () => {
  const project = {
    sources: [
      { id: 's1', name: 'kor_grammar.md', profileId: 'batch', order: 0, enabled: true },
      { id: 's2', name: 'kor_mdheading.md', profileId: 'mdheading', order: 1, enabled: true },
    ],
    units: {},
  };
  const problems = [];
  for (const s of project.sources) {
    const text = fs.readFileSync(`${FIX}${s.name}`, 'utf8');
    const res = parseSource({ ...s, text, profileId: 'auto' }, null, {});
    problems.push(...res.problems);
  }
  assignUnits(problems, project);
  const kor = problems.filter((p) => p.sourceId === 's1');
  assert.deepEqual(kor.map((p) => p.unit), ['문법 심화', '문법 심화', '문법 심화']);
  assert.equal(kor[0].unitFrom, 'ref');

  const mdh = problems.filter((p) => p.sourceId === 's2');
  assert.deepEqual(mdh.map((p) => p.unit), Array(3).fill('국어 문법 심화'));
  assert.equal(mdh[0].unitFrom, 'header');
});

/* ── groupByUnits ───────────────────────────────── */

test('groupByUnits — order·suborder를 따르고 나머지는 등장 순', () => {
  const mk = (key, unit, subunit) => ({ key, unit, subunit, excluded: false });
  const problems = [
    mk('a', 'Ⅱ. 용액', '총괄성'),
    mk('b', 'Ⅰ. 기체', '기체 법칙'),
    mk('c', 'Ⅰ. 기체', '분압'),
    mk('d', 'Ⅱ. 용액', '농도'),
    mk('e', 'Ⅲ. 반응', ''),
  ];
  const groups = groupByUnits(problems, {
    order: ['Ⅰ. 기체', 'Ⅱ. 용액'],
    suborder: { 'Ⅱ. 용액': ['농도', '총괄성'] },
  });
  assert.deepEqual(groups.map((g) => g.unit), ['Ⅰ. 기체', 'Ⅱ. 용액', 'Ⅲ. 반응']);
  assert.deepEqual(groups[0].subunits.map((s) => s.subunit), ['기체 법칙', '분압'], '지정이 없으면 등장 순');
  assert.deepEqual(groups[1].subunits.map((s) => s.subunit), ['농도', '총괄성'], 'suborder를 따른다');
  assert.deepEqual(groups[1].subunits.map((s) => s.problems.map((p) => p.key)), [['d'], ['a']]);
  assert.deepEqual(groups[2].subunits.map((s) => s.subunit), ['']);
});

test('groupByUnits — 제외된 문항은 빼고, 단원 없는 문항은 "" 묶음', () => {
  const problems = [
    { key: 'a', unit: '', subunit: '', excluded: false },
    { key: 'b', unit: '', subunit: '', excluded: true },
    { key: 'c', unit: 'Ⅰ', subunit: '', excluded: false },
  ];
  const groups = groupByUnits(problems, {});
  assert.deepEqual(groups.map((g) => g.unit), ['', 'Ⅰ']);
  assert.deepEqual(groups[0].subunits[0].problems.map((p) => p.key), ['a']);
});
