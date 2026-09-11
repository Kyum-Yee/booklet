#!/usr/bin/env bash
# KaTeX 0.16.11을 cdnjs에서 vendor/katex/에 내려받는다(오프라인 file:// 실행용).
# 이미 받아둔 파일은 건너뛰고, curl 실패 시 안내 후 종료한다.
set -euo pipefail

VERSION="0.16.11"
BASE_URL="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/${VERSION}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${SCRIPT_DIR}/katex"

mkdir -p "${DEST}/contrib" "${DEST}/fonts"

# $1(url), $2(out): 필수 파일. 실패하면 즉시 종료한다.
fetch_required() {
  local url="$1" out="$2"
  if [ -f "$out" ]; then
    echo "건너뜀 (이미 있음): ${out#"$SCRIPT_DIR"/}"
    return 0
  fi
  echo "내려받는 중: ${url}"
  mkdir -p "$(dirname "$out")"
  if ! curl -fsSL "$url" -o "$out"; then
    echo "오류: ${url} 다운로드에 실패했습니다. 네트워크 연결이나 버전(${VERSION})을 확인하세요." >&2
    rm -f "$out"
    exit 1
  fi
}

# $1(url), $2(out): 선택 파일(폰트). cdnjs가 모든 확장자(.ttf 등)를 호스팅하지 않을 수 있으니
# 실패해도 경고만 남기고 나머지 폰트를 계속 받는다.
fetch_optional() {
  local url="$1" out="$2"
  if [ -f "$out" ]; then
    echo "건너뜀 (이미 있음): ${out#"$SCRIPT_DIR"/}"
    return 0
  fi
  echo "내려받는 중: ${url}"
  mkdir -p "$(dirname "$out")"
  if ! curl -fsSL "$url" -o "$out"; then
    echo "경고: ${url}은(는) 원격에 없어 건너뜁니다(woff/woff2가 있으면 동작에는 지장 없음)." >&2
    rm -f "$out"
    return 1
  fi
}

fetch_required "${BASE_URL}/katex.min.css" "${DEST}/katex.min.css"
fetch_required "${BASE_URL}/katex.min.js" "${DEST}/katex.min.js"
fetch_required "${BASE_URL}/contrib/auto-render.min.js" "${DEST}/contrib/auto-render.min.js"

# katex.min.css 안의 url(fonts/...) 참조를 전부 찾아 폰트 파일을 내려받는다.
FONT_FILES="$(grep -oE 'fonts/[A-Za-z0-9_.-]+\.(woff2?|ttf)' "${DEST}/katex.min.css" | sort -u)"

if [ -z "${FONT_FILES}" ]; then
  echo "경고: katex.min.css에서 폰트 참조를 찾지 못했습니다." >&2
else
  while IFS= read -r rel; do
    fetch_optional "${BASE_URL}/${rel}" "${DEST}/${rel}" || true
  done <<< "${FONT_FILES}"
fi

FONT_COUNT="$(find "${DEST}/fonts" -type f | wc -l | tr -d ' ')"
echo "완료: ${DEST} (폰트 파일 ${FONT_COUNT}개)"
