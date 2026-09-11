// options.test.mjs — 열거형 사전의 뼈대(values·default), DESIGN §2.6 기본값,
// 격자 id 왕복, 선택지 HTML, 유효성 판정. 여기가 깨지면 UI와 store의 기본값이 갈라진 것이다.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ALL_ENUMS,
  CHOICE_STYLE,
  ENUM_PATHS,
  FONT_FAMILY,
  GRID,
  HEADER_TOKENS,
  IMAGE_SLOT,
  IMAGE_WIDTH,
  KEEP_KEYS,
  LIMITS,
  NUMBERING_MODE,
  PAGE_SIZE,
  PREFER_VARIANT,
  PROFILE_ID,
  RULE_SCOPE,
  SUBJECT,
  clamp,
  defaults,
  figureSlot,
  flagDefaults,
  gridFromId,
  gridId,
  imageSlotOptions,
  isValid,
  labelOf,
  omit,
  optionsHtml,
  pageMm,
  sanitizeEnums,
} from '../src/options.js';

import { defaultLayout, defaultProject, mergeProject } from '../src/store.js';

/* ─────────────────────────── 뼈대 ─────────────────────────── */

test('모든 열거형이 values·default를 갖고 기본값이 목록 안에 있다', () => {
  const names = Object.keys(ALL_ENUMS);
  assert.ok(names.length >= 22, `열거형이 ${names.length}개뿐입니다`);
  for (const [name, e] of Object.entries(ALL_ENUMS)) {
    assert.ok(Array.isArray(e.values) && e.values.length > 0, `${name}: values가 비었습니다`);
    assert.equal(typeof e.default, 'string', `${name}: default가 문자열이 아닙니다`);
    assert.ok(e.byId[e.default], `${name}: 기본값 "${e.default}"이 목록에 없습니다`);
    assert.equal(e.name, name, `${name}: 이름표가 어긋납니다`);
  }
});

test('값마다 id와 한국어 라벨이 있고 id가 겹치지 않는다', () => {
  for (const [name, e] of Object.entries(ALL_ENUMS)) {
    const seen = new Set();
    for (const v of e.values) {
      assert.equal(typeof v.id, 'string', `${name}: id가 없는 값이 있습니다`);
      assert.ok(v.label && v.label.trim(), `${name}/${v.id}: 라벨이 비었습니다`);
      assert.ok(!seen.has(v.id), `${name}: id "${v.id}"가 두 번 나옵니다`);
      seen.add(v.id);
    }
  }
});

test('열거형은 Object.freeze로 봉인돼 밖에서 목록을 늘릴 수 없다', () => {
  assert.ok(Object.isFrozen(GRID) && Object.isFrozen(GRID.values));
  assert.throws(() => { GRID.values.push({ id: '3x3' }); });
  assert.throws(() => { CHOICE_STYLE.default = 'list'; });
});

test('ids 거울은 자기 id를 그대로 가리킨다', () => {
  assert.equal(CHOICE_STYLE.ids.grid5, 'grid5');
  assert.equal(NUMBERING_MODE.ids.perUnit, 'perUnit');
  assert.equal(RULE_SCOPE.ids.all, 'all');
  assert.equal(IMAGE_SLOT.ids.beforeChoices, 'beforeChoices');
});

/* ─────────────────────────── DESIGN §2.6 기본값 ─────────────────────────── */

test('defaults()가 DESIGN §2.6 기본값과 한 자도 다르지 않다', () => {
  const d = defaults();
  assert.equal(d.page, 'A4');
  assert.equal(d.orientation, 'portrait');
  assert.deepEqual(d.margin, { top: 18, right: 14, bottom: 16, left: 14 });
  assert.deepEqual(d.grid, { cols: 2, rows: 1 });
  assert.equal(d.gutter, 8);
  assert.equal(d.rowGap, 6);
  assert.equal(d.columnRule, true);
  assert.equal(d.rowRule, false);
  assert.equal(d.fillOrder, 'auto');
  assert.equal(d.font.size, 10);
  assert.equal(d.font.lineHeight, 1.55);
  assert.equal(d.font.mathScale, 1);
  assert.match(d.font.family, /Noto Serif KR/u);
  assert.deepEqual(d.header, { left: '{title}', center: '', right: '{unit}' });
  assert.deepEqual(d.footer, { left: '', center: '{page}', right: '' });
  assert.equal(d.examStyle, false);
  assert.equal(d.problemGap, 5);
  assert.equal(d.numberStyle, 'plain');
  assert.equal(d.passageStyle, 'boxed');
  assert.equal(d.choiceStyle, 'auto');
  assert.deepEqual(d.keep, {
    headWithStem: true,
    stemWithFirstChoice: true,
    choicesTogether: true,
    allowPassageSplit: true,
    allowTableSplit: true,
    bandWithFirst: true,
    passageWithFirst: true,
    shrinkToKeep: true,
  });
  assert.deepEqual(d.perPage, { min: 0, max: 0 });
  assert.deepEqual(d.perPageRules, []);
  assert.deepEqual(d.perPageFont, { enabled: true, minSize: 8, step: 0.25 });
  assert.deepEqual(d.figure, { mode: 'svg', maxWidth: 100 });
  assert.deepEqual(d.unitBand, { enabled: true, style: 'band' });
  assert.deepEqual(d.subunitBand, { enabled: true });
});

test('defaults()는 부를 때마다 새 객체다(한 프로젝트를 고쳐도 다음 프로젝트가 안 물든다)', () => {
  const a = defaults();
  const b = defaults();
  assert.notEqual(a, b);
  assert.notEqual(a.margin, b.margin);
  a.margin.top = 99;
  a.keep.choicesTogether = false;
  assert.equal(defaults().margin.top, 18);
  assert.equal(defaults().keep.choicesTogether, true);
});

test('store.defaultLayout()이 options.defaults()와 같다(기본값이 두 곳으로 갈라지지 않는다)', () => {
  assert.deepEqual(defaultLayout(), defaults());
});

test('새 프로젝트의 열거형 자리는 모두 각 열거형의 기본값이다', () => {
  const p = defaultProject();
  assert.equal(p.numbering.mode, NUMBERING_MODE.default);
  assert.equal(p.units.source, 'auto');
  assert.equal(p.sheets.answers.perRow, LIMITS.perRow.default);
  assert.deepEqual(flagDefaults(ALL_ENUMS.TOC_OPTIONS), { front: true, perUnit: true, pageNumbers: true });
});

/* ─────────────────────────── 격자 ─────────────────────────── */

test('gridFromId / gridId 왕복', () => {
  for (const v of GRID.values) {
    const g = gridFromId(v.id);
    assert.deepEqual(g, { cols: v.cols, rows: v.rows });
    assert.equal(gridId(g), v.id);
  }
  assert.deepEqual(gridFromId('2x1'), { cols: 2, rows: 1 });
  assert.equal(gridId({ cols: 1, rows: 2 }), '1x2');
});

test('모르는 격자는 기본 격자로 떨어진다', () => {
  assert.deepEqual(gridFromId('9x9'), { cols: 2, rows: 1 });
  assert.equal(gridId({ cols: 3, rows: 7 }), GRID.default);
  assert.equal(gridId(null), GRID.default);
});

/* ─────────────────────────── 용지 ─────────────────────────── */

test('pageMm이 프리셋과 { w, h } 객체를 모두 mm로 돌려준다', () => {
  assert.deepEqual(pageMm('A4'), { w: 210, h: 297 });
  assert.deepEqual(pageMm('B5'), { w: 182, h: 257 });
  assert.deepEqual(pageMm({ w: 100, h: 150 }), { w: 100, h: 150 });
  assert.deepEqual(pageMm('없는용지'), { w: 210, h: 297 });
  // custom은 치수가 없는 표지 값이라 A4로 떨어진다.
  assert.deepEqual(pageMm('custom'), { w: 210, h: 297 });
});

test('용지는 프리셋 id와 { w, h } 객체를 모두 유효한 입력으로 받는다', () => {
  assert.equal(isValid(PAGE_SIZE, 'Letter'), true);
  assert.equal(isValid(PAGE_SIZE, { w: 200, h: 300 }), true);
  assert.equal(isValid(PAGE_SIZE, { w: 'x' }), false);
  assert.equal(isValid(PAGE_SIZE, 'A3'), false);
});

/* ─────────────────────────── isValid · labelOf ─────────────────────────── */

test('isValid가 목록 밖 값을 거부한다', () => {
  assert.equal(isValid(CHOICE_STYLE, 'grid5'), true);
  assert.equal(isValid(CHOICE_STYLE, 'grid3'), false);
  assert.equal(isValid(NUMBERING_MODE, 'perUnit'), true);
  assert.equal(isValid(NUMBERING_MODE, 'PERUNIT'), false);
  assert.equal(isValid(SUBJECT, '국어'), true);
  assert.equal(isValid(SUBJECT, '물리'), false);
  assert.equal(isValid(PREFER_VARIANT, 'view'), true);
  assert.equal(isValid(PREFER_VARIANT, 'View'), false);
  assert.equal(isValid(CHOICE_STYLE, undefined), false);
  assert.equal(isValid(CHOICE_STYLE, null), false);
});

test('figure:<n> 슬롯은 목록에 없어도 pattern으로 통과한다', () => {
  assert.equal(isValid(IMAGE_SLOT, 'afterStem'), true);
  assert.equal(isValid(IMAGE_SLOT, figureSlot(0)), true);
  assert.equal(isValid(IMAGE_SLOT, 'figure:12'), true);
  assert.equal(isValid(IMAGE_SLOT, 'figure:a'), false);
  assert.equal(isValid(IMAGE_SLOT, 'figure:'), false);
});

test('이미지 폭은 프리셋 밖의 CSS 길이도 받는다', () => {
  assert.equal(isValid(IMAGE_WIDTH, '75%'), true);
  assert.equal(isValid(IMAGE_WIDTH, '42%'), true);
  assert.equal(isValid(IMAGE_WIDTH, '8em'), true);
  assert.equal(isValid(IMAGE_WIDTH, '넓게'), false);
});

test('labelOf가 한국어 라벨을 돌려주고 도형 자리는 사람이 세는 번호로 옮긴다', () => {
  assert.equal(labelOf(CHOICE_STYLE, 'grid5'), '5열');
  assert.equal(labelOf(NUMBERING_MODE, 'source'), '원문 번호 그대로');
  assert.equal(labelOf(IMAGE_SLOT, 'figure:2'), '도형 3 자리');
  assert.equal(labelOf(IMAGE_SLOT, '없는자리'), '없는자리');
});

/* ─────────────────────────── optionsHtml ─────────────────────────── */

test('optionsHtml이 값 수만큼 option을 만들고 고른 것 하나만 표시한다', () => {
  const html = optionsHtml(CHOICE_STYLE, 'grid2');
  assert.equal((html.match(/<option /gu) || []).length, CHOICE_STYLE.values.length);
  assert.match(html, /<option value="grid2" selected/u);
  assert.equal((html.match(/ selected/gu) || []).length, 1);
  assert.match(html, /<option value="list"[^>]*>세로 목록<\/option>/u);
});

test('optionsHtml은 고를 값을 안 주면 열거형 기본값을 고른다', () => {
  assert.match(optionsHtml(NUMBERING_MODE), /value="sequential" selected/u);
  // 목록에 없는 값을 주면 아무것도 고르지 않는다(브라우저가 첫 항목을 보여 준다).
  assert.equal((optionsHtml(NUMBERING_MODE, '없는모드').match(/ selected/gu) || []).length, 0);
});

test('optionsHtml이 따옴표가 든 값을 속성으로 안전하게 감싼다', () => {
  const html = optionsHtml(FONT_FAMILY, FONT_FAMILY.default);
  assert.ok(!/value="[^"]*'/u.test(html), '작은따옴표가 속성 안에 날것으로 남았습니다');
  assert.match(html, /&#39;Noto Serif KR&#39;/u);
});

test('optionsHtml이 배열도 그대로 받는다(omit으로 덜어 낸 목록)', () => {
  const html = optionsHtml(omit(RULE_SCOPE, 'all'), 'choices');
  assert.equal((html.match(/<option /gu) || []).length, RULE_SCOPE.values.length - 1);
  assert.ok(!html.includes('value="all"'));
  assert.match(html, /value="choices" selected/u);
});

test('imageSlotOptions가 고정 자리 뒤에 도형 자리를 붙인다', () => {
  const list = imageSlotOptions(3);
  assert.equal(list.length, IMAGE_SLOT.values.length + 3);
  assert.equal(list[list.length - 1].id, 'figure:2');
  assert.equal(list[list.length - 1].label, '도형 3 자리');
  assert.equal(imageSlotOptions(0).length, IMAGE_SLOT.values.length);
});

/* ─────────────────────────── 한계 ─────────────────────────── */

test('LIMITS의 모든 항목이 min ≤ default ≤ max를 지킨다', () => {
  for (const [key, lim] of Object.entries(LIMITS)) {
    assert.ok(lim.min <= lim.max, `${key}: min이 max보다 큽니다`);
    const values = typeof lim.default === 'object' ? Object.values(lim.default) : [lim.default];
    for (const v of values) {
      assert.ok(v >= lim.min && v <= lim.max, `${key}: 기본값 ${v}이(가) 범위 밖입니다`);
    }
  }
});

test('LIMITS가 명세한 범위를 그대로 갖는다', () => {
  assert.deepEqual([LIMITS.fontSize.min, LIMITS.fontSize.max], [7, 14]);
  assert.deepEqual([LIMITS.lineHeight.min, LIMITS.lineHeight.max], [1.2, 2.0]);
  assert.deepEqual([LIMITS.margin.min, LIMITS.margin.max], [0, 40]);
  assert.deepEqual([LIMITS.gutter.min, LIMITS.gutter.max], [0, 20]);
  assert.deepEqual([LIMITS.zoom.min, LIMITS.zoom.max], [0.3, 2.0]);
  assert.deepEqual([LIMITS.perRow.min, LIMITS.perRow.max], [5, 20]);
  assert.equal(LIMITS.autosave.max, 4 * 1024 * 1024);
});

test('clamp가 값을 한계 안으로 밀어 넣는다', () => {
  assert.equal(clamp('fontSize', 3), 7);
  assert.equal(clamp('fontSize', 99), 14);
  assert.equal(clamp('fontSize', 10.5), 10.5);
  assert.equal(clamp('fontSize', '느슨'), 10);
  assert.equal(clamp('없는키', 5), 5);
});

/* ─────────────────────────── 검증 ─────────────────────────── */

test('sanitizeEnums가 목록 밖 값을 기본값으로 되돌리고 경고를 남긴다', () => {
  const p = defaultProject();
  p.layout.choiceStyle = 'grid7';
  p.layout.figure.mode = 'png';
  p.numbering.mode = 'random';
  const warnings = sanitizeEnums(p);
  assert.equal(p.layout.choiceStyle, 'auto');
  assert.equal(p.layout.figure.mode, 'svg');
  assert.equal(p.numbering.mode, 'sequential');
  assert.equal(warnings.length, 3);
  for (const w of warnings) assert.match(w, /되돌렸습니다/u);
});

test('sanitizeEnums는 멀쩡한 프로젝트를 건드리지 않는다', () => {
  const p = defaultProject();
  p.layout.page = { w: 200, h: 280 };
  assert.deepEqual(sanitizeEnums(p), []);
  assert.deepEqual(p.layout.page, { w: 200, h: 280 });
});

test('sanitizeEnums가 문항별 선지 배치 덮어쓰기도 훑는다', () => {
  const p = defaultProject();
  p.overrides = { 's1#0': { choiceLayout: 'grid9' }, 's1#1': { choiceLayout: 'grid2' } };
  const warnings = sanitizeEnums(p);
  assert.equal(p.overrides['s1#0'].choiceLayout, 'auto');
  assert.equal(p.overrides['s1#1'].choiceLayout, 'grid2');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /s1#0/u);
});

test('ENUM_PATHS의 모든 경로가 새 프로젝트에 실제로 있다', () => {
  const p = defaultProject();
  for (const { path, enum: e } of ENUM_PATHS) {
    const cur = path.split('.').reduce((o, k) => (o == null ? o : o[k]), p);
    assert.notEqual(cur, undefined, `${path}가 프로젝트에 없습니다`);
    assert.ok(isValid(e, cur), `${path}의 기본값이 열거형과 어긋납니다`);
  }
});

test('mergeProject가 남의 JSON 속 이상한 열거형 값을 되돌리고 알린다', () => {
  const { project, warnings } = mergeProject({
    version: 1,
    layout: { page: 'A9', numberStyle: '별표' },
    units: { source: '점술' },
  });
  assert.equal(project.layout.page, 'A4');
  assert.equal(project.layout.numberStyle, 'plain');
  assert.equal(project.units.source, 'auto');
  assert.equal(warnings.filter((w) => /되돌렸습니다/u.test(w)).length, 3);
});

/* ─────────────────────────── 목록 자체 ─────────────────────────── */

test('머리말 토큰 12개가 모두 중괄호 꼴이고 설명을 갖는다', () => {
  assert.equal(HEADER_TOKENS.values.length, 12);
  for (const t of HEADER_TOKENS.values) {
    assert.match(t.id, /^\{[a-z]+\}$/u, `${t.id}: 토큰 모양이 아닙니다`);
    assert.equal(t.id, `{${t.key}}`);
    assert.ok(t.desc && t.desc.trim(), `${t.id}: 설명이 없습니다`);
  }
});

test('붙여 두기 여덟 항목이 라벨·설명·기본값을 갖춘다', () => {
  assert.equal(KEEP_KEYS.values.length, 8);
  for (const k of KEEP_KEYS.values) {
    assert.equal(k.on, true, `${k.id}: 기본값은 모두 켜짐이어야 합니다`);
    assert.ok(k.desc && k.desc.trim(), `${k.id}: 설명이 없습니다`);
  }
});

test('프로파일 선택지가 format.js의 내장 목록을 그대로 따라간다', async () => {
  const { BUILTIN_ORDER } = await import('../src/format.js');
  const ids = PROFILE_ID.values.map((v) => v.id);
  assert.deepEqual(ids, ['auto', ...BUILTIN_ORDER]);
  assert.deepEqual(PROFILE_ID.builtinIds.slice(), BUILTIN_ORDER.slice());
});

test('omit이 원본 목록을 건드리지 않고 덜어 낸 새 배열을 준다', () => {
  const before = SUBJECT.values.length;
  const rest = omit(SUBJECT, 'auto');
  assert.equal(rest.length, before - 1);
  assert.equal(SUBJECT.values.length, before);
  assert.ok(!rest.some((v) => v.id === 'auto'));
});

/* ─────────────────────────── 쪽당 문항 수·띠 붙이기 ─────────────────────────── */

test('띠 붙이기(bandWithFirst)가 붙여 두기 목록에 있고 기본이 켜짐이다', () => {
  const k = KEEP_KEYS.byId.bandWithFirst;
  assert.ok(k, 'KEEP_KEYS에 bandWithFirst가 없습니다');
  assert.equal(k.on, true);
  assert.match(k.label, /단원/u);
  assert.equal(defaults().keep.bandWithFirst, true);
});

test('쪽당 문항 수의 한계가 UI·조판이 함께 볼 수 있게 적혀 있다', () => {
  assert.deepEqual([LIMITS.perPageMin.min, LIMITS.perPageMin.max], [0, 30]);
  assert.deepEqual([LIMITS.perPageMax.min, LIMITS.perPageMax.max], [0, 30]);
  // 0은 "제한 없음"이므로 기본값이 0이어야 켜자마자 쪽 수가 달라지지 않는다.
  assert.equal(LIMITS.perPageMin.default, 0);
  assert.equal(LIMITS.perPageMax.default, 0);
  assert.deepEqual([LIMITS.perPageMinFont.min, LIMITS.perPageMinFont.max], [6, 12]);
  assert.equal(LIMITS.perPageMinFont.default, 8);
  assert.equal(LIMITS.perPageFontStep.default, 0.25);
  // 줄일 수 있는 바닥(8pt)은 본문 글자 크기 범위 안에 있어야 한다.
  assert.ok(LIMITS.perPageMinFont.default >= LIMITS.fontSize.min);
  assert.ok(LIMITS.perPageMinFont.default <= LIMITS.fontSize.max);
});
