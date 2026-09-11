/**
 * options.js — 프로그램이 사용자에게서 받는 모든 입력의 허용값을 한곳에 모은 열거형 사전.
 *
 * 코드 곳곳에 흩어져 있던 문자열 리터럴("sequential", "grid5", "afterStem", "A4", "auto"…)의
 * 단일 출처다. UI의 <select>·라디오·숫자 칸, store의 기본값, booklet.py의 CLI 선택지,
 * render/units/numbering의 값 비교가 전부 여기 적힌 id 하나를 바라본다.
 *
 * 열거형 하나 = 값 목록(values) + 한국어 라벨 + 기본값(default). 전부 Object.freeze로 봉인해
 * 어느 모듈이 실수로 목록을 밀어 넣어도 다른 모듈의 선택지가 흔들리지 않는다.
 *
 * 규약
 *   enum.values   [{ id, label, …부가필드 }] — 화면에 보일 순서 그대로
 *   enum.default  values 안에 반드시 존재하는 id
 *   enum.ids      { id: id } — `CHOICE_STYLE.ids.grid5`처럼 오타 없이 상수로 쓰라고 둔 거울
 *   enum.byId     { id: value } — 부가필드(치수·설명)를 O(1)로 꺼낸다
 *   enum.pattern  (선택) 목록에 없어도 이 정규식에 맞으면 유효 — `figure:<n>` 같은 가변 id
 *   enum.accepts  (선택) 정규식으로도 못 잡는 모양(용지 { w, h } 객체)을 받는 술어
 *
 * DOM 무관·의존 없음(format.js의 내장 프로파일 목록만 읽는다). node --test에서 그대로 import된다.
 */

import { BUILTIN_ORDER, BUILTIN_PROFILES } from './format.js';

/* ─────────────────────────── 열거형 만들기 ─────────────────────────── */

/**
 * 값 목록·기본값·부가 속성을 봉인된 열거형 하나로 묶는다.
 * 기본값이 목록에 없으면 즉시 던진다 — 조용히 어긋난 기본값은 두 곳의 UI를 갈라 놓는다.
 * @param {string} name  진단 문구에 쓸 이름
 * @param {object[]} values  { id, label, … }
 * @param {string} def  기본값 id
 * @param {object} [extra]  pattern·accepts·설명 등 열거형에 얹을 것
 */
function makeEnum(name, values, def, extra = {}) {
  const frozen = Object.freeze(values.map((v) => Object.freeze({ ...v })));
  const ids = {};
  const byId = {};
  for (const v of frozen) {
    ids[v.id] = v.id;
    byId[v.id] = v;
  }
  if (!Object.hasOwn(byId, def)) {
    throw new Error(`options.js: ${name}의 기본값 "${def}"이(가) 값 목록에 없습니다.`);
  }
  return Object.freeze({
    name,
    values: frozen,
    default: def,
    ids: Object.freeze(ids),
    byId: Object.freeze(byId),
    ...extra,
  });
}

/* ─────────────────────────── 용지·지면 ─────────────────────────── */

/**
 * 용지 규격. w·h는 mm이고 layout.js의 PAGE_SIZES와 같은 수를 쓴다
 * (Letter는 8.5×11인치 = 215.9×279.4 — 반올림해 두면 프리셋에서 사용자 지정으로
 * 넘어가는 순간 쪽 크기가 0.4mm 튄다).
 * `custom`은 치수를 갖지 않는 표지 값이다 — 고르면 layout.page가 { w, h } 객체가 된다.
 */
export const PAGE_SIZE = makeEnum('PAGE_SIZE', [
  { id: 'A4', w: 210, h: 297, label: 'A4 (210×297)' },
  { id: 'B4', w: 257, h: 364, label: 'B4 (257×364)' },
  { id: 'B5', w: 182, h: 257, label: 'B5 (182×257)' },
  { id: 'Letter', w: 215.9, h: 279.4, label: 'Letter (216×279)' },
  { id: 'custom', label: '사용자 지정' },
], 'A4', {
  customId: 'custom',
  // layout.page는 문자열 프리셋이거나 { w, h } 객체다. 객체도 유효한 입력으로 받는다.
  accepts: (v) => v !== null && typeof v === 'object'
    && Number.isFinite(Number(v.w)) && Number.isFinite(Number(v.h)),
});

/** 용지 id를 mm 치수로. { w, h } 객체를 그대로 넘겨도 되고, 모르는 값은 A4로 떨어진다. */
export function pageMm(page) {
  if (page !== null && typeof page === 'object') {
    const w = Number(page.w);
    const h = Number(page.h);
    if (Number.isFinite(w) && Number.isFinite(h)) return { w, h };
  }
  const found = PAGE_SIZE.byId[page];
  if (found && found.w) return { w: found.w, h: found.h };
  const fallback = PAGE_SIZE.byId[PAGE_SIZE.default];
  return { w: fallback.w, h: fallback.h };
}

export const ORIENTATION = makeEnum('ORIENTATION', [
  { id: 'portrait', label: '세로' },
  { id: 'landscape', label: '가로' },
], 'portrait');

/* ─────────────────────────── 격자 ─────────────────────────── */

/** 한 쪽의 칸 배치. id는 `<cols>x<rows>` — booklet.py의 --grid와 글자까지 같다. */
export const GRID = makeEnum('GRID', [
  { id: '1x1', cols: 1, rows: 1, label: '1×1 한 단', hint: '교재 본문 한 단' },
  { id: '2x1', cols: 2, rows: 1, label: '2×1 두 단(수능)', hint: '수능 시험지 두 단' },
  { id: '1x2', cols: 1, rows: 2, label: '1×2 상·하 두 칸', hint: '가로가 넓은 수학 프린트' },
  { id: '2x2', cols: 2, rows: 2, label: '2×2 네 칸', hint: '짧은 문항 모음' },
], '2x1');

/** "2x1" → { cols: 2, rows: 1 }. 모르는 id는 기본 격자로 떨어진다. */
export function gridFromId(id) {
  const g = GRID.byId[id] || GRID.byId[GRID.default];
  return { cols: g.cols, rows: g.rows };
}

/** { cols: 2, rows: 1 } → "2x1". 목록에 없는 조합이면 기본 격자 id를 돌려준다. */
export function gridId(grid) {
  if (!grid) return GRID.default;
  const want = `${grid.cols}x${grid.rows}`;
  return GRID.byId[want] ? want : GRID.default;
}

/** 칸을 채워 나가는 방향. auto는 layout.js가 rows로 고른다(rows 1 → column, 2 → row). */
export const FILL_ORDER = makeEnum('FILL_ORDER', [
  { id: 'auto', label: '자동', hint: '한 행이면 세로, 두 행이면 가로' },
  { id: 'column', label: '세로(단 우선)' },
  { id: 'row', label: '가로(행 우선)' },
], 'auto');

/* ─────────────────────────── 문항 모양 ─────────────────────────── */

/** 문항 번호 장식. plain 말고는 render가 `.q-num.num-<id>` 클래스를 붙인다. */
export const NUMBER_STYLE = makeEnum('NUMBER_STYLE', [
  { id: 'plain', label: '보통' },
  { id: 'boxed', label: '네모' },
  { id: 'circled', label: '동그라미' },
], 'plain');

export const PASSAGE_STYLE = makeEnum('PASSAGE_STYLE', [
  { id: 'boxed', label: '테두리' },
  { id: 'plain', label: '민무늬' },
], 'boxed');

/**
 * 선지 배치. auto면 render.choiceLayoutFor가 길이로 고른다
 * (5개 모두 12자 이하 → grid5, 모두 28자 이하 → grid2, 아니면 list).
 * 그래서 auto를 뺀 넷은 그대로 `.choices.layout-<id>` 클래스가 된다.
 */
export const CHOICE_STYLE = makeEnum('CHOICE_STYLE', [
  { id: 'auto', label: '자동', hint: '선지 길이로 고른다' },
  { id: 'list', label: '세로 목록' },
  { id: 'inline', label: '한 줄' },
  { id: 'grid2', label: '2열' },
  { id: 'grid5', label: '5열' },
], 'auto');

/** 문항별 덮어쓰기(overrides.choiceLayout)에서 실제로 쓰이는, auto를 뺀 배치들. */
export const CHOICE_LAYOUT_IDS = Object.freeze(
  CHOICE_STYLE.values.filter((v) => v.id !== 'auto').map((v) => v.id),
);

/** 아스키 도형 처리. svg는 confidence 0.5 미만이면 스스로 ascii로 물러선다. */
export const FIGURE_MODE = makeEnum('FIGURE_MODE', [
  { id: 'svg', label: 'SVG 변환' },
  { id: 'ascii', label: '아스키 그대로' },
], 'svg');

/** 대단원이 시작될 때의 표시. page는 쪽을 통째로 하나 쓴다. */
export const UNIT_BAND_STYLE = makeEnum('UNIT_BAND_STYLE', [
  { id: 'band', label: '띠 제목' },
  { id: 'page', label: '별도 표지 쪽' },
], 'band');

/**
 * 본문 글꼴. id가 곧 CSS font-family 문자열이라 select 값을 그대로 layout.font.family에 넣는다.
 * `__custom`만 예외로, 고르면 직접 입력 칸이 열린다(프로젝트에는 저장되지 않는 표지 값).
 */
export const FONT_FAMILY = makeEnum('FONT_FAMILY', [
  { id: "'Noto Serif KR', 'Apple SD Gothic Neo', 'Malgun Gothic', serif", label: '본명조 계열(명조)' },
  { id: "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif", label: '본고딕 계열(고딕)' },
  { id: "'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif", label: '애플 SD 고딕' },
  { id: "'Batang', 'Apple SD Gothic Neo', serif", label: '바탕' },
  { id: "'Gulim', 'Apple SD Gothic Neo', sans-serif", label: '굴림' },
  { id: '__custom', label: '직접 입력…' },
], "'Noto Serif KR', 'Apple SD Gothic Neo', 'Malgun Gothic', serif", {
  customId: '__custom',
});

/* ─────────────────────────── 머리말 토큰 ─────────────────────────── */

/**
 * 머리말·꼬리말에 쓰는 치환 토큰. id는 중괄호까지 포함한 원문 그대로라
 * 도움말에 그대로 찍어도 되고 문자열 치환 키로 그대로 써도 된다.
 */
export const HEADER_TOKENS = makeEnum('HEADER_TOKENS', [
  { id: '{title}', key: 'title', label: '제목', desc: '문서 제목(파일 탭의 제목 칸)' },
  { id: '{subtitle}', key: 'subtitle', label: '부제', desc: '제목 아래 붙는 부제' },
  { id: '{subject}', key: 'subject', label: '과목', desc: 'meta.subject — 비어 있으면 사라진다' },
  { id: '{grade}', key: 'grade', label: '학년', desc: '고2 같은 학년 표기' },
  { id: '{round}', key: 'round', label: '회차', desc: '모의고사 회차' },
  { id: '{period}', key: 'period', label: '교시', desc: '수능식 “제N교시”의 N' },
  { id: '{unit}', key: 'unit', label: '대단원', desc: '그 쪽 첫 문항의 대단원' },
  { id: '{subunit}', key: 'subunit', label: '소단원', desc: '그 쪽 첫 문항의 소단원' },
  { id: '{page}', key: 'page', label: '쪽번호', desc: '표지를 뺀 1부터의 쪽번호' },
  { id: '{pages}', key: 'pages', label: '전체 쪽수', desc: '조판이 끝난 뒤의 총 쪽수' },
  { id: '{date}', key: 'date', label: '날짜', desc: 'meta.date를 글자 그대로' },
  { id: '{institute}', key: 'institute', label: '학원', desc: '학원·기관 이름' },
], '{title}');

/** 머리말·꼬리말의 기본 배치(§2.6). 좌·중·우 세 칸씩이다. */
export const HEADER_DEFAULT = Object.freeze({ left: '{title}', center: '', right: '{unit}' });
export const FOOTER_DEFAULT = Object.freeze({ left: '', center: '{page}', right: '' });

/* ─────────────────────────── 번호·단원·과목 ─────────────────────────── */

export const NUMBERING_MODE = makeEnum('NUMBERING_MODE', [
  { id: 'sequential', label: '순차(1부터)', hint: '제외한 문항은 건너뛴다' },
  { id: 'source', label: '원문 번호 그대로', hint: '겹치거나 빠지면 경고와 함께 보정' },
  { id: 'perUnit', label: '대단원마다 1부터' },
], 'sequential');

export const UNITS_SOURCE = makeEnum('UNITS_SOURCE', [
  { id: 'auto', label: '자동', hint: '수동 지정 → 헤더 → 출처 순으로 훑는다' },
  { id: 'ref', label: '출처(ref)에서' },
  { id: 'header', label: '파일 헤더에서' },
  { id: 'manual', label: '수동 지정만' },
], 'auto');

/** 과목. auto면 parser가 subjectHints 점수로 고르고, 동점·0점이면 “기타”가 된다. */
export const SUBJECT = makeEnum('SUBJECT', [
  { id: 'auto', label: '자동' },
  { id: '국어', label: '국어' },
  { id: '영어', label: '영어' },
  { id: '수학', label: '수학' },
  { id: '화학', label: '화학' },
  { id: '기타', label: '기타' },
], 'auto');

/**
 * 파싱 프로파일. 내장 목록은 format.js의 BUILTIN_ORDER에서 그때그때 엮으므로,
 * 내장 프로파일을 하나 더 만들면 UI 선택지와 CLI 선택지가 같이 늘어난다.
 */
export const PROFILE_ID = makeEnum('PROFILE_ID', [
  { id: 'auto', label: '자동 판별', hint: `${BUILTIN_ORDER.join(' → ')} 순으로 시도` },
  ...BUILTIN_ORDER.map((id) => ({
    id,
    label: `${(BUILTIN_PROFILES[id] && BUILTIN_PROFILES[id].name) || id} (내장)`,
    builtin: true,
  })),
], 'auto', {
  builtinIds: Object.freeze(BUILTIN_ORDER.slice()),
});

/* ─────────────────────────── 규칙·이미지 ─────────────────────────── */

/** 인라인 규칙이 걸리는 자리. all은 나머지 다섯을 전부 덮는 우산 값이다. */
export const RULE_SCOPE = makeEnum('RULE_SCOPE', [
  { id: 'all', label: '전체', umbrella: true },
  { id: 'passage', label: '지문' },
  { id: 'stem', label: '발문' },
  { id: 'choices', label: '선지' },
  { id: 'box', label: '보기' },
  { id: 'explanation', label: '해설' },
], 'all');

/** 미리보기처럼 “한 자리”를 골라야 할 때 쓰는, 우산 값을 뺀 목록. */
export const RULE_SCOPE_CONCRETE = Object.freeze(
  RULE_SCOPE.values.filter((v) => !v.umbrella).map((v) => v.id),
);

/**
 * 이미지가 들어갈 자리. `figure:<n>`은 문항 안 n번째 도형 자리라 개수가 정해져 있지 않다 —
 * 그래서 목록이 아니라 pattern으로 받고, 화면에 뿌릴 때만 figureSlots(n)로 펼친다.
 */
export const IMAGE_SLOT = makeEnum('IMAGE_SLOT', [
  { id: 'afterPassage', label: '지문 뒤' },
  { id: 'afterStem', label: '발문 뒤' },
  { id: 'beforeChoices', label: '선지 앞' },
  { id: 'explanation', label: '해설' },
], 'afterStem', {
  pattern: /^figure:(\d+)$/u,
  figurePrefix: 'figure:',
});

/** n번째 도형 자리의 슬롯 id. */
export function figureSlot(n) {
  return `${IMAGE_SLOT.figurePrefix}${n}`;
}

/** 도형 자리 count개를 붙인 슬롯 선택지 전체(배치 표의 <select>가 쓰는 목록). */
export function imageSlotOptions(figureCount = 3) {
  const extra = [];
  for (let i = 0; i < Math.max(0, figureCount); i += 1) {
    extra.push({ id: figureSlot(i), label: `도형 ${i + 1} 자리` });
  }
  return IMAGE_SLOT.values.concat(extra);
}

/** 이미지 폭 프리셋. 칸 폭에 대한 백분율이고, 직접 친 값도 그대로 통한다. */
export const IMAGE_WIDTH = makeEnum('IMAGE_WIDTH', [
  { id: '100%', label: '100% (칸 전체)' },
  { id: '75%', label: '75%' },
  { id: '60%', label: '60%' },
  { id: '50%', label: '50% (반 칸)' },
], '100%', {
  // 40%·8em처럼 직접 친 CSS 길이도 막지 않는다.
  pattern: /^\d+(?:\.\d+)?(?:%|px|mm|em|rem)$/u,
});

/* ─────────────────────────── 시트·차례·붙여 두기 ─────────────────────────── */

/** 만들어 낼 수 있는 시트. on은 새 프로젝트에서의 켬·끔 기본값이다. */
export const SHEET_KEYS = makeEnum('SHEET_KEYS', [
  { id: 'cover', label: '표지', on: false, desc: '줄 단위로 적은 표지 문구 한 쪽' },
  { id: 'problems', label: '문제 시트', on: true, desc: '본체. 끄면 정답·해설만 남는다' },
  { id: 'answers', label: '빠른 정답', on: true, desc: '한 줄 perRow칸의 번호·정답 표' },
  { id: 'explanations', label: '해설 시트', on: true, desc: '자체 격자를 갖는 별도 시트' },
  { id: 'toc', label: '차례', on: true, desc: '2-pass로 쪽번호를 확정해 넣는다' },
], 'problems');

/** 차례 세부 토글. */
export const TOC_OPTIONS = makeEnum('TOC_OPTIONS', [
  { id: 'front', label: '맨 앞에 전체 차례', on: true },
  { id: 'perUnit', label: '대단원마다 소단원 차례', on: true },
  { id: 'pageNumbers', label: '쪽번호 표시', on: true },
], 'front');

/**
 * 쪽을 넘길 때 쪼개지 말아야 할 것들. 앞의 셋은 “붙인다”, 뒤의 둘은 “쪼개도 된다”라
 * 뜻이 뒤집혀 있다 — 라벨을 여기 한 번만 적어 두고 UI가 그대로 읽어 쓴다.
 */
export const KEEP_KEYS = makeEnum('KEEP_KEYS', [
  { id: 'headWithStem', label: '번호와 발문을 붙인다', on: true, desc: '번호만 앞 칸에 남는 일을 막는다' },
  { id: 'stemWithFirstChoice', label: '발문과 첫 선지를 붙인다', on: true, desc: '발문 뒤가 곧장 끊기지 않게 한다' },
  { id: 'choicesTogether', label: '선지를 쪼개지 않는다', on: true, desc: '못 지키면 li 단위로 나눈다' },
  { id: 'allowPassageSplit', label: '지문 분할을 허용한다', on: true, desc: '문단·문장 단위로 이어 붙인다' },
  { id: 'allowTableSplit', label: '표 분할을 허용한다', on: true, desc: '행 단위로 나누고 머리 행을 되풀이한다' },
  { id: 'bandWithFirst', label: '단원 제목과 첫 문항 붙이기', on: true, desc: '띠만 칸 끝에 남고 문항이 다음 칸에서 시작하는 일을 막는다' },
  { id: 'passageWithFirst', label: '지문과 첫 문항을 붙인다', on: true, desc: '여러 문항이 나눠 읽는 지문은 첫 문항의 일부로 본다 — 지문 끝과 번호·발문이 한 칸에 앉는다' },
  { id: 'shrinkToKeep', label: '붙여 두기가 안 되면 글자를 줄인다', on: true, desc: '그 쪽만 글자를 단계씩 줄여 다시 놓는다. 쪽당 문항 수의 글자 조절을 꺼 두어도 이것만은 돈다' },
], 'headWithStem');

/** `_원본`/`_view` 쌍에서 살릴 쪽(booklet.py --prefer, 파일 탭 체크상자). */
export const PREFER_VARIANT = makeEnum('PREFER_VARIANT', [
  { id: '원본', label: '_원본 우선' },
  { id: 'view', label: '_view 우선' },
], '원본');

/* ─────────────────────────── 확장자 ─────────────────────────── */

// 세 목록의 지역 이름에 OPT_ 접두를 붙이는 것은 export.js의 독립 HTML 번들 때문이다 —
// 모든 모듈이 한 스코프에 이어 붙으므로 store.js가 다시 내보내는 같은 이름과 부딪힌다.
// 바깥에서 보이는 이름은 아래 export 문이 TEXT_EXT·IMAGE_EXT·PROJECT_EXT로 되돌려 놓는다.

/** 문제 원문으로 받는 확장자(소문자, 점 포함). */
const OPT_TEXT_EXT = Object.freeze(['.md', '.txt', '.markdown']);

/** 이미지로 받는 확장자. */
const OPT_IMAGE_EXT = Object.freeze(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

/** 프로젝트 파일로 받는 확장자. */
const OPT_PROJECT_EXT = Object.freeze(['.json']);

export { OPT_TEXT_EXT as TEXT_EXT, OPT_IMAGE_EXT as IMAGE_EXT, OPT_PROJECT_EXT as PROJECT_EXT };

/* ─────────────────────────── 숫자 한계 ─────────────────────────── */

/**
 * 숫자 입력의 범위·눈금·기본값. UI의 min·max·step이 전부 여기서 나오므로
 * “칸에는 6까지 들어가는데 조판은 7 아래를 못 버틴다” 같은 어긋남이 생기지 않는다.
 * default가 객체인 항목(margin)은 네 변을 한 번에 준다.
 */
export const LIMITS = Object.freeze({
  fontSize: Object.freeze({ min: 7, max: 14, step: 0.25, default: 10, unit: 'pt', label: '본문 글자 크기' }),
  lineHeight: Object.freeze({ min: 1.2, max: 2.0, step: 0.05, default: 1.55, unit: '', label: '줄높이' }),
  mathScale: Object.freeze({ min: 0.6, max: 1.6, step: 0.05, default: 1, unit: '배', label: '수식 배율' }),
  margin: Object.freeze({
    min: 0, max: 40, step: 0.5, unit: 'mm', label: '쪽 여백',
    default: Object.freeze({ top: 18, right: 14, bottom: 16, left: 14 }),
  }),
  gutter: Object.freeze({ min: 0, max: 20, step: 0.5, default: 8, unit: 'mm', label: '단 간격' }),
  rowGap: Object.freeze({ min: 0, max: 20, step: 0.5, default: 6, unit: 'mm', label: '행 간격' }),
  problemGap: Object.freeze({ min: 0, max: 20, step: 0.5, default: 5, unit: 'mm', label: '문항 간격' }),
  cellSlack: Object.freeze({ min: 0, max: 15, step: 0.5, default: 3, unit: 'mm', label: '칸 아래 여유(잘림 방지)' }),
  figureMaxWidth: Object.freeze({ min: 20, max: 100, step: 5, default: 100, unit: '%', label: '도형 최대 폭' }),
  // 쪽당 시작 문항 수. 0은 "제한 없음"이라 min이 0이다 — 한 쪽에 서른 문항이면 어떤 격자로도 넘친다.
  perPageMin: Object.freeze({ min: 0, max: 30, step: 1, default: 0, unit: '문항', label: '쪽당 최소 문항 수(0=제한 없음)' }),
  perPageMax: Object.freeze({ min: 0, max: 30, step: 1, default: 0, unit: '문항', label: '쪽당 최대 문항 수(0=제한 없음)' }),
  // 최소 미달 쪽을 줄일 수 있는 바닥 글자 크기와 한 단계 폭.
  perPageMinFont: Object.freeze({ min: 6, max: 12, step: 0.25, default: 8, unit: 'pt', label: '줄일 수 있는 최소 글자 크기' }),
  perPageFontStep: Object.freeze({ min: 0.05, max: 2, step: 0.05, default: 0.25, unit: 'pt', label: '글자 크기 한 단계' }),
  perPageRulePage: Object.freeze({ min: 1, max: 999, step: 1, default: 1, unit: '쪽', label: '예외를 걸 쪽번호' }),
  pageMm: Object.freeze({ min: 80, max: 500, step: 1, default: 210, unit: 'mm', label: '사용자 지정 용지' }),
  zoom: Object.freeze({ min: 0.3, max: 2.0, step: 0.05, default: 0.7, unit: '×', label: '미리보기 배율' }),
  perRow: Object.freeze({ min: 5, max: 20, step: 1, default: 10, unit: '칸', label: '빠른 정답 한 줄 칸 수' }),
  numberStart: Object.freeze({ min: 0, max: 999, step: 1, default: 1, unit: '', label: '시작 번호' }),
  numberPad: Object.freeze({ min: 0, max: 4, step: 1, default: 0, unit: '자리', label: '0 채움 자릿수' }),
  explGrid: Object.freeze({ min: 1, max: 3, step: 1, default: 2, unit: '', label: '해설 시트 격자' }),
  autosave: Object.freeze({ min: 0, max: 4 * 1024 * 1024, step: 1, default: 4 * 1024 * 1024, unit: 'B', label: 'localStorage 저장 한도' }),
});

/** 값을 그 한계 안으로 밀어 넣는다(숫자가 아니면 기본값). */
export function clamp(limitKey, value) {
  const lim = LIMITS[limitKey];
  if (!lim) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return typeof lim.default === 'number' ? lim.default : lim.min;
  return Math.min(lim.max, Math.max(lim.min, n));
}

/* ─────────────────────────── 헬퍼 ─────────────────────────── */

/** enum 객체든 [{id,label}] 배열이든 값 목록으로 펴 준다. */
function listOf(enumOrList) {
  if (Array.isArray(enumOrList)) return enumOrList;
  return enumOrList && enumOrList.values ? enumOrList.values : [];
}

/**
 * 값이 그 열거형에서 허용되는지 본다.
 * 목록에 있거나 · pattern에 맞거나 · accepts가 받아들이면 유효하다.
 */
export function isValid(enumObj, v) {
  if (!enumObj) return false;
  if (Array.isArray(enumObj)) return enumObj.some((x) => x.id === v);
  if (typeof v === 'string' && Object.hasOwn(enumObj.byId, v)) return true;
  if (enumObj.pattern && typeof v === 'string' && enumObj.pattern.test(v)) return true;
  if (typeof enumObj.accepts === 'function' && enumObj.accepts(v)) return true;
  return false;
}

/** 값의 한국어 라벨. 모르는 값은 문자열 그대로 돌려준다(라벨 자리가 비지 않게). */
export function labelOf(enumObj, v) {
  if (!enumObj) return String(v == null ? '' : v);
  const found = Array.isArray(enumObj)
    ? enumObj.find((x) => x.id === v)
    : enumObj.byId[v];
  if (found) return found.label;
  if (enumObj.pattern && typeof v === 'string') {
    const m = enumObj.pattern.exec(v);
    // `figure:2` → "도형 3 자리". 0부터 세는 슬롯을 사람이 세는 번호로 옮긴다.
    if (m && enumObj === IMAGE_SLOT) return `도형 ${Number(m[1]) + 1} 자리`;
    if (m) return v;
  }
  return String(v == null ? '' : v);
}

/** 목록에서 몇 개를 뺀 값 배열(선택지에서 “전체”·“자동”을 덜어 낼 때). */
export function omit(enumObj, ...ids) {
  const drop = new Set(ids.flat());
  return listOf(enumObj).filter((v) => !drop.has(v.id));
}

/** HTML 속성값 이스케이프 — 글꼴 id에 작은따옴표가 들어 있어 반드시 거쳐야 한다.
 *  이름에 Opt를 박은 것도 번들 한 스코프에서 rules.js의 같은 함수와 겹치지 않기 위해서다. */
function escapeOptAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;').replace(/'/gu, '&#39;');
}

/**
 * `<option>` 문자열을 만든다. selected와 같은 id에 selected 속성이 붙는다.
 * @param {object|object[]} enumOrList  열거형 또는 값 배열
 * @param {string} [selected]  고를 값(없으면 열거형 기본값)
 */
export function optionsHtml(enumOrList, selected) {
  const list = listOf(enumOrList);
  const want = selected !== undefined && selected !== null
    ? String(selected)
    : (Array.isArray(enumOrList) ? '' : String(enumOrList.default || ''));
  return list.map((v) => {
    const on = String(v.id) === want ? ' selected' : '';
    const title = v.hint || v.desc ? ` title="${escapeOptAttr(v.hint || v.desc)}"` : '';
    return `<option value="${escapeOptAttr(v.id)}"${on}${title}>${escapeOptAttr(v.label)}</option>`;
  }).join('');
}

/** on 플래그를 가진 열거형(시트·차례·keep)을 { id: bool } 기본값 객체로 편다. */
export function flagDefaults(enumObj) {
  const out = {};
  for (const v of enumObj.values) out[v.id] = v.on === true;
  return out;
}

/* ─────────────────────────── 기본값 조각 ─────────────────────────── */

/**
 * DESIGN §2.6 LayoutSettings의 기본값 전체를 새 객체로 만든다.
 * store.js의 defaultLayout()과 booklet.py의 default_layout()이 둘 다 이 표를 본다 —
 * 두 곳에 같은 수를 두 번 적으면 언젠가 한쪽만 고쳐진다.
 */
export function defaults() {
  return {
    page: PAGE_SIZE.default,
    orientation: ORIENTATION.default,
    margin: { ...LIMITS.margin.default },
    grid: gridFromId(GRID.default),
    gutter: LIMITS.gutter.default,
    rowGap: LIMITS.rowGap.default,
    columnRule: true,
    rowRule: false,
    fillOrder: FILL_ORDER.default,
    font: {
      family: FONT_FAMILY.default,
      size: LIMITS.fontSize.default,
      lineHeight: LIMITS.lineHeight.default,
      mathScale: LIMITS.mathScale.default,
    },
    header: { ...HEADER_DEFAULT },
    footer: { ...FOOTER_DEFAULT },
    examStyle: false,
    problemGap: LIMITS.problemGap.default,
    cellSlack: LIMITS.cellSlack.default,
    numberStyle: NUMBER_STYLE.default,
    showTitle: false,
    showTime: false,
    showRef: false,
    showSrcNum: false,
    passageStyle: PASSAGE_STYLE.default,
    choiceStyle: CHOICE_STYLE.default,
    keep: flagDefaults(KEEP_KEYS),
    // 한 쪽에서 **시작**하는 문항 수의 최소·최대(0 = 제한 없음). 문제 시트에만 건다.
    perPage: { min: LIMITS.perPageMin.default, max: LIMITS.perPageMax.default },
    // 쪽번호별 예외 [{ page, min, max }]. 비어 있으면 전역 값만 쓴다.
    perPageRules: [],
    // 최소 미달 쪽의 글자를 step(pt)씩 줄여 minSize까지 다시 배치한다.
    perPageFont: {
      enabled: true,
      minSize: LIMITS.perPageMinFont.default,
      step: LIMITS.perPageFontStep.default,
    },
    figure: { mode: FIGURE_MODE.default, maxWidth: LIMITS.figureMaxWidth.default },
    unitBand: { enabled: true, style: UNIT_BAND_STYLE.default },
    subunitBand: { enabled: true },
  };
}

/* ─────────────────────────── 검증 ─────────────────────────── */

/**
 * 프로젝트 안에서 열거형이 지키는 자리들. 남의 손을 거친 JSON을 읽을 때
 * 이 표대로 훑어 이상한 값을 기본값으로 되돌린다.
 */
export const ENUM_PATHS = Object.freeze([
  Object.freeze({ path: 'layout.page', enum: PAGE_SIZE, label: '용지' }),
  Object.freeze({ path: 'layout.orientation', enum: ORIENTATION, label: '용지 방향' }),
  Object.freeze({ path: 'layout.fillOrder', enum: FILL_ORDER, label: '채우는 순서' }),
  Object.freeze({ path: 'layout.numberStyle', enum: NUMBER_STYLE, label: '번호 스타일' }),
  Object.freeze({ path: 'layout.passageStyle', enum: PASSAGE_STYLE, label: '지문 스타일' }),
  Object.freeze({ path: 'layout.choiceStyle', enum: CHOICE_STYLE, label: '선지 스타일' }),
  Object.freeze({ path: 'layout.figure.mode', enum: FIGURE_MODE, label: '도형 모드' }),
  Object.freeze({ path: 'layout.unitBand.style', enum: UNIT_BAND_STYLE, label: '대단원 형식' }),
  Object.freeze({ path: 'numbering.mode', enum: NUMBERING_MODE, label: '번호 매기는 방식' }),
  Object.freeze({ path: 'units.source', enum: UNITS_SOURCE, label: '단원 도출' }),
]);

/** 경로 하나를 읽는다(store.js를 부르면 순환 import가 되므로 여기 따로 둔다). */
function readPath(obj, path) {
  let cur = obj;
  for (const k of String(path).split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = cur[k];
  }
  return cur;
}

/** 경로 하나에 쓴다(중간 객체가 없으면 만들지 않고 조용히 물러난다). */
function writePath(obj, path, value) {
  const keys = String(path).split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i += 1) {
    if (cur === null || typeof cur !== 'object') return;
    cur = cur[keys[i]];
  }
  if (cur !== null && typeof cur === 'object') cur[keys[keys.length - 1]] = value;
}

/**
 * 프로젝트의 열거형 자리를 훑어 허용값이 아닌 것을 기본값으로 되돌린다(제자리 수정).
 * @returns {string[]} 사람이 읽는 경고 문장(고친 것만)
 */
export function sanitizeEnums(project) {
  const warnings = [];
  if (!project || typeof project !== 'object') return warnings;
  for (const { path, enum: e, label } of ENUM_PATHS) {
    const cur = readPath(project, path);
    if (cur === undefined) continue;
    if (isValid(e, cur)) continue;
    const shown = typeof cur === 'object' ? JSON.stringify(cur) : String(cur);
    writePath(project, path, e.default);
    warnings.push(`${label}(${path})의 값 “${shown}”은(는) 쓸 수 없어 기본값 “${labelOf(e, e.default)}”으로 되돌렸습니다.`);
  }
  // 선지 배치 덮어쓰기는 문항 수만큼 있으므로 따로 훑는다.
  const overrides = project.overrides;
  if (overrides && typeof overrides === 'object') {
    for (const [key, ov] of Object.entries(overrides)) {
      if (!ov || typeof ov !== 'object' || ov.choiceLayout === undefined) continue;
      if (isValid(CHOICE_STYLE, ov.choiceLayout)) continue;
      warnings.push(`${key}의 선지 배치 “${ov.choiceLayout}”은(는) 쓸 수 없어 자동으로 되돌렸습니다.`);
      ov.choiceLayout = CHOICE_STYLE.default;
    }
  }
  return warnings;
}

/** 모든 열거형을 이름으로 찾을 수 있게 모아 둔 목록(테스트·도구용). */
export const ALL_ENUMS = Object.freeze({
  PAGE_SIZE, ORIENTATION, GRID, FILL_ORDER, NUMBER_STYLE, PASSAGE_STYLE,
  CHOICE_STYLE, FIGURE_MODE, UNIT_BAND_STYLE, FONT_FAMILY, HEADER_TOKENS,
  NUMBERING_MODE, UNITS_SOURCE, SUBJECT, PROFILE_ID, RULE_SCOPE, IMAGE_SLOT,
  IMAGE_WIDTH, SHEET_KEYS, TOC_OPTIONS, KEEP_KEYS, PREFER_VARIANT,
});
