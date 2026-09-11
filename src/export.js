/**
 * export.js — 독립 실행 HTML 만들기와 인쇄.
 * index.html 원문을 가져와 styles/를 인라인으로 심고, src/ 모듈은 data: URL + import map으로 넣는다
 * (모듈 스코프 보존 — 파일 간 같은 이름이 있어도 충돌하지 않는다). 프로젝트 JSON도 함께 넣는다.
 */

const KATEX_CDN = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11";

/** 독립 HTML에 담을 스타일 (문서 순서 그대로). */
export const STYLE_FILES = ["styles/page.css", "styles/ui.css"];

/** 독립 HTML에 담을 모듈. import map 키는 `booklet/<이름>.js`. */
export const SRC_FILES = [
  ["format", "src/format.js"],
  ["options", "src/options.js"],
  ["rules", "src/rules.js"],
  ["ascii2svg", "src/ascii2svg.js"],
  ["numbering", "src/numbering.js"],
  ["units", "src/units.js"],
  ["parser", "src/parser.js"],
  ["render", "src/render.js"],
  ["toc", "src/toc.js"],
  ["sheets", "src/sheets.js"],
  ["layout", "src/layout.js"],
  ["store", "src/store.js"],
  ["export", "src/export.js"],
  ["app", "src/app.js"],
];

/**
 * 지금 열린 문서가 이미 독립 HTML인지 본다.
 * `booklet.py build`의 결과물(프로젝트가 심겨 있고 src/가 절대 경로)과
 * 이 파일이 만든 번들 한 장이 여기에 해당한다 — 다시 감쌀 필요가 없다.
 */
export function isEmbeddedStandalone() {
  if (typeof document === "undefined") return false;
  if (!document.getElementById("booklet-project")) return false;
  const tag = document.querySelector('script[type="module"][src]');
  if (!tag) return true;                                    // 인라인 번들만 남은 문서
  return /^[a-z][a-z0-9+.-]*:/i.test(tag.getAttribute("src") || "");  // file:///… 등 절대 경로
}

/** 앱이 놓인 폴더(…/booklet/)의 절대 URL. */
function baseUrl() {
  return new URL("../", import.meta.url).href;
}

let fetchOverride = null;
/** 테스트용: 파일 읽기 함수를 갈아 끼운다(node에서 fs로). */
export function setFetch(fn) { fetchOverride = fn; }

/** 텍스트 파일 하나를 가져온다. 실패는 그대로 던진다. */
async function fetchText(url) {
  if (typeof fetchOverride === "function") return fetchOverride(url);
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${url} — HTTP ${res.status}`);
  return res.text();
}

/** file:// 등으로 가져올 수 없을 때 보여 줄 안내. */
function serveHint(detail) {
  return new Error(
    "독립 HTML을 만들려면 앱 파일을 읽을 수 있어야 하는데, file://로 연 창에서는 브라우저가 막습니다. " +
    "`python3 booklet.py serve`로 연 뒤 다시 내보내거나, `python3 booklet.py build <폴더> -o out.html`을 쓰세요." +
    (detail ? ` (${detail})` : "")
  );
}

/** 지금 시각을 사용자 시간대의 `YYYY-MM-DD HH:MM+09:00` 꼴로 — UTC로 찍으면 "아침에 만든 파일이 새벽 파일"로 읽힌다. */
function localStamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}` +
    `${sign}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
}

/** UTF-8 문자열을 base64로(브라우저·node 공통). */
export function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** 모듈 안의 형제 지정자 "./x.js"(정적·동적 import 모두)를 import map 키 "booklet/x.js"로 바꾼다. */
export function rebaseSpecifiers(code, fileNames) {
  let out = code;
  for (const n of fileNames) {
    out = out.split(`"./${n}"`).join(`"booklet/${n}"`).split(`'./${n}'`).join(`'booklet/${n}'`);
  }
  return out;
}

/** 프로젝트 JSON을 <script>에 안전하게 넣을 문자열로 만든다. */
export function embedJson(project) {
  return JSON.stringify(project, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** 문자열을 정규식 치환의 특수문자($&, $1 …)로부터 지킨다. */
function literal(text) {
  return () => text;
}

/**
 * 프로젝트를 담은 독립 실행 HTML 한 장을 만든다.
 * fetch가 막히는 file://에서는 <template id="self-src">가 있으면 그것을 쓰고, 없으면 안내를 던진다.
 */
export async function toStandaloneHtml(project, opts = {}) {
  const base = opts.base || baseUrl();
  const warnings = [];

  // 1) index.html 원문
  let html = null;
  try {
    html = await fetchText(new URL("index.html", base).href);
  } catch (err) {
    const tpl = typeof document !== "undefined" ? document.getElementById("self-src") : null;
    if (tpl) html = tpl.innerHTML;
    else throw serveHint(err.message);
  }

  // 2) 스타일 인라인
  for (const path of STYLE_FILES) {
    let css = "";
    try {
      css = await fetchText(new URL(path, base).href);
    } catch (err) {
      warnings.push(`${path}를 넣지 못했습니다(${err.message}).`);
      continue;
    }
    const name = path.split("/").pop();
    const re = new RegExp(`<link[^>]*href="[^"]*${name.replace(".", "\\.")}"[^>]*>`, "i");
    const tag = `<style data-from="${name}">\n${css.replace(/<\/style/gi, "<\\/style")}\n</style>`;
    html = re.test(html) ? html.replace(re, literal(tag)) : html.replace(/<\/head>/i, literal(tag + "\n</head>"));
  }

  // 3) KaTeX는 CDN만 남긴다(vendor/ 폴더는 따라가지 않는다).
  html = html
    .replace(/<link[^>]*katex\.min\.css[^>]*>/i, literal(`<link rel="stylesheet" href="${KATEX_CDN}/katex.min.css">`))
    .replace(/<script[^>]*katex\.min\.js[^>]*><\/script>/i,
      literal(`<script defer src="${KATEX_CDN}/katex.min.js" onload="window.__katexArrived && window.__katexArrived();"></script>`))
    .replace(/<script[^>]*auto-render\.min\.js[^>]*><\/script>/i, '');

  // 4) 모듈마다 data: URL로 감싸고 import map으로 잇는다 — 모듈 스코프가 그대로 살아 이름 충돌이 없다.
  const fileNames = SRC_FILES.map(([, path]) => path.split("/").pop());
  const imports = {};
  for (const [name, path] of SRC_FILES) {
    let code = "";
    try {
      code = await fetchText(new URL(path, base).href);
    } catch (err) {
      warnings.push(`${path}를 넣지 못했습니다(${err.message}). 그 기능은 독립 HTML에서 빠집니다.`);
      continue;
    }
    imports[`booklet/${name}.js`] = "data:text/javascript;charset=utf-8;base64," + toBase64(rebaseSpecifiers(code, fileNames));
  }
  if (!imports["booklet/app.js"]) throw serveHint("src/app.js를 읽지 못했습니다");

  // 5) 모듈 script 태그를 프로젝트 JSON + import map + 진입 모듈로 갈아 끼운다.
  const importMap = JSON.stringify({ imports }).replace(/<\//g, "<\\/");
  const payload = [
    `<script id="booklet-project" type="application/json">${embedJson(project)}</script>`,
    `<script type="importmap">${importMap}</script>`,
    `<script type="module">import "booklet/app.js";</script>`,
  ].join("\n");
  const tagRe = /<script[^>]*src="src\/app\.js"[^>]*><\/script>/i;
  html = tagRe.test(html) ? html.replace(tagRe, literal(payload)) : html.replace(/<\/body>/i, literal(payload + "\n</body>"));

  // 빌드 스탬프(내보내기 탭이 보여 준다).
  const stamp = `<meta name="booklet-build" content="${localStamp()} export.js">`;
  html = /<meta name="booklet-build"/i.test(html)
    ? html.replace(/<meta name="booklet-build"[^>]*>/i, literal(stamp))
    : html.replace(/<\/head>/i, literal(stamp + "\n</head>"));

  if (warnings.length) {
    const note = `<!-- booklet 내보내기 경고\n${warnings.map((w) => " - " + w.replace(/--/g, "—")).join("\n")}\n-->`;
    html = html.replace(/<\/head>/i, literal(note + "\n</head>"));
    if (typeof console !== "undefined") for (const w of warnings) console.warn("[booklet]", w);
  }
  return html;
}

/** 브라우저 인쇄 대화상자를 연다(화면 UI는 page.css·ui.css가 감춘다). */
export function printBooklet() {
  if (typeof window === "undefined") return;
  const w = document.getElementById("warnings");
  if (w) w.hidden = true;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  window.print();
}
