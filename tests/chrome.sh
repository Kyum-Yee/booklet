#!/usr/bin/env bash
# chrome.sh — 헤드리스 Chrome로 demo-*.html을 열어 PDF·PNG·리포트를 뽑는다 (DESIGN §3 layout 절).
#   사용: bash tests/chrome.sh <html[?query]> [pdf|png|report] [out]
#   예:   bash tests/chrome.sh "tests/demo-real.html?json=fixtures/project_chem.json&grid=2x1" report
#         bash tests/chrome.sh "tests/demo-real.html?json=fixtures/project_kor.json&exam=1" pdf /tmp/kor.pdf
#
# --virtual-time-budget을 켜면 Chrome이 결과를 다 쓰고도 제 발로 끝나지 않는다(관측: 5분 이상).
# 그래서 백그라운드로 띄우고 산출물이 완성되면 바로 죽인다 — 플래그는 DESIGN대로 유지하되 벽시계는 우리가 쥔다.
set -u

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [ ! -x "$CHROME" ]; then
  for c in /Applications/Chromium.app/Contents/MacOS/Chromium \
           "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
           "$(command -v google-chrome 2>/dev/null)" "$(command -v chromium 2>/dev/null)"; do
    [ -n "$c" ] && [ -x "$c" ] && CHROME="$c" && break
  done
fi
if [ ! -x "$CHROME" ]; then
  echo "Chrome을 찾지 못했습니다. CHROME=<크롬 실행 파일 경로> 를 지정하고 다시 실행하세요." >&2
  exit 127
fi

TARGET="${1:-}"
MODE="${2:-report}"
OUT="${3:-}"
# 초. 이 안에 산출물이 안 나오면 실패로 본다. 96문항·98쪽짜리 국어 프로젝트를 여러 개
# 동시에 돌리면 한 판이 3분을 넘길 수 있어 넉넉히 잡는다(MAXWAIT=60 처럼 줄여 쓸 수 있다).
MAXWAIT="${MAXWAIT:-300}"
if [ -z "$TARGET" ]; then
  echo "사용법: bash tests/chrome.sh <html[?query]> [pdf|png|report] [out]" >&2
  exit 2
fi

# 경로와 질의 문자열을 갈라 절대 file:// URL을 만든다(질의 문자열은 그대로 둔다).
PATH_PART="${TARGET%%\?*}"
QUERY_PART=""
case "$TARGET" in *\?*) QUERY_PART="${TARGET#*\?}";; esac
if [ ! -f "$PATH_PART" ]; then
  ROOT="$(cd "$(dirname "$0")/.." && pwd)"     # tests/ 밖에서 부른 경우 프로젝트 루트 기준으로 한 번 더
  if [ -f "$ROOT/$PATH_PART" ]; then PATH_PART="$ROOT/$PATH_PART"; else
    echo "파일이 없습니다: $PATH_PART" >&2
    exit 2
  fi
fi
ABS="$(cd "$(dirname "$PATH_PART")" && pwd)/$(basename "$PATH_PART")"
URL="file://$ABS"
[ -n "$QUERY_PART" ] && URL="$URL?$QUERY_PART"

PROFILE="$(mktemp -d "${TMPDIR:-/tmp}/booklet-chrome.XXXXXX")"
CHILD=""
cleanup() {
  [ -n "$CHILD" ] && kill "$CHILD" 2>/dev/null
  [ -n "$CHILD" ] && wait "$CHILD" 2>/dev/null
  rm -rf "$PROFILE"
}
trap cleanup EXIT INT TERM

# 가상 시간 예산. 가상 시간은 **한가할 때만** 흐르므로 예산을 키워도 실제로 더 기다리지 않는다
# (조판이 끝나 한가해지는 순간 남은 예산이 한꺼번에 소진되고 크롬이 산출물을 쓴다).
# 반대로 예산이 짧으면 JSON 페치·KaTeX 적재·fonts.ready로 쉬는 동안 예산이 다 타 버려,
# 조판이 끝나기도 전에 화면이 찍힌다 — report 모드는 `__done` 표식으로 그걸 걸러내지만
# png·pdf는 걸러낼 길이 없어 "{\"state\":\"loading\"}"만 찍힌 빈 장을 낸다. 그래서 넉넉히 준다.
VTB="${VTB:-120000}"
COMMON=(
  --headless=new
  --disable-gpu
  --no-sandbox
  --no-first-run
  --no-default-browser-check
  --disable-extensions
  --disable-lcd-text
  --force-device-scale-factor=1
  --hide-scrollbars
  --allow-file-access-from-files
  --virtual-time-budget="$VTB"
  --user-data-dir="$PROFILE"
)

# 산출물이 다 만들어질 때까지 기다린다. $1 = 완성 판정 명령.
wait_for() {
  local i=0
  local ticks=$((MAXWAIT * 4))
  while [ "$i" -lt "$ticks" ]; do
    if eval "$1"; then return 0; fi
    kill -0 "$CHILD" 2>/dev/null || { eval "$1" && return 0; return 1; }
    i=$((i + 1))
    perl -e 'select(undef,undef,undef,0.25)' 2>/dev/null || sleep 1
  done
  return 1
}

case "$MODE" in
  pdf|png)
    if [ "$MODE" = pdf ]; then
      OUT="${OUT:-${TMPDIR:-/tmp}/booklet.pdf}"
      : >"$OUT"
      "$CHROME" "${COMMON[@]}" --no-pdf-header-footer --print-to-pdf="$OUT" "$URL" >/dev/null 2>&1 &
    else
      OUT="${OUT:-${TMPDIR:-/tmp}/booklet.png}"
      : >"$OUT"
      "$CHROME" "${COMMON[@]}" --window-size="${WINDOW:-1200,1800}" --screenshot="$OUT" "$URL" >/dev/null 2>&1 &
    fi
    CHILD=$!
    LAST=-1
    # 파일이 생기고 크기가 두 번 연속 같으면 다 쓴 것으로 본다(부분 기록 중에 읽지 않도록).
    stable_file() {
      local n
      n="$(wc -c <"$OUT" 2>/dev/null || echo 0)"
      n="${n// /}"
      if [ "$n" -gt 0 ] && [ "$n" = "$LAST" ]; then return 0; fi
      LAST="$n"
      return 1
    }
    if ! wait_for stable_file; then
      echo "${MODE}를 만들지 못했습니다(${MAXWAIT}초 안에 끝나지 않음): $OUT" >&2
      exit 1
    fi
    echo "$OUT"
    ;;
  report)
    DOM="$(mktemp "${TMPDIR:-/tmp}/booklet-dom.XXXXXX")"
    "$CHROME" "${COMMON[@]}" --dump-dom "$URL" >"$DOM" 2>/dev/null &
    CHILD=$!
    # demo가 리포트를 다 찍으면 "__done" 표식이 들어간다(오류도 표식을 남긴다).
    if ! wait_for 'grep -q "\"__done\": 1" "$DOM" 2>/dev/null'; then
      echo "리포트를 얻지 못했습니다(${MAXWAIT}초 안에 #report가 완성되지 않음)." >&2
      head -c 1200 "$DOM" >&2
      rm -f "$DOM"
      exit 1
    fi
    python3 - "$DOM" <<'PY'
import html, re, sys
raw = open(sys.argv[1], encoding='utf-8', errors='replace').read()
ms = re.findall(r'<pre[^>]*\bid="report"[^>]*>(.*?)</pre>', raw, re.S)
m = None
for cand in ms:
    if '"__done": 1' in cand:
        m = cand
if m is None:
    sys.stderr.write('#report 요소를 찾지 못했습니다. 페이지가 끝까지 실행됐는지 확인하세요.\n')
    sys.stderr.write(raw[:1500] + '\n')
    sys.exit(1)
text = re.sub(r'<[^>]+>', '', m)
sys.stdout.write(html.unescape(text).strip() + '\n')
PY
    code=$?
    rm -f "$DOM"
    exit $code
    ;;
  *)
    echo "모드는 pdf · png · report 중 하나여야 합니다: $MODE" >&2
    exit 2
    ;;
esac
