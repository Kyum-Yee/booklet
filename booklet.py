#!/usr/bin/env python3
"""booklet.py — 문제 파일 모음을 조판 프로젝트로 만드는 CLI (표준 라이브러리만 사용).
하위 명령: build(프로젝트 JSON·독립 HTML·PDF 생성), serve(로컬 정적 서버), inspect(픽스처 통계표).
DESIGN.md §2.1·§2.6·§3(booklet.py 절)을 그대로 구현한다.
"""

import argparse
import fnmatch
import functools
import http.server
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata
import webbrowser
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ALLOWED_EXT = {".md", ".txt"}
EXCLUDED_DIR_NAMES = {"문제거리"}
PROBLEM_KEY_RE = re.compile(r"^s\d+#(?:\d+|\*)$")
SUFFIX_ORIGINAL = "_원본"
SUFFIX_VIEW = "_view"

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "google-chrome",
    "chromium",
    "chromium-browser",
]

# CLI 선택지의 단일 출처는 src/options.js다 — 아래 상수는 그 파일을 못 읽을 때의 대비책이다.
FALLBACK_CHOICES = {
    "GRID": ["1x1", "2x1", "1x2", "2x2"],
    "PAGE_SIZE": ["A4", "B4", "B5", "Letter", "custom"],
    "SUBJECT": ["auto", "국어", "영어", "수학", "화학", "기타"],
    "PROFILE_ID": ["auto", "batch", "mdheading", "plain"],
    "PREFER_VARIANT": ["원본", "view"],
}

OPTIONS_JS = SCRIPT_DIR / "src" / "options.js"
FORMAT_JS = SCRIPT_DIR / "src" / "format.js"
_ENUM_HEAD_RE = re.compile(r"^export const (?P<name>[A-Z_0-9]+) = makeEnum\(", re.M)
_ID_RE = re.compile(r"""\bid:\s*(?P<q>['"])(?P<id>.*?)(?P=q)""")
_BUILTIN_ORDER_RE = re.compile(r"export const BUILTIN_ORDER = \[(?P<body>[^\]]*)\]")
_QUOTED_RE = re.compile(r"""(?P<q>['"])(?P<v>[^'"]*)(?P=q)""")


@functools.lru_cache(maxsize=1)
def builtin_profile_ids() -> list:
    """src/format.js의 BUILTIN_ORDER를 그대로 읽는다(내장 프로파일을 늘리면 CLI도 따라 는다)."""
    try:
        text = FORMAT_JS.read_text(encoding="utf-8")
    except OSError:
        return []
    m = _BUILTIN_ORDER_RE.search(text)
    return [x.group("v") for x in _QUOTED_RE.finditer(m.group("body"))] if m else []


@functools.lru_cache(maxsize=1)
def options_enums() -> dict:
    """src/options.js에서 열거형 이름 → id 목록을 뽑는다(읽기 실패·모양 변화는 빈 표)."""
    try:
        text = OPTIONS_JS.read_text(encoding="utf-8")
    except OSError:
        return {}
    out = {}
    for m in _ENUM_HEAD_RE.finditer(text):
        # 값 목록은 makeEnum( 다음부터 줄 첫머리의 `], ` 까지다.
        start = m.end()
        end = text.find("\n], ", start)
        if end < 0:
            continue
        block = text[start:end]
        ids = [x.group("id") for x in _ID_RE.finditer(block)]
        # PROFILE_ID는 내장 목록을 BUILTIN_ORDER에서 펼쳐 붙이므로 리터럴이 없다.
        if "...BUILTIN_ORDER" in block:
            ids += [i for i in builtin_profile_ids() if i not in ids]
        if ids:
            out[m.group("name")] = ids
    return out


def choices_of(name: str, drop: tuple = ()) -> list:
    """열거형 하나의 선택지. options.js를 못 읽었으면 FALLBACK_CHOICES로 물러선다."""
    ids = options_enums().get(name) or FALLBACK_CHOICES.get(name, [])
    return [i for i in ids if i not in drop]


# --page는 mm 치수를 받을 수 없으므로 표지 값 custom을 뺀다.
GRID_CHOICES = choices_of("GRID")
PAGE_CHOICES = choices_of("PAGE_SIZE", drop=("custom",))
SUBJECT_CHOICES = choices_of("SUBJECT")
PROFILE_CHOICES = tuple(choices_of("PROFILE_ID"))
PREFER_CHOICES = choices_of("PREFER_VARIANT")


# ---------------------------------------------------------------------------
# 공통 유틸리티
# ---------------------------------------------------------------------------

def natural_sort_key(name: str):
    """파일명을 숫자·문자 청크로 쪼개 자연 정렬 키를 만든다(batch-2 < batch-10)."""
    return [int(chunk) if chunk.isdigit() else chunk.lower() for chunk in re.split(r"(\d+)", name)]


def display_width(text: str) -> int:
    """동아시아 넓은 글자(전각)를 2칸으로 세어 터미널 표시 폭을 계산한다."""
    width = 0
    for ch in text:
        width += 2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1
    return width


def pad_display(text: str, width: int) -> str:
    """display_width 기준으로 오른쪽에 공백을 채워 열을 맞춘다."""
    return text + " " * max(0, width - display_width(text))


def read_text_file(path: Path) -> str:
    """UTF-8(BOM 제거)로 읽고 CRLF/CR을 LF로 통일한다. 실패 시 cp949로 재시도."""
    raw = path.read_bytes()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = raw.decode("cp949")
            print(f"안내: {path.name}을(를) UTF-8로 읽지 못해 cp949로 다시 읽었습니다.", file=sys.stderr)
        except UnicodeDecodeError as e:
            raise SystemExit(f"오류: {path}의 인코딩을 인식할 수 없습니다 (UTF-8도 cp949도 아님): {e}")
    return text.replace("\r\n", "\n").replace("\r", "\n")


# ---------------------------------------------------------------------------
# 파일 수집 (build·inspect 공통)
# ---------------------------------------------------------------------------

def is_excluded_dir(path: Path) -> bool:
    """`문제거리` 폴더나 `_discarded`로 시작하는 폴더인지 확인한다."""
    return path.name in EXCLUDED_DIR_NAMES or path.name.startswith("_discarded")


def collect_files(paths) -> list:
    """파일·폴더 목록을 받아 *.md/*.txt를 (재귀 없이) 모으고 자연 정렬해 반환한다."""
    seen = {}
    for raw in paths:
        p = Path(raw)
        if not p.exists():
            print(f"경고: 경로가 존재하지 않아 건너뜁니다: {raw}", file=sys.stderr)
            continue
        if p.is_dir():
            if is_excluded_dir(p):
                print(f"건너뜀(제외 폴더): {p}", file=sys.stderr)
                continue
            for child in sorted(p.iterdir()):
                if not child.is_file():
                    continue
                if child.suffix.lower() not in ALLOWED_EXT:
                    continue
                if child.name.startswith("_discarded"):
                    print(f"건너뜀(제외 파일): {child}", file=sys.stderr)
                    continue
                seen[str(child.resolve())] = child
        else:
            if p.suffix.lower() not in ALLOWED_EXT:
                print(f"건너뜀(지원하지 않는 확장자): {p}", file=sys.stderr)
                continue
            if p.name.startswith("_discarded"):
                print(f"건너뜀(제외 파일): {p}", file=sys.stderr)
                continue
            seen[str(p.resolve())] = p
    return sorted(seen.values(), key=lambda f: natural_sort_key(f.name))


def variant_of(stem: str):
    """파일명 밑동에서 `_원본`/`_view` 접미사를 분리해 (밑동, 종류)를 반환한다. 접미사 없으면 원본 취급."""
    if stem.endswith(SUFFIX_ORIGINAL):
        return stem[: -len(SUFFIX_ORIGINAL)], "원본"
    if stem.endswith(SUFFIX_VIEW):
        return stem[: -len(SUFFIX_VIEW)], "view"
    return stem, "원본"


def apply_prefer(files, prefer: str) -> list:
    """같은 밑동의 `_원본`/`_view` 쌍 중 prefer만 활성화하고 나머지는 enabled=False로 표시한다."""
    groups = {}
    order = []
    for f in files:
        base, kind = variant_of(f.stem)
        gkey = (str(f.parent), base)
        if gkey not in groups:
            groups[gkey] = []
            order.append(gkey)
        groups[gkey].append((f, kind))

    result = []
    for gkey in order:
        members = groups[gkey]
        if len(members) == 1:
            result.append({"path": members[0][0], "enabled": True, "reason": ""})
            continue
        preferred = [m for m in members if m[1] == prefer]
        chosen = preferred[0][0] if preferred else members[0][0]
        for f, kind in members:
            if f == chosen:
                result.append({"path": f, "enabled": True, "reason": ""})
            else:
                result.append({"path": f, "enabled": False, "reason": f"{prefer} 우선(같은 밑동)"})
    # 원래 자연 정렬 순서를 유지
    result.sort(key=lambda item: natural_sort_key(item["path"].name))
    return result


# ---------------------------------------------------------------------------
# Project JSON (DESIGN.md §2.1, §2.6 기본값)
# ---------------------------------------------------------------------------

def default_layout(grid: str, page: str, exam: bool) -> dict:
    """DESIGN §2.6 LayoutSettings 기본값을 그대로 채우고 --grid/--page/--exam만 덮어쓴다."""
    cols, rows = (int(x) for x in grid.split("x"))
    return {
        "page": page,
        "orientation": "portrait",
        "margin": {"top": 18, "right": 14, "bottom": 16, "left": 14},
        "grid": {"cols": cols, "rows": rows},
        "gutter": 8,
        "rowGap": 6,
        "columnRule": True,
        "rowRule": False,
        "fillOrder": "auto",
        "font": {
            "family": "'Noto Serif KR', 'Apple SD Gothic Neo', 'Malgun Gothic', serif",
            "size": 10,
            "lineHeight": 1.55,
            "mathScale": 1,
        },
        "header": {"left": "{title}", "center": "", "right": "{unit}"},
        "footer": {"left": "", "center": "{page}", "right": ""},
        "examStyle": exam,
        "problemGap": 5,
        "cellSlack": 3,
        "numberStyle": "plain",
        "showTime": False,
        "showRef": False,
        "showSrcNum": False,
        "passageStyle": "boxed",
        "choiceStyle": "auto",
        "keep": {
            "headWithStem": True,
            "stemWithFirstChoice": True,
            "choicesTogether": True,
            "allowPassageSplit": True,
            "allowTableSplit": True,
            # 단원·소단원 띠는 그 뒤 첫 문항과 한 칸에 함께 놓는다.
            "bandWithFirst": True,
            # 여러 문항이 나눠 읽는 지문은 첫 문항의 일부로 본다.
            "passageWithFirst": True,
            # 붙여 두기가 안 되면 그 쪽 글자를 줄여 다시 놓는다.
            "shrinkToKeep": True,
        },
        # 한 쪽에서 시작하는 문항 수의 최소·최대(0 = 제한 없음). 문제 시트에만 건다.
        "perPage": {"min": 0, "max": 0},
        # 쪽번호별 예외 [{"page": 5, "min": 2, "max": 3}].
        "perPageRules": [],
        # 최소 미달 쪽의 글자를 step(pt)씩 minSize까지 줄여 다시 배치한다.
        "perPageFont": {"enabled": True, "minSize": 8, "step": 0.25},
        "figure": {"mode": "svg", "maxWidth": 100},
        "unitBand": {"enabled": True, "style": "band"},
        "subunitBand": {"enabled": True},
    }


def default_sheets() -> dict:
    """DESIGN §2.1 sheets 기본값."""
    return {
        "cover": {"enabled": False, "lines": []},
        "problems": True,
        "answers": {"enabled": True, "perRow": 10, "title": "빠른 정답"},
        "explanations": {"enabled": True, "grid": {"cols": 2, "rows": 1}, "title": "정답과 해설"},
        "toc": {"enabled": True, "front": True, "perUnit": True, "pageNumbers": True, "title": "차례"},
    }


def build_project(args) -> dict:
    """수집한 파일들로 Project JSON(dict)을 만든다. DESIGN §2.1의 키를 전부 채운다."""
    files = collect_files(args.path)
    if not files:
        print("오류: 수집된 .md/.txt 파일이 없습니다.", file=sys.stderr)
        sys.exit(1)
    entries = apply_prefer(files, args.prefer)

    sources = []
    for i, item in enumerate(entries):
        text = read_text_file(item["path"])
        sid = f"s{i + 1}"
        sources.append({
            "id": sid,
            "name": item["path"].name,
            "text": text,
            "profileId": args.profile,
            "subject": args.subject,
            "order": i,
            "enabled": item["enabled"],
        })
        item["id"] = sid

    project = {
        "version": 1,
        "title": args.title or "",
        "subtitle": args.subtitle or "",
        "meta": {
            "subject": args.subject,
            "grade": "",
            "institute": "",
            "date": "",
            "round": "",
            "period": "",
        },
        "sources": sources,
        "profiles": [],
        "rules": [],
        "layout": default_layout(args.grid, args.page, args.exam),
        "numbering": {"mode": "sequential", "start": 1, "pad": 0},
        "units": {"source": "auto", "order": [], "suborder": {}, "map": {}},
        "sheets": default_sheets(),
        "images": [],
        "imagePlacements": [],
        "overrides": {},
    }

    if args.manifest:
        apply_manifest(project, sources, args.manifest)

    return project, entries


def apply_manifest(project: dict, sources: list, manifest_path: str) -> None:
    """--manifest JSON({파일명 glob 또는 문항키: {unit, subunit}})을 project.units.map에 반영한다."""
    try:
        data = json.loads(Path(manifest_path).read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as e:
        print(f"오류: manifest 파일을 읽을 수 없습니다 ({manifest_path}): {e}", file=sys.stderr)
        sys.exit(1)
    if not isinstance(data, dict):
        print(f"오류: manifest는 JSON 객체여야 합니다: {manifest_path}", file=sys.stderr)
        sys.exit(1)

    units_map = project["units"]["map"]
    for key, value in data.items():
        if PROBLEM_KEY_RE.match(key):
            units_map[key] = value
            continue
        matched = False
        for s in sources:
            if fnmatch.fnmatchcase(s["name"], key):
                units_map[f"{s['id']}#*"] = value
                matched = True
        if not matched:
            print(f"경고: manifest 키 '{key}'와 일치하는 소스나 문항키가 없습니다.", file=sys.stderr)


# ---------------------------------------------------------------------------
# 독립 HTML 삽입 (export.js와 같은 방식)
# ---------------------------------------------------------------------------

def escape_for_script_tag(text: str) -> str:
    """JSON 문자열 안의 `</script`·`<!--`가 HTML 파서를 깨지 않도록 이스케이프한다."""
    text = re.sub(r"</script", lambda m: "<\\/script", text, flags=re.IGNORECASE)
    text = text.replace("<!--", "<\\u0021--")
    return text


ASSET_PATH_RE = re.compile(r"([\"'])(?:\./)?(src|styles|vendor)/([^\"']*)\1")


def localize_asset_paths(html: str, booklet_dir: Path) -> str:
    """`src/`·`styles/`·`vendor/` 상대 경로를 booklet_dir 기준 절대 file:// 경로로 바꾼다."""
    booklet_dir = booklet_dir.resolve()

    def repl(m: "re.Match") -> str:
        quote, folder, rest = m.group(1), m.group(2), m.group(3)
        abs_path = (booklet_dir / folder / rest).resolve()
        return f"{quote}{abs_path.as_uri()}{quote}"

    return ASSET_PATH_RE.sub(repl, html)


BUNDLE_MODULES = [
    "format", "options", "rules", "ascii2svg", "numbering", "units", "parser",
    "render", "toc", "sheets", "layout", "store", "export", "app",
]
BUNDLE_STYLES = ["styles/page.css", "styles/ui.css"]


def rebase_specifiers(code: str, file_names) -> str:
    """모듈 안의 형제 지정자 "./x.js"(정적·동적 import)를 import map 키 "booklet/x.js"로 바꾼다."""
    for n in file_names:
        code = code.replace(f'"./{n}"', f'"booklet/{n}"').replace(f"'./{n}'", f"'booklet/{n}'")
    return code


def bundle_portable(html: str, booklet_dir: Path) -> str:
    """styles를 인라인하고 src 모듈을 data: URL + import map으로 심어 어디서나 열리는 한 파일로 만든다(export.js와 같은 방식)."""
    import base64
    booklet_dir = booklet_dir.resolve()
    # 1) 스타일 인라인
    for rel in BUNDLE_STYLES:
        css_path = booklet_dir / rel
        if not css_path.exists():
            continue
        css = css_path.read_text(encoding="utf-8").replace("</style", "<\\/style")
        name = rel.split("/")[-1]
        tag_re = re.compile(r'<link[^>]*href="[^"]*' + re.escape(name) + r'"[^>]*>', re.I)
        style_tag = f'<style data-from="{name}">\n{css}\n</style>'
        if tag_re.search(html):
            html = tag_re.sub(lambda m: style_tag, html, count=1)
        else:
            idx = html.lower().find("</head>")
            html = html[:idx] + style_tag + "\n" + html[idx:]
    # 2) 모듈 → data: URL import map
    file_names = [f"{m}.js" for m in BUNDLE_MODULES]
    imports = {}
    for m in BUNDLE_MODULES:
        js_path = booklet_dir / "src" / f"{m}.js"
        if not js_path.exists():
            print(f"경고: src/{m}.js가 없어 번들에서 뺍니다.", file=sys.stderr)
            continue
        code = rebase_specifiers(js_path.read_text(encoding="utf-8"), file_names)
        b64 = base64.b64encode(code.encode("utf-8")).decode("ascii")
        imports[f"booklet/{m}.js"] = "data:text/javascript;charset=utf-8;base64," + b64
    import_map = json.dumps({"imports": imports}).replace("</", "<\\/")
    payload = (
        f'<script type="importmap">{import_map}</script>\n'
        '<script type="module">import "booklet/app.js";</script>'
    )
    tag_re = re.compile(r'<script[^>]*src="(?:\./)?src/app\.js"[^>]*></script>', re.I)
    if tag_re.search(html):
        html = tag_re.sub(lambda m: payload, html, count=1)
    else:
        idx = html.lower().rfind("</body>")
        html = html[:idx] + payload + "\n" + html[idx:]
    # 3) vendor/(KaTeX)는 절대 경로로 두고, 없으면 onerror가 CDN으로 넘긴다.
    vendor_re = re.compile(r'([\"\'])(?:\./)?vendor/([^\"\']*)\1')
    html = vendor_re.sub(lambda m: f"{m.group(1)}{(booklet_dir / 'vendor' / m.group(2)).resolve().as_uri()}{m.group(1)}", html)
    return html


def insert_project_script(html: str, json_str: str):
    """`</head>` 직전에 booklet-project 스크립트 태그를 문자열 슬라이싱으로 끼워 넣는다(re.sub 백참조 위험 회피)."""
    idx = html.lower().find("</head>")
    if idx == -1:
        return None
    script = f'<script id="booklet-project" type="application/json">{escape_for_script_tag(json_str)}</script>\n'
    # 빌드 스탬프 — 앱의 내보내기 탭이 "이 문서 빌드: …"로 보여 준다(오래된 독립 HTML을 새 코드로 착각하지 않게).
    stamp = f'<meta name="booklet-build" content="{build_stamp()} booklet.py">\n'
    return html[:idx] + stamp + script + html[idx:]


def build_stamp() -> str:
    """사용자 시간대의 `YYYY-MM-DD HH:MM+09:00` — UTC로 찍으면 아침에 만든 파일이 새벽 파일로 읽힌다."""
    from datetime import datetime
    now = datetime.now().astimezone()
    off = now.strftime("%z")  # +0900
    return now.strftime("%Y-%m-%d %H:%M") + f"{off[:3]}:{off[3:]}"


# ---------------------------------------------------------------------------
# Chrome headless PDF
# ---------------------------------------------------------------------------

def find_chrome():
    """Chrome/Chromium 실행 파일을 후보 목록 순서대로 찾는다. 없으면 None."""
    for candidate in CHROME_CANDIDATES:
        if os.sep in candidate:
            if os.path.exists(candidate):
                return candidate
        else:
            found = shutil.which(candidate)
            if found:
                return found
    return None


def run_chrome_pdf(html_path: Path, pdf_path: Path) -> None:
    """헤드리스 Chrome로 html_path를 pdf_path로 인쇄한다. 실패해도 프로세스는 계속 진행."""
    chrome = find_chrome()
    if chrome is None:
        print(
            "오류: Chrome/Chromium을 찾을 수 없습니다. "
            "Google Chrome을 설치하거나 PATH에 chromium(-browser)을 추가하세요.",
            file=sys.stderr,
        )
        sys.exit(2)

    pdf_abs = str(pdf_path.resolve())
    html_uri = html_path.resolve().as_uri()
    cmd = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--allow-file-access-from-files",
        "--no-pdf-header-footer",
        "--virtual-time-budget=20000",
        f"--print-to-pdf={pdf_abs}",
        html_uri,
    ]
    try:
        result = subprocess.run(cmd, timeout=120, capture_output=True, text=True)
    except subprocess.TimeoutExpired:
        print("오류: PDF 생성이 120초를 초과해 중단되었습니다.", file=sys.stderr)
        return
    if result.returncode != 0:
        print(f"오류: PDF 생성 실패 (종료 코드 {result.returncode}): {result.stderr.strip()}", file=sys.stderr)
    else:
        print(f"PDF 저장: {pdf_abs}")


# ---------------------------------------------------------------------------
# 하위 명령: build
# ---------------------------------------------------------------------------

def cmd_build(args) -> None:
    """build 하위 명령: 프로젝트 JSON을 만들고, index.html이 있으면 독립 HTML로 감싼다."""
    project, entries = build_project(args)
    json_str = json.dumps(project, ensure_ascii=False, indent=2)

    if args.json:
        json_path = Path(args.json)
        json_path.parent.mkdir(parents=True, exist_ok=True)
        json_path.write_text(json_str, encoding="utf-8")
    else:
        json_path = None

    out_path = Path(args.output) if args.output else Path.cwd() / "booklet.html"
    index_html = SCRIPT_DIR / "index.html"
    html_written = None

    if not index_html.exists():
        print("index.html이 아직 없습니다 — 앱 파일을 먼저 두세요", file=sys.stderr)
        if json_path is None:
            fallback = out_path.with_name(out_path.stem + ".booklet.json")
            fallback.parent.mkdir(parents=True, exist_ok=True)
            fallback.write_text(json_str, encoding="utf-8")
            json_path = fallback
            print(f"JSON만 저장했습니다: {fallback}")
    else:
        html = index_html.read_text(encoding="utf-8")
        if getattr(args, "link", False):
            html = localize_asset_paths(html, SCRIPT_DIR)   # 개발용: 앱 파일을 절대 경로로 참조
        else:
            html = bundle_portable(html, SCRIPT_DIR)        # 기본: 한 파일(styles 인라인 + 모듈 import map)
        merged = insert_project_script(html, json_str)
        if merged is None:
            print("오류: index.html에 </head> 태그가 없어 프로젝트를 삽입할 수 없습니다.", file=sys.stderr)
            sys.exit(1)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(merged, encoding="utf-8")
        html_written = out_path

        if args.pdf:
            run_chrome_pdf(out_path, Path(args.pdf))
        if args.open:
            try:
                subprocess.run(["open", str(out_path)], check=False)
            except OSError as e:
                print(f"경고: 파일을 여는 데 실패했습니다: {e}", file=sys.stderr)

    print_build_summary(entries, html_written, json_path)


def print_build_summary(entries, html_path, json_path) -> None:
    """소스 n(활성 m), 파일 목록, 출력 경로를 요약 출력한다."""
    enabled = [e for e in entries if e["enabled"]]
    print(f"소스 {len(entries)}개 (활성 {len(enabled)}개)")
    for e in entries:
        mark = "x" if e["enabled"] else " "
        note = f"  — {e['reason']}" if e["reason"] else ""
        print(f"  [{mark}] {e['path'].name}{note}")
    if json_path:
        print(f"JSON: {json_path}")
    if html_path:
        print(f"출력: {html_path}")


# ---------------------------------------------------------------------------
# 하위 명령: serve
# ---------------------------------------------------------------------------

def cmd_serve(args) -> None:
    """serve 하위 명령: booklet 폴더를 정적 서버로 열고 index.html을 브라우저로 띄운다."""
    directory = Path(args.dir).resolve() if args.dir else SCRIPT_DIR
    if not (directory / "index.html").exists():
        print(f"경고: {directory}에 index.html이 없습니다.", file=sys.stderr)

    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    with http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler) as httpd:
        url = f"http://localhost:{args.port}/index.html"
        print(f"서비스 중: {url}  (폴더: {directory})")
        print("Ctrl+C로 종료합니다.")
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n서버를 종료합니다.")


# ---------------------------------------------------------------------------
# 하위 명령: inspect
# ---------------------------------------------------------------------------

def inspect_counts(text: str) -> dict:
    """정규식만으로 --- 블록·[문제]·[정답]·펜스·$ 수식 개수를 센다(파서 미사용, 값은 세지 않음)."""
    return {
        "dash": len(re.findall(r"^---\s*$", text, re.MULTILINE)),
        "problem": len(re.findall(r"\[문제\]", text)),
        "answer": len(re.findall(r"\[정답\]", text)),
        "fence": len(re.findall(r"^```", text, re.MULTILINE)) // 2,
        "math": text.count("$"),
    }


def cmd_inspect(args) -> None:
    """inspect 하위 명령: 파일별 --- 블록/[문제]/[정답]/펜스/$ 수식 개수를 표로 출력한다."""
    files = collect_files(args.path)
    if not files:
        print("오류: 수집된 .md/.txt 파일이 없습니다.", file=sys.stderr)
        sys.exit(1)

    headers = ["파일", "---블록", "[문제]", "[정답]", "펜스", "$수식"]
    rows = []
    totals = {"dash": 0, "problem": 0, "answer": 0, "fence": 0, "math": 0}
    for f in files:
        text = read_text_file(f)
        c = inspect_counts(text)
        for k in totals:
            totals[k] += c[k]
        rows.append([f.name, str(c["dash"]), str(c["problem"]), str(c["answer"]), str(c["fence"]), str(c["math"])])
    rows.append(["합계", str(totals["dash"]), str(totals["problem"]), str(totals["answer"]), str(totals["fence"]), str(totals["math"])])

    widths = [max(display_width(headers[i]), *(display_width(r[i]) for r in rows)) for i in range(len(headers))]
    def fmt_row(cols):
        return " | ".join(pad_display(c, widths[i]) for i, c in enumerate(cols))

    print(fmt_row(headers))
    print("-+-".join("-" * w for w in widths))
    for r in rows[:-1]:
        print(fmt_row(r))
    print("-+-".join("-" * w for w in widths))
    print(fmt_row(rows[-1]))


# ---------------------------------------------------------------------------
# argparse
# ---------------------------------------------------------------------------

def parse_grid(value: str) -> str:
    """--grid 값이 1x1|2x1|1x2|2x2 형식인지 검증한다."""
    if value not in GRID_CHOICES:
        raise argparse.ArgumentTypeError(f"grid는 {', '.join(GRID_CHOICES)} 중 하나여야 합니다: {value}")
    return value


def build_arg_parser() -> argparse.ArgumentParser:
    """세 하위 명령(build/serve/inspect)을 갖는 argparse 파서를 만든다."""
    parser = argparse.ArgumentParser(prog="booklet.py", description="문제 파일을 모아 조판 프로젝트로 만드는 CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    p_build = sub.add_parser("build", help="파일/폴더를 모아 프로젝트 JSON과 독립 HTML을 만든다")
    p_build.add_argument("path", nargs="+", help="문제 파일 또는 폴더 경로(여러 개 가능)")
    p_build.add_argument("-o", "--output", help="독립 HTML 출력 경로 (기본: ./booklet.html)")
    p_build.add_argument("--title", default="", help="문제집 제목")
    p_build.add_argument("--subtitle", default="", help="부제")
    p_build.add_argument("--subject", choices=SUBJECT_CHOICES, default="auto", help="과목 (기본 auto)")
    p_build.add_argument("--grid", type=parse_grid, default="2x1", help="배치 격자 (기본 2x1)")
    p_build.add_argument("--page", choices=PAGE_CHOICES, default="A4", help="용지 크기 (기본 A4)")
    p_build.add_argument("--exam", action="store_true", help="수능식 시험지 스타일(examStyle) 사용")
    p_build.add_argument("--profile", choices=PROFILE_CHOICES, default="auto", help="파싱 프로파일 (기본 auto: batch→mdheading→plain 자동 감지)")
    p_build.add_argument("--prefer", choices=PREFER_CHOICES, default="원본", help="_원본/_view 쌍에서 우선할 쪽 (기본 원본)")
    p_build.add_argument("--manifest", help="문항별 단원 지정 JSON 경로")
    p_build.add_argument("--json", help="프로젝트 JSON 저장 경로")
    p_build.add_argument("--link", action="store_true", help="번들 대신 src/·styles/를 절대 경로로 참조(개발용, 수정이 바로 반영됨)")
    p_build.add_argument("--pdf", help="Chrome headless로 인쇄할 PDF 출력 경로")
    p_build.add_argument("--open", action="store_true", help="완료 후 macOS open으로 열기")
    p_build.set_defaults(func=cmd_build)

    p_serve = sub.add_parser("serve", help="booklet 폴더를 로컬 정적 서버로 연다")
    p_serve.add_argument("-p", "--port", type=int, default=8765, help="포트 (기본 8765)")
    p_serve.add_argument("--dir", default=None, help="서비스할 폴더 (기본: booklet.py가 있는 폴더)")
    p_serve.set_defaults(func=cmd_serve)

    p_inspect = sub.add_parser("inspect", help="파일별 --- 블록/[문제]/[정답]/펜스/$ 수식 개수를 표로 보여준다")
    p_inspect.add_argument("path", nargs="+", help="문제 파일 또는 폴더 경로(여러 개 가능)")
    p_inspect.set_defaults(func=cmd_inspect)

    return parser


def main() -> None:
    """CLI 진입점: 인자를 파싱해 해당 하위 명령 함수를 실행한다."""
    parser = build_arg_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
