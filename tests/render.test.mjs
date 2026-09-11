/**
 * render.test.mjs — Problem → 원자(Atom) HTML 변환 검증.
 * 원자 종류·분할 조각·선지 배치·표·도형·이미지·해설·정답표를 실제 픽스처로 확인한다.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { parseSource } from '../src/parser.js';
import { assignNumbers, groupRanges } from '../src/numbering.js';
import {
  renderBlocks, renderProblem, renderExplanation, renderAnswerTable, choiceLayoutFor,
} from '../src/render.js';

const FIX = fileURLToPath(new URL('./fixtures/', import.meta.url));

/** 픽스처를 읽고 번호·지문 범위까지 채운다. */
function load(name) {
  const text = fs.readFileSync(`${FIX}${name}`, 'utf8');
  const res = parseSource({ id: 's1', name, text, profileId: 'auto' }, null, {});
  assignNumbers(res.problems, { mode: 'sequential', start: 1, pad: 0 });
  groupRanges(res.problems);
  return res.problems;
}

/** 문자열에서 패턴이 몇 번 나오는지. */
function count(html, pattern) {
  return (html.match(pattern) || []).length;
}

/** 블록 트리에서 첫 번째 조건 일치 블록. */
function find(blocks, type) {
  for (const b of blocks || []) {
    if (b.type === type) return b;
    if (b.type === 'box') {
      const inner = find(b.blocks, type);
      if (inner) return inner;
    }
  }
  return null;
}

/* ── 원자 구성 ───────────────────────────────────── */

test('head 원자는 번호와 발문을 한 덩어리로 묶고 data-q를 단다', () => {
  const p = load('kor_reading_set.md')[0];
  const { atoms } = renderProblem(p, { settings: {} });
  const head = atoms.find((a) => a.kind === 'head');
  assert.ok(head.html.startsWith('<div class="q-head" data-q="s1#0">'));
  assert.ok(head.html.includes('<span class="q-num">1</span>'));
  assert.ok(head.html.includes('윗글의 내용과 일치하지 않는 것은?'), '발문이 같은 원자에 있어야 한다');
  assert.equal(head.splittable, false);
  assert.equal(head.keepWithNext, true);
  for (const a of atoms) assert.ok(a.html.includes('data-q="s1#0"'), `${a.kind} 원자에 data-q가 없다`);
});

test('passage 원자는 문단마다 하나, 긴 문단은 splitParts를 준다', () => {
  const p = load('kor_reading_set.md')[0];
  const { atoms } = renderProblem(p, { settings: {} });
  const parts = atoms.filter((a) => a.kind === 'passage');
  assert.equal(parts.length, p.passage.blocks.length);
  assert.equal(parts.length, 5);
  assert.ok(parts[0].html.includes('data-first="1"'));
  assert.ok(parts[parts.length - 1].html.includes('data-last="1"'));
  for (const part of parts) {
    assert.equal(part.splittable, true);
    assert.ok(Array.isArray(part.splitParts) && part.splitParts.length >= 3,
      `긴 지문 문단은 문장 조각 3개 이상이어야 한다 — ${part.splitParts && part.splitParts.length}`);
    for (const piece of part.splitParts) assert.ok(piece.includes('class="passage-part"'));
  }
  assert.equal(atoms[0].kind, 'intro');
  assert.deepEqual(atoms.map((a) => a.kind), ['intro', 'passage', 'passage', 'passage', 'passage', 'passage', 'head', 'choices']);
});

test('계승 문항은 지문 원자를 다시 그리지 않는다', () => {
  const problems = load('kor_reading_set.md');
  assert.equal(problems[1].passage.inherited, true);
  const { atoms } = renderProblem(problems[1], { settings: {} });
  assert.deepEqual(atoms.map((a) => a.kind), ['head', 'choices']);
});

test('발문 뒤 지문(afterStem)은 head 다음에 온다', () => {
  const p = load('kor_grammar.md')[1];
  assert.equal(p.passagePosition, 'afterStem');
  const kinds = renderProblem(p, { settings: {} }).atoms.map((a) => a.kind);
  assert.equal(kinds.indexOf('head') < kinds.indexOf('passage'), true);
  assert.equal(kinds[0], 'head');
});

test('examStyle이면 지문 문항의 안내 문장에 [n~m] 범위가 붙는다', () => {
  const problems = load('kor_reading_set.md');
  const { atoms } = renderProblem(problems[0], { settings: { examStyle: true } });
  const intro = atoms.find((a) => a.kind === 'intro');
  assert.ok(intro.html.includes('[1~3]'), intro.html);
  assert.deepEqual(problems[0].groupRange, { from: 1, to: 3 });
  // 지문을 혼자 쓰는 문항은 범위를 붙이지 않는다.
  const solo = { key: 's1#0', stem: [], choices: [] };
  const soloAtoms = renderProblem(solo, { settings: { examStyle: true } }).atoms;
  assert.equal(soloAtoms.some((a) => a.kind === 'intro'), false);
});

test('problem.title은 showTitle일 때만 head에 들어간다', () => {
  const p = load('kor_mdheading.md')[0];
  assert.equal(p.title, '품사 통용과 띄어쓰기 판정 (기본 소재 안)');
  const off = renderProblem(p, { settings: {} }).atoms.find((a) => a.kind === 'head');
  assert.ok(!off.html.includes('q-title'), '기본값은 제목을 감춘다');
  const on = renderProblem(p, { settings: { showTitle: true } }).atoms.find((a) => a.kind === 'head');
  assert.ok(on.html.includes('<span class="q-title">품사 통용과 띄어쓰기 판정 (기본 소재 안)</span>'));
});

/* ── 선지 ────────────────────────────────────────── */

test('선지 원자는 li 5개와 조각 5개를 갖는다', () => {
  const p = load('kor_lit.md')[0];
  const choices = renderProblem(p, { settings: {} }).atoms.find((a) => a.kind === 'choices');
  assert.equal(count(choices.html, /<li>/gu), 5);
  assert.equal(count(choices.html, /class="c-label"/gu), 5);
  assert.equal(choices.splitParts.length, 5);
  assert.ok(choices.html.startsWith('<ol class="choices layout-list" data-q="s1#0">'));
});

test('선지 배치 판정 4종 — grid5 · grid2 · list · inline', () => {
  const shortChoices = { choices: ['1', '2', '3', '4', '5'].map((t, i) => ({ label: '①②③④⑤'[i], text: t })), choiceLayout: 'auto' };
  assert.equal(choiceLayoutFor(shortChoices, {}), 'grid5', '짧은 수치 선지');
  assert.equal(choiceLayoutFor(load('kor_lit.md')[0], {}), 'list', '긴 서술 선지');
  const inlineChoices = { choices: ['', '', '', '', ''].map((t, i) => ({ label: '①②③④⑤'[i], text: t })), choiceLayout: 'inline' };
  assert.equal(choiceLayoutFor(inlineChoices, {}), 'inline', '인라인 선지');

  const mid = {
    key: 's9#0',
    choices: [
      '수소 기체와 산소 기체의 혼합물',
      '질소 기체와 아르곤 기체의 혼합물',
      '헬륨 기체와 네온 기체의 혼합물',
      '탄소 분말과 규소 분말의 혼합물',
      '칼륨 금속과 칼슘 금속의 혼합물',
    ].map((t, i) => ({ label: '①②③④⑤'[i], text: t })),
    choiceLayout: 'auto',
  };
  assert.equal(choiceLayoutFor(mid, {}), 'grid2', '중간 길이 선지');

  // settings·overrides가 자동 판정보다 세다.
  assert.equal(choiceLayoutFor(mid, { choiceStyle: 'list' }), 'list');
  assert.equal(choiceLayoutFor(mid, { overrides: { 's9#0': { choiceLayout: 'grid5' } } }), 'grid5');
});

test('인라인 선지는 라벨만 그린다', () => {
  const inlineProblem = { key: 's1#0', choices: ['', '', '', '', ''].map((t, i) => ({ label: '①②③④⑤'[i], text: t })), choiceLayout: 'inline', stem: [] };
  const choices = renderProblem(inlineProblem, { settings: {} }).atoms.find((a) => a.kind === 'choices');
  assert.ok(choices.html.includes('layout-inline'));
  assert.equal(count(choices.html, /<li>/gu), 5);
  assert.equal(count(choices.html, /class="c-text"/gu), 0);
});

/* ── 표·목록·도형·이미지 ─────────────────────────── */

test('표는 table.tbl로, 행 수가 원문과 같다', () => {
  const p = load('kor_grammar.md')[1];
  const table = find(p.stem, 'table');
  const html = renderBlocks([table], { settings: {}, subject: '국어' });
  assert.ok(html.startsWith('<table class="tbl">'));
  assert.equal(count(html, /<th\b/gu), 4);
  assert.equal(count(html, /<tr>/gu), 6, '머리 1행 + 본문 5행');
  assert.equal(count(html, /<td/gu), 20);
});

test('스스로 라벨을 단 목록은 점을 찍지 않는다', () => {
  const p = load('kor_grammar.md')[0];
  const box = p.stem.find((b) => b.type === 'box');
  const html = renderBlocks([box], { settings: {}, subject: '국어' });
  assert.ok(html.includes('<ul class="list marked">'));
  assert.equal(count(html, /l-mark/gu), 0, '(가)로 시작하는 항목에 마커를 덧붙이지 않는다');
  assert.equal(count(html, /<li>/gu), 5);

  // 마커가 따로 있는 목록은 l-mark 뒤에 공백 하나를 둔다.
  const list = { type: 'list', marker: 'ㄱ', markers: ['ㄱ', 'ㄴ'], items: ['첫째', '둘째'] };
  const marked = renderBlocks([list], { settings: {}, subject: '국어' });
  assert.ok(marked.includes('<span class="l-mark">ㄱ.</span> <span class="l-text">첫째</span>'), marked);
  assert.ok(marked.includes('<ul class="list marked">'));

  // 라벨 없는 불릿 목록은 그대로 bullet.
  const plain = { type: 'list', marker: '-', markers: ['-', '-'], items: ['그냥 문장', '또 문장'] };
  assert.ok(renderBlocks([plain], { settings: {} }).includes('<ul class="list bullet">'));
});

test('도형 — asciiToSvg를 부르고, confidence가 낮으면 <pre>로 되돌린다', () => {
  const figure = { type: 'figure', text: '+-----------+\n|   A(g)    |\n+-----------+', lang: '', idx: 0 };
  let calls = 0;
  const good = renderBlocks([figure], {
    settings: { figure: { mode: 'svg' } },
    asciiToSvg: (text) => { calls += 1; assert.ok(text.length > 0); return { svg: '<svg id="ok"></svg>', confidence: 0.9 }; },
  });
  assert.equal(calls, 1);
  assert.equal(good, '<figure class="fig svg" data-figure-idx="0"><svg id="ok"></svg></figure>');

  const weak = renderBlocks([figure], {
    settings: { figure: { mode: 'svg' } },
    asciiToSvg: () => ({ svg: '<svg/>', confidence: 0.2 }),
  });
  assert.ok(weak.startsWith('<figure class="fig ascii" data-figure-idx="0"><pre>'));

  // ascii 모드면 변환기를 아예 부르지 않는다.
  let asciiCalls = 0;
  const raw = renderBlocks([figure], {
    settings: { figure: { mode: 'ascii' } },
    asciiToSvg: () => { asciiCalls += 1; return { svg: '<svg/>', confidence: 1 }; },
  });
  assert.equal(asciiCalls, 0);
  assert.ok(raw.includes('<pre>'));

  // 변환기가 던지면 경고를 남기고 원문으로 간다.
  const warnings = [];
  const thrown = renderBlocks([figure], {
    settings: { figure: { mode: 'svg' } },
    problemKey: 's1#0',
    warnings,
    asciiToSvg: () => { throw new Error('깨짐'); },
  });
  assert.ok(thrown.includes('<pre>'));
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('s1#0'));
});

test('이미지 블록 — 이름이 맞으면 img, 못 찾으면 자리표시와 경고', () => {
  const block = { type: 'image', name: 'fig1.png', imageId: null, caption: '그림 1' };
  const images = [{ id: 'img1', name: 'fig1.png', dataUrl: 'data:image/png;base64,AAA' }];
  const ok = renderBlocks([block], { settings: {}, images });
  assert.ok(ok.includes('<figure class="fig img">'));
  assert.ok(ok.includes('src="data:image/png;base64,AAA"'));
  assert.ok(ok.includes('<figcaption>그림 1</figcaption>'));

  const warnings = [];
  const missing = renderBlocks([block], { settings: {}, images: [], warnings, problemKey: 's1#2' });
  assert.equal(missing, '<div class="img-missing">[이미지: fig1.png]</div>');
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('fig1.png'));
});

test('imagePlacements는 슬롯 자리에 material 원자를 끼운다', () => {
  const p = load('kor_lit.md')[0];
  const ctx = {
    settings: {},
    images: [{ id: 'img1', name: 'a.png', dataUrl: 'data:image/png;base64,AAA' }],
    imagePlacements: [{ problemKey: p.key, imageId: 'img1', slot: 'beforeChoices', width: '60%' }],
  };
  const kinds = renderProblem(p, ctx).atoms.map((a) => a.kind);
  assert.equal(kinds[kinds.length - 2], 'material');
  assert.equal(kinds[kinds.length - 1], 'choices');
});

/* ── 해설·정답표 ─────────────────────────────────── */

test('renderExplanation — 정답을 ①~⑤로, 다중은 쉼표로 잇는다', () => {
  const problems = load('kor_grammar.md');
  const single = renderExplanation(problems[0], { settings: {} });
  assert.ok(single.atoms[0].html.includes('<span class="ans">②</span>'));
  assert.equal(single.atoms[0].kind, 'expl-head');

  const multi = renderExplanation(problems[2], { settings: {} });
  assert.ok(multi.atoms[0].html.includes('<span class="ans">①, ②, ③, ④</span>'));

  // [지문] 섹션은 기본으로 "지문 요약"이라 부른다.
  const names = single.atoms.slice(1).map((a) => (a.html.match(/expl-name">([^<]*)</u) || [])[1]);
  assert.deepEqual(names, ['지문 요약', '풀이', '팁']);
  const kept = renderExplanation(problems[0], { settings: {}, renamePassage: false });
  assert.equal((kept.atoms[1].html.match(/expl-name">([^<]*)</u) || [])[1], '지문');

  // 정답이 없으면 —.
  const none = renderExplanation(load('kor_grammar_view.md')[0], { settings: {} });
  assert.ok(none.atoms[0].html.includes('<span class="ans">—</span>'));
});

test('renderAnswerTable — perRow만큼 끊고 빈 칸을 채운다', () => {
  const problems = load('kor_grammar.md');
  const html = renderAnswerTable(problems, { perRow: 2, title: '빠른 정답' });
  assert.ok(html.includes('<h2 class="sheet-title">빠른 정답</h2>'));
  assert.equal(count(html, /<tr>/gu), 2);
  assert.equal(count(html, /class="ans-num"/gu), 3);
  assert.equal(count(html, /class="empty"/gu), 1);
  assert.ok(html.includes('<div class="ans-val">①, ②, ③, ④</div>'));

  const grouped = renderAnswerTable(problems, {
    perRow: 10,
    groups: [{ unit: '문법 심화', subunits: [{ subunit: '', problems }] }],
  });
  assert.ok(grouped.includes('<h3 class="ans-unit">문법 심화</h3>'));
});

test('mdheading 해설은 "풀이" 한 섹션으로 그려진다', () => {
  const p = load('kor_mdheading.md')[2];
  const { atoms } = renderExplanation(p, { settings: {} });
  assert.ok(atoms[0].html.includes('<span class="ans">①, ②, ④</span>'));
  assert.equal(atoms.length, 2);
  assert.ok(atoms[1].html.includes('<span class="expl-name">풀이</span>'));
  assert.ok(atoms[1].html.includes('<ul class="list'));
});
