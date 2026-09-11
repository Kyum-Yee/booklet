// format.js — 포맷 프로파일 스키마·내장 프로파일(batch, plain)·컴파일·검증.
// 모든 규칙은 문자열 정규식으로 보관하고, compileProfile에서 딱 한 번 RegExp로 만든다.
// 파서는 컴파일된 프로파일만 본다(런타임 정규식 생성 금지).

/** 문자열(또는 문자열 배열) 정규식으로 다루는 최상위 필드 목록. */
const REGEX_FIELDS = [
  'ignoreLine', 'headerLine', 'headerField', 'ref', 'refParts',
  'problemStart', 'explanationStart', 'questionHead', 'metaLine', 'quotePrefix', 'intro',
  'stemNeedsPassage', 'choice', 'choiceInline', 'choiceContinuation',
  'section', 'boxItem', 'listItem', 'inserted', 'fence',
  'tableRow', 'tableSep', 'mathBlock', 'image',
];

/** 하위 객체 안에서 정규식으로 다루는 필드 목록. */
const NESTED_REGEX_FIELDS = {
  block: ['start', 'end'],
  passage: ['open', 'close', 'fenceHead'],
  box: ['open', 'close', 'fenceHead'],
  answer: ['parse'],
  answerKey: ['start', 'entry'],
};

/** 내장 batch 프로파일 — problem_generator 산출물(`---` 구분 · [문제]/[해설] · `"""` 지문 · ①~⑤ 선지). */
const BATCH = {
  id: 'batch',
  name: 'problem_generator batch',
  description: '--- 구분 · [문제]/[해설] · """ 지문 · ①~⑤ 선지 · [정답] n',
  ignoreLine: ['^<!--.*-->\\s*$'],
  headerLine: ['^#+\\s*(.*)$', '^>\\s*(.*)$'],
  headerField: '^([^:：]{1,20})[:：]\\s*(.*)$',
  block: { start: '^---\\s*$', end: '^---\\s*$' },
  ref: '^\\[ref\\]\\s*(.*)$',
  // page/srcProblem은 "228~229쪽", "문제 50~53" 같은 범위 표기를 받는다.
  // lead는 대괄호 제목이 없을 때의 제목 자리(예: "홑문장·겹문장 판별 문제 1 …").
  refParts: '^(?:(?<page>[0-9][0-9~\\-–]*쪽)\\s*)?(?:\\[(?<title>[^\\]]+)\\]\\s*)?(?:(?<lead>.*?)\\s*문제\\s*(?<srcProblem>[0-9][0-9~\\-–]*)\\s*)?(?<rest>.*)$',
  problemStart: '^\\[문제\\]\\s*$',
  explanationStart: '^\\[해설\\]\\s*$',
  questionHead: [
    '^(?<num>\\d{1,3})\\s*[.)]?\\s*(?:\\((?<time>[^)]*)\\))?\\s*$',
    '^문제\\s*(?<num>\\d{1,3})\\s*[.)]?\\s*(?:\\((?<time>[^)]*)\\))?\\s*$',
  ],
  // 아래 넷은 batch 포맷에 없는 기능(=null). 사용자 포맷이 켜서 쓴다.
  metaLine: null,       // "- **풀이 권장 시간**: 2분" 같은 문항 머리 메타 줄
  timeKeys: null,       // metaLine의 key 중 problem.time으로 갈 이름들(정규식 아님)
  quotePrefix: null,    // 본문 줄 앞의 인용 접두("> ")를 벗기는 규칙
  answerKey: null,      // 파일 끝의 정답표 섹션(start/entry)
  intro: '^(?:다음|아래)\\s*(?:글|시|시가|작품|자료|물음|두 글|\\(가\\)와? \\(나\\))?.*(?:읽고|보고|참고하여).*(?:답하시오|답하라|답하세요)\\.?$',
  passage: { open: '^"""\\s*$', close: '^"""\\s*$', inherit: true, fenceHead: null },
  // 지문을 스스로 갖지 않는 문항이 앞 지문을 가리키는 발문 형태.
  // 〈보기〉/<보기> 접두, 윗글류, [A]·㉠·ⓐ 지시, 지문 속 어구를 따옴표로 인용한 발문까지 받는다.
  stemNeedsPassage: '^(?:[〈<]\\s*(?:보기|자료)\\s*[〉>][^?]{0,40}?)?(?:윗글|위 글|위 시|위 작품|위의 글|앞의 글|앞 글|\\(가\\)|\\(나\\)|\\[[A-Ea-e]\\]|[㉠-㉭]|[ⓐ-ⓩ]|[\'‘][^\'’]{1,25}[\'’]|[가-힣]{1,10}의 내용에 대한)',
  choice: '^(?<label>[①②③④⑤⑥⑦⑧⑨⑩])\\s*(?<text>.*)$',
  choiceInline: '^(?:[①②③④⑤⑥⑦⑧⑨⑩]\\s*){2,}$',
  choiceContinuation: '^\\s{2,}(?!\\s*[①②③④⑤])(\\S.*)$',
  section: '^\\[(?<name>지문|풀이|팁|정답|출처|지문 요약)\\]\\s*(?<rest>.*)$',
  answer: { section: '정답', parse: '[0-9]+|[①-⑩]' },
  box: { open: '^[<〈](?<title>보기|자료|표|조건|그림|대화|사례)\\s*(?<no>[0-9A-Za-z가-힣]*)[>〉]\\s*$', close: null, fenceHead: null },
  boxItem: '^(?<marker>[ㄱ-ㅎ]|\\([가-힣]\\)|[a-eA-E]|[0-9]{1,2})[.)]\\s+(?<text>.*)$',
  listItem: '^(?<marker>[-•·]|\\([가-힣]\\)|[0-9]{1,2}\\.)\\s+(?<text>.*)$',
  inserted: '^\\s{4,}(?<text>\\S.*)$',
  fence: '^```\\s*(?<lang>\\w*)\\s*$',
  tableRow: '^\\|.*\\|\\s*$',
  tableSep: '^\\|?\\s*:?-{2,}:?\\s*(?:\\|\\s*:?-{2,}:?\\s*)*\\|?\\s*$',
  mathBlock: '^\\$\\$',
  image: ['^\\[이미지\\s*[:：]\\s*(?<name>[^\\]]+)\\]\\s*$', '^!\\[(?<caption>[^\\]]*)\\]\\((?<name>[^)]+)\\)\\s*$'],
  subjectHints: {
    '국어': ['윗글', '화자', '서술상', '음운', '형태소', '작품', '시적', '문장 성분', '겹문장'],
    '영어': ['[A-Za-z]{4,}\\s+[A-Za-z]{4,}\\s+[A-Za-z]{4,}'],
    '수학': ['함수', '극한', '방정식', '삼각형', '좌표평면', '미분', '적분', '수열'],
    '화학': ['mol', 'atm', '\\(g\\)', '\\(aq\\)', '분자량', '끓는점', '수용액', '원자량', '몰 농도', '화학 반응식'],
  },
};

/**
 * 내장 mdheading 프로파일 — 마크다운 문항 헤딩 포맷.
 * `# 파일 제목` + `- 영역: …` 헤더, `---` 구분, `### [문항 N] 제목`,
 * `- **풀이 권장 시간**: 2분` 메타, ```` ```text ````+`[지문]` 지문, `> ` 인용 <보기>·선지,
 * 파일 끝 `## [정답 및 정밀 해설]` 정답표.
 */
const MDHEADING = {
  id: 'mdheading',
  name: '마크다운 문항 헤딩(### [문항 N])',
  description: '### [문항 N] 제목 · - **풀이 권장 시간**: 2분 · ```text [지문] 지문 · > 인용 <보기>·선지 · ## [정답 및 정밀 해설] 정답표',
  ignoreLine: ['^<!--.*-->\\s*$'],
  // 파일 머리의 `- 영역: …` 같은 리스트형 필드도 헤더로 읽는다(첫 블록 앞에 한함).
  headerLine: ['^#+\\s*(.*)$', '^>\\s*(.*)$', '^-\\s*(.*)$'],
  headerField: '^([^:：]{1,20})[:：]\\s*(.*)$',
  block: { start: '^---\\s*$', end: '^---\\s*$' },
  ref: null,
  problemStart: null,
  explanationStart: null,
  questionHead: ['^#{2,4}\\s*\\[문항\\s*(?<num>\\d{1,3})\\]\\s*(?<title>.*)$'],
  metaLine: '^-\\s*\\*\\*(?<key>[^*]+)\\*\\*\\s*[:：]\\s*(?<val>.*)$',
  timeKeys: ['풀이 권장 시간', '권장 풀이 시간', '풀이시간', '시간'],
  quotePrefix: '^>\\s?',
  // 지문은 펜스 안에 오고 첫 줄이 `[지문]`인 것만 지문으로 본다(나머지 펜스는 도형).
  passage: { open: null, close: null, inherit: true, fenceHead: '^\\[지문\\]\\s*$' },
  box: { open: '^[<〈](?<title>보기|자료|표|조건|그림|대화|사례)\\s*(?<no>[0-9A-Za-z가-힣]*)[>〉]\\s*$', close: null, fenceHead: '^\\[(?<title>보기|자료|표|조건)\\s*(?<no>[0-9A-Za-z가-힣]*)\\]\\s*$' },
  answerKey: {
    start: '^##\\s*\\[?정답',
    entry: '^###\\s*\\[문항\\s*(?<num>\\d+)\\s*정답\\]\\s*[:：]?\\s*(?<answer>.*)$',
  },
  answer: { section: '정답', parse: '[0-9]+|[①-⑩]' },
  section: null,
  // 해설 목록은 `- `와 `  - `가 섞여 오므로 들여쓰기를 허용해 한 층으로 평탄화한다.
  listItem: '^\\s*(?<marker>[-•·])\\s+(?<text>.*)$',
};

/** 내장 plain 프로파일 — 일반 문제지 텍스트(`1.` 시작 · `(1)`/`①` 선지 · `정답: 3` · `[지문]…[/지문]`). */
const PLAIN = {
  id: 'plain',
  name: '일반 문제지',
  description: '1./1)/문제 1 시작 · ①·(1)·1) 선지 · 정답: 3 / 답 ③ · [지문]…[/지문] 또는 """ 지문',
  ignoreLine: ['^<!--.*-->\\s*$', '^\\s*[-=*_]{3,}\\s*$'],
  headerLine: ['^#+\\s*(.*)$', '^>\\s*(.*)$'],
  block: null, // questionHead가 새 문항(=새 블록)을 연다
  ref: null,
  problemStart: null,
  explanationStart: '^\\[?해설\\]?\\s*[:：]?\\s*$',
  questionHead: [
    '^(?<num>\\d{1,3})\\s*[.)]\\s*(?:\\((?<time>[^)]*)\\)\\s*)?(?<rest>.*)$',
    '^문제\\s*(?<num>\\d{1,3})\\s*[.):]?\\s*(?:\\((?<time>[^)]*)\\)\\s*)?(?<rest>.*)$',
  ],
  metaLine: null,
  timeKeys: null,
  quotePrefix: null,
  answerKey: null,
  passage: {
    open: ['^\\[지문\\]\\s*$', '^"""\\s*$'],
    close: ['^\\[/지문\\]\\s*$', '^"""\\s*$'],
    inherit: true,
    fenceHead: null,
  },
  choice: [
    '^(?<label>[①②③④⑤⑥⑦⑧⑨⑩])\\s*(?<text>.*)$',
    '^\\((?<label>[1-9])\\)\\s*(?<text>.*)$',
    '^(?<label>[1-9])\\)\\s+(?<text>\\S.*)$',
  ],
  // `[정답] 3` · `정답: 3` · `답 ③` 세 모양만 섹션으로 본다(본문 문장을 섹션으로 오인하지 않게).
  section: [
    '^\\[(?<name>정답|답|해설|풀이|팁|지문|출처|지문 요약)\\]\\s*[:：]?\\s*(?<rest>.*)$',
    '^(?<name>정답|답|해설|풀이|팁|출처)\\s*[:：]\\s*(?<rest>.*)$',
    '^(?<name>정답|답)\\s+(?<rest>[①-⑩0-9].*)$',
  ],
  answer: { section: '정답', parse: '[0-9]+|[①-⑩]' },
};

export const BUILTIN_PROFILES = { batch: BATCH, mdheading: MDHEADING, plain: PLAIN };

/** 자동 감지 시 시도하는 내장 프로파일 순서. */
export const BUILTIN_ORDER = ['batch', 'mdheading', 'plain'];

/** 값이 평범한 객체인지. */
function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** 사용자 프로파일의 빠진 필드를 batch 기본값으로 채운다(명시적 null은 "기능 없음"으로 존중). */
function withDefaults(json) {
  const out = {};
  const keys = new Set([...Object.keys(BATCH), ...Object.keys(json || {})]);
  for (const k of keys) {
    const has = json && Object.prototype.hasOwnProperty.call(json, k);
    const mine = has ? json[k] : undefined;
    const base = BATCH[k];
    if (!has) { out[k] = base; continue; }
    if (isPlainObject(mine) && isPlainObject(base)) out[k] = { ...base, ...mine };
    else out[k] = mine;
  }
  return out;
}

/** 문자열/문자열 배열을 RegExp/RegExp[]로. null·undefined는 null. */
function toRegExp(value, flags, field, errors) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const list = [];
    value.forEach((v, i) => {
      const r = toRegExp(v, flags, `${field}[${i}]`, errors);
      if (r) list.push(r);
    });
    return list.length ? list : null;
  }
  if (value instanceof RegExp) return new RegExp(value.source, flags);
  try {
    return new RegExp(String(value), flags);
  } catch (err) {
    errors.push({ field, message: `정규식을 컴파일할 수 없습니다: ${err.message}` });
    return null;
  }
}

/**
 * 프로파일 JSON을 RegExp 묶음으로 컴파일한다(누락 필드는 batch 기본값).
 * @returns {object} CompiledProfile — 원본은 `.json`, 오류 목록은 `.errors`.
 */
export function compileProfile(json) {
  const merged = withDefaults(json || {});
  const errors = [];
  const c = {
    id: merged.id || 'custom',
    name: merged.name || merged.id || '사용자 프로파일',
    description: merged.description || '',
    json: merged,
    errors,
  };
  c.timeKeys = Array.isArray(merged.timeKeys)
    ? merged.timeKeys.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim())
    : null;
  for (const f of REGEX_FIELDS) c[f] = toRegExp(merged[f], 'u', f, errors);
  for (const [group, fields] of Object.entries(NESTED_REGEX_FIELDS)) {
    const src = merged[group];
    if (!src) { c[group] = null; continue; }
    const obj = { ...src };
    for (const f of fields) {
      obj[f] = toRegExp(src[f], f === 'parse' ? 'gu' : 'u', `${group}.${f}`, errors);
    }
    c[group] = obj;
  }
  const hints = merged.subjectHints || {};
  c.subjectHints = {};
  for (const [subject, list] of Object.entries(hints)) {
    const arr = toRegExp(list, 'gu', `subjectHints.${subject}`, errors);
    c.subjectHints[subject] = Array.isArray(arr) ? arr : (arr ? [arr] : []);
  }
  return c;
}

/**
 * 프로파일 JSON 검증 — 정규식 컴파일 실패와 필수 필드 누락을 모은다.
 * @returns {{ok: boolean, errors: {field: string, message: string}[]}}
 */
export function validateProfile(json) {
  const errors = [];
  if (!isPlainObject(json)) {
    return { ok: false, errors: [{ field: '(전체)', message: '프로파일은 JSON 객체여야 합니다.' }] };
  }
  const merged = withDefaults(json);
  for (const f of REGEX_FIELDS) toRegExp(merged[f], 'u', f, errors);
  for (const [group, fields] of Object.entries(NESTED_REGEX_FIELDS)) {
    if (!merged[group]) continue;
    for (const f of fields) toRegExp(merged[group][f], f === 'parse' ? 'gu' : 'u', `${group}.${f}`, errors);
  }
  for (const [subject, list] of Object.entries(merged.subjectHints || {})) {
    toRegExp(list, 'gu', `subjectHints.${subject}`, errors);
  }
  if (!json.id || typeof json.id !== 'string') {
    errors.push({ field: 'id', message: 'id는 비어 있지 않은 문자열이어야 합니다.' });
  }
  if (!merged.choice) {
    errors.push({ field: 'choice', message: '선지 규칙(choice)이 없으면 선지를 읽을 수 없습니다.' });
  }
  if (!merged.block && !merged.questionHead) {
    errors.push({ field: 'block', message: 'block(구분선)이 없으면 questionHead로 문항을 나눠야 합니다. 둘 다 없습니다.' });
  }
  if (merged.timeKeys !== null && merged.timeKeys !== undefined && !Array.isArray(merged.timeKeys)) {
    errors.push({ field: 'timeKeys', message: 'timeKeys는 문자열 배열이어야 합니다(예: ["풀이 권장 시간"]).' });
  }
  if (merged.metaLine && !/\(\?<key>/u.test(String(merged.metaLine))) {
    errors.push({ field: 'metaLine', message: 'metaLine에는 이름 붙인 그룹 (?<key>…)와 (?<val>…)가 있어야 합니다.' });
  }
  if (merged.answerKey) {
    if (!merged.answerKey.start) {
      errors.push({ field: 'answerKey.start', message: '정답표가 어디서 시작하는지(start)를 적어야 합니다.' });
    }
    if (!merged.answerKey.entry) {
      errors.push({ field: 'answerKey.entry', message: '정답표 항목 규칙(entry)이 없으면 정답을 문항에 붙일 수 없습니다.' });
    } else if (!/\(\?<num>/u.test(String(merged.answerKey.entry))) {
      errors.push({ field: 'answerKey.entry', message: 'answerKey.entry에는 문항 번호 그룹 (?<num>…)가 있어야 합니다.' });
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * 프로젝트에서 프로파일을 찾아 컴파일한다(사용자 정의 → 내장 → batch 순).
 * 같은 프로파일을 되풀이 컴파일하지 않도록 프로젝트에 캐시를 붙인다.
 */
export function resolveProfile(project, profileId) {
  const id = profileId || 'batch';
  const cacheKey = `__compiled_${id}`;
  const cache = project && project.__profileCache;
  if (cache && cache[cacheKey]) return cache[cacheKey];
  const custom = (project && Array.isArray(project.profiles))
    ? project.profiles.find((p) => p && p.id === id)
    : null;
  const json = custom || BUILTIN_PROFILES[id] || BUILTIN_PROFILES.batch;
  const compiled = compileProfile(json);
  if (project) {
    if (!project.__profileCache) {
      Object.defineProperty(project, '__profileCache', { value: {}, enumerable: false, writable: true });
    }
    project.__profileCache[cacheKey] = compiled;
  }
  return compiled;
}
