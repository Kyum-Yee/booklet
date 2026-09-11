/**
 * rules.test.mjs — 수식 분리(mathSegments)와 인라인 처리(inline) 검증.
 * 화이트리스트·이스케이프·규칙 적용 순서·잘못된 규칙의 안전한 건너뛰기까지 본다.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_RULES, inline, mathSegments, plainLength, sanitizeTex } from '../src/rules.js';

/** 세그먼트를 "타입:값" 목록으로 줄여 비교하기 쉽게 만든다. */
function shape(text) {
  return mathSegments(text).map((s) => `${s.type === 'math' ? (s.display ? 'D' : 'M') : 'T'}:${s.value}`);
}

/* ── mathSegments ────────────────────────────────── */

test('mathSegments — $…$ 인라인 수식', () => {
  assert.deepEqual(shape('값 $x^2$ 이다'), ['T:값 ', 'M:x^2', 'T: 이다']);
  const seg = mathSegments('값 $x^2$ 이다')[1];
  assert.equal(seg.raw, '$x^2$');
  assert.equal(seg.display, false);
});

test('mathSegments — $$…$$와 \\[…\\]는 display', () => {
  assert.deepEqual(shape('$$a+b$$'), ['D:a+b']);
  assert.deepEqual(shape('앞 $$\\frac{1}{2}$$ 뒤'), ['T:앞 ', 'D:\\frac{1}{2}', 'T: 뒤']);
  assert.deepEqual(shape('구간 \\(x\\)와 \\[y\\]'), ['T:구간 ', 'M:x', 'T:와 ', 'D:y']);
});

test('mathSegments — \\$·$5·$ 5는 수식이 아니다', () => {
  assert.deepEqual(shape('가격은 \\$5 입니다'), ['T:가격은 $5 입니다']);
  assert.deepEqual(shape('가격은 $5 입니다'), ['T:가격은 $5 입니다']);
  assert.deepEqual(shape('가격은 $ 5 입니다'), ['T:가격은 $ 5 입니다']);
  // 닫히면 수식이다.
  assert.deepEqual(shape('$5$'), ['M:5']);
});

test('mathSegments — 닫히지 않은 $는 리터럴로 남는다', () => {
  assert.deepEqual(shape('a $b c'), ['T:a $b c']);
  assert.deepEqual(shape('a $$b'), ['T:a $$b']);
});

test('plainLength — 수식을 걷어낸 길이', () => {
  assert.equal(plainLength('  2  '), 1);
  assert.equal(plainLength('$x^2$'), 3);
});

/* ── inline ─────────────────────────────────────── */

test('inline — <보기>는 이스케이프하고 <u>는 살린다', () => {
  const html = inline('<보기>의 <u>밑줄</u> 부분', { scope: 'stem', subject: '국어' });
  assert.ok(html.includes('&lt;보기&gt;'), '허용하지 않은 태그는 글자로 보인다');
  assert.ok(html.includes('<u>밑줄</u>'), '<u>는 태그로 살아남는다');
  assert.ok(!html.includes('<보기>'));
});

test('inline — **굵게**는 전 과목·전 범위에서 <b>', () => {
  assert.equal(inline('적절하지 **않은** 것은?', { scope: 'stem', subject: '화학' }), '적절하지 <b>않은</b> 것은?');
  assert.equal(inline('**A**와 **B**', { scope: 'passage', subject: '' }), '<b>A</b>와 <b>B</b>');
});

test("inline — '나' 굵게는 국어 선지에만", () => {
  assert.equal(inline("'나'의 심정", { scope: 'choices', subject: '국어' }), "<b>'나'</b>의 심정");
  // 영어 선지에서는 손대지 않는다.
  assert.equal(inline("'na' feeling", { scope: 'choices', subject: '영어' }), "'na' feeling");
  // 국어라도 지문 범위에서는 손대지 않는다.
  assert.equal(inline("'나'의 심정", { scope: 'passage', subject: '국어' }), "'나'의 심정");
});

test('inline — ㉠·[A] 표시는 span.mk로', () => {
  assert.equal(inline('㉠과 ⓐ', { scope: 'stem', subject: '국어' }),
    '<span class="mk">㉠</span>과 <span class="mk">ⓐ</span>');
  assert.equal(inline('[A] 구간', { scope: 'passage', subject: '국어' }), '<span class="mk">[A]</span> 구간');
  // bracket-label은 국어·영어 전용이다.
  assert.equal(inline('[A] 구간', { scope: 'passage', subject: '화학' }), '[A] 구간');
});

test('inline — 수식 안의 _와 작은따옴표는 훼손되지 않는다', () => {
  const html = inline("식 $a_1 = b'$ 확인", { scope: 'choices', subject: '국어' });
  assert.ok(html.includes('data-tex="a_1 = b&#39;"') || html.includes('data-tex="a_1 = b\'"'), html);
  assert.ok(html.includes('$a_1 = b\'$'), '원문이 그대로 보인다');
  assert.ok(!html.includes('<b>'), '수식 안은 규칙이 건드리지 않는다');
  assert.ok(html.includes('data-display="0"'));

  const display = inline('$$\\sum_{i=1}^{n} i$$', { scope: 'stem', subject: '수학' });
  assert.ok(display.includes('data-display="1"'));
  assert.ok(display.includes('\\sum_{i=1}^{n} i'));
});

test('inline — 잘못된 정규식 규칙은 그 규칙만 건너뛰고 경고', () => {
  const warnings = [];
  const rules = [
    { id: 'bad', name: '망가진 규칙', enabled: true, scope: ['all'], subjects: [], pattern: '([', flags: 'g', replace: 'x' },
    { id: 'md', name: '굵게', enabled: true, scope: ['all'], subjects: [], pattern: '\\*\\*(.+?)\\*\\*', flags: 'g', replace: '<b>$1</b>' },
  ];
  const html = inline('**살아남는다**', { scope: 'stem', subject: '국어', rules, warnings });
  assert.equal(html, '<b>살아남는다</b>', '뒤 규칙은 정상 적용된다');
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('망가진 규칙'));
});

test('inline — 꺼진 규칙은 적용되지 않는다', () => {
  const dq = DEFAULT_RULES.find((r) => r.id === 'dquote-bold');
  assert.equal(dq.enabled, false);
  assert.equal(inline('“인용”이다', { scope: 'choices', subject: '국어' }), '“인용”이다');
  const on = DEFAULT_RULES.map((r) => (r.id === 'dquote-bold' ? { ...r, enabled: true } : r));
  assert.equal(inline('“인용”이다', { scope: 'choices', subject: '국어', rules: on }), '<b>“인용”</b>이다');
});

test('inline — &와 span class는 안전하게 다룬다', () => {
  assert.equal(inline('A & B', { scope: 'stem' }), 'A &amp; B');
  assert.equal(inline('<span class="mk">㉠</span>', { scope: 'stem' }).includes('<span class="mk">'), true);
  assert.ok(inline('<script>x</script>', { scope: 'stem' }).includes('&lt;script&gt;'));
});

test('inline — null·빈 값은 빈 문자열', () => {
  assert.equal(inline(null), '');
  assert.equal(inline(undefined), '');
  assert.equal(inline(''), '');
});

/* ── sanitizeTex ───────────────────────────────────── */

test('sanitizeTex — 간격 명령 뒤의 ^·_에 빈 그룹을 끼운다(KaTeX "internal" 오류 회피)', () => {
  assert.equal(sanitizeTex('2k\\,^\\circ\\text{C}'), '2k\\,{}^\\circ\\text{C}');
  assert.equal(sanitizeTex('t_1\\,^\\circ\\text{C}'), 't_1\\,{}^\\circ\\text{C}');
  assert.equal(sanitizeTex('x\\quad^2'), 'x\\quad{}^2');
  assert.equal(sanitizeTex('a\\; _2'), 'a\\;{} _2');
  assert.equal(sanitizeTex('a\\,b^2'), 'a\\,b^2', '글자가 사이에 있으면 손대지 않는다');
  assert.equal(sanitizeTex('\\text{H}_2\\text{O}'), '\\text{H}_2\\text{O}');
  assert.equal(sanitizeTex(null), '');
});

test('inline — $…$ 안의 \\,^\\circ가 data-tex에서 고쳐져 나온다', () => {
  const html = inline('끓는점은 $2k\\,^\\circ\\text{C}$이다.');
  assert.match(html, /data-tex="2k\\,\{\}\^\\circ\\text\{C\}"/);
  assert.match(html, /\$2k\\,\^\\circ\\text\{C\}\$/, '보이는 원문은 그대로');
});
