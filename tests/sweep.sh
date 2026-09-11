#!/usr/bin/env bash
# sweep.sh — 붙여 두기·잘림 검산표. 픽스처(또는 프로젝트 JSON)를 격자별로 실시간 헤드리스 Chrome에 조판해
# pages / clipped / overflow / keepOrphans / passageOrphans / bandOrphans / shrunkForKeep 를 한 줄씩 찍는다.
#   사용: bash tests/sweep.sh [project.json] [grids...]
#   예:   bash tests/sweep.sh                       # 국어·화학 픽스처 × 1x1 1x2 2x1 2x2
#         bash tests/sweep.sh ~/내프로젝트.json 2x1  # 앱에서 [JSON 저장]한 파일을 그대로
# 기대: 2×1 이하 격자에서 keepOrphans·passageOrphans·bandOrphans·clipped 전부 0. 2×2는 칸이 작아 경고가 남을 수 있다.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO="file://$ROOT/tests/demo-real.html"
if [ $# -ge 1 ] && [ -f "$1" ]; then
  JSONS=("$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"); shift
else
  JSONS=("fixtures/project_kor.json" "fixtures/project_chem.json")
fi
GRIDS=("$@"); [ ${#GRIDS[@]} -eq 0 ] && GRIDS=(1x1 1x2 2x1 2x2)
printf '%-28s %-4s %5s %7s %8s %5s %8s %5s %7s\n' json grid pages clipped overflow keep passage band shrunk
for J in "${JSONS[@]}"; do
  for G in "${GRIDS[@]}"; do
    node "$ROOT/tests/cdp-report.mjs" "$DEMO?json=$J&grid=$G&sheet=problems" 300000 2>/dev/null | python3 -c '
import sys, json, os
raw = sys.stdin.read()
try:
    j = json.loads(raw[raw.index("{"):raw.rindex("}") + 1])
except Exception:
    print("%-28s %-4s  (리포트 없음)" % (os.path.basename(sys.argv[1]), sys.argv[2])); sys.exit(0)
g = lambda k: j.get(k) if j.get(k) is not None else "-"
print("%-28s %-4s %5s %7s %8s %5s %8s %5s %7s" % (os.path.basename(sys.argv[1])[:28], sys.argv[2], g("pages"), g("clipped"), g("overflow"), g("keepOrphans"), g("passageOrphans"), g("bandOrphans"), g("shrunkForKeep")))
' "$J" "$G"
  done
done
