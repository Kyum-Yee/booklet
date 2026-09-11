# booklet — 문제 조판기 설계서 (모듈 계약)

목적: 문제 파일(기본은 problem_generator의 batch 포맷, 그러나 **사용자 정의 포맷 프로파일로 어떤 문제 텍스트든**)을 모아 학원 교재·모의고사 시험지로 조판하고, 브라우저 인쇄(PDF)로 뽑는다.

- 실행 형태: 빌드 없는 브라우저 앱(`index.html` + ES modules). 서버 없음. `file://`로 열려도 동작.
- 외부 의존: KaTeX만 (CDN `https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/…`, `vendor/katex/`가 있으면 로컬 우선). 나머지는 전부 자체 구현.
- 파서·렌더·ascii2svg는 **DOM 무관 순수 JS** (node `--test`로 검증). 레이아웃·앱만 브라우저.
- 경로: `booklet/`. 모듈은 `src/`, 스타일 `styles/`, 테스트 `tests/` (픽스처 `tests/fixtures/*.md` = 실제 산출물 그대로).

요구 기능(목표 9항)과 담당 모듈:

| # | 기능 | 모듈 |
|---|---|---|
| 1 | 1×1, 2×1, 1×2, 2×2 배치 | layout.js (`grid.cols × grid.rows` 셀 흐름) |
| 2 | LaTeX/KaTeX | render.js(수식 보호) + layout.js(측정 전 `renderMathInElement`) |
| 3 | 포맷 기반 파싱 + 정규식 후처리(작은따옴표 어구 자동 bold 등) | format.js, parser.js, rules.js |
| 4 | 문제 시트 → 정답 시트 → 해설 시트 분리 | sheets.js + layout.js |
| 5 | 아스키 그래프 매끄럽게 | ascii2svg.js |
| 6 | 문제 번호 정리 | numbering.js |
| 7 | 문제별 대단원·소단원 | units.js + UI |
| 8 | 차례 자동 생성(맨 앞 + 대단원 사이 소단원 차례, 쪽수) | toc.js + layout.js 2-pass |
| 9 | 이미지 업로드 | store.js + render.js(`image` 블록) + UI |

---

## 1. 파일 구성

```
booklet/
  index.html            앱 진입점 (UI 골격, KaTeX 로드, 모듈 import)
  booklet.py            CLI: 폴더/파일 → 프로젝트 JSON / 독립 실행 HTML / Chrome headless PDF
  DESIGN.md             이 문서
  README.md             사용법
  src/
    options.js          사용자 입력의 허용값 사전(열거형·라벨·기본값·한계)  [DOM 무관]
    format.js           포맷 프로파일 스키마·내장 프로파일·컴파일·검증
    parser.js           프로파일 기반 라인 상태기계 → Problem[]
    rules.js            인라인 정규식 규칙(기본 규칙 + 사용자 규칙) 적용
    render.js           Problem → HTML 문자열(원자 단위)  [DOM 무관]
    numbering.js        번호 정리
    units.js            대단원·소단원 도출·그룹화
    ascii2svg.js        아스키 도형 → SVG  [DOM 무관]
    layout.js           페이지네이션 엔진(측정·셀 패킹·분할·헤더/푸터)  [브라우저]
    toc.js              차례 항목 생성(레이아웃 2-pass용)
    sheets.js           정답 시트·해설 시트 항목 생성
    store.js            프로젝트 상태·autosave(localStorage)·import/export
    app.js              UI 배선
    export.js           독립 HTML 내보내기·인쇄
  styles/
    ui.css              앱 UI(사이드바·프리뷰). 인쇄 시 숨김
    page.css            페이지·셀·문항·지문·선지·표·도형·차례·시트 스타일(화면+인쇄 공통)
  vendor/
    fetch.sh            KaTeX 로컬 복사(오프라인용). 없어도 CDN으로 동작
  tests/
    fixtures/*.md       실제 산출물 (아래 §9)
    *.test.mjs          node --test
    demo-*.html         브라우저 확인용
    chrome.sh           헤드리스 Chrome로 demo 렌더 → PDF/스크린샷
```

---

## 2. 데이터 모델 (모든 모듈이 이 이름을 그대로 쓴다)

### 2.1 Project (저장 단위, `.booklet.json`)

```js
{
  version: 1,
  title: "2026 화학 물질과 에너지 변형 문제집",
  subtitle: "",
  meta: { subject: "화학", grade: "고2", institute: "", date: "", round: "", period: "" }, // 헤더 토큰용
  sources: [ { id: "s1", name: "batch-1_원본.md", text: "...", profileId: "batch", subject: "auto"|"국어"|"영어"|"수학"|"화학"|"기타", order: 0, enabled: true } ],
  profiles: [ /* 사용자 정의 FormatProfile. 내장(batch, plain)은 id로만 참조 */ ],
  rules:   [ /* InlineRule. 비어 있으면 DEFAULT_RULES 사용. UI에서 기본 규칙도 복제·수정 가능 */ ],
  layout:  LayoutSettings,
  numbering: { mode: "sequential"|"source"|"perUnit", start: 1, pad: 0 },
  units: {
    source: "auto"|"ref"|"header"|"manual",     // 기본값 도출 방식
    order: ["Ⅰ. 기체", "Ⅱ. 용액"],               // 대단원 표시 순서(비어 있으면 등장 순)
    suborder: { "Ⅰ. 기체": ["기체의 성질", ...] },
    map: { "<problemKey>": { unit: "...", subunit: "..." } }   // 수동 지정(우선)
  },
  sheets: {
    cover: { enabled: false, lines: [] },
    problems: true,
    answers: { enabled: true, perRow: 10, title: "빠른 정답" },
    explanations: { enabled: true, grid: { cols: 2, rows: 1 }, title: "정답과 해설" },
    toc: { enabled: true, front: true, perUnit: true, pageNumbers: true, title: "차례" }
  },
  images: [ { id: "img1", name: "fig1.png", dataUrl: "data:image/png;base64,...", width: 800, height: 600 } ],
  imagePlacements: [ { problemKey, imageId, slot: "afterPassage"|"afterStem"|"beforeChoices"|"figure:<n>"|"explanation", width: "100%", caption: "" } ],
  overrides: { "<problemKey>": { exclude: false, figures: { "0": "svg"|"ascii" }, choiceLayout: "auto"|"list"|"inline"|"grid2"|"grid5" } }
}
```

`problemKey = \`${source.id}#${index}\`` (index = 그 소스 안에서 파싱된 순번, 0부터). 재파싱해도 안정.

### 2.2 Problem (parser 출력)

```js
{
  key: "s1#0", sourceId: "s1", index: 0,
  srcNum: "01",          // 원문에 적힌 번호 문자열(없으면 null)
  num: 1,                // numbering.js가 채움
  time: "2분" | null,
  ref: { raw: "12쪽 [용액의 성질 연습 문제] 문제 1 Ⅱ. 용액의 성질 용액의 성질 연습 문제",
         page: "12쪽", title: "용액의 성질 연습 문제", srcProblem: "1", rest: "Ⅱ. 용액의 성질 용액의 성질 연습 문제" },
  header: { title: "...", fields: { "단원": "Ⅱ. 용액의 성질 / ...", "실행": "..." } },  // 파일 상단 `#`·`>` 줄에서. 소스 공통
  intro: "다음 글을 읽고 물음에 답하시오." | null,
  passage: { blocks: Block[], inherited: false, ownerKey: "s1#0" } | null,   // 케이스 B는 inherited:true, blocks는 owner 것을 참조(복사하지 않음)
  stem: Block[],         // 발문부터 선지 직전까지(발문 문단 + <보기>/<자료>/표/도형 등). 첫 p 블록이 발문
  choices: [ { label: "①", text: "..." } ],   // 인라인 "① ② ③ ④ ⑤"면 text "" 5개 + choiceLayout "inline"
  choiceLayout: "auto",  // render가 결정: 모두 짧은 수치/기호면 grid5, 중간이면 grid2, 길면 list, 인라인이면 inline
  explanation: { sections: [ { name: "지문"|"풀이"|"팁"|string, blocks: Block[] } ] },
  answer: { raw: "2, 3, 4", values: [2,3,4], multi: true } | null,
  figures: [ { idx: 0, where: "stem"|"passage"|"explanation", text: "ascii...", lang: "" } ],
  subject: "화학",       // source.subject가 auto면 parser가 추정
  unit: null, subunit: null,   // units.js가 채움
  warnings: [ "..." ]
}
```

### 2.3 Block (지문·발문·해설 공통 콘텐츠 블록)

```js
{ type: "p", text }                                  // 문단. 원문 한 줄 = 한 문단 (빈 줄은 문단 경계일 뿐 블록 아님)
{ type: "table", header: [cell...] | null, rows: [[cell...]], align: ["left"|"center"|"right"|null...] }   // 파이프 표
{ type: "figure", text, lang, idx }                  // ``` 펜스. render가 ascii2svg 시도
{ type: "box", title: "보기"|"자료"|"표"|"조건"|..., blocks: Block[] }   // `<보기>` 줄부터 빈 줄 2개·선지·[해설] 전까지. 안의 "ㄱ. …" 줄은 list(marker "ㄱ")
{ type: "list", marker: "-"|"ㄱ"|"(가)"|"1."|"•", items: [ text... ] }
{ type: "inserted", text }                           // 4칸 이상 들여쓴 줄(영어 문장삽입의 주어진 문장) → 박스
{ type: "math", tex }                                // `$$ … $$`가 단독 줄(들)로 온 경우
{ type: "image", name, imageId: null, caption }      // `[이미지: name]` 또는 `![cap](name)` 줄. 업로드 이미지와 이름으로 매칭
{ type: "raw", html }                                // 예비
```

cell/text/items의 문자열은 **원문 그대로**(마크업 미처리). 인라인 처리(§5)는 render 몫.

### 2.4 FormatProfile (파싱 규칙. 사용자 정의 가능)

모든 필드는 문자열 정규식(플래그 없이 `u`), 배열이면 순서대로 대안. `null`이면 해당 기능 없음.

```js
{
  id: "batch", name: "problem_generator batch",
  description: "--- 구분 · [문제]/[해설] · \"\"\" 지문 · ①~⑤ 선지 · [정답] n",
  ignoreLine: ["^<!--.*-->\\s*$"],                       // 통째로 무시할 줄
  headerLine: ["^#\\s*(.*)$", "^>\\s*(.*)$"],             // 첫 블록 시작 전에 나오는 파일 헤더 줄(제목·필드)
  headerField: "^([^:：]{1,20})[:：]\\s*(.*)$",            // 헤더 줄 안의 "키: 값"
  block: { start: "^---\\s*$", end: "^---\\s*$" },        // 블록 경계. 연속 중복·빈 블록은 무시. null이면 questionHead가 블록 시작
  ref: "^\\[ref\\]\\s*(.*)$",
  refParts: "^(?:(?<page>\\d+쪽)\\s*)?(?:\\[(?<title>[^\\]]+)\\]\\s*)?(?:문제\\s*(?<srcProblem>\\d+)\\s*)?(?<rest>.*)$",
  problemStart: "^\\[문제\\]\\s*$",                      // 이 줄 다음부터 문항 본문
  explanationStart: "^\\[해설\\]\\s*$",
  questionHead: ["^(?<num>\\d{1,3})\\s*[.)]?\\s*(?:\\((?<time>[^)]*)\\))?\\s*$",
                 "^문제\\s*(?<num>\\d{1,3})\\s*(?:\\((?<time>[^)]*)\\))?\\s*$"],
  intro: "^(?:다음|아래)\\s*(?:글|시|작품|자료|물음|두 글|\\(가\\)와? \\(나\\))?.*(?:읽고|보고|참고하여).*(?:답하시오|답하라|답하세요)\\.?$",
  passage: { open: "^\"\"\"\\s*$", close: "^\"\"\"\\s*$", inherit: true },   // inherit: 지문 없는 블록은 직전 지문 계승. 단, 발문이 stemNeedsPassage와 맞을 때만
  stemNeedsPassage: "^(?:윗글|위 글|위 시|위 작품|위의 글|\\(가\\)와 \\(나\\)|\\[A\\]|㉠)",
  choice: "^(?<label>[①②③④⑤⑥⑦⑧⑨⑩])\\s*(?<text>.*)$",
  choiceInline: "^(?:[①②③④⑤⑥⑦⑧⑨⑩]\\s*){2,}$",
  choiceContinuation: "^\\s{2,}(?!\\s*[①②③④⑤])(\\S.*)$",  // 선지 다음 줄 들여쓰기 → 같은 선지에 이어 붙임
  section: "^\\[(?<name>지문|풀이|팁|정답|출처|지문 요약)\\]\\s*(?<rest>.*)$",   // 해설 안 섹션. rest가 있으면 첫 줄
  answer: { section: "정답", parse: "[0-9]+|[①-⑩]" },   // section 이름과 값 추출 정규식(전역 매치). ①→1 변환은 parser 고정 동작
  box: { open: "^<(?<title>보기|자료|표|조건|그림|대화|사례)\\s*(?<no>[0-9A-Za-z가-힣]*)>\\s*$", close: null },  // close null → 빈 줄 2개·선지·section·블록끝에서 닫힘. 빈 줄 1개는 계속
  boxItem: "^(?<marker>[ㄱ-ㅎ]|\\([가-힣]\\)|[a-eA-E]|[0-9]{1,2})[.)]\\s+(?<text>.*)$",
  listItem: "^(?<marker>[-•·]|\\([가-힣]\\)|[0-9]{1,2}\\.)\\s+(?<text>.*)$",
  inserted: "^\\s{4,}(?<text>\\S.*)$",
  fence: "^```\\s*(?<lang>\\w*)\\s*$",
  tableRow: "^\\|.*\\|\\s*$",
  tableSep: "^\\|?\\s*:?-{2,}:?\\s*(?:\\|\\s*:?-{2,}:?\\s*)*\\|?\\s*$",
  mathBlock: "^\\$\\$",
  image: ["^\\[이미지\\s*[:：]\\s*(?<name>[^\\]]+)\\]\\s*$", "^!\\[(?<caption>[^\\]]*)\\]\\((?<name>[^)]+)\\)\\s*$"],
  // ── 다른 포맷을 위한 선택 필드 (batch에서는 전부 null). 내장 `mdheading` 프로파일이 전부 사용한다.
  metaLine: "^-\\s*\\*\\*(?<key>[^*]+)\\*\\*\\s*[:：]\\s*(?<val>.*)$",   // 문항 머리 메타 줄 → key/val. timeKeys에 든 key는 time으로
  timeKeys: ["풀이 권장 시간", "권장 풀이 시간", "풀이시간", "시간"],
  quotePrefix: "^>\\s?",                                  // 모든 본문 줄에서 먼저 벗기는 인용 접두(펜스 안 제외)
  "passage.fenceHead": "^\\[지문\\]\\s*$",              // 펜스 첫 줄이 이에 맞으면 그 펜스는 도형이 아니라 지문
  "box.fenceHead": "^\\[(?<title>보기|자료|표|조건)\\s*(?<no>[0-9A-Za-z가-힣]*)\\]\\s*$",   // 펜스 첫 줄이 이에 맞으면 <보기 n> 상자
  answerKey: { start: "^##\\s*\\[?정답",                  // 파일 끝 정답표 섹션 시작
               entry: "^###\\s*\\[문항\\s*(?<num>\\d+)\\s*정답\\]\\s*[:：]?\\s*(?<answer>.*)$" },   // 문항 번호별 정답(뒤 줄들은 그 문항의 해설)
  // questionHead에 (?<title>…) 그룹이 있으면 problem.title. headerLine에 "^-\\s*(.*)$"를 넣으면 `- 영역: …` 리스트형 헤더 필드도 읽는다.
  subjectHints: { "국어": ["윗글", "화자", "서술", "음운", "형태소"], "영어": ["[A-Za-z]{4,}\\s+[A-Za-z]{4,}\\s+[A-Za-z]{4,}"], "수학": ["\\$[^$]+\\$", "함수", "극한", "방정식"], "화학": ["mol", "atm", "\\(g\\)", "\\(aq\\)", "<보기>"] }
}
```

내장 프로파일은 셋: `batch`(기본), `mdheading`(`### [문항 N] 제목` 헤딩 + `- **풀이 권장 시간**: 2분` 메타 + ```` ```text ```` 펜스 안 `[지문]`/`[보기 n]` + `> ` 인용 보기 + 파일 끝 `## [정답 및 정밀 해설]` 정답표), `plain`. `source.profileId`가 `"auto"`(기본)면 parser가 batch → mdheading → plain 순으로 시도해 선지를 갖춘 문항이 가장 많고 경고가 적은 것을 고른다(`doc.sources[].profileId`로 보고). 내장 `plain` (일반 문제지 텍스트: `1.` 로 시작, `(1)`/`①` 선지, `정답: 3` 또는 `[정답]`, 지문 `[지문]…[/지문]`)를 같은 스키마로 제공한다 — 사용자가 복제해 고치는 출발점.

`compileProfile(json)` → 각 문자열을 `RegExp`로(배열은 RegExp[]), 누락 필드는 batch 기본값으로 채움. `validateProfile(json)` → `{ ok, errors: [{field, message}] }` (정규식 컴파일 실패, 필수 필드 누락).

### 2.5 InlineRule (정규식 후처리)

```js
{ id: "quote-bold", name: "작은따옴표 어구 굵게", enabled: true,
  scope: ["choices"],                  // "passage"|"stem"|"choices"|"box"|"explanation"|"all"
  subjects: ["국어"],                  // 빈 배열 = 전 과목
  pattern: "'([^'\\n]{1,60})'", flags: "g",
  replace: "<b>'$1'</b>" }            // JS String.replace 치환식. HTML 허용(§5 화이트리스트 태그만 살아남음)
```

DEFAULT_RULES (rules.js):
1. `quote-bold` 위와 같음 (국어 선지). 2. `dquote-bold`: 큰따옴표 “…”/"…" 어구, scope choices, 국어, 기본 **비활성**. 3. `md-bold`: `\*\*(.+?)\*\*` → `<b>$1</b>`, all, 전 과목. 4. `underline-keep`: `<u>` 통과(규칙이 아니라 화이트리스트지만 UI 목록에 표시용, 삭제 불가). 5. `circled-mark`: `([㉠-㉭ⓐ-ⓔ])` → `<span class="mk">$1</span>`, all, 전 과목. 6. `bracket-label`: `(\[[A-E]\])` → `<span class="mk">$1</span>`, passage/stem/choices, 국어·영어.

적용 순서: 수식 `$…$`·`$$…$$`·`\(…\)` 구간을 먼저 토큰으로 빼고(§5) → HTML 이스케이프 → 화이트리스트 태그 복원 → 규칙 순서대로 적용 → 수식 토큰 복원.

### 2.6 LayoutSettings

```js
{
  page: "A4"|"B4"|"B5"|"Letter"|{ w: 210, h: 297 },   // mm
  orientation: "portrait"|"landscape",
  margin: { top: 18, right: 14, bottom: 16, left: 14 },   // mm
  grid: { cols: 2, rows: 1 },                            // 1×1, 2×1, 1×2, 2×2 (cols×rows)
  gutter: 8, rowGap: 6,                                   // mm. 세로 구분선은 columnRule
  columnRule: true, rowRule: false,
  fillOrder: "auto"|"column"|"row",                       // auto: rows==1 → column, rows==2 → row
  font: { family: "'Noto Serif KR', 'Apple SD Gothic Neo', 'Malgun Gothic', serif", size: 10, lineHeight: 1.55, mathScale: 1 },  // pt
  header: { left: "{title}", center: "", right: "{unit}" },        // 토큰: {title} {subtitle} {subject} {grade} {round} {period} {unit} {subunit} {page} {pages} {date} {institute}
  footer: { left: "", center: "{page}", right: "" },
  examStyle: false,          // true: 수능식 — 홀수쪽 우측/짝수쪽 좌측 쪽번호, 헤더 "제N교시 {subject} 영역", 문항 번호 굵게, 지문 상단 "[n~m] 다음 글을 읽고 물음에 답하시오."
  problemGap: 5,             // mm, 문항 사이
  cellSlack: 3,              // mm, 칸 아래 여유 — 배치 예산에서만 뺀다(측정↔렌더 오차 흡수). 조판 후 scrollHeight 검증에서 넘침이 남으면 2mm씩 늘려 최대 3회 재배치
  numberStyle: "plain"|"boxed"|"circled",
  showTime: false, showRef: false, showSrcNum: false,
  passageStyle: "boxed"|"plain",
  choiceStyle: "auto"|"list"|"inline"|"grid2"|"grid5",
  keep: { headWithStem: true, stemWithFirstChoice: true, choicesTogether: true, allowPassageSplit: true, allowTableSplit: true,
          bandWithFirst: true,     // 단원·소단원 띠를 그 뒤 첫 문항과 한 칸에 묶는다
          passageWithFirst: true,  // 여러 문항이 나눠 읽는 지문은 첫 문항의 일부 — 지문 끝과 번호·발문이 한 칸
          shrinkToKeep: true },    // 붙여 두기가 안 되는 자리는 그 쪽 글자를 줄여 다시 놓는다(perPageFont와 별개 스위치)
  perPage: { min: 0, max: 0 },                          // 그 쪽에서 **시작**하는 문항 수(0 = 제한 없음). 문제 시트만
  perPageRules: [ { page: 5, min: 2, max: 3 } ],        // 쪽번호(표지 제외 no)별 예외. 그 쪽은 전역 대신 이 값(0 = 제한 없음)
  perPageFont: { enabled: true, minSize: 8, step: 0.25 },   // 최소 미달 쪽은 글자를 step(pt)씩 minSize까지 줄여 다시 배치
  figure: { mode: "svg"|"ascii", maxWidth: 100 },   // % of cell width
  unitBand: { enabled: true, style: "band"|"page" },   // 대단원 시작: 띠 제목 or 별도 표지 페이지
  subunitBand: { enabled: true }
}
```

---

## 3. 모듈 인터페이스 (export 이름·시그니처 고정)

### options.js  [DOM 무관]
```js
// 열거형 하나 = { name, values: [{ id, label, …부가필드 }], default, ids, byId, pattern?, accepts? }
export const PAGE_SIZE, ORIENTATION, GRID, FILL_ORDER, NUMBER_STYLE, PASSAGE_STYLE, CHOICE_STYLE,
             FIGURE_MODE, UNIT_BAND_STYLE, FONT_FAMILY, HEADER_TOKENS, NUMBERING_MODE, UNITS_SOURCE,
             SUBJECT, PROFILE_ID, RULE_SCOPE, IMAGE_SLOT, IMAGE_WIDTH, SHEET_KEYS, TOC_OPTIONS,
             KEEP_KEYS, PREFER_VARIANT;                      // 22종
export const ALL_ENUMS;                          // { 이름: 열거형 } — 이름으로 찾을 때
export const CHOICE_LAYOUT_IDS, RULE_SCOPE_CONCRETE;         // auto·all을 뺀 id 배열
export const HEADER_DEFAULT, FOOTER_DEFAULT;                 // { left, center, right }
export const TEXT_EXT, IMAGE_EXT, PROJECT_EXT;               // 받아들이는 확장자
export const LIMITS;                             // 숫자 칸의 { min, max, step, default, unit, label }
export const ENUM_PATHS;                         // [{ path, enum, label }] — 프로젝트 안 열거형 자리

export function defaults(): LayoutSettings       // §2.6 기본값 전체(부를 때마다 새 객체)
export function isValid(enumObj, v): boolean     // 목록 · pattern · accepts 셋 중 하나면 통과
export function labelOf(enumObj, v): string      // 한국어 라벨(모르는 값은 그대로)
export function optionsHtml(enumOrList, selected): string    // `<option>` 문자열
export function omit(enumObj, ...ids): value[]   // 선택지에서 "전체"·"자동"을 덜어 낸다
export function flagDefaults(enumObj): object    // on 플래그를 { id: bool }로 (keep · toc)
export function gridFromId(id): {cols, rows}     // "2x1" → { cols: 2, rows: 1 }
export function gridId(grid): string             // { cols: 2, rows: 1 } → "2x1"
export function pageMm(page): {w, h}             // 프리셋 id 또는 { w, h } → mm
export function figureSlot(n): string            // n → "figure:<n>"
export function imageSlotOptions(count): value[] // 고정 자리 + 도형 자리 count개
export function clamp(limitKey, v): number       // LIMITS 범위 안으로
export function sanitizeEnums(project): string[] // 목록 밖 값을 기본값으로 되돌리고 경고를 준다
```
- **역할**: 프로그램이 사용자에게서 받는 모든 입력의 허용값을 여기 한 곳에만 적는다. UI의 `<select>`·숫자 칸, `store.defaultLayout()`, `booklet.py`의 `--grid --page --profile --prefer --subject`, render/numbering/rules의 값 비교가 전부 같은 id를 본다.
- 열거형은 전부 `Object.freeze`. `default`가 `values` 안에 없으면 모듈 적재 때 즉시 던진다.
- `IMAGE_SLOT`은 `figure:<n>`을, `IMAGE_WIDTH`는 임의의 CSS 길이를 `pattern`으로, `PAGE_SIZE`는 `{ w, h }` 객체를 `accepts`로 함께 받는다.
- `PROFILE_ID`는 `format.js`의 `BUILTIN_ORDER`를 읽어 그때그때 엮는다 — 내장 프로파일을 늘리면 UI와 CLI 선택지가 같이 는다.
- `booklet.py`는 이 파일을 정규식으로 훑어(`id: "…"`) CLI 선택지를 얻고, 읽지 못하면 `FALLBACK_CHOICES`로 물러난다.

### format.js
```js
export const BUILTIN_PROFILES;                       // { batch, plain }
export function compileProfile(json): CompiledProfile   // 필드별 RegExp | RegExp[]; 원본 json은 .json에 보관
export function validateProfile(json): { ok, errors }
export function resolveProfile(project, profileId): CompiledProfile   // 사용자 정의 우선, 없으면 내장, 없으면 batch
```

### parser.js
```js
export function parseSource(source, compiled, opts = {}): { problems: Problem[], header, warnings: string[] }
export function parseProject(project): { problems: Problem[], sources: [{id, name, header, count, warnings}], warnings }
   // sources를 order 순으로 파싱 → 지문 계승 처리(소스 경계 넘지 않음) → subject 추정 → numbering.assignNumbers → units.assign
```
파싱 상태기계 (batch 프로파일 기준, 다른 프로파일도 같은 단계):
1. 줄 단위. `ignoreLine` 제거. 첫 `block.start` 전 줄들은 헤더(`headerLine`)로.
2. 블록 = start~end 사이. 연속 `---`·공백만 있는 블록은 무시. `block`이 null인 프로파일은 `questionHead` 매치 줄이 새 블록 시작.
3. 블록 안: `ref` → `problemStart` 이후가 본문, `explanationStart` 이후가 해설. `problemStart` 없으면 ref 다음 줄부터 본문.
4. 본문: 첫 비공백 줄이 `questionHead`면 num/time. 이어서 `intro`(있으면), `passage.open`이 나오면 close까지 지문(안의 줄은 Block으로 파싱: 표·펜스·문단). 지문 뒤부터 첫 `choice`/`choiceInline` 전까지 stem Block[]. 선지는 연속 `choice` 줄, `choiceContinuation`은 직전 선지에 공백으로 이어 붙임. 선지 뒤 남는 줄(빈 줄 제외)은 stem 뒤 `box`로 오지 않는 한 경고와 함께 stem 끝에 붙인다.
   - 지문 안에서 `intro` 줄이 지문 앞이 아니라 발문 자리에 있는 변형("다음 글을 바탕으로 <표>…" 다음에 `"""`)도 처리: `questionHead` 다음 줄이 intro도 passage.open도 아니면 그 줄을 stem 첫 문단으로 잡고, 그 뒤에 `passage.open`이 오면 지문으로 파싱해 `passage`에 넣되 `passagePosition: "afterStem"`으로 기록 (render는 발문 → 지문 → 자료 순으로 그림).
   - 지문이 없고 stem 첫 줄이 `stemNeedsPassage`에 맞고 `passage.inherit`면 같은 소스의 직전 문항 지문을 계승(`inherited: true, ownerKey`). 직전에도 없으면 경고.
5. 해설: `section` 줄로 나눈다. `정답` 섹션 값은 `answer.parse`로 전역 추출, ①~⑩은 숫자로. 섹션 밖 줄은 이름 없는 섹션(`name: ""`).
6. Block 파싱 공통 규칙(지문·stem·box·해설 모두): 펜스 → figure(lang, idx는 문항 내 0부터), 표(연속 `tableRow`, 2행째가 `tableSep`이면 header) → table, `box.open` → box(안의 줄 재귀), `boxItem`/`listItem` 연속 → list, `inserted` → inserted, `mathBlock` 단독 → math(닫힘 `$$`까지), `image` → image, 그 외 비공백 줄 → p. 빈 줄은 경계.
7. `subject`: source.subject가 "auto"면 `subjectHints` 점수 최대 과목, 동점·0점이면 "기타".
8. 모든 이상은 `warnings`에 사람이 읽을 문장으로 (예: "s1#3: 선지가 4개뿐입니다", "s2#0: 지문 계승 대상이 없습니다").

### rules.js
```js
export const DEFAULT_RULES: InlineRule[]
export function inline(text, ctx): string      // ctx = { scope, subject, rules }  → 안전한 HTML (수식 보호·이스케이프·화이트리스트·규칙)
export function mathSegments(text): [{type:"text"|"math", value, display}]   // $…$, $$…$$, \(…\), \[…\] 분리. 이스케이프 \$는 리터럴
```
화이트리스트 태그: `u b i em strong sub sup br span(class만) s mark`. 나머지 `<…>`는 이스케이프되어 그대로 보인다(예: `<보기>`가 문장 안에 있어도 안전).

### render.js
```js
export function renderBlocks(blocks, ctx): string
export function renderProblem(problem, ctx): { atoms: Atom[] }      // 문제 시트용
export function renderExplanation(problem, ctx): { atoms: Atom[] }  // 해설 시트용
export function renderAnswerTable(problems, opts): string           // 빠른 정답 표 HTML (perRow)
export function choiceLayoutFor(problem, settings): "list"|"inline"|"grid2"|"grid5"
// Atom = { kind: "head"|"intro"|"passage"|"stem"|"material"|"choices"|"choice"|"expl-head"|"expl", html, splittable: bool, keepWithNext: bool, keepWithPrev: bool, splitParts?: string[] }
```
- ctx = `{ settings, rules, subject, images, imagePlacements, figureMode(problemKey, idx) → "svg"|"ascii", tocLabel }`.
- `head` 원자: `<div class="q-head"><span class="q-num">12</span>[<span class="q-time">2분</span>][<span class="q-ref">…</span>]</div>` + 발문을 **같은 원자**에 넣는다(번호와 발문은 절대 분리 안 됨). 발문 = stem[0]이 p일 때. 나머지 stem 블록은 `material` 원자(각 블록 하나씩; box는 통째로 하나).
- `passage` 원자: 문단마다 하나씩 (`splittable: true`, 문단이 8줄 이상으로 예상되면 `splitParts`에 문장 단위 조각을 제공: 한국어 `다. `/`요. `, 영어 `. ` 뒤 경계). 지문 컨테이너는 `<div class="passage [boxed]">…</div>`이지만 원자 분할을 위해 render는 각 문단을 `<div class="passage-part" data-first data-last>`로 내보내고, layout이 셀에 놓을 때 인접한 passage-part들을 같은 `.passage` 래퍼로 묶는다(래퍼 복원은 layout 책임, 클래스명 계약: `.passage > .passage-part`).
- 계승 지문(`inherited`)은 다시 그리지 않는다. 대신 head 원자 앞에 아무것도 없고, examStyle이면 지문 소유 문항의 intro를 "[n~m] 다음 글을 읽고 물음에 답하시오."로 바꿔 범위를 표시 (n~m = 같은 ownerKey를 공유하는 문항 번호 범위; ctx.tocLabel 아님 — `problem.groupRange`를 numbering.js가 채움).
- `choices` 원자: `<ol class="choices layout-list">` … `<li><span class="c-label">①</span><span class="c-text">…</span></li>`. `splitParts`로 li 단위 조각 제공(choicesTogether가 못 지켜질 때 layout이 씀).
- 표: `<table class="tbl">`, 정렬은 `style="text-align"` 대신 class `ta-c/ta-r`.
- figure: `figureMode`가 svg면 `asciiToSvg`를 호출해 `confidence >= 0.5`면 `<figure class="fig svg">svg</figure>`, 아니면 `<figure class="fig ascii"><pre>…</pre></figure>`. 결과에 `data-figure-idx`.
- image 블록: `images`에서 name 매칭 → `<figure class="fig img"><img src=dataUrl style="width:..."><figcaption>`. 못 찾으면 `<div class="img-missing">[이미지: name]</div>` + 경고.
- imagePlacements: slot 위치에 image 원자 삽입 (`kind: "material"`).
- 해설: `expl-head`(번호 + 정답 `<span class="ans">②</span>` + ref) 뒤 섹션마다 `<div class="expl-sec"><span class="expl-name">풀이</span>…`. 정답 표기: 값 1~10 → ①~⑩, 다중은 "②, ③, ④", 수식/문자면 그대로.
- 문항 래퍼 클래스: 각 원자 html은 `data-q="<key>"` 속성을 최상위 요소에 가진다. layout은 같은 key의 연속 원자를 `<article class="q">`로 감싼다.

### numbering.js
```js
export function assignNumbers(problems, numbering, groups?): void   // problem.num 채움. sequential: 등장 순 1..N (start·pad). source: srcNum 정수화(중복·결측은 경고 + 순차 대체). perUnit: 대단원마다 1부터.
export function groupRanges(problems): void   // 같은 ownerKey 묶음의 [n~m]을 problem.groupRange = {from, to}로
export function formatNum(n, pad): string
```

### units.js
```js
export function deriveUnits(problem, source, header): { unit, subunit, from: "map"|"header"|"ref"|"none" }
export function assignUnits(problems, project): void
export function groupByUnits(problems, unitsCfg): [{ unit, subunits: [{ subunit, problems }] }]   // order/suborder 적용, 미지정은 등장 순, 단원 없음은 unit "" 한 묶음
```
ref.rest 휴리스틱(순서대로 첫 매치): ` — ` 분리 → [앞=unit, 뒤=subunit]; `(유형\s*\d+|연습 문제|UNIT\s*\d+|단원 종합)` 앞에서 분리; `^(Ⅰ|Ⅱ|Ⅲ|Ⅳ|Ⅴ|[0-9]{2})[.\s-]*[^\s]+(\s[^\s]+){0,3}?` 대단원 번호 패턴(예 "Ⅱ. 용액의 성질", "03 미분계수와 도함수") 뒤에서 분리; 실패하면 unit=rest 전체, subunit=ref.title. 헤더 `단원:` 필드가 있으면 그것이 unit, ref에서 subunit. 소스별 UI 지정이 있으면 그것 우선(`units.map`은 `"s1#*"` 와일드카드 키로 소스 전체 지정 허용).

### ascii2svg.js  [DOM 무관]
```js
export function asciiToSvg(text, opts = {}): { svg: string, width: number, height: number, confidence: number, kind: "graph"|"device"|"structure"|"table"|"unknown", warnings: string[] }
// opts: { cellW: 8, cellH: 16, fontFamily, stroke: 1.2, smooth: true, fit: number|null(px 폭에 맞춰 viewBox 스케일) }
```
알고리즘(필수 구현):
1. 그리드화(탭→4칸, 전각 문자는 2칸 폭). 박스 문자는 격자를 만들 때 같은 뜻의 ASCII로 바꾼다(`─`→`-`, `│`→`|`, `┌┐└┘├┤┬┴┼╭╮╰╯`→`+`, `═`→`=`, `╱╲`→`/\`) — 그래프 계단 `┌───┘`이 글자로 새지 않는다. 문자 분류: 선 문자 `- _ | / \ + = ' . , : ` 및 화살표 `> < ^ v V → ← ↑ ↓`, 점 `* ● ○ o •`, 그 외 텍스트.
2. **텍스트 런**: 텍스트 문자가 이어진 구간(한 칸 공백 허용, 예 "온도(℃)", "1.00", "A(g)", "꼭지a"). 단 선 문자 사이에 낀 단일 텍스트 문자(예 곡선 위 `B`, `*` 옆 `C`)는 라벨. 텍스트 런은 `<text>`로, 위치는 첫 글자 셀 좌상단 기준, `font-size: cellH*0.75`, `xml:space="preserve"`.
3. **축**: 길이 ≥ 4의 `|` 수직 런(맨 위 `^`/`↑` 허용)과 길이 ≥ 6의 `-`/`_`/`=` 수평 런(맨 끝 `>`/`→` 허용)이 `+`나 모서리에서 만나면 축. 축에 붙은 `-` 1~2칸 눈금·좌측 숫자 텍스트 = 눈금 라벨. 축은 직선 + 화살촉, 눈금은 짧은 직선.
4. **점선**: `- - -` `. . .` 같은 1칸 간격 반복 → 한 직선 `stroke-dasharray`.
5. **곡선**: `_ - ' . / \ ( )` 와 점 문자가 8-연결로 이어진 사슬(축·박스·점선에 속하지 않은 것). 각 문자의 셀 내 앵커점(`_` 바닥 중앙, `-` 중앙, `'` 상단 중앙, `.` 하단 중앙, `/` 좌하→우상, `\` 좌상→우하, `*` 중앙)을 순서대로 이어 폴리라인 → x 단조이면 monotone cubic(Fritsch–Carlson), 아니면 Catmull-Rom → `<path>`. 끝점이 축·점선에 닿으면 이어 붙임. 불연속(수직 점프 `|` 조각이 곡선 끝에서 위로 이어짐)은 별도 세그먼트로 두어 계단을 보존.
5b. **사선 직선**(`scanDiagonalLines`, 직선 런을 그린 뒤·곡선 사슬 전에): 같은 방향 사선(`/`는 위로 오른쪽, `\`는 아래로 오른쪽)이 행마다 1~5칸씩 건너뛰며 이어지면 한 직선이다. 보폭 차이가 2칸 이하인 열만 받고, 굽이 문자(`.` `'` `~` `-` `_`)와 8-이웃인 사선은 곡선 몫으로 남긴다(이미 선으로 그려진 칸은 이웃·경로 판정에서 투명). 칸 중심(+ 양 끝 표식 `+ * ● ○ •`의 중심, 직선에서 0.6칸 넘게 벗어나면 제외)을 최소제곱으로 맞춘 직선을 첫 칸 시작 모서리(바로 왼쪽이 `|`면 축 중심선)부터 마지막 칸 끝 모서리(또는 표식 중심)까지 긋는다. 한 칸짜리는 양 끝에 표식이 있을 때만.
6. **박스/장치**: `+---+` … `|   |` … `+---+` 사각형은 `<rect>`; `+===+`는 굵은 선(피스톤). `|=====|`처럼 양쪽이 `|`인 `=`는 **액면**이다 — 굵은 막대 대신 벽 중심선 사이를 잇는 얇은 선을 긋고, 그 아래 벽이 이어지다 `+`/`-` 바닥에 닿으면 바닥선까지 `<rect fill-opacity="0.1">`로 채운다(U자관·비커의 액체). `|X|`는 밸브(작은 사각형 + X). 화살표 `-->`, `V`, `|` 수직 화살 → 선 + 화살촉. 박스 안 텍스트는 그대로 `<text>`. 여러 박스를 잇는 `--|X|--` 관은 직선.
7. **구조식**: `H--C--H`, `||`, `|` 가 원자 기호와 붙은 패턴 → 원자는 텍스트, 결합은 원자 가장자리에서 시작하는 선(이중 결합 두 줄).
8. confidence: (변환된 선 문자 수 / 전체 선 문자 수) × 텍스트 런 보존율. 선 문자가 0이면 kind "table"/"unknown" confidence 0.
9. 출력 SVG는 `viewBox="0 0 W H"`, `width="100%"`, 스타일 인라인(`stroke:#000; fill:none; stroke-linecap:round`), 텍스트 `font-family` 옵션, 검은색만. `<svg>` 문자열은 그대로 `innerHTML`에 넣어도 안전해야 한다(텍스트는 이스케이프).
10. 데모: `tests/demo-ascii.html`이 픽스처 6개(chem_batch3/9/12/15/16/17)의 모든 펜스를 왼쪽 `<pre>` 오른쪽 SVG로 나란히 그린다.

### layout.js  [브라우저]
```js
export async function buildBooklet(doc, project, mount): Promise<{ pages: HTMLElement[], index, warnings, stats }>
// doc = parseProject 결과. mount = 프리뷰 루트(비우고 채움). 내부에서 측정용 오프스크린 컨테이너를 만든다.
// index = { problemPage: Map<key, number>, unitPage: Map<unit, number>, subunitPage: Map<unit+"/"+subunit, number>, answersPage, explanationsPage, tocPages: number[] }
// stats = { pages, overflow, ms, atoms, passes, repairs, clipped, measures, converged,
//           perPage: [{ page, count, scale, min, max }], fontAdjusted, shrunkForKeep, rewinds,
//           bandOrphans, keepOrphans, passageOrphans }
export function findBandOrphans(pages): number   // 띠만 칸 끝에 남은 칸 수(pack 기록을 받는다)
export function findKeepOrphans(pages, keep): number   // 번호·발문이 뒤 내용과 떨어진 칸 수(지문 통째 설정이면 지문 문단 사이 끊김도)
export function findPassageOrphans(pages, keep, out?): number   // 지문 끝과 번호·발문이 갈라진 칸 수(out에 자리 목록)
```
절차:
1. 페이지 물리량 계산(mm → px: 96/25.4). 셀 폭 = (본문폭 − gutter×(cols−1))/cols, 셀 높이 = (본문높이 − rowGap×(rows−1))/rows. 본문 = 페이지 − 여백 − 헤더/푸터 높이(각 7mm 고정, 비어 있으면 0).
2. 항목 스트림 생성: `[cover?] [front TOC(placeholder)] for each unit: [unit band | unit page] [sub-TOC placeholder?] for each subunit: [subunit band] for each problem: renderProblem atoms …` 그 뒤 `[answers sheet]` `[explanations sheet]`. 시트 전환은 항상 새 페이지.
3. 측정: 셀 폭의 오프스크린 `.cell` 안에 원자 html을 넣고(프리뷰 축소 `transform: scale`이 조상에 걸리면 `getBoundingClientRect`가 배율만큼 작아지므로 `scaleOf()`로 나눠 레이아웃 px로 되돌린다; 측정 통의 `.page`에는 축소를 걸지 않는다) KaTeX `renderMathInElement` 적용 후 `getBoundingClientRect().height` + margin. 측정 후 노드를 실제 배치에 재사용(수식 재렌더 방지).
4. 패킹: 셀 순서(fillOrder)대로 커서. 원자가 남은 높이에 들어가면 배치; 안 들어가면 (a) `splittable`이고 `splitParts`가 있으면 조각을 이진탐색으로 최대한 넣고 나머지는 다음 셀로(문단 조각 이어 붙일 때 첫 조각만 들여쓰기), (b) 표는 행 단위(헤더 행 반복), (c) 아니면 다음 셀로. 셀 높이보다 큰 비분할 원자는 그대로 두고 `overflow` 경고(잘림 방지 위해 셀에 `overflow: visible` 아님 — 그 원자는 다음 셀에서 시작).
   - keep 규칙: `keepWithNext` 원자는 **뒤 원자가 첫 배치에서 실제로 요구하는 높이**(`followNeed`)까지 같이 들어갈 때만 놓는다. 그 높이는 어림(두 줄)이 아니라 뒤 원자의 첫 조각을 그대로 재서 얻는다 — 상자·표는 첫 조각이 테두리·제목·머리 행까지 안고 오므로, 두 줄로 어림하면 판정만 통과하고 배치는 실패해 발문만 칸 끝에 남는다. 쪼갤 수 없는 원자(선지를 붙여 두라고 한 경우 등)는 제 높이 전부가 요구 높이다.
   - 되물리기(안전망): 어떤 원자가 다음 칸으로 넘어가는 순간, 칸 끝에 그와 붙어 있어야 할 기록(번호·발문 → 자료 → 선지의 사슬)이 남으면 그 **사슬 전체**를 되물려 함께 옮긴다. 사슬이 칸을 통째로 차지해 되물릴 데가 없으면 옮기지 않고 여기 놓거나(뒤 원자가 다음 칸에서 이어진다), 마지막 수단으로 뒤 원자를 쪼개 붙이고 경고한다.
   - 띠 사슬(`keep.bandWithFirst`): 연속한 띠 원자(대단원 띠·대단원별 차례·소단원 띠) + 그 뒤 첫 문항의 head + head의 `followNeed`를 한 덩어리로 보고, 전부 들어갈 때만 첫 띠를 놓는다. 안 되면 `nextCell()` 후 다시 따진다. 대단원 표지(`unitBand.style === "page"`)는 자기 쪽을 쓰므로 사슬 밖이고, 그 뒤 소단원 띠부터 다시 사슬이다. 사후 검증은 `findBandOrphans`(띠로 끝난 칸 수), `findKeepOrphans`(번호·발문이 뒤 내용과 떨어진 칸 수).
   - 지문 사슬(`keep.passageWithFirst`): 지문을 가진 문항은 사슬이 안내 문장(`intro`)에서 시작한다 — [띠들] → intro → 지문 원자 전부 → head → head의 `followNeed`. `chainAt`/`chainHeight`/`prePlace`가 띠 사슬과 같은 틀로 따진다. 지문이 쪼개지는 설정이면 마지막 지문 조각 뒤에 head 몫(`reserveFor`)을 남겨 분할점을 앞으로 당기고, 그마저 안 되는 빈 칸에서는 글자를 줄여 보고 나서야 지문 끝에서 가른다(경고). 사후 검증 `findPassageOrphans`.
   - 지문 묶음(run)과 `allowPassageSplit: false`: 지문은 **문단마다 원자 하나**라서, 원자 하나만 안 쪼개서는 문단 사이에서 끊긴다. 설정이 꺼져 있으면 같은 문항의 연속한 지문 원자(`runStart`·`runEnd`)를 한 덩어리로 다룬다 — `followNeed`가 지문을 만나면 묶음 전체(+ 묶음 뒤 같은 문항의 자료·선지 또는 번호·발문 몫)를 요구 높이로 내고, `place()`는 지문 원자 뒤 같은 문항 원자를 `wantsNext`로 잡으며, `boundTo`는 지문 기록을 사슬에 넣어 되물리기가 번호·발문 → 지문 문단들 → 표 → 선지를 통째로 옮긴다. 묶음이 한 칸보다 크면(`runOversized`) 문단 사이 끊김을 허용하고 문항마다 한 번 경고한다(그 기록은 `runOver`로 표시해 고아로 세지 않는다). 발문 뒤 지문(`passagePosition: afterStem`)도 같은 길을 탄다.
   - 띠와 되물리기: 띠 기록(`unit-band`·`subunit-band`·대단원 차례)은 `boundTo`에서 그 뒤 첫 문항의 첫 원자와 묶인다. 사슬이 커져 안내 문장이 다음 칸으로 넘어갈 때 띠를 홀로 두고 가지 않는다.
   - 붙여 두기의 글자 줄이기(`keep.shrinkToKeep`): 띠·지문 사슬이 빈 칸보다 클 때, 번호·발문 + 뒤 원자의 요구 높이가 남은 자리보다 클 때, 앞 사슬이 칸을 다 차지해 되물릴 수 없을 때 — `shrinkToKeep(needAt, budget)`이 바닥 배율에서 재어 들어가면 그 쪽 배율을 한 단계 낮추고 `REWIND`를 던진다(perPage.min의 되감기 경로·`retries` 맵을 그대로 쓴다). 바닥에서도 안 들어가면 줄이지 않고 기존 최후 수단으로 간다. `perPageFont.enabled`가 꺼져 있어도 이 스위치만 켜져 있으면 돈다. 줄인 쪽은 마지막 배율로 한 번만 경고하고 `stats.shrunkForKeep`에 센다.
   - 쪽당 문항 수(`perPage`·`perPageRules`): 단위는 그 쪽에서 **시작**하는 문항(head 원자가 놓인 쪽, 칸 무관), 문제 시트에만 건다. **max** — head를 놓으려는데 이 쪽에 이미 max개가 시작했으면 칸이 남아도 `newPage()`(경고 없음). 띠 사슬이면 띠 앞에서 넘긴다. **min** — 쪽이 꽉 차서 닫힐 때 시작 문항 수가 모자라면 그 쪽의 글자 배율을 한 단계 낮추고(`perPageFont.step` pt) 그 쪽이 열릴 때의 스냅샷으로 **되감아** 다시 배치한다. `perPageFont.minSize`까지 줄여도 모자라면 그대로 두고 경고. 시트의 마지막 쪽(다음 쪽이 다른 시트이거나 스트림 끝)은 자연히 짧으므로 최소에서 면제.
   - 되감기 구조: `newPage()`가 새 쪽마다 `{ itemIndex, from, pagesLen, pageNo, index 맵 사본, passageStarted 사본, lastUnit, lastSubunit, run }` 스냅샷을 쥔다. pack의 바깥 고리는 `while (i < items.length)` + `place(item, next, from)` 꼴이라, 되감을 때 항목 번호와 조각 번호를 스냅샷 값으로 되돌려 같은 자리를 다시 놓는다. 배율은 쪽마다 단조 감소하고 minSize에서 멈추므로 끝난다(총 되감기 상한도 둔다). 배율은 pack이 돌 때마다 처음부터 다시 정한다 — 차례 2-pass·넘침 재배치가 늘 깨끗한 상태에서 시작한다.
   - 배율과 측정: 측정 통은 기하 × 배율마다 하나씩 두고(`--font-size`를 통에 심는다), 원자 노드는 하나만 만들어 통 사이를 옮겨 다니며 잰다(수식은 em 기준이라 다시 그리지 않는다). 높이 캐시는 배율 1이 `_h`, 나머지는 `_hBy[scale]`. `cap`·`avail`·`followNeed`·`fitCount`는 그 쪽 배율의 높이를 쓰고, mm로 적은 `cellSlack`·`problemGap`은 배율과 무관하다.
5. 문항 사이 `problemGap`, 원자 사이 0. 같은 문항의 원자가 셀을 넘어가면 넘어간 쪽 `.q`에 `cont` 클래스.
6. TOC 2-pass: 1차 배치로 각 unit/subunit/problem의 쪽 계산 → toc.js로 항목 생성 → TOC 자리(placeholder)에 실제 항목 원자 넣고 재배치 → 쪽이 바뀌었으면 한 번 더(최대 3회). 쪽번호는 표지 제외 1부터, TOC도 쪽수에 포함.
7. 페이지 DOM: `<section class="page" data-page="n"><header class="pg-head">…</header><div class="pg-body cols-2 rows-1"><div class="cell">…</div>…</div><footer class="pg-foot">…</footer></section>`. 토큰 치환(`{page}` 등). `examStyle`이면 홀짝 좌우 반전. 셀 사이 세로선은 `.pg-body.rule` + CSS.
8. 반환 후 mount에 pages를 append. 프리뷰는 CSS `zoom`/transform으로 축소. 인쇄: `@page { size: <w>mm <h>mm; margin: 0 }`, `.page { break-after: page }` — page.css가 `--page-w/--page-h` 변수를 읽는다(layout이 `mount.style.setProperty`).

### toc.js
```js
export function buildTocEntries(groups, index, opts): { front: TocEntry[], perUnit: Map<unit, TocEntry[]> }
// TocEntry = { level: 1|2, label, page, count }  (level1 대단원, level2 소단원 + 문항 수)
export function renderToc(entries, title): string   // <nav class="toc"> 점선 리더 + 우측 쪽번호
```

### sheets.js
```js
export function answerSheetAtoms(problems, cfg): Atom[]     // 제목 + 표(perRow) — 단원별 소제목 포함
export function explanationAtoms(problems, ctx): Atom[]    // 단원 띠 + renderExplanation 연결
```

### store.js
```js
export function createStore(): { get(), set(patch), subscribe(fn), addSources(files: File[]), removeSource(id), reorder(ids), addImages(files), exportJson(), importJson(text), autosave(), load() }
```
- 파일 추가: 확장자 `.md .txt .markdown` 텍스트, 이미지 `.png .jpg .jpeg .gif .webp .svg`. 폴더 드롭(`webkitGetAsEntry`)·`<input webkitdirectory>` 지원. 파일명 자연 정렬(`batch-2` < `batch-10`). 같은 밑동의 `_원본`과 `_view`가 같이 오면 `_원본`만 활성(옵션 `preferOriginal`).
- autosave: `localStorage["booklet.project"]`(이미지 dataUrl 포함, 4MB 초과 시 이미지 제외 저장 + 경고). 로드 시 복원.

### app.js / index.html
사이드바 탭: **파일**(드롭존, 목록·순서·활성·과목·프로파일 선택) / **배치**(LayoutSettings 폼: 용지·여백·격자 4버튼·글꼴·헤더/푸터·모의고사 스타일·지문/선지 스타일·keep) / **단원·번호**(문항 표: 번호·출처·과목·대단원·소단원 편집, 대단원 순서 드래그, 번호 모드) / **규칙**(포맷 프로파일 JSON 편집기 + "검증"·"테스트 파싱" 결과; 인라인 규칙 표: 켜기·패턴·플래그·치환·범위·과목·미리보기) / **이미지**(업로드 목록, 문항·슬롯 배치, 폭) / **시트·차례**(표지·차례·정답·해설 토글, 제목) / **내보내기**(인쇄, JSON 저장·열기, 독립 HTML, 초기화). 메인: 페이지 프리뷰(줌 50~150%), 상단 상태줄(소스 n · 문항 n · 쪽 n · 경고 n → 클릭 시 경고 패널). 변경 즉시 재빌드(디바운스 300ms). 경고는 문항 키를 클릭하면 해당 쪽으로 스크롤.

### export.js
```js
export async function toStandaloneHtml(project, opts): Promise<string>   // index.html 템플릿 + styles 인라인 + src 모듈을 data: URL로 감싼 import map + <script id="booklet-project" type="application/json">
export function printBooklet(): void                 // window.print()
export function setFetch(fn): void                   // 테스트용 파일 읽기 대체(node에서 fs)
```
- 모듈은 한 스코프에 이어 붙이지 않는다. 각 `src/*.js`를 `data:text/javascript;base64`로 감싸고 `<script type="importmap">`에 `booklet/<이름>.js` 키로 매핑, 모듈 안의 `"./x.js"` 지정자(정적·동적 import 모두)를 그 키로 바꾼다. 모듈 스코프가 살아 있어 파일 간 같은 이름(`esc`, `deepMerge` 등)이 충돌하지 않는다.
- KaTeX는 CDN 링크로 바꾼다(vendor/는 따라가지 않음). index.html 로드 시 `#booklet-project`가 있으면 그 프로젝트로 시작(URL `?readonly=1`이면 사이드바 숨김, `?debug=1`이면 `<pre id="report">`에 조판 결과 JSON).
- `file://`에서는 fetch가 막혀 만들 수 없다 → `python3 booklet.py serve`로 연 뒤 내보내거나 `booklet.py build`를 쓴다.

### booklet.py (CLI, Python 3 표준 라이브러리만)
```
python3 booklet.py build <path...> [-o out.html] [--title T] [--grid 2x1] [--pdf out.pdf] [--json out.booklet.json] [--profile batch] [--prefer view|원본] [--manifest units.json]
python3 booklet.py serve [-p 8765]        # 로컬 정적 서버로 index.html 열기(file:// 제약 회피용)
```
- path가 폴더면 `*.md`를 자연 정렬로 수집(`문제거리/` 제외, `_view`/`_원본` 규칙 적용). 프로젝트 JSON을 만들고 `index.html`을 템플릿으로 독립 HTML 생성(export.js와 같은 삽입 방식).
- `--pdf`: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf=<out> --virtual-time-budget=20000 file://<html>`; 실패 시 안내만.
- `--manifest`: `{ "<파일명 glob 또는 문항키>": {"unit":..., "subunit":...} }` → project.units.map.

---

## 4. 배치(격자) 의미

- `cols×rows` = 한 페이지의 셀 수. 셀은 독립 흐름 컨테이너, 내용은 셀→셀→다음 페이지로 흐른다(고정 슬롯이 아님: 문항이 셀보다 길면 이어짐).
- 1×1: 교재 한 단. 2×1: 수능 두 단. 1×2: 상·하 두 칸(한 문항씩 넣는 학원 프린트 — 가로 넓은 수학). 2×2: 네 칸.
- fillOrder auto: rows 1 → column(좌→우), rows 2 → row(좌상→우상→좌하→우하).
- `rowRule`이면 행 사이 가로선, `columnRule`이면 열 사이 세로선(수능 시험지 느낌).

## 5. 인라인 텍스트 처리 순서 (rules.inline)

1. `mathSegments`: `$$…$$`, `\[…\]` display, `$…$`, `\(…\)` inline. `\$`는 리터럴 달러. `$` 뒤에 공백·숫자면 수식 아님(가격 표기 보호: `$ 5`, `$5`는 리터럴로 취급하되 `$5$`처럼 닫히면 수식).
2. text 세그먼트만: HTML 이스케이프 → 화이트리스트 태그 복원(정규식으로 `&lt;(/?)(u|b|i|em|strong|sub|sup|s|mark|br)&gt;`, `span class="…"`) → 규칙 적용(scope·subject 일치, enabled만, 순서대로).
3. math 세그먼트: `<span class="math" data-tex="…" data-display="0|1">원문</span>`로 출력(KaTeX는 layout이 DOM에서 `renderMathInElement` 대신 `katex.render(tex, el, {displayMode, throwOnError:false})`로 처리. 실패 시 원문 유지 + 경고). `data-tex`는 `sanitizeTex()`를 거친다 — 간격 명령(`\,` `\;` `\quad` …) 바로 뒤의 `^`·`_`에 빈 그룹 `{}`를 끼운다(`2k\,^\circ\text{C}`를 KaTeX가 "Got group of unknown type: 'internal'"로 거부하기 때문; 보이는 원문은 그대로). `$$` 블록도 같다.
4. 줄바꿈 없음(한 블록 = 한 문단). `  `(공백 2개) 끝 줄바꿈은 지원하지 않는다.

## 6. 번호 정리 규칙 (numbering.js)

- `sequential`(기본): 활성 소스를 order 순으로, 제외(exclude)된 문항 건너뛰고 1부터. `start`·`pad`(`pad: 2` → 01).
- `source`: srcNum 정수화. 중복·결측·비단조는 경고 목록에 올리고 그 문항만 직전+1로 보정.
- `perUnit`: 대단원 그룹마다 start부터.
- 정답·해설 시트, 차례, `[n~m]` 범위는 전부 최종 `num` 사용. 원문 번호는 `showSrcNum`일 때 작게 병기.

## 7. 정답·해설 시트

- 정답 시트: 제목(기본 "빠른 정답"), 대단원별 소제목, 표: 한 행 `perRow`칸, 셀 상단 번호·하단 정답(①~⑤ 또는 값). 다중 정답은 "②,③,④". 정답 없는 문항은 "—" + 경고.
- 해설 시트: 자체 grid(기본 2×1). 문항마다 `expl-head`(번호·정답·ref) + 섹션. `[지문]` 섹션은 지문 요약이므로 이름을 "지문 요약"으로 표시 가능(옵션 `explanations.renamePassage: true` 기본).
- 순서: 표지 → 차례 → 문제 → 정답 → 해설. 각 시트는 새 페이지에서 시작. 모의고사 스타일이면 정답·해설은 헤더 "정답과 해설".

## 8. 차례

- front TOC: 대단원(level1) + 소단원(level2, 문항 수 · 시작 쪽). 정답·해설 시트도 항목으로.
- perUnit TOC: 대단원 띠 바로 뒤, 그 단원의 소단원 목록 + 쪽. `unitBand.style === "page"`면 단원 표지 페이지 안에 그린다.
- 점선 리더: `.toc-row { display:flex } .toc-dots { flex:1; border-bottom: 1px dotted }`.

## 9. 픽스처와 검증 (tests/)

| 파일 | 특징 |
|---|---|
| kor_grammar.md / _view.md | 국어 문법. 발문→지문 순서 변형, `<자료>`·`<표>` 파이프 표, 다중 정답, `"""` 계승 |
| kor_reading_set.md | 국어 독서 세트. `<u>`, ㉠, `---` 연속 중복, 지문 계승, `[지문]` 섹션 빈 줄 |
| kor_lit.md | 국어 문학 대용량(2982줄). 선지 `'나'` 작은따옴표, `[A]/[B]`, 〈 〉 |
| eng_batch.md | 영어. `01` 번호, `#` 헤더, `---`+빈 줄+`---`, 다중 정답, `- ①` 리스트 해설 |
| eng_insert.md | 영어 문장삽입. 인라인 선지 `① ② ③ ④ ⑤`, 4칸 들여쓴 삽입 문장, 지문 안 `( ① )` |
| math_batch.md | 수학. `$…$` `$$…$$`, 짧은 수치 선지(grid5) |
| math_merged.md | 수학 합본. `<!-- BATCH:n START/END -->`, 여러 batch |
| chem_batch3/9/12/15.md | 화학. `>` 헤더 필드(단원:), 펜스 아스키 그래프·장치도·구조식·반투막, `<보기>` ㄱㄴㄷ, 수식 in 발문 |

node 테스트 최소 항목: 각 픽스처의 문항 수(kor_grammar 3, kor_reading_set ≥3, eng_batch 4, eng_insert 3, math_batch 4, chem_batch9 4, math_merged = BATCH 주석 안 블록 수), 정답 값·다중 여부, 지문 계승 연결, 인라인 선지 5개, 표 파싱(행·열 수), 펜스 figure 수, `<u>` 유지·`'나'` bold·`<보기>` 텍스트 이스케이프, 수식 세그먼트 분리, sequential/source/perUnit 번호, units 휴리스틱 4종, ascii2svg 각 픽스처 confidence ≥ 0.5 및 SVG 유효(`<svg` 시작, 텍스트 런 전부 포함).

브라우저 검증: `tests/chrome.sh demo-layout.html` → `--print-to-pdf` 와 `--screenshot`으로 결과 확인. Chrome 경로 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

## 10. 스타일 계약 (page.css 클래스)

`.page .pg-head .pg-body .cell .pg-foot` / `.q .q-head .q-num .q-time .q-ref .q-intro` / `.passage .passage-part .passage.boxed` / `.stem` / `.box .box-title .box-body` / `.choices.layout-list|inline|grid2|grid5 .c-label .c-text` / `.tbl` / `.fig.svg|ascii|img` / `.inserted` / `.math` / `.mk` / `.unit-band .subunit-band .unit-page` / `.toc .toc-row .toc-l1 .toc-l2 .toc-dots .toc-page` / `.answers .ans-table .ans-num .ans-val` / `.expl .expl-head .ans .expl-sec .expl-name` / `.cover`. 글자 크기는 `--font-size`(pt), 줄높이 `--line-height`, 글꼴 `--font-family`; 인쇄용 `@page`는 layout이 주입하는 `<style id="page-size">`.

## 11. 코드 규범

- ES2022 모듈, 세미콜론 사용, 외부 패키지 없음. 파일 상단에 모듈 역할 주석 3줄 이내. 함수마다 한 줄 JSDoc.
- 모든 사용자 노출 문자열은 한국어. 경고 문장은 "무엇이, 어디서, 어떻게 하면 되는지".
- 실패는 삼키지 않는다: 파서는 warnings로, 레이아웃은 경고 + 최선 배치, 규칙 정규식 오류는 그 규칙만 건너뛰고 경고.
