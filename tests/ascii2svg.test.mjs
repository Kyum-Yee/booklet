/**
 * ascii2svg 회귀 테스트 — 화학 픽스처 4개의 펜스 13블록을 통째로 벡터화해 본다.
 * `node --test tests/ascii2svg.test.mjs` (DOM 없이 1초 안에 끝난다)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { asciiToSvg } from '../src/ascii2svg.js';

/* ══════════════════ 픽스처 읽기 ══════════════════ */

/** 펜스(```) 사이 본문을 등장 순서대로 뽑는다. */
function fences(text) {
  const re = /^```[^\n]*\n([\s\S]*?)^```/gm;
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push(m[1].replace(/\n$/, ''));
  return out;
}

const demoText = readFileSync(new URL('./demo-ascii.html', import.meta.url), 'utf8');
const BLOCKS = fences(demoText).map((text, i) => ({ nth: i + 1, text }));

/** 블록마다 기대하는 kind와, 반드시 살아남아야 하는 대표 라벨(2개 이상). */
const EXPECT = [
  { kind: 'device', labels: ['A(g)', '4.0 atm', '강철 용기 1', 'He(g)'] },
  { kind: 'device', labels: ['1 atm', 'T_1 K', '(가)'] },
  { kind: 'device', labels: ['첨가 후 평형', 'Ne(g)', '2V L'] },
  { kind: 'device', labels: ['x atm', '3.0 atm', '2a g'] },
  { kind: 'graph', labels: ['밀도(g/cm³)', '온도(℃)', '1.00', '0.90', 't1'] },
  { kind: 'graph', labels: ['밀도(g/mL)', '1.20', '온도(℃)', '25'] },
  { kind: 'graph', labels: ['플라스틱 판', 'A(l)', '표면 장력(mN/m)', '에탄올의 퍼센트 농도(%)'] },
  { kind: 'device', labels: ['포도당 수용액', '물 200 g 추가', '(나)'] },
  { kind: 'graph', labels: ['순수한 용매 X', '용액 (가)', '온도(℃)', '시간'] },
  { kind: 'device', labels: ['반투막', 'A(aq)', 'b M'] },
  { kind: 'device', labels: ['꼭지', 'P atm', '4 L'] },
  { kind: 'structure', labels: ['H', 'N', '(다)'] },
  { kind: 'graph', labels: ['증기 압력(mmHg)', '760', '온도(℃)'] },
  { kind: 'graph', labels: ['(가)', '(나)', '1 g의 부피(cm³)', '온도(℃)'] },
  { kind: 'graph', labels: ['온도', '100', 't1', '가열 시간(분)'] },
  { kind: 'graph', labels: ['어는점 내림(℃)', 'B 수용액', 'A 수용액', '몰랄 농도(m)'] },
  { kind: 'device', labels: ['[ 처음 ]', '[ 나중 ]', '반투막'] },
  { kind: 'device', labels: ['12 atm', '반투막 A(aq)', '(나)'] },
];

/** 블록 번호(1부터)로 결과를 얻는다. */
const svgOf = (nth, opts) => asciiToSvg(BLOCKS[nth - 1].text, opts);

/** `<text>` 안의 내용만 뽑는다. */
const textRuns = (svg) => [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

/** `<path d="…">`의 d 속성만 뽑는다. */
const pathData = (svg) => [...svg.matchAll(/<path d="([^"]*)"/g)].map((m) => m[1]);

/** d 속성이 지나는 모든 좌표쌍(제어점 포함)의 x 값. */
function xsOf(d) {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  return nums.filter((_, i) => i % 2 === 0);
}

/* ══════════════════ 1. 13블록 공통 계약 ══════════════════ */

test('펜스 18블록이 나온다', () => {
  assert.equal(BLOCKS.length, 18);
});

for (let i = 1; i <= 18; i++) {
  const { nth } = BLOCKS[i - 1];
  const want = EXPECT[i - 1];

  test(`#${i} 블록 ${nth} — SVG 껍데기·kind·confidence·라벨`, () => {
    const res = svgOf(i);

    // 껍데기: innerHTML에 그대로 넣어도 되는 완결된 <svg>
    assert.ok(res.svg.startsWith('<svg'), 'svg는 <svg로 시작한다');
    assert.ok(res.svg.endsWith('</svg>'), 'svg는 </svg>로 끝난다');
    assert.match(res.svg, /viewBox="0 0 [\d.]+ [\d.]+"/);
    assert.equal(res.svg.match(/<svg/g).length, 1);
    assert.ok(res.width > 0 && res.height > 0);

    // 종류와 신뢰도
    assert.equal(res.kind, want.kind, `kind는 ${want.kind}`);
    assert.match(res.svg, new RegExp(`data-kind="${want.kind}"`));
    assert.ok(res.confidence >= 0.5, `confidence ${res.confidence} ≥ 0.5`);

    // 텍스트 런 보존 — 대표 라벨은 이스케이프된 채 <text> 안에 그대로 있다
    assert.ok(want.labels.length >= 2, '대표 라벨은 블록마다 2개 이상 검사한다');
    const runs = textRuns(res.svg);
    for (const label of want.labels) {
      const esc = label.replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      assert.ok(runs.includes(esc), `<text>에 ${JSON.stringify(label)}가 남아 있어야 한다`);
    }

    // 원문에 없던 태그가 텍스트에서 새로 열리지 않는다
    for (const run of runs) assert.ok(!/[<>]/.test(run), `텍스트가 이스케이프되지 않았다: ${run}`);
  });
}

test('부등호·따옴표는 실체 참조로 이스케이프된다', () => {
  assert.ok(textRuns(svgOf(6).svg).includes('&lt; ㉠ &gt;'));
  assert.ok(textRuns(svgOf(10).svg).includes('a&#39; M'));
});

/* ══════════════════ 2. 선·기호 ══════════════════ */

test('점선(`- - -`)은 한 줄 stroke-dasharray로 합쳐진다', () => {
  for (const i of [5, 6, 13]) {
    const svg = svgOf(i).svg;
    assert.match(svg, /<line[^>]*stroke-dasharray="[\d.]+ [\d.]+"/, `#${i}에 점선이 없다`);
  }
  // 점선은 낱개 짧은 선이 아니라 하나로 이어진 긴 선이다.
  const dashed = [...svgOf(5).svg.matchAll(/<line x1="([\d.]+)"[^>]*x2="([\d.]+)"[^>]*stroke-dasharray/g)];
  assert.ok(dashed.length >= 2);
  for (const d of dashed) assert.ok(+d[2] - +d[1] >= 40, '점선 한 줄은 한 칸짜리가 아니다');
});

test('피스톤(`+===+`)은 굵은 선으로 그려진다', () => {
  for (const i of [1, 2, 3, 7]) {
    const svg = svgOf(i).svg;
    const widths = [...svg.matchAll(/<line[^>]*stroke-width="([\d.]+)"/g)].map((m) => +m[1]);
    assert.ok(widths.some((w) => w >= 2.5), `#${i}에 굵은 선(≥2.5)이 없다`);
  }
});

test('꼭지(`--|X|--`)는 사각형 + X 심볼이 된다', () => {
  for (const i of [1, 4, 11]) {
    const svg = svgOf(i).svg;
    assert.match(svg, /<g class="valve"><rect /, `#${i}에 밸브 심볼이 없다`);
    const valve = svg.slice(svg.indexOf('<g class="valve">'));
    assert.ok((valve.match(/<line /g) || []).length >= 2, '밸브는 X자 두 선을 갖는다');
  }
  assert.equal((svgOf(1).svg.match(/class="valve"/g) || []).length, 2, '#1의 꼭지는 둘이다');
});

test('축 끝에는 화살촉 polygon이 붙는다', () => {
  // #13은 원문 축에 `>`가 없어 화살촉도 없다 — 그래서 명단에서 뺀다.
  for (const i of [5, 6, 7, 9]) {
    assert.match(svgOf(i).svg, /<polygon points="[^"]+" fill="#000"/, `#${i}에 화살촉이 없다`);
  }
  // ㉠·㉡ 두 축이 나란한 블록은 화살촉도 둘이다.
  assert.equal((svgOf(6).svg.match(/<polygon /g) || []).length, 2);
});

/* ══════════════════ 3. 곡선 ══════════════════ */

test('그래프 블록의 곡선은 3차 베지어 path다', () => {
  for (const i of [5, 6, 7, 9]) {
    const ds = pathData(svgOf(i).svg);
    assert.ok(ds.length >= 1, `#${i}에 곡선이 없다`);
    assert.ok(ds.some((d) => /^M[\d.\s-]+C/.test(d)), `#${i}의 곡선이 M…C… 형태가 아니다`);
  }
});

test('곡선은 직선보다 굵게(1.4) 그려지고 점은 반지름 2.2다', () => {
  const svg = svgOf(5).svg;
  assert.match(svg, /<path d="[^"]*" stroke-width="1.4"\/>/);
  const radii = [...svg.matchAll(/<circle[^>]*r="([\d.]+)"/g)].map((m) => +m[1]);
  assert.ok(radii.length >= 3, '점 A·B·C가 모두 찍힌다');
  for (const r of radii) assert.equal(r, 2.2);
});

test('#5 밀도–온도 곡선은 끊기지 않은 한 줄로 B와 최댓점을 지난다', () => {
  const res = svgOf(5);
  const ds = pathData(res.svg);
  assert.equal(ds.length, 1, '곡선 path는 하나여야 한다 — 라벨 C·점 B에서 끊기면 안 된다');

  const d = ds[0];
  assert.match(d, /^M[\d.\s-]+C/, '한 줄짜리 매끄러운 곡선이다');
  assert.equal((d.match(/M/g) || []).length, 1, 'path 안에서 붓을 떼지 않는다');

  // 셀 격자(cellW 8, cellH 16, pad 6) 위의 B·C 좌표
  const bx = 19.5 * 8 + 6, by = 5.5 * 16 + 6;   // B*  (5행 19열)
  const cx = 27.5 * 8 + 6, cy = 2.5 * 16 + 6;   // 최댓점 * (2행 27열)
  const ax = 14.5 * 8 + 6, ay = 8.5 * 16 + 6;   // A*  (8행 14열)

  const xs = xsOf(d);
  assert.ok(Math.min(...xs) <= bx, `곡선 왼쪽 끝(${Math.min(...xs)})이 B의 x(${bx})까지 온다`);
  assert.ok(Math.max(...xs) >= cx + 2 * 8, `곡선 오른쪽 끝(${Math.max(...xs)})이 최댓점 오른쪽으로 뻗는다`);

  // 세 점은 곡선 위 표식으로 남는다
  for (const [x, y] of [[bx, by], [cx, cy], [ax, ay]]) {
    assert.match(res.svg, new RegExp(`<circle cx="${x}" cy="${y}"`), `(${x}, ${y})에 점이 없다`);
  }
});

test('#7 표면 장력 곡선도 한 줄, 방울 둘은 각각 닫힌 호다', () => {
  const ds = pathData(svgOf(7).svg);
  assert.equal(ds.length, 3, '방울 A·B와 (나) 곡선, 셋이다');
  for (const d of ds) assert.equal((d.match(/M/g) || []).length, 1);
  // 방울 두 개는 시작 높이와 끝 높이가 같다 — 플라스틱 판 위에 얹혀 있다.
  const ys = (d) => (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number).filter((_, i) => i % 2 === 1);
  for (const d of ds.slice(0, 2)) {
    const y = ys(d);
    assert.equal(y[0], y[y.length - 1], '방울은 같은 높이에서 시작하고 끝난다');
  }
});

test('smooth를 끄면 폴리라인으로 떨어진다', () => {
  const d = pathData(svgOf(5, { smooth: false }).svg)[0];
  assert.ok(d.includes('L'), '폴리라인은 L 명령으로 잇는다');
  assert.ok(!d.includes('C'), '베지어 명령이 남아 있으면 안 된다');
});

/* ══════════════════ 4. 옵션 ══════════════════ */

test('labelFont는 라벨 글자 크기 배수다', () => {
  assert.match(svgOf(5).svg, /font-size="12"/);
  assert.match(svgOf(5, { labelFont: 1.5 }).svg, /font-size="18"/);
  assert.match(svgOf(5, { labelFont: 0.75 }).svg, /font-size="9"/);
});

test('fit은 viewBox 비율을 지킨 채 픽셀 폭을 박는다', () => {
  const res = svgOf(5, { fit: 300 });
  assert.match(res.svg, /width="300"/);
  const h = +res.svg.match(/height="([\d.]+)"/)[1];
  assert.ok(Math.abs(h - 300 * res.height / res.width) < 0.5);
});

test('빈 펜스는 경고와 함께 빈 SVG를 돌려준다', () => {
  const res = asciiToSvg('   \n\n');
  assert.equal(res.kind, 'unknown');
  assert.equal(res.confidence, 0);
  assert.equal(res.warnings.length, 1);
  assert.ok(res.svg.startsWith('<svg') && res.svg.endsWith('</svg>'));
});

/* ══════════════════ 5. 예산 ══════════════════ */

test('13블록 전부 변환해도 1초 안에 끝난다', () => {
  const t0 = process.hrtime.bigint();
  for (let k = 0; k < 5; k++) for (const b of BLOCKS) asciiToSvg(b.text);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 1000, `13블록 × 5회 변환이 ${ms.toFixed(1)}ms 걸렸다`);
});

test('해석 못 한 문자가 남지 않는다 — 13블록 모두 경고 없음', () => {
  for (let i = 1; i <= 13; i++) {
    const res = svgOf(i);
    assert.deepEqual(res.warnings, [], `#${i}: ${res.warnings.join(' / ')}`);
    assert.equal(res.confidence, 1, `#${i}의 confidence는 1이다`);
  }
});

/* ══════════════════ 박스 문자 · 띄엄띄엄 사선 · 액면 ══════════════════ */

/** 기울어진 <line>(가로·세로 둘 다 1px 넘게 움직이는 것)만 뽑는다. */
const diagLines = (svg) =>
  [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)]
    .map((m) => m.slice(1, 5).map(Number))
    .filter(([x1, y1, x2, y2]) => Math.abs(x1 - x2) > 1 && Math.abs(y1 - y2) > 1);

test('#15 가열 곡선 — 박스 문자(┌─┘)는 글자가 아니라 선이고, 띄엄띄엄한 /는 한 직선이다', () => {
  const res = svgOf(15);
  const labels = textRuns(res.svg).join(' ');
  assert.doesNotMatch(labels, /[┌┐└┘─│]/, '박스 문자가 <text>로 새지 않는다');
  const diag = diagLines(res.svg);
  assert.ok(diag.length >= 2, `사선 직선이 둘 이상이어야 한다(얻음 ${diag.length})`);
  // 0 ℃ 계단에서 100 ℃ 계단까지 오르는 긴 선: 가로로 8칸(64px) 넘게, 위로 4칸 넘게 간다.
  const long = diag.find(([x1, y1, x2, y2]) => x2 - x1 > 64 && y1 - y2 > 60);
  assert.ok(long, '완만한 긴 오르막 직선이 있다');
  assert.equal((res.svg.match(/<path/g) || []).length, 0, '곡선 조각이 남지 않는다');
  assert.equal(res.confidence, 1);
});

test('#16 어는점 내림 그래프 — 두 직선이 원점 쪽에서 출발해 점(*)에서 끝난다', () => {
  const res = svgOf(16);
  const diag = diagLines(res.svg);
  assert.equal(diag.length, 2);
  for (const [x1, y1, x2, y2] of diag) {
    assert.ok(x2 > x1 && y2 < y1, '오른쪽 위로 오른다');
  }
  assert.equal((res.svg.match(/<circle/g) || []).length, 2, '점 두 개는 그대로 표식이다');
  assert.equal((res.svg.match(/<path/g) || []).length, 0);
});

test('#17·#18 U자관 — |=====| 액면은 얇은 선 + 바닥까지 옅은 채움이다', () => {
  for (const [nth, levels] of [[17, 4], [18, 4]]) {
    const res = svgOf(nth);
    assert.equal((res.svg.match(/<rect /g) || []).length, levels, `#${nth} 채움 사각형 ${levels}개`);
    assert.match(res.svg, /fill-opacity="0.1"/);
    assert.doesNotMatch(res.svg, /stroke-width="2\.6[0-9]*"/, '굵은 막대(=)로 그리지 않는다');
    assert.equal(res.confidence, 1);
  }
});

test('박스 문자만으로 그린 계단도 선으로 읽는다', () => {
  const res = asciiToSvg(['  ┌────┐', '  │    │', '──┘    └──'].join('\n'));
  assert.equal(textRuns(res.svg).length, 0, '글자로 새는 문자가 없다');
  assert.ok((res.svg.match(/<line /g) || []).length >= 4, '가로·세로 선이 넷 이상');
  assert.equal(res.warnings.length, 0);
});
