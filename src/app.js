/**
 * app.js — UI 배선. 스토어 변경 → 디바운스 → 파싱 → 렌더러 주입 → 레이아웃 → 상태줄·경고.
 * 폼 컨트롤은 전부 data-path 경로 바인딩 하나로 읽고 쓴다(컨트롤별 핸들러 없음).
 * 아직 없는 모듈은 동적 import 실패를 경고로 보여 주고 앱은 계속 돈다.
 */

import { createStore, isImageFile, filesFromDataTransfer, byteLength, normalizePerPageRules } from "./store.js";
import {
  ALL_ENUMS, FONT_FAMILY, GRID, HEADER_TOKENS, IMAGE_SLOT, IMAGE_WIDTH, KEEP_KEYS,
  PAGE_SIZE, PROFILE_ID, RULE_SCOPE, SUBJECT, LIMITS as OPT_LIMITS,
  gridFromId, gridId, imageSlotOptions, omit, optionsHtml, pageMm,
} from "./options.js";
import { toStandaloneHtml, printBooklet, isEmbeddedStandalone } from "./export.js";

/* ─────────────────────────── 모듈 적재 ─────────────────────────── */

const MODULE_SPECS = [
  ["format", "./format.js"],
  ["rules", "./rules.js"],
  ["parser", "./parser.js"],
  ["render", "./render.js"],
  ["units", "./units.js"],
  ["ascii2svg", "./ascii2svg.js"],
  ["layout", "./layout.js"],
];

const M = Object.create(null);
const missingModules = [];

/** 형제 모듈을 동적으로 불러온다(독립 HTML에서는 이미 심어 둔 것을 쓴다). */
async function loadModules() {
  const pre = globalThis.__BOOKLET_MODULES__;
  if (pre) {
    for (const [name] of MODULE_SPECS) M[name] = pre[name] || null;
    return;
  }
  await Promise.all(MODULE_SPECS.map(async ([name, path]) => {
    try {
      M[name] = await import(path);
    } catch (err) {
      M[name] = null;
      missingModules.push(`${name}.js를 불러오지 못했습니다(${String(err && err.message || err).split("\n")[0]}). 그 기능은 잠시 멈춥니다.`);
    }
  }));
}

/** 모듈 함수를 안전하게 꺼낸다. 없으면 한국어 오류를 던진다. */
function fn(mod, name) {
  const m = M[mod];
  if (!m || typeof m[name] !== "function") {
    throw new Error(`${mod}.js의 ${name}()가 아직 없습니다.`);
  }
  return m[name];
}

/** 모듈 함수가 준비됐는지만 본다. */
function has(mod, name) {
  return !!(M[mod] && typeof M[mod][name] === "function");
}

/* ─────────────────────────── DOM 도구 ─────────────────────────── */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** HTML 특수문자를 막는다. */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** 태그·속성·자식으로 요소를 만든다. */
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "class") node.className = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of [].concat(children)) if (c) node.append(c);
  return node;
}

/** select에 옵션을 채우고 현재 값을 고른다. */
function fillSelect(sel, options, value) {
  sel.textContent = "";
  for (const opt of options) {
    const o = typeof opt === "string" ? { value: opt, label: opt } : opt;
    sel.append(el("option", { value: o.value, text: o.label }));
  }
  sel.value = value != null ? String(value) : "";
  if (sel.selectedIndex < 0 && sel.options.length) sel.selectedIndex = 0;
}

/** 아래쪽에 잠깐 뜨는 알림. */
let toastTimer = null;
function toast(msg, kind = "") {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast" + (kind ? " " + kind : "");
  t.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}

/** 바이트를 사람 눈금으로. */
function humanSize(n) {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** Blob을 파일로 내려받는다(브라우저가 막으면 새 탭). */
function download(filename, text, mime = "application/json") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** 문자열 앞머리만 잘라 보여 준다. */
function head(text, n) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/* ─────────────────────────── 전역 상태 ─────────────────────────── */

/**
 * options.js의 선택지 사전. 독립 HTML 번들은 모든 모듈을 한 스코프에 이어 붙이며
 * `import * as`를 지워 버리므로, 이름공간을 여기서 손으로 엮어 둔다.
 */
const OPT = {
  ALL_ENUMS, FONT_FAMILY, GRID, HEADER_TOKENS, IMAGE_SLOT, IMAGE_WIDTH, KEEP_KEYS,
  LIMITS: OPT_LIMITS, PAGE_SIZE, PROFILE_ID, RULE_SCOPE, SUBJECT,
  gridFromId, gridId, imageSlotOptions, omit, optionsHtml, pageMm,
};

/** options.js의 { id, label } 목록을 fillSelect가 먹는 { value, label }로 옮긴다. */
function asOptions(list) {
  return list.map((v) => ({ value: v.id, label: v.label }));
}

/** 배치 표에 펼쳐 보일 도형 자리 수(문항 하나에 도형이 이보다 많으면 앞의 것만 고를 수 있다). */
const FIGURE_SLOTS = 3;

// 선택지·과목·슬롯·범위는 전부 options.js가 갖는다 — 여기 목록을 다시 적지 않는다.
const SLOTS = asOptions(OPT.imageSlotOptions(FIGURE_SLOTS));
const SCOPES = asOptions(OPT.RULE_SCOPE.values);

const store = createStore();
let doc = null;              // parseProject 결과
let buildIndex = null;       // buildBooklet의 index
let buildStats = null;
let pageCount = 0;
let issues = [];             // 화면에 보여 줄 경고 목록
let issueSeen = new Set();   // 같은 문장을 두 번 싣지 않기 위한 체
let buildToken = 0;
let buildTimer = null;
let selectedUnit = null;     // 소단원 순서를 편집 중인 대단원
let profileDraftId = null;   // 편집 중인 프로파일 id
let builtWithKatex = false;  // 마지막 조판이 KaTeX를 쥐고 끝났는지
let katexRetried = false;    // 늦게 온 KaTeX로 다시 짜기는 딱 한 번만

const params = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams("");
const DEBUG = params.get("debug") === "1";
const READONLY = params.get("readonly") === "1";

/* ─────────────────────────── 경로 바인딩 ─────────────────────────── */

/** data-type에 따라 컨트롤에서 값을 읽는다. */
function readControl(node) {
  const type = node.dataset.type || "string";
  if (type === "bool") return !!node.checked;
  if (type === "number") {
    const v = parseFloat(node.value);
    return Number.isFinite(v) ? v : 0;
  }
  if (type === "lines") return node.value.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (type === "list") return node.value.split(",").map((s) => s.trim()).filter(Boolean);
  if (type === "page") {
    if (node.value !== "custom") return node.value;
    const cur = store.getPath("layout.page");
    return typeof cur === "object" && cur ? { ...cur } : OPT.pageMm(OPT.PAGE_SIZE.default);
  }
  return node.value;
}

/** data-type에 따라 컨트롤에 값을 써 넣는다. */
function writeControl(node, value) {
  const type = node.dataset.type || "string";
  if (type === "bool") { node.checked = !!value; return; }
  if (type === "lines") { node.value = Array.isArray(value) ? value.join("\n") : String(value || ""); return; }
  if (type === "list") { node.value = Array.isArray(value) ? value.join(", ") : String(value || ""); return; }
  if (type === "page") {
    node.value = typeof value === "object" && value
      ? OPT.PAGE_SIZE.customId
      : String(value || OPT.PAGE_SIZE.default);
    return;
  }
  node.value = value === null || value === undefined ? "" : String(value);
}

/** 사이드바 전체를 훑어 현재 프로젝트 값을 컨트롤에 반영한다(입력 중인 칸은 건드리지 않는다). */
function syncControls() {
  for (const node of $$("[data-path]")) {
    if (node === document.activeElement) continue;
    writeControl(node, store.getPath(node.dataset.path));
  }
  syncDerivedControls();
}

/** 경로 바인딩만으로 안 되는 몇 개(용지 사용자 지정·글꼴 프리셋·격자 버튼)를 맞춘다. */
function syncDerivedControls() {
  const page = store.getPath("layout.page");
  $("#page-custom").hidden = typeof page !== "object";

  const family = store.getPath("layout.font.family") || "";
  const preset = $("#font-preset");
  const known = Array.from(preset.options).some((o) => o.value === family);
  preset.value = known ? family : "__custom";
  $("#font-custom-row").hidden = known;

  const g = store.getPath("layout.grid") || OPT.gridFromId(OPT.GRID.default);
  const gid = OPT.gridId(g);
  for (const b of $$("#grid-btns .gb")) b.classList.toggle("is-on", b.dataset.grid === gid);
}

/** 입력·변경 한 번을 스토어 경로 한 곳에 쓴다. */
function onControlEdit(ev) {
  const node = ev.target.closest("[data-path]");
  if (!node) return;
  const path = node.dataset.path;
  // 용지가 프리셋 문자열인 채로 layout.page.w를 건드리면 치수 객체로 바꿔 준다.
  if (path.startsWith("layout.page.")) {
    const cur = store.getPath("layout.page");
    if (typeof cur === "string") store.setPath("layout.page", OPT.pageMm(cur), "page");
  }
  store.setPath(path, readControl(node), "control");
  if (path === "layout.page" || path === "layout.font.family" || path === "layout.grid") syncDerivedControls();
}

/* ─────────────────────────── 파이프라인 ─────────────────────────── */

/** 300ms 뒤에 한 번만 다시 조판한다. */
function scheduleBuild() {
  if (buildTimer) clearTimeout(buildTimer);
  buildTimer = setTimeout(() => { buildTimer = null; rebuild(); }, 300);
}

/** 문항·도형별 표시 모드를 overrides → layout.figure.mode 순으로 정한다. */
function figureMode(problemKey, idx) {
  const project = store.get();
  const ov = project.overrides && project.overrides[problemKey];
  const per = ov && ov.figures && ov.figures[String(idx)];
  return per || (project.layout.figure && project.layout.figure.mode) || "svg";
}

/** 프로젝트에 규칙이 없으면 기본 규칙을 쓴다. */
function effectiveRules() {
  const project = store.get();
  if (project.rules && project.rules.length) return project.rules;
  return (M.rules && M.rules.DEFAULT_RULES) || [];
}

/** 이미지에 치수가 비어 있으면 채워 넣는다(레이아웃 측정 오차를 막는다). */
async function ensureImageDims() {
  const project = store.get();
  const pending = (project.images || []).filter((im) => im.dataUrl && (!im.width || !im.height));
  if (!pending.length) return;
  for (const im of pending) {
    const dim = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = im.dataUrl;
    });
    im.width = dim.width;
    im.height = dim.height;
  }
}

/** 경고 목록을 비운다(조판 한 번마다 처음부터 다시 쌓는다). */
function resetIssues() {
  issues = [];
  issueSeen = new Set();
}

/**
 * 경고 한 줄을 목록에 싣는다. 같은 문장은 한 번만 실린다 —
 * 파서 경고는 doc.warnings와 layout의 반환 경고에 함께 들어 있기 때문이다.
 */
function addIssue(text, kind) {
  const t = String(text == null ? "" : text).trim();
  if (!t || issueSeen.has(t)) return;
  issueSeen.add(t);
  issues.push({ text: t, kind: kind || "etc" });
}

/** Map이든 객체든 JSON에 담을 수 있는 평범한 객체로 바꾼다. */
function plainFromMap(value) {
  if (value instanceof Map) return Object.fromEntries(value);
  if (value && typeof value === "object") return { ...value };
  return {};
}

/** 소스 요약에 적힌(없으면 프로젝트에 적힌) 프로파일 id. */
function profileIdOf(summary) {
  if (summary && summary.profileId) return summary.profileId;
  const src = store.get().sources.find((s) => s.id === (summary && summary.id));
  return (src && src.profileId) || "batch";
}

/** ?debug=1일 때만 조판 요약을 #report에 JSON으로 적는다(헤드리스 검증 통로). */
function writeReport(ms) {
  const pre = $("#report");
  if (!pre) return;
  if (!DEBUG) { pre.textContent = ""; return; }
  const ix = buildIndex || {};
  pre.textContent = JSON.stringify({
    pages: pageCount,
    problems: doc && doc.problems ? doc.problems.length : 0,
    sources: ((doc && doc.sources) || []).map((s) => ({
      name: s.name,
      count: s.count || 0,
      profileId: profileIdOf(s),
    })),
    warnings: issues.map((i) => i.text),
    index: {
      problemPage: plainFromMap(ix.problemPage),
      unitPage: plainFromMap(ix.unitPage),
      subunitPage: plainFromMap(ix.subunitPage),
      answersPage: ix.answersPage === undefined ? null : ix.answersPage,
      explanationsPage: ix.explanationsPage === undefined ? null : ix.explanationsPage,
      tocPages: Array.isArray(ix.tocPages) ? ix.tocPages : [],
    },
    stats: buildStats,
    ms,
  }, null, 2);
}

/** 파싱 → 렌더러 주입 → 레이아웃 → 상태 갱신. 어디서 터져도 앱은 살아 있다. */
async function rebuild() {
  const my = ++buildToken;
  const t0 = (typeof performance !== "undefined" ? performance : Date).now();
  const project = store.get();
  const mount = $("#preview");
  resetIssues();
  for (const text of missingModules) addIssue(text, "module");
  for (const text of store.getWarnings()) addIssue(text, "store");

  if (!project.sources.length) {
    doc = null;
    pageCount = 0;
    buildIndex = null;
    mount.textContent = "";
    $("#empty-hint").hidden = false;
    paintStatus();
    paintWarnings();
    writeReport(0);
    return;
  }
  $("#empty-hint").hidden = true;

  await ensureImageDims();

  // 1) 파싱
  try {
    doc = fn("parser", "parseProject")(project);
  } catch (err) {
    doc = null;
    addIssue(`파싱에 실패했습니다: ${err.message}`, "parse");
  }
  if (my !== buildToken) return;

  if (doc) {
    // doc.warnings가 최종 문장이다(소스 이름·문항 키 접두는 파서가 이미 붙였다).
    // sources[].warnings·problems[].warnings는 같은 내용의 원문이므로 여기서 다시 붙이지 않는다 —
    // 붙이면 "batch-1.md: batch-1.md: …"처럼 접두가 겹친다.
    for (const w of doc.warnings || []) addIssue(w, "parse");

    // 2) 렌더러·컨텍스트 주입
    doc.renderers = {
      renderProblem: has("render", "renderProblem") ? M.render.renderProblem : null,
      renderExplanation: has("render", "renderExplanation") ? M.render.renderExplanation : null,
      renderAnswerTable: has("render", "renderAnswerTable") ? M.render.renderAnswerTable : null,
      groupByUnits: has("units", "groupByUnits") ? M.units.groupByUnits : null,
      asciiToSvg: has("ascii2svg", "asciiToSvg") ? M.ascii2svg.asciiToSvg : null,
    };
    doc.figureMode = figureMode;
    doc.ctx = {
      settings: project.layout,
      rules: effectiveRules(),
      images: project.images,
      imagePlacements: project.imagePlacements,
      figureMode,
      tocLabel: null,
    };

    // 3) 조판
    try {
      const res = await fn("layout", "buildBooklet")(doc, project, mount);
      if (my !== buildToken) return;
      pageCount = res && res.stats && res.stats.pages != null ? res.stats.pages : (res && res.pages ? res.pages.length : 0);
      buildIndex = res ? res.index : null;
      buildStats = res && res.stats ? res.stats : null;
      builtWithKatex = !!(typeof window !== "undefined" && window.katex);
      for (const w of (res && res.warnings) || []) addIssue(w, "layout");
    } catch (err) {
      pageCount = 0;
      addIssue(`조판 중 오류가 났습니다: ${err.message}`, "layout");
      if (!mount.childElementCount) {
        mount.append(el("div", { class: "build-fail", text: "조판을 마치지 못했습니다. 아래 경고를 확인하세요." }));
      }
    }
  }

  if (my !== buildToken) return;
  applyZoom(store.getUi().zoom);
  paintStatus();
  paintWarnings();
  refreshUnitTable();
  refreshPlacements();
  refreshDataLists();
  refreshUnitOrder();
  refreshFileBadges();
  const t1 = (typeof performance !== "undefined" ? performance : Date).now();
  writeReport(Math.round(t1 - t0));
}

/**
 * CDN이 늦어 첫 조판이 KaTeX 없이 끝났으면, 도착 신호를 받아 딱 한 번 다시 짠다.
 * 4초 타임아웃 뒤에 온 KaTeX도 이 길로 들어온다.
 */
function wireLateKatex() {
  if (typeof window === "undefined") return;
  window.addEventListener("katex-loaded", () => {
    if (katexRetried || builtWithKatex) return;
    katexRetried = true;
    toast("수식 글꼴이 늦게 도착해 다시 조판합니다.");
    rebuild();
  });
}

/* ─────────────────────────── 상태줄·경고 ─────────────────────────── */

/** 상태줄 숫자와 저장 용량을 다시 그린다. */
function paintStatus() {
  const project = store.get();
  $("#st-sources").textContent = String(project.sources.filter((s) => s.enabled).length);
  $("#st-problems").textContent = String(doc && doc.problems ? doc.problems.length : 0);
  $("#st-pages").textContent = String(pageCount);
  $("#st-warnings").textContent = String(issues.length);
  $("#st-warnings-btn").classList.toggle("has", issues.length > 0);

  const st = store.getStatus();
  const bytes = st.bytes || byteLength(JSON.stringify(project));
  $("#storage-info").textContent =
    `저장 용량: ${humanSize(bytes)} / 4 MB${st.imagesDropped ? " — 이미지는 빼고 저장 중" : ""}${st.error ? ` — 저장 실패(${st.error})` : ""}`;
}

/** 경고 패널 목록을 다시 그린다. 문항 키는 눌러서 해당 쪽으로 간다. */
function paintWarnings() {
  const list = $("#w-list");
  list.textContent = "";
  $("#w-count").textContent = String(issues.length);
  for (const issue of issues) {
    const m = /^([A-Za-z0-9_]+#\d+)\s*[:：]?\s*(.*)$/s.exec(issue.text);
    const li = el("li", { class: `w-item w-${issue.kind || "etc"}` });
    if (m) {
      li.append(el("button", { type: "button", class: "w-key", text: m[1], onclick: () => jumpTo(m[1]) }));
      li.append(el("span", { class: "w-text", text: m[2] }));
    } else {
      li.append(el("span", { class: "w-text", text: issue.text }));
    }
    list.append(li);
  }
  if (!issues.length) list.append(el("li", { class: "w-item", text: "경고가 없습니다." }));
}

/** 문항 키로 미리보기를 굴려 가고 잠깐 강조한다. */
function jumpTo(key) {
  const target = $(`#preview .q[data-q="${CSS.escape(key)}"]`) || $(`#preview [data-q="${CSS.escape(key)}"]`);
  if (!target) { toast(`${key} 문항을 미리보기에서 찾지 못했습니다.`); return; }
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("hl");
  setTimeout(() => target.classList.remove("hl"), 1600);
}

/* ─────────────────────────── 파일 탭 ─────────────────────────── */

/** 소스 목록 표를 다시 그린다. */
function refreshFileList() {
  const project = store.get();
  const tb = $("#file-list").tBodies[0];
  tb.textContent = "";
  const profileOptions = sourceProfileOptions();

  project.sources.forEach((s, i) => {
    const tr = el("tr", { "data-src": s.id });
    tr.append(el("td", { class: "ord" }, [
      el("button", { type: "button", class: "mini", title: "위로", text: "↑", disabled: i === 0, onclick: () => { store.moveSource(s.id, -1); refreshFileList(); } }),
      el("button", { type: "button", class: "mini", title: "아래로", text: "↓", disabled: i === project.sources.length - 1, onclick: () => { store.moveSource(s.id, 1); refreshFileList(); } }),
    ]));
    tr.append(el("td", {}, [
      el("input", {
        type: "checkbox", checked: s.enabled, title: "이 파일을 쓸지",
        onchange: (e) => store.update((p) => { p.sources.find((x) => x.id === s.id).enabled = e.target.checked; }, "src-enabled"),
      }),
    ]));
    tr.append(el("td", { class: "nm" }, [el("span", { class: "fname", title: s.name, text: s.name })]));
    tr.append(el("td", {}, [
      el("select", {
        title: "과목",
        onchange: (e) => store.update((p) => { p.sources.find((x) => x.id === s.id).subject = e.target.value; }, "src-subject"),
      }),
    ]));
    tr.append(el("td", {}, [
      el("select", {
        title: "포맷 프로파일",
        onchange: (e) => store.update((p) => { p.sources.find((x) => x.id === s.id).profileId = e.target.value; }, "src-profile"),
      }),
    ]));
    tr.append(el("td", {}, [
      el("button", {
        type: "button", class: "mini danger", title: "지우기", text: "✕",
        onclick: () => { if (confirm(`“${s.name}”을(를) 목록에서 지울까요?`)) { store.removeSource(s.id); refreshFileList(); } },
      }),
    ]));
    fillSelect(tr.children[3].firstChild, asOptions(OPT.SUBJECT.values), s.subject);
    fillSelect(tr.children[4].firstChild, profileOptions, s.profileId || "auto");
    tr.classList.add("src-main");
    tb.append(tr);
    // 요약은 제 줄을 갖는다 — 이름·선택 상자에 끼면 두 줄로 접힌다.
    tb.append(el("tr", { class: "src-sum", "data-sum": s.id }, [
      el("td", { colspan: 6 }, [el("span", { class: "badge", "data-badge": s.id, text: "—" })]),
    ]));
  });

  refreshFileBadges();
  refreshSourceSelects();
}

/** 소스 하나의 한 줄 요약을 만든다 — "문항 n · 경고 m · 프로파일 X". */
function sourceSummaryText(info) {
  const parts = [`문항 ${info.count}`];
  parts.push(`경고 ${info.warn}`);
  parts.push(`프로파일 ${info.profileLabel}`);
  return parts.join(" · ");
}

/** 프로파일 id를 사람이 읽는 이름으로. 자동 판별이면 "자동→고른 것"으로 보여 준다. */
function profileLabelOf(askedId, detectedId) {
  const builtin = (M.format && M.format.BUILTIN_PROFILES) || {};
  const named = (id) => {
    const b = builtin[id];
    if (b) return b.name && b.name.length <= 14 ? b.name : id;
    const user = store.get().profiles.find((p) => p.id === id);
    return user ? (user.name || user.id) : id;
  };
  if (askedId !== "auto") return named(askedId || "batch");
  return detectedId && detectedId !== "auto" ? `자동→${named(detectedId)}` : "자동";
}

/** 소스별 문항 수·경고 수·프로파일 한 줄 요약을 채운다(0문항은 회색). */
function refreshFileBadges() {
  const info = new Map();
  for (const s of store.get().sources) {
    info.set(s.id, { count: 0, warn: 0, asked: s.profileId || "batch", detected: null, parsed: false });
  }
  if (doc) {
    for (const s of doc.sources || []) {
      const cur = info.get(s.id) || { count: 0, warn: 0, asked: "batch", detected: null };
      cur.count = s.count || 0;
      cur.warn = (s.warnings || []).length;
      cur.detected = s.profileId || null;
      cur.parsed = true;
      info.set(s.id, cur);
    }
  }
  for (const badge of $$("#file-list .badge")) {
    const c = info.get(badge.dataset.badge);
    if (!c) { badge.textContent = "—"; continue; }
    c.profileLabel = profileLabelOf(c.asked, c.detected);
    badge.textContent = c.parsed ? sourceSummaryText(c) : `프로파일 ${c.profileLabel} · 아직 읽지 않음`;
    badge.classList.toggle("warn", c.warn > 0);
    const zero = c.parsed && c.count === 0;
    for (const row of $$(`#file-list [data-src="${CSS.escape(badge.dataset.badge)}"], #file-list [data-sum="${CSS.escape(badge.dataset.badge)}"]`)) {
      row.classList.toggle("zero", zero);
    }
  }
  const project = store.get();
  const total = doc && doc.problems ? doc.problems.length : 0;
  const empty = [...info.values()].filter((c) => c.parsed && c.count === 0).length;
  $("#file-summary").textContent = project.sources.length
    ? `파일 ${project.sources.length}개 · 활성 ${project.sources.filter((s) => s.enabled).length}개 · `
      + `문항 ${total}개 · 경고 ${issues.length}개${empty ? ` · 문항 없는 파일 ${empty}개` : ""}`
    : "불러온 파일이 없습니다.";
}

/** 프로파일 선택지(내장 + 사용자). 내장 목록은 BUILTIN_PROFILES 키를 그대로 훑는다. */
function profileOptionList() {
  const builtin = M.format && M.format.BUILTIN_PROFILES ? M.format.BUILTIN_PROFILES : {};
  const out = Object.keys(builtin).map((id) => ({ value: id, label: `${builtin[id].name || id} (내장)` }));
  // format.js가 아직 안 왔으면 options.js가 적어 둔 내장 목록으로 버틴다.
  if (!out.length) out.push(...asOptions(OPT.omit(OPT.PROFILE_ID, OPT.PROFILE_ID.default)));
  for (const p of store.get().profiles) out.push({ value: p.id, label: `${p.name || p.id} (사용자)` });
  return out;
}

/** 소스에 물릴 프로파일 선택지 — 맨 앞이 기본값인 "자동"이다. */
function sourceProfileOptions() {
  const auto = OPT.PROFILE_ID.byId[OPT.PROFILE_ID.default];
  return [{ value: auto.id, label: auto.label }].concat(profileOptionList());
}

/** 소스를 고르는 select들(일괄 지정·테스트 파싱)을 채운다. */
function refreshSourceSelects() {
  const opts = store.get().sources.map((s) => ({ value: s.id, label: s.name }));
  for (const sel of [$("#bulk-source"), $("#prof-test-source")]) {
    const keep = sel.value;
    fillSelect(sel, opts.length ? opts : [{ value: "", label: "— 파일 없음 —" }], keep);
  }
}

/* ─────────────────────────── 단원·번호 탭 ─────────────────────────── */

/** 대단원·소단원 제안 목록을 datalist에 채운다. */
function refreshDataLists() {
  const units = new Set();
  const subs = new Set();
  for (const p of (doc && doc.problems) || []) {
    if (p.unit) units.add(p.unit);
    if (p.subunit) subs.add(p.subunit);
  }
  for (const v of Object.values(store.get().units.map || {})) {
    if (v && v.unit) units.add(v.unit);
    if (v && v.subunit) subs.add(v.subunit);
  }
  $("#dl-units").innerHTML = [...units].map((u) => `<option value="${esc(u)}">`).join("");
  $("#dl-subunits").innerHTML = [...subs].map((u) => `<option value="${esc(u)}">`).join("");
}

/** units.map의 한 칸을 고친다(빈 문자열이면 지운다). */
function setUnitMap(key, field, value) {
  store.update((p) => {
    const cur = p.units.map[key] || {};
    if (value) cur[field] = value; else delete cur[field];
    if (Object.keys(cur).length) p.units.map[key] = cur;
    else delete p.units.map[key];
  }, "units-map");
}

/** 문항 표를 다시 그린다(단원·번호 탭이 보일 때만). */
function refreshUnitTable() {
  const panel = $("#panel-units");
  if (panel.hidden) return;
  const tb = $("#unit-table").tBodies[0];
  tb.textContent = "";
  const project = store.get();
  const problems = (doc && doc.problems) || [];
  if (!problems.length) {
    tb.append(el("tr", {}, [el("td", { colspan: 8, class: "muted", text: "문항이 없습니다." })]));
    return;
  }
  const frag = document.createDocumentFragment();
  for (const p of problems) {
    const ov = project.overrides[p.key] || {};
    const mapped = project.units.map[p.key] || project.units.map[`${p.sourceId}#*`] || {};
    const tr = el("tr", { "data-q": p.key });
    tr.append(el("td", { class: "num", text: p.num == null ? "—" : String(p.num) }));
    tr.append(el("td", { class: "muted", text: p.srcNum || "—" }));
    // 제목은 원문에 있을 때만 나온다(레이아웃에 실릴지는 배치 탭의 "문항 제목 표시"가 정한다).
    tr.append(el("td", {
      class: p.title ? "ttl" : "ttl muted",
      title: p.title || "원문에 제목이 없습니다",
      text: p.title ? head(p.title, 28) : "—",
    }));
    tr.append(el("td", { class: "muted", title: p.key, text: p.sourceId }));
    tr.append(el("td", { class: "muted", text: p.subject || "—" }));
    tr.append(el("td", {}, [el("input", {
      type: "text", list: "dl-units", value: mapped.unit || p.unit || "", placeholder: "대단원",
      onchange: (e) => setUnitMap(p.key, "unit", e.target.value.trim()),
    })]));
    tr.append(el("td", {}, [el("input", {
      type: "text", list: "dl-subunits", value: mapped.subunit || p.subunit || "", placeholder: "소단원",
      onchange: (e) => setUnitMap(p.key, "subunit", e.target.value.trim()),
    })]));
    tr.append(el("td", {}, [el("input", {
      type: "checkbox", checked: !!ov.exclude, title: "이 문항을 빼기",
      onchange: (e) => store.update((pr) => {
        const o = pr.overrides[p.key] || (pr.overrides[p.key] = {});
        o.exclude = e.target.checked;
      }, "override-exclude"),
    })]));
    tr.addEventListener("dblclick", () => jumpTo(p.key));
    frag.append(tr);
  }
  tb.append(frag);
}

/** 대단원 순서 목록과 선택된 대단원의 소단원 순서를 다시 그린다. */
function refreshUnitOrder() {
  const panel = $("#panel-units");
  if (panel.hidden) return;
  const project = store.get();
  const seen = [];
  for (const p of (doc && doc.problems) || []) {
    const u = p.unit || "";
    if (!seen.includes(u)) seen.push(u);
  }
  const order = project.units.order.filter((u) => seen.includes(u)).concat(seen.filter((u) => !project.units.order.includes(u)));

  const ol = $("#unit-order");
  ol.textContent = "";
  order.forEach((u, i) => {
    const li = el("li", { class: "ord-item" + (u === selectedUnit ? " is-on" : "") }, [
      el("button", { type: "button", class: "ord-name", text: u || "(단원 없음)", onclick: () => { selectedUnit = u; refreshUnitOrder(); } }),
      el("button", { type: "button", class: "mini", text: "↑", disabled: i === 0, onclick: () => moveInOrder("units.order", order, i, -1) }),
      el("button", { type: "button", class: "mini", text: "↓", disabled: i === order.length - 1, onclick: () => moveInOrder("units.order", order, i, 1) }),
    ]);
    ol.append(li);
  });
  if (!order.length) ol.append(el("li", { class: "muted", text: "문항을 넣으면 대단원이 나타납니다." }));

  const sub = $("#subunit-order");
  sub.textContent = "";
  if (selectedUnit === null) {
    $("#subunit-order-note").textContent = "대단원을 고르면 소단원 순서를 바꿀 수 있습니다.";
    return;
  }
  $("#subunit-order-note").textContent = `“${selectedUnit || "(단원 없음)"}”의 소단원 순서`;
  const subsSeen = [];
  for (const p of (doc && doc.problems) || []) {
    if ((p.unit || "") !== selectedUnit) continue;
    const s = p.subunit || "";
    if (!subsSeen.includes(s)) subsSeen.push(s);
  }
  const savedSub = (project.units.suborder && project.units.suborder[selectedUnit]) || [];
  const subOrder = savedSub.filter((s) => subsSeen.includes(s)).concat(subsSeen.filter((s) => !savedSub.includes(s)));
  subOrder.forEach((s, i) => {
    sub.append(el("li", { class: "ord-item" }, [
      el("span", { class: "ord-name", text: s || "(소단원 없음)" }),
      el("button", { type: "button", class: "mini", text: "↑", disabled: i === 0, onclick: () => moveSubOrder(subOrder, i, -1) }),
      el("button", { type: "button", class: "mini", text: "↓", disabled: i === subOrder.length - 1, onclick: () => moveSubOrder(subOrder, i, 1) }),
    ]));
  });
}

/** 순서 배열의 한 칸을 옮겨 저장한다. */
function moveInOrder(path, arr, i, delta) {
  const next = arr.slice();
  const j = i + delta;
  if (j < 0 || j >= next.length) return;
  next.splice(j, 0, next.splice(i, 1)[0]);
  store.setPath(path, next, "order");
  refreshUnitOrder();
}

/** 소단원 순서를 옮겨 저장한다. */
function moveSubOrder(arr, i, delta) {
  const next = arr.slice();
  const j = i + delta;
  if (j < 0 || j >= next.length) return;
  next.splice(j, 0, next.splice(i, 1)[0]);
  store.update((p) => { p.units.suborder[selectedUnit] = next; }, "suborder");
  refreshUnitOrder();
}

/* ─────────────────────────── 규칙 탭 ─────────────────────────── */

/** 프로파일 select와 편집기를 다시 그린다. */
function refreshProfiles() {
  const sel = $("#prof-select");
  const keep = sel.value;
  fillSelect(sel, profileOptionList(), keep);
  showProfileJson(sel.value);
  refreshSourceSelects();
}

/** 고른 프로파일의 JSON을 편집기에 보여 준다(내장은 읽기 전용). */
function showProfileJson(id) {
  const ta = $("#prof-json");
  const project = store.get();
  const user = project.profiles.find((p) => p.id === id);
  const builtin = M.format && M.format.BUILTIN_PROFILES ? M.format.BUILTIN_PROFILES[id] : null;
  const src = user || builtin;
  profileDraftId = user ? id : null;
  ta.value = src ? JSON.stringify(user ? user : (builtin.json || builtin), null, 2) : "";
  ta.readOnly = !user;
  ta.classList.toggle("ro", !user);
  $("#btn-prof-delete").disabled = !user;
  $("#btn-prof-save").disabled = !user;
  $("#prof-result").textContent = user ? "" : "내장 프로파일입니다. [복제해서 편집]을 눌러 사본을 만드세요.";
}

/** 편집기 내용을 검증해 결과를 보여 준다. */
function validateProfileDraft() {
  const box = $("#prof-result");
  let json;
  try {
    json = JSON.parse($("#prof-json").value);
  } catch (err) {
    box.className = "result bad";
    box.textContent = `JSON 형식이 잘못됐습니다: ${err.message}`;
    return null;
  }
  if (!has("format", "validateProfile")) {
    box.className = "result";
    box.textContent = "format.js가 아직 없어 형식만 확인했습니다(JSON은 올바릅니다).";
    return json;
  }
  const res = M.format.validateProfile(json);
  if (res.ok) {
    box.className = "result good";
    box.textContent = "검증을 통과했습니다.";
  } else {
    box.className = "result bad";
    box.textContent = res.errors.map((e) => `${e.field}: ${e.message}`).join("\n");
  }
  return res.ok ? json : null;
}

/** 고른 소스 하나를 편집 중인 프로파일로 파싱해 결과 요약을 보여 준다. */
function testParse() {
  const box = $("#prof-result");
  const srcId = $("#prof-test-source").value;
  const source = store.get().sources.find((s) => s.id === srcId);
  if (!source) { box.className = "result bad"; box.textContent = "테스트할 소스를 먼저 넣으세요."; return; }
  let json = null;
  try { json = JSON.parse($("#prof-json").value); } catch { json = null; }
  try {
    const compiled = json && has("format", "compileProfile")
      ? M.format.compileProfile(json)
      : fn("format", "resolveProfile")(store.get(), source.profileId);
    const res = fn("parser", "parseSource")(source, compiled, {});
    const first = res.problems[0];
    const lines = [
      `문항 ${res.problems.length}개 · 경고 ${(res.warnings || []).length}개`,
      first
        ? `첫 문항: ${first.srcNum || first.num || "?"}번 · 선지 ${first.choices.length}개 · 정답 ${first.answer ? first.answer.raw : "없음"}`
        : "첫 문항을 찾지 못했습니다.",
      first ? `발문: ${head((first.stem.find((b) => b.type === "p") || {}).text, 60)}` : "",
      ...(res.warnings || []).slice(0, 5),
    ];
    box.className = "result good";
    box.textContent = lines.filter(Boolean).join("\n");
  } catch (err) {
    box.className = "result bad";
    box.textContent = `테스트 파싱에 실패했습니다: ${err.message}`;
  }
}

/** 프로젝트 규칙이 비어 있으면 기본 규칙을 복사해 넣는다(켜고 끄기를 하려면 필요하다). */
function materializeRules() {
  const project = store.get();
  if (project.rules && project.rules.length) return project.rules;
  const base = (M.rules && M.rules.DEFAULT_RULES) || [];
  const copy = JSON.parse(JSON.stringify(base));
  store.setPath("rules", copy, "rules-init");
  return copy;
}

/** 인라인 규칙 표를 다시 그린다. */
function refreshRuleTable() {
  const tb = $("#rule-table").tBodies[0];
  tb.textContent = "";
  const builtinIds = new Set(((M.rules && M.rules.DEFAULT_RULES) || []).map((r) => r.id));
  const rules = effectiveRules();
  if (!rules.length) {
    tb.append(el("tr", {}, [el("td", { colspan: 8, class: "muted", text: "rules.js가 아직 없어 기본 규칙을 보여 줄 수 없습니다." })]));
    return;
  }

  rules.forEach((r, i) => {
    const locked = builtinIds.has(r.id);
    const undeletable = r.id === "underline-keep";
    /** 규칙 하나의 필드를 고친다. */
    const edit = (field, value) => {
      materializeRules();
      store.update((p) => { const t = p.rules.find((x) => x.id === r.id) || p.rules[i]; if (t) t[field] = value; }, "rule-edit");
      refreshRulePreview();
    };
    const tr = el("tr", {});
    tr.append(el("td", {}, [el("input", {
      type: "checkbox", checked: r.enabled !== false, title: "이 규칙 쓰기",
      onchange: (e) => { edit("enabled", e.target.checked); },
    })]));
    tr.append(el("td", {}, [el("input", { type: "text", value: r.name || r.id, readonly: locked, class: "w-name", onchange: (e) => edit("name", e.target.value) })]));
    tr.append(el("td", {}, [el("input", { type: "text", value: r.pattern || "", readonly: locked, class: "code w-pat", onchange: (e) => edit("pattern", e.target.value) })]));
    tr.append(el("td", {}, [el("input", { type: "text", value: r.flags || "g", readonly: locked, class: "code w-flag", onchange: (e) => edit("flags", e.target.value) })]));
    tr.append(el("td", {}, [el("input", { type: "text", value: r.replace || "", readonly: locked, class: "code w-rep", onchange: (e) => edit("replace", e.target.value) })]));
    tr.append(el("td", {}, [multiSelect(SCOPES, r.scope || ["all"], locked, (v) => edit("scope", v))]));
    tr.append(el("td", {}, [multiSelect(asOptions(OPT.omit(OPT.SUBJECT, OPT.SUBJECT.default)), r.subjects || [], locked, (v) => edit("subjects", v))]));
    tr.append(el("td", { class: "acts" }, [
      el("button", { type: "button", class: "mini", title: "복제", text: "⎘", onclick: () => cloneRule(r) }),
      undeletable ? null : el("button", {
        type: "button", class: "mini danger", title: "지우기", text: "✕",
        onclick: () => { materializeRules(); store.update((p) => { p.rules = p.rules.filter((x) => x.id !== r.id); }, "rule-del"); refreshRuleTable(); refreshRulePreview(); },
      }),
    ]));
    tr.classList.toggle("locked", locked);
    tb.append(tr);
  });
  refreshRulePreview();
}

/** 여러 값을 고를 수 있는 작은 select를 만든다. */
function multiSelect(options, value, disabled, onchange) {
  const sel = el("select", { multiple: true, size: 2, disabled });
  for (const o of options) {
    const opt = el("option", { value: o.value, text: o.label });
    opt.selected = value.includes(o.value);
    sel.append(opt);
  }
  sel.addEventListener("change", () => onchange(Array.from(sel.selectedOptions).map((o) => o.value)));
  return sel;
}

/** 규칙 하나를 복제해 사용자 규칙으로 넣는다. */
function cloneRule(r) {
  materializeRules();
  const copy = JSON.parse(JSON.stringify(r));
  copy.id = `${r.id}-copy-${Date.now().toString(36).slice(-4)}`;
  copy.name = `${r.name || r.id} 사본`;
  store.update((p) => { p.rules.splice(p.rules.findIndex((x) => x.id === r.id) + 1, 0, copy); }, "rule-clone");
  refreshRuleTable();
}

/** 미리보기 문장에 현재 규칙을 적용해 그대로 그린다. */
function refreshRulePreview() {
  const out = $("#rule-preview-out");
  if (!has("rules", "inline")) { out.textContent = "rules.js가 아직 없어 미리보기를 만들 수 없습니다."; return; }
  try {
    const html = M.rules.inline($("#rule-preview-in").value, {
      scope: $("#rule-preview-scope").value,
      subject: $("#rule-preview-subject").value,
      rules: effectiveRules(),
    });
    out.innerHTML = html;
    renderMathIn(out);
  } catch (err) {
    out.textContent = `규칙 적용 중 오류: ${err.message}`;
  }
}

/** 요소 안의 .math 조각을 KaTeX로 그린다(실패하면 원문 그대로 둔다). */
function renderMathIn(root) {
  if (!window.katex) return;
  for (const node of root.querySelectorAll("[data-tex]")) {
    try {
      window.katex.render(node.getAttribute("data-tex"), node, {
        displayMode: node.getAttribute("data-display") === "1",
        throwOnError: false,
        strict: "ignore",
      });
    } catch { /* 원문 유지 */ }
  }
}

/* ─────────────────────────── 이미지 탭 ─────────────────────────── */

/** 업로드된 이미지 썸네일 목록을 다시 그린다. */
function refreshImages() {
  const box = $("#image-list");
  box.textContent = "";
  const project = store.get();
  if (!project.images.length) {
    box.append(el("p", { class: "muted", text: "올린 이미지가 없습니다." }));
    return;
  }
  const referenced = referencedImageNames();
  for (const im of project.images) {
    const card = el("figure", { class: "thumb" }, [
      el("img", { src: im.dataUrl, alt: im.name }),
      el("figcaption", {}, [
        el("b", { text: im.name }),
        el("span", { class: "muted", text: `${im.width || "?"}×${im.height || "?"} · ${humanSize(im.size || byteLength(im.dataUrl || ""))}` }),
        referenced.has(im.name) ? el("span", { class: "ok", text: "이름으로 자동 매칭됨" }) : null,
      ]),
      el("button", {
        type: "button", class: "mini danger", title: "지우기", text: "✕",
        onclick: () => { store.removeImage(im.id); refreshImages(); refreshPlacements(); },
      }),
    ]);
    box.append(card);
  }
}

/** 원문에 `[이미지: 이름]`으로 불린 이름들을 모은다. */
function referencedImageNames() {
  const names = new Set();
  const re = /^\[이미지\s*[:：]\s*([^\]]+)\]\s*$|^!\[[^\]]*\]\(([^)]+)\)\s*$/gm;
  for (const s of store.get().sources) {
    let m;
    while ((m = re.exec(s.text))) names.add((m[1] || m[2] || "").trim());
  }
  return names;
}

/** 이미지 배치 표를 다시 그린다. */
function refreshPlacements() {
  const panel = $("#panel-images");
  if (panel.hidden) return;
  const tb = $("#place-table").tBodies[0];
  tb.textContent = "";
  const project = store.get();
  const imageOpts = project.images.map((im) => ({ value: im.id, label: im.name }));
  const problemOpts = ((doc && doc.problems) || []).map((p) => ({
    value: p.key,
    label: `${p.num != null ? p.num + ". " : ""}${head((p.stem.find((b) => b.type === "p") || {}).text, 20) || p.key}`,
  }));

  if (!project.imagePlacements.length) {
    tb.append(el("tr", {}, [el("td", { colspan: 6, class: "muted", text: "배치가 없습니다. 필요하면 [배치 추가]." })]));
    return;
  }
  project.imagePlacements.forEach((pl, i) => {
    /** 배치 한 줄의 필드를 고친다. */
    const edit = (field, value) => store.update((p) => { p.imagePlacements[i][field] = value; }, "place-edit");
    const tr = el("tr", {});
    const imgSel = el("select", { onchange: (e) => edit("imageId", e.target.value) });
    fillSelect(imgSel, imageOpts.length ? imageOpts : [{ value: "", label: "— 이미지 없음 —" }], pl.imageId);
    const qSel = el("select", { onchange: (e) => edit("problemKey", e.target.value) });
    fillSelect(qSel, problemOpts.length ? problemOpts : [{ value: "", label: "— 문항 없음 —" }], pl.problemKey);
    const slotSel = el("select", { onchange: (e) => edit("slot", e.target.value) });
    fillSelect(slotSel, SLOTS, pl.slot);
    tr.append(el("td", {}, [imgSel]));
    tr.append(el("td", {}, [qSel]));
    tr.append(el("td", {}, [slotSel]));
    tr.append(el("td", {}, [el("input", { type: "text", class: "w-flag", list: "dl-image-width", value: pl.width || OPT.IMAGE_WIDTH.default, onchange: (e) => edit("width", e.target.value) })]));
    tr.append(el("td", {}, [el("input", { type: "text", value: pl.caption || "", onchange: (e) => edit("caption", e.target.value) })]));
    tr.append(el("td", {}, [el("button", {
      type: "button", class: "mini danger", text: "✕", title: "지우기",
      onclick: () => { store.update((p) => { p.imagePlacements.splice(i, 1); }, "place-del"); refreshPlacements(); },
    })]));
    tb.append(tr);
  });
}

/**
 * 쪽별 예외(layout.perPageRules) 표를 다시 그린다.
 * 경로 바인딩(data-path)은 배열 안 자리를 가리킬 수 없어 이 표만 전용 렌더러를 둔다 —
 * 값은 store.js의 normalizePerPageRules를 거쳐 저장되므로 빈 행·겹치는 쪽은 남지 않는다.
 */
function refreshPerPageRules() {
  const table = $("#perpage-rules");
  if (!table) return;
  const tb = table.tBodies[0];
  tb.textContent = "";
  const rules = store.getPath("layout.perPageRules") || [];
  if (!rules.length) {
    tb.append(el("tr", {}, [el("td", { colspan: 4, class: "muted", text: "예외가 없습니다. 모든 쪽이 위 값을 씁니다." })]));
    return;
  }
  const lim = OPT.LIMITS;
  /** 한 칸을 고쳐 배열 전체를 다시 저장한다(정리는 스토어가 한다). */
  const edit = (i, field, value) => {
    const next = (store.getPath("layout.perPageRules") || []).map((r) => ({ ...r }));
    if (!next[i]) return;
    next[i][field] = Number(value);
    store.setPath("layout.perPageRules", normalizePerPageRules(next), "perpage-rule");
    refreshPerPageRules();
  };
  const cell = (i, field, limit) =>
    el("td", {}, [el("input", {
      type: "number", class: "w-num", min: limit.min, max: limit.max, step: limit.step,
      value: String(rules[i][field] ?? 0), title: limit.label,
      onchange: (e) => edit(i, field, e.target.value),
    })]);
  rules.forEach((r, i) => {
    void r;
    tb.append(el("tr", {}, [
      cell(i, "page", lim.perPageRulePage),
      cell(i, "min", lim.perPageMin),
      cell(i, "max", lim.perPageMax),
      el("td", {}, [el("button", {
        type: "button", class: "mini danger", text: "✕", title: "이 예외를 지웁니다",
        onclick: () => {
          const next = (store.getPath("layout.perPageRules") || []).filter((_, j) => j !== i);
          store.setPath("layout.perPageRules", next, "perpage-rule-del");
          refreshPerPageRules();
        },
      })]),
    ]));
  });
}

/* ─────────────────────────── 줌·인쇄·저장 ─────────────────────────── */

/** 미리보기 축소 비율을 CSS 변수로 넘긴다. */
function applyZoom(percent) {
  const lim = OPT.LIMITS.zoom;
  const asked = (Number(percent) || lim.default * 100) / 100;
  const z = Math.max(lim.min, Math.min(lim.max, asked));
  const mount = $("#preview");
  mount.style.setProperty("--zoom", String(z));
  $("#zoom-val").textContent = `${Math.round(z * 100)}%`;
  const slider = $("#zoom");
  if (slider.value !== String(Math.round(z * 100))) slider.value = String(Math.round(z * 100));
}

/** 프로젝트를 JSON 파일로 내려받는다. */
function saveJson() {
  const project = store.get();
  const name = (project.title || "booklet").replace(/[\\/:*?"<>|]/g, "_");
  download(`${name}.booklet.json`, store.exportJson());
  toast("프로젝트 JSON을 저장했습니다.");
}

/** 독립 실행 HTML을 만들어 내려받는다(file://에서는 안내만). */
async function saveStandalone() {
  // booklet.py build가 만든 문서는 이미 독립 HTML이다 — 다시 감쌀 것이 없다.
  if (isEmbeddedStandalone()) {
    toast("이 문서가 이미 독립 HTML입니다. 고친 내용은 [JSON 저장]으로 보관하세요.");
    saveJson();
    return;
  }
  try {
    const html = await toStandaloneHtml(store.get());
    const name = (store.get().title || "booklet").replace(/[\\/:*?"<>|]/g, "_");
    download(`${name}.html`, html, "text/html");
    toast("독립 HTML을 저장했습니다.");
  } catch (err) {
    toast(err.message, "bad");
    addIssue(err.message, "export");
    paintWarnings();
    paintStatus();
  }
}

/* ─────────────────────────── 배선 ─────────────────────────── */

/** 탭 하나를 켠다. */
function showTab(name) {
  for (const b of $$("#tabs .tab")) {
    const on = b.dataset.tab === name;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  }
  for (const p of $$(".panel")) p.hidden = p.id !== `panel-${name}`;
  store.setUi({ tab: name });
  if (name === "units") { refreshUnitTable(); refreshUnitOrder(); }
  if (name === "images") { refreshImages(); refreshPlacements(); }
  if (name === "rules") { refreshProfiles(); refreshRuleTable(); }
  if (name === "files") refreshFileList();
}

/** 드롭존 하나를 배선한다. */
function wireDropzone(node, handler, pickInput = null) {
  if (pickInput) {
    const open = () => { try { pickInput.click(); } catch (err) { toast(`파일 선택창을 열지 못했습니다: ${err.message}`, "bad"); } };
    node.addEventListener("click", open);
    node.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  }
  const over = (e) => { e.preventDefault(); node.classList.add("over"); };
  const off = (e) => { e.preventDefault(); node.classList.remove("over"); };
  node.addEventListener("dragenter", over);
  node.addEventListener("dragover", over);
  node.addEventListener("dragleave", off);
  node.addEventListener("drop", async (e) => {
    off(e);
    node.classList.add("busy");
    try {
      const files = await filesFromDataTransfer(e.dataTransfer);
      await handler(files);
    } catch (err) {
      toast(`파일을 읽지 못했습니다: ${err.message}`, "bad");
    } finally {
      node.classList.remove("busy");
    }
  });
}

/**
 * 마크업이 비워 둔 <select>·숫자 칸을 options.js의 표로 채운다(부팅 때 딱 한 번).
 * `data-opt`는 열거형 이름, `data-opt-omit`은 뺄 id들, `data-opt-pick`은 처음 고를 값,
 * `data-limit`은 LIMITS의 키(`data-limit-scale`이 있으면 그 배로 곱해 쓴다).
 */
function fillOptionControls() {
  for (const sel of $$("[data-opt]")) {
    const e = OPT.ALL_ENUMS[sel.dataset.opt];
    if (!e) continue;
    const omit = (sel.dataset.optOmit || "").split(",").map((x) => x.trim()).filter(Boolean);
    const list = omit.length ? OPT.omit(e, omit) : e.values;
    const pick = sel.dataset.optPick !== undefined ? sel.dataset.optPick : e.default;
    sel.innerHTML = OPT.optionsHtml(list, pick);
  }

  for (const node of $$("[data-limit]")) {
    const lim = OPT.LIMITS[node.dataset.limit];
    if (!lim) continue;
    const scale = Number(node.dataset.limitScale) || 1;
    node.min = String(lim.min * scale);
    node.max = String(lim.max * scale);
    // step은 마크업이 더 곱게 잡아 놓았을 수 있어 적힌 값을 그대로 둔다.
    if (!node.getAttribute("step")) node.step = String(lim.step * scale);
    if (lim.label) node.title = `${lim.label} ${lim.min * scale}~${lim.max * scale}${lim.unit || ""}`;
  }

  // 붙여 두기 체크 목록 — 라벨·설명·기본값은 options.KEEP_KEYS 한 곳에만 적힌다.
  // 항목을 늘리면 마크업을 고치지 않아도 배치 탭에 그대로 나타난다.
  const keepList = $("#keep-list");
  if (keepList) {
    keepList.textContent = "";
    for (const k of OPT.KEEP_KEYS.values) {
      keepList.append(el("label", { class: "chk", title: k.desc || "" }, [
        el("input", { type: "checkbox", "data-path": `layout.keep.${k.id}`, "data-type": "bool" }),
        el("span", { text: k.label }),
      ]));
    }
  }

  // 머리말 토큰 도움말 — 설명은 각 <code>의 title로 붙어 마우스를 올리면 뜬다.
  const tokens = $("#header-tokens");
  if (tokens) {
    tokens.innerHTML = "쓸 수 있는 토큰: " + OPT.HEADER_TOKENS.values
      .map((t) => `<code title="${esc(t.label)} — ${esc(t.desc)}">${esc(t.id)}</code>`)
      .join(" ");
  }

  // 이미지 폭은 프리셋을 제안하되 직접 친 값(40%·8em…)도 막지 않는다.
  const widths = $("#dl-image-width");
  if (widths) {
    widths.innerHTML = OPT.IMAGE_WIDTH.values
      .map((w) => `<option value="${esc(w.id)}">${esc(w.label)}</option>`).join("");
  }

  // 격자 버튼은 아이콘만 있어 뜻이 안 보인다 — 설명을 툴팁으로 얹는다.
  for (const b of $$("#grid-btns .gb")) {
    const g = OPT.GRID.byId[b.dataset.grid];
    if (g) b.title = g.hint ? `${g.label} — ${g.hint}` : g.label;
  }
}

/** 문서 전체 배선. */
function wire() {
  fillOptionControls();
  const sidebar = $("#sidebar");

  // 경로 바인딩 — 컨트롤별 핸들러 없이 이 두 줄이 전부다.
  sidebar.addEventListener("input", onControlEdit);
  sidebar.addEventListener("change", onControlEdit);

  // 탭
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest(".tab");
    if (b) showTab(b.dataset.tab);
  });

  // 접기·펴기
  const collapse = (on) => {
    document.body.classList.toggle("collapsed", on);
    store.setUi({ collapsed: on });
  };
  $("#btn-collapse").addEventListener("click", () => collapse(true));
  $("#btn-expand").addEventListener("click", () => collapse(false));

  // 읽기 전용으로 열린 문서를 그 자리에서 고치기 시작한다.
  $("#btn-edit").addEventListener("click", () => {
    document.body.classList.add("editing");
    document.body.classList.remove("collapsed");
    store.setUi({ collapsed: false });
  });

  // 파일 — 선택창이 닫힌 뒤 "아무 일도 안 일어나는" 경우가 없도록, 모든 갈래에서 한 줄은 말한다.
  const takeFiles = async (files) => {
    const list = Array.from(files || []);
    const dz = $("#dz-files");
    if (!list.length) { toast("선택된 파일이 없습니다. .md·.txt·이미지 또는 프로젝트 JSON을 고르세요.", "bad"); return; }
    dz.classList.add("busy");
    toast(`파일 ${list.length}개를 읽는 중…`);
    try {
      const res = await store.addSources(list, { preferOriginal: $("#opt-prefer-original").checked });
      const tail = res.warnings.length ? ` (경고 ${res.warnings.length}개)` : "";
      if (res.imported) {
        afterProjectSwap();
        toast(`“${res.name}”의 프로젝트를 열었습니다${tail}.`);
        return;
      }
      refreshFileList();
      refreshImages();
      scheduleBuild(); // 커밋이 없어도 경고 목록은 새로 그린다
      if (!res.added && !res.images) {
        toast(res.warnings[0] || "넣을 수 있는 파일이 없었습니다.", "bad");
        return;
      }
      toast(`파일 ${res.added}개, 이미지 ${res.images}개를 넣었습니다${tail}.`);
    } catch (err) {
      console.error(err);
      toast(`파일을 넣지 못했습니다: ${err && err.message ? err.message : err}`, "bad");
    } finally {
      dz.classList.remove("busy");
    }
  };
  /** input[type=file]의 change — 목록을 먼저 떠 두고 value를 비워야 같은 파일을 다시 고를 수 있다. */
  const onPick = (handler) => (e) => {
    const list = Array.from(e.target.files || []);
    e.target.value = "";
    handler(list);
  };
  wireDropzone($("#dz-files"), takeFiles, $("#in-files"));
  $("#in-files").addEventListener("change", onPick(takeFiles));
  $("#in-dir").addEventListener("change", onPick(takeFiles));
  // 선택창을 취소하면 change가 오지 않는다 — 브라우저가 cancel을 주면 그것으로 알린다.
  for (const id of ["#in-files", "#in-dir", "#in-images", "#in-json"]) {
    const el = $(id);
    if (el) el.addEventListener("cancel", () => toast("파일 선택을 취소했습니다."));
  }
  $("#opt-prefer-original").addEventListener("change", (e) => store.setUi({ preferOriginal: e.target.checked }));

  // 배치 — 격자 버튼·글꼴 프리셋
  $("#grid-btns").addEventListener("click", (e) => {
    const b = e.target.closest(".gb");
    if (!b) return;
    const [cols, rows] = b.dataset.grid.split("x").map(Number);
    store.setPath("layout.grid", { cols, rows }, "grid");
    syncDerivedControls();
  });
  $("#font-preset").addEventListener("change", (e) => {
    if (e.target.value === OPT.FONT_FAMILY.customId) { $("#font-custom-row").hidden = false; return; }
    store.setPath("layout.font.family", e.target.value, "font");
    $("#font-custom-row").hidden = true;
  });

  // 단원 일괄 지정
  $("#btn-bulk-apply").addEventListener("click", () => {
    const sid = $("#bulk-source").value;
    if (!sid) { toast("소스를 먼저 고르세요.", "bad"); return; }
    const unit = $("#bulk-unit").value.trim();
    const subunit = $("#bulk-subunit").value.trim();
    store.update((p) => {
      const key = `${sid}#*`;
      if (!unit && !subunit) delete p.units.map[key];
      else p.units.map[key] = { ...(unit ? { unit } : {}), ...(subunit ? { subunit } : {}) };
    }, "units-bulk");
    toast(`${sid}의 모든 문항에 적용했습니다.`);
  });

  // 규칙 탭
  $("#prof-select").addEventListener("change", (e) => showProfileJson(e.target.value));
  $("#btn-prof-clone").addEventListener("click", () => {
    const id = $("#prof-select").value;
    const builtin = M.format && M.format.BUILTIN_PROFILES ? M.format.BUILTIN_PROFILES[id] : null;
    const user = store.get().profiles.find((p) => p.id === id);
    const src = user || (builtin && (builtin.json || builtin));
    if (!src) { toast("복제할 프로파일을 찾지 못했습니다.", "bad"); return; }
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = `${id}-사본-${Date.now().toString(36).slice(-4)}`;
    copy.name = `${copy.name || id} 사본`;
    store.update((p) => p.profiles.push(copy), "prof-clone");
    refreshProfiles();
    $("#prof-select").value = copy.id;
    showProfileJson(copy.id);
    toast("사본을 만들었습니다. 고친 뒤 [저장]을 누르세요.");
  });
  $("#btn-prof-validate").addEventListener("click", validateProfileDraft);
  $("#btn-prof-test").addEventListener("click", testParse);
  $("#btn-prof-save").addEventListener("click", () => {
    const json = validateProfileDraft();
    if (!json) return;
    store.update((p) => {
      const i = p.profiles.findIndex((x) => x.id === profileDraftId);
      if (i >= 0) p.profiles[i] = json; else p.profiles.push(json);
    }, "prof-save");
    refreshProfiles();
    refreshFileList();
    toast("프로파일을 저장했습니다.");
  });
  $("#btn-prof-delete").addEventListener("click", () => {
    const id = $("#prof-select").value;
    if (!confirm(`프로파일 “${id}”을(를) 지울까요?`)) return;
    store.update((p) => {
      p.profiles = p.profiles.filter((x) => x.id !== id);
      for (const s of p.sources) if (s.profileId === id) s.profileId = OPT.PROFILE_ID.default;
    }, "prof-del");
    refreshProfiles();
    refreshFileList();
  });

  $("#btn-rule-add").addEventListener("click", () => {
    materializeRules();
    const rule = {
      id: `rule-${Date.now().toString(36).slice(-5)}`,
      name: "새 규칙", enabled: true, scope: [OPT.RULE_SCOPE.default], subjects: [],
      pattern: "", flags: "g", replace: "",
    };
    store.update((p) => p.rules.push(rule), "rule-add");
    refreshRuleTable();
  });
  $("#btn-rule-reset").addEventListener("click", () => {
    if (!confirm("인라인 규칙을 기본값으로 되돌릴까요?")) return;
    store.setPath("rules", [], "rule-reset");
    refreshRuleTable();
  });
  for (const id of ["#rule-preview-in", "#rule-preview-scope", "#rule-preview-subject"]) {
    $(id).addEventListener("input", refreshRulePreview);
    $(id).addEventListener("change", refreshRulePreview);
  }

  // 이미지 탭
  const takeImages = async (files) => {
    const list = Array.from(files || []);
    const dz = $("#dz-images");
    if (!list.length) { toast("선택된 이미지가 없습니다. png·jpg·gif·webp·svg를 고르세요.", "bad"); return; }
    dz.classList.add("busy");
    toast(`이미지 ${list.length}개를 읽는 중…`);
    try {
      const before = store.getWarnings().length;
      const n = await store.addImages(list);
      refreshImages();
      refreshPlacements();
      scheduleBuild(); // 커밋이 없어도 경고 목록은 새로 그린다
      if (!n) { toast(store.getWarnings()[before] || "넣을 수 있는 이미지가 없었습니다.", "bad"); return; }
      toast(`이미지 ${n}개를 넣었습니다.`);
    } catch (err) {
      console.error(err);
      toast(`이미지를 넣지 못했습니다: ${err && err.message ? err.message : err}`, "bad");
    } finally {
      dz.classList.remove("busy");
    }
  };
  wireDropzone($("#dz-images"), (files) => takeImages(Array.from(files).filter((f) => isImageFile(f.name))), $("#in-images"));
  $("#in-images").addEventListener("change", onPick(takeImages));
  $("#btn-place-add").addEventListener("click", () => {
    const project = store.get();
    if (!project.images.length) { toast("이미지를 먼저 올리세요.", "bad"); return; }
    const firstQ = (doc && doc.problems && doc.problems[0]) ? doc.problems[0].key : "";
    store.update((p) => p.imagePlacements.push({
      problemKey: firstQ, imageId: project.images[0].id,
      slot: OPT.IMAGE_SLOT.default, width: OPT.IMAGE_WIDTH.default, caption: "",
    }), "place-add");
    refreshPlacements();
  });

  // 배치 탭 — 쪽별 예외는 배열이라 경로 바인딩이 닿지 않는다(전용 렌더러가 맡는다).
  $("#btn-perpage-add").addEventListener("click", () => {
    const rules = (store.getPath("layout.perPageRules") || []).map((r) => ({ ...r }));
    // 새 행의 쪽번호는 마지막 예외 다음 쪽 — 같은 쪽이 겹치면 정리 때 버려지기 때문이다.
    const nextPage = rules.length ? Math.max(...rules.map((r) => Number(r.page) || 0)) + 1 : 1;
    rules.push({ page: Math.min(nextPage, OPT.LIMITS.perPageRulePage.max), min: 0, max: 0 });
    store.setPath("layout.perPageRules", normalizePerPageRules(rules), "perpage-rule-add");
    refreshPerPageRules();
  });

  // 내보내기 탭
  $("#btn-print").addEventListener("click", printBooklet);
  $("#btn-print2").addEventListener("click", printBooklet);
  $("#btn-json-save").addEventListener("click", saveJson);
  $("#in-json").addEventListener("change", onPick(async (list) => {
    const file = list[0];
    if (!file) { toast("선택된 파일이 없습니다.", "bad"); return; }
    try {
      const text = await file.text();
      const res = store.importJson(text);
      if (!res.ok) { toast(res.warnings[0], "bad"); return; }
      afterProjectSwap();
      toast(`“${file.name}”을(를) 열었습니다${res.warnings.length ? ` (경고 ${res.warnings.length}개)` : ""}.`);
    } catch (err) {
      console.error(err);
      toast(`프로젝트를 열지 못했습니다: ${err && err.message ? err.message : err}`, "bad");
    }
  }));
  $("#btn-standalone").addEventListener("click", saveStandalone);
  $("#btn-reset").addEventListener("click", () => {
    if (!confirm("프로젝트를 초기화합니다. 지금까지의 파일·설정이 모두 사라집니다. 계속할까요?")) return;
    store.reset();
    afterProjectSwap();
    toast("프로젝트를 초기화했습니다.");
  });

  // 상태줄·경고
  $("#st-warnings-btn").addEventListener("click", () => {
    const w = $("#warnings");
    w.hidden = !w.hidden;
    $("#st-warnings-btn").setAttribute("aria-expanded", String(!w.hidden));
  });
  $("#btn-w-close").addEventListener("click", () => {
    $("#warnings").hidden = true;
    $("#st-warnings-btn").setAttribute("aria-expanded", "false");
  });

  // 줌
  $("#zoom").addEventListener("input", (e) => {
    applyZoom(e.target.value);
    store.setUi({ zoom: Number(e.target.value) });
  });

  // 단축키
  document.addEventListener("keydown", (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === "p") { e.preventDefault(); printBooklet(); }
    if (k === "s") { e.preventDefault(); saveJson(); }
  });

  // 창을 닫기 전에 마지막 저장
  window.addEventListener("beforeunload", () => store.saveNow());
}

/** 프로젝트가 통째로 바뀐 뒤 UI 전체를 맞춘다. */
function afterProjectSwap() {
  syncControls();
  refreshFileList();
  refreshImages();
  refreshPlacements();
  refreshProfiles();
  refreshRuleTable();
  refreshUnitOrder();
  refreshPerPageRules();
  scheduleBuild();
}

/** 앱 시작. */
async function boot() {
  wire();
  wireLateKatex();
  const loaded = store.load();
  await loadModules();

  const ui = store.getUi();
  $("#opt-prefer-original").checked = ui.preferOriginal !== false;
  const zoomPercent = ui.zoom || Math.round(OPT.LIMITS.zoom.default * 100);
  $("#zoom").value = String(zoomPercent);
  applyZoom(zoomPercent);

  // 읽기 전용은 접기가 아니라 숨김이다 — 상태줄의 [편집]이 사이드바를 도로 불러온다.
  document.body.classList.toggle("collapsed", !READONLY && !!ui.collapsed);
  document.body.classList.toggle("readonly", READONLY);
  document.body.classList.toggle("debug", DEBUG);

  // URL의 #tab=규칙으로도 탭을 열 수 있다(헤드리스 화면 확인용).
  const hashTab = /(?:^|[#&])tab=([a-z]+)/.exec(location.hash || "");
  showTab((hashTab && hashTab[1]) || ui.tab || "files");
  afterProjectSwap();

  if (isEmbeddedStandalone()) {
    const btn = $("#btn-standalone");
    btn.textContent = "이미 독립 HTML";
    btn.title = "이 문서 자체가 독립 HTML입니다. 고친 내용은 [JSON 저장]으로 보관하세요.";
  }
  // 이 문서가 언제 어떤 도구로 묶였는지 — 오래된 독립 HTML을 새 코드로 착각하는 일을 막는다.
  {
    const meta = document.querySelector('meta[name="booklet-build"]');
    const info = $("#storage-info");
    if (meta && info) {
      const p = document.createElement("p");
      p.className = "note";
      p.id = "build-info";
      p.textContent = `이 문서 빌드: ${meta.content}`;
      info.insertAdjacentElement("afterend", p);
    }
  }
  if (loaded.from === "embedded") toast("문서에 심긴 프로젝트를 열었습니다.");
  if (missingModules.length) toast(`모듈 ${missingModules.length}개를 아직 찾지 못했습니다. 경고를 확인하세요.`, "bad");

  store.subscribe(() => { scheduleBuild(); paintStatus(); });

  // KaTeX가 뜬 뒤에 첫 조판을 돌려야 수식 높이가 맞다.
  try { await Promise.race([window.__katexReady || Promise.resolve(), new Promise((r) => setTimeout(r, 4000))]); } catch { /* 없어도 진행 */ }
  rebuild();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
