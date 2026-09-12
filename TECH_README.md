# booklet 기술 문서 (TECH_README.md)

이 문서는 AI 에이전트와 개발자를 위한 `booklet`의 아키텍처, CLI 명령어, 로컬 서버 구동법, 파일 맵 및 기술 규격을 설명합니다.  
일반 사용자용 사용 설명서는 [README.md](./README.md)를 참고하세요.

---

## 1. 아키텍처 및 설계 원칙

`booklet`은 마크다운/텍스트 문제 세트를 브라우저 기반으로 실시간 조판하고 인쇄용 PDF를 생성하는 독립형 조판 엔진입니다.

- **Zero-Build & Zero-Dependency**: Webpack, Vite 등의 번들러나 트랜스파일러가 필요 없습니다. 브라우저 표준 ES 모듈(`import`/`export`)로 브라우저 안에서 100% 동작합니다.
- **수식 렌더링**: [KaTeX](https://katex.org/)를 사용합니다. 오프라인 로컬 번들(`vendor/katex/`)을 최우선으로 로드하며, 부재 시 공식 CDN으로 자동 fallback합니다.
- **상태 관리 & 자동 저장**: `src/store.js`의 발행-구독(pub/sub) 모델과 브라우저 `localStorage`를 통해 작업 상태가 자동 보존됩니다.
- **스트리밍 조판 엔진**: `src/layout.js`가 문항을 렌더링 가능한 블록 단위로 쪼개어 페이지 격자(`cols × rows`) 흐름 컨테이너에 자동 배치합니다. 오버플로우 방지, 쪼개기 방지(keep) 규칙, 글자 크기 자동 축소(최소 문항 수 보장)를 지원합니다.
- **단일 독립 HTML 배포**: `toStandaloneHtml()` 및 `booklet.py build`를 통해 모든 JS 모듈을 data URL import-map으로 번들링하여, 파일 하나만으로 인터넷 없이 동작하는 standalone HTML을 생성합니다.

---

## 2. 파일 및 디렉터리 구조

```text
booklet/
├── index.html            # 웹 애플리케이션 진입점 (SPA UI 및 KaTeX 로더)
├── booklet.py            # 표준 라이브러리 기반 Python CLI (build / serve / inspect)
├── start_windows.bat     # Windows 사용자용 원클릭 로컬 서버 실행 배치 파일
├── start_mac.command     # macOS 사용자용 원클릭 로컬 서버 실행 스크립트
├── README.md             # 일반 사용자를 위한 ChatGPT/Claude 프로젝트 연동 가이드
├── TECH_README.md        # 개발자 및 에이전트를 위한 기술 명세서 (본 문서)
├── format.md             # 포맷 프로파일 및 파싱 규격 상세 안내서
├── DESIGN.md             # 초기 모듈 설계서 및 인터페이스 계약
├── package.json          # Node.js 내장 테스트 러너 정의 ("scripts": { "test": "node --test" })
├── docs/                 # 문서 보조 자료 및 시연 미디어
│   └── demo.mp4          # booklet 실제 조판 시연 영상 (720p MP4)
├── src/                  # 코어 ES 모듈
│   ├── app.js            # UI 이벤트 바인딩, 사이드바 탭 및 메인 렌더링 루프
│   ├── parser.js         # 줄 단위 1-pass 상태기계 문제 파서
│   ├── format.js         # 포맷 프로파일 스키마, 내장 프로파일(batch/mdheading/plain) 컴파일
│   ├── layout.js         # 격자 기반 페이지 조판 및 페이지네이션 엔진
│   ├── render.js         # 문제 객체를 렌더링용 블록 HTML로 변환
│   ├── store.js          # 프로젝트 상태 스토어 및 localStorage 영속화
│   ├── options.js        # 설정 열거형(Enums), 기본 레이아웃, 단일 출처 상수
│   ├── rules.js          # 인라인 텍스트 후처리 (볼드, 밑줄, 배지 치환)
│   ├── units.js          # 대단원·소단원 추출 및 그룹화 휴리스틱
│   ├── numbering.js      # 문항 번호 매기기 (순차, 원문 번호, 대단원별)
│   ├── sheets.js         # 표지, 문제, 빠른 정답, 해설 시트 레이아웃
│   ├── toc.js            # 전체 목차 및 대단원별 차례 생성
│   ├── ascii2svg.js      # 아스키 아트 실험 장치 및 그래프를 SVG 벡터로 변환
│   └── export.js         # 독립 HTML 및 프로젝트 JSON 내보내기/가져오기
├── styles/               # CSS 스타일시트
│   ├── page.css          # 인쇄 및 페이지 프리뷰 규격 (@page, 격자, 시험지 레이아웃)
│   └── ui.css            # 사이드바 설정 폼, 상태줄, 툴바 스타일
├── vendor/               # 외부 정적 라이브러리
│   └── katex/            # 오프라인 수식 렌더링용 KaTeX 본체 및 폰트
└── tests/                # Node.js 내장 테스트 러너 단위 테스트
    ├── fixtures/         # 국어 테스트 픽스처 (.md 및 .json)
    ├── parser.test.mjs   # 파서 유닛 테스트
    ├── render.test.mjs   # 렌더러 유닛 테스트
    ├── store.test.mjs    # 스토어 영속성 테스트
    ├── units.test.mjs    # 단원 도출 테스트
    ├── numbering.test.mjs# 번호 생성 테스트
    ├── rules.test.mjs    # 인라인 규칙 테스트
    └── ascii2svg.test.mjs# 아스키 아트 벡터화 회귀 테스트
```

---

## 3. CLI 명령어 및 사용법 (`booklet.py`)

Python 3.10 이상 표준 라이브러리(`argparse`, `http.server`, `json`, `re` 등)만 사용하며 추가 패키지 설치가 필요 없습니다.

### (1) 로컬 웹 서버 실행 (`serve`)
브라우저의 `file://` 보안 정책(CORS 및 fetch 제한)을 우회하여 독립 HTML 내보내기 및 파일 처리를 원활하게 할 때 사용합니다.
```bash
python3 booklet.py serve
# 기본 포트: 8765 -> http://localhost:8765/index.html 자동 브라우저 실행
```
포트 변경 시:
```bash
python3 booklet.py serve -p 8080
```

### (2) 명령 한 줄로 조판 및 PDF/독립 HTML 생성 (`build`)

로컬 웹 서버(`localhost`)를 띄우지 않고, 터미널 명령 한 줄로 문제 파일을 조판하여 **인쇄용 PDF**를 즉시 추출하거나, **더블 클릭으로 바로 열리는 독립 HTML 사본**을 일괄 생성할 수 있습니다.

```bash
python3 booklet.py build ./problems_dir \
  -o booklet.html \
  --title "2026학년도 국어 모의고사" \
  --grid 2x1 \
  --page A4 \
  --exam \
  --pdf booklet.pdf
```

#### 🛠️ 내부 동작 메커니즘 및 대체 경로 (Alternative Pipeline):

1. **로컬 서버 없는 Headless Chrome PDF 직접 렌더링 (`--pdf`)**:
   - `find_chrome()`이 시스템의 Google Chrome / Chromium 실행 파일을 자동 탐지합니다 (`/Applications/Google Chrome.app/...`, `google-chrome`, `chromium` 등).
   - HTTP 서버(localhost)를 열지 않고도, 내부 빌드된 HTML의 file URI를 대상으로 Chrome을 헤드리스 모드로 호출합니다:
     ```bash
     chrome --headless=new --disable-gpu --allow-file-access-from-files \
            --no-pdf-header-footer --virtual-time-budget=20000 \
            --print-to-pdf=<pdf_abs> <html_file_uri>
     ```
   - KaTeX 수식, SVG 도형, 2단 페이지 격자가 100% 동일하게 렌더링된 인쇄용 PDF가 생성됩니다.

2. **독립 HTML 번들 생성 및 더블 클릭(`file:///`)으로 localhost 없이 즉시 편집 (`-o`)**:
   - `bundle_portable()` 함수가 `styles/page.css`, `styles/ui.css`, KaTeX CSS를 단일 HTML 내부 `<style>` 블록으로 자동 인라인합니다.
   - 파싱된 문제 데이터(Project JSON)를 `<script>window.__BOOKLET_INITIAL_PROJECT__ = ...</script>` 형태로 HTML 헤더에 직접 삽입합니다.
   - **결과**: 생성된 `booklet.html`은 웹 서버 없이 **로컬에서 그냥 더블 클릭(`file:///`)하는 것만으로 브라우저에서 바로 열립니다.** 문제가 이미 조판된 상태로 로드되며, 사이드바 옵션 조절, 문항 수정, 인쇄가 로컬 서버 없이도 완벽히 동작합니다.
   - *※ 참고: 이 방식은 배치 일괄 변환이나 오프라인 배포용 파일을 만들 때 유용한 대체 경로입니다. 드래그 앤 드롭으로 새 파일을 계속 추가하거나 LocalStorage 기반으로 작업 상태를 지속 유지하는 인터랙티브 정석 워크플로우는 `booklet.py serve`입니다.*

#### 주요 플래그 옵션:
| 옵션 | 기본값 | 설명 |
|---|---|---|
| `-o, --output` | `./booklet.html` | 생성될 독립 HTML 파일 경로 (더블 클릭으로 로컬 서버 없이 실행 가능) |
| `--pdf` | `None` | Chrome headless를 호출하여 localhost 없이 PDF 직접 출력 |
| `--title` | `""` | 문제집 표지 및 머리말 제목 |
| `--subtitle` | `""` | 부제 |
| `--subject` | `auto` | 과목 (`auto`, `국어`, `영어`, `수학`, `화학`, `기타`) |
| `--grid` | `2x1` | 페이지 칸 배치 (`1x1`, `2x1`, `1x2`, `2x2`) |
| `--page` | `A4` | 용지 크기 (`A4`, `B4`, `B5`, `Letter`) |
| `--exam` | `False` | 수능/모의고사 스타일 활성화 (교시 표기, 굵은 번호, [n~m] 세트 표기) |
| `--profile` | `auto` | 파싱 프로파일 (`auto`, `batch`, `mdheading`, `plain`) |
| `--prefer` | `원본` | `_원본`/`_view` 쌍이 있을 때 우선할 파일 (`원본`, `view`) |
| `--manifest` | `None` | 문항별 단원 수동 매핑 JSON 파일 경로 |
| `--json` | `None` | 프로젝트 데이터만 `.booklet.json`으로 저장 |
| `--open` | `False` | 빌드 완료 후 시스템 기본 뷰어로 열기 |

### (3) 파일 통계 검사 (`inspect`)
문제 파일의 블록 수, 문항 수, 정답 수, 수식 수 등을 터미널 표 형태로 점검합니다.
```bash
python3 booklet.py inspect ./problems_dir
```

---

## 4. 포맷 프로파일 및 파싱 규격 요약

booklet은 3가지 내장 포맷 프로파일을 제공합니다 (상세 규칙: [format.md](./format.md)):

1. **`batch` (표준 권장)**
   - 문항 간 구분: `---`
   - 문항 헤더: `[문제]` 다음 줄에 `1 (2분)`
   - 지문: `"""`로 감싼 블록
   - 선지: 줄 첫머리 `①`~`⑤`
   - 해설 및 정답: `[해설]` 아래 `[풀이]`, `[팁]`, `[정답] 5`
2. **`mdheading` (마크다운 헤딩형)**
   - 문항 헤더: `### [문항 1] 제목` + `- **풀이 권장 시간**: 2분`
   - 지문: ```` ```text ```` 첫 줄 `[지문]` 펜스
   - 정답표: 문서 끝 `## [정답 및 정밀 해설]` 아래 `### [문항 1 정답]: ①`
3. **`plain` (일반 문제지형)**
   - `---` 없이 `1.` 또는 `문제 1`로 자동 분할
   - `[지문]...[/지문]` 및 `정답: 3`

---

## 5. 테스트 실행

Node.js 내장 테스트 러너(`node --test`)를 사용합니다:
```bash
npm test
```
모든 테스트는 외부 의존성(Jest, Mocha 등) 없이 1초 내에 100% 통과하도록 설계되어 있습니다.
