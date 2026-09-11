/**
 * store.js — 프로젝트 상태의 단일 진실원. 파일·이미지 적재, 경로 단위 수정,
 * localStorage 자동 저장(4MB 정책), JSON 입출력, 구독 알림을 맡는다.
 * 브라우저 API는 있으면 쓰고 없으면 건너뛴다(node --test에서 그대로 import 가능).
 */

import {
  defaults as layoutDefaults,
  sanitizeEnums,
  flagDefaults,
  isValid,
  SUBJECT,
  PROFILE_ID,
  NUMBERING_MODE,
  UNITS_SOURCE,
  LIMITS,
  TOC_OPTIONS,
  TEXT_EXT as OPT_TEXT_EXT,
  IMAGE_EXT as OPT_IMAGE_EXT,
  PROJECT_EXT as OPT_PROJECT_EXT,
} from "./options.js";

export const STORAGE_KEY = "booklet.project";
export const UI_KEY = "booklet.ui";
export const STORAGE_LIMIT = LIMITS.autosave.max;
export const PROJECT_VERSION = 1;

// 받아들이는 확장자는 options.js가 갖는다 — 여기서는 예전 import 경로를 위해 다시 내보낸다.
export const TEXT_EXT = OPT_TEXT_EXT;
export const IMAGE_EXT = OPT_IMAGE_EXT;
export const PROJECT_EXT = OPT_PROJECT_EXT;

/** 폴더 드롭에서 통째로 건너뛸 폴더 이름(booklet.py의 EXCLUDED_DIR_NAMES와 같다). */
export const EXCLUDED_DIRS = ["문제거리"];

// 과목 목록은 options.SUBJECT 하나뿐이다 — 여기서 다시 배열로 굳히지 않는다.

/* ─────────────────────────── 기본값 ─────────────────────────── */

/** DESIGN §2.6의 LayoutSettings 기본값을 새 객체로 만든다(표는 options.defaults()에 있다). */
export function defaultLayout() {
  return layoutDefaults();
}

/** DESIGN §2.1의 Project 기본값을 새 객체로 만든다(모든 키가 반드시 존재한다). */
export function defaultProject() {
  return {
    version: PROJECT_VERSION,
    title: "문제집",
    subtitle: "",
    meta: { subject: "", grade: "", institute: "", date: "", round: "", period: "" },
    sources: [],
    profiles: [],
    rules: [],
    layout: defaultLayout(),
    numbering: {
      mode: NUMBERING_MODE.default,
      start: LIMITS.numberStart.default,
      pad: LIMITS.numberPad.default,
    },
    units: { source: UNITS_SOURCE.default, order: [], suborder: {}, map: {} },
    sheets: {
      cover: { enabled: false, lines: [] },
      problems: true,
      answers: { enabled: true, perRow: LIMITS.perRow.default, title: "빠른 정답" },
      explanations: {
        enabled: true,
        grid: { cols: LIMITS.explGrid.default, rows: 1 },
        title: "정답과 해설",
        renamePassage: true,
      },
      toc: { enabled: true, ...flagDefaults(TOC_OPTIONS), title: "차례" },
    },
    images: [],
    imagePlacements: [],
    overrides: {},
  };
}

/** UI 전용(프로젝트에 저장하지 않는) 기본 설정. zoom은 백분율이라 배율에 100을 곱한다. */
export function defaultUi() {
  return {
    tab: "files",
    zoom: Math.round(LIMITS.zoom.default * 100),
    collapsed: false,
    preferOriginal: true,
  };
}

/* ─────────────────────────── 작은 도구 ─────────────────────────── */

/** 값이 배열이 아닌 순수 객체인지 본다. */
function isPlain(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** patch의 순수 객체는 깊게 병합하고 배열·원시값은 통째로 갈아 끼운다. */
export function deepMerge(base, patch) {
  if (!isPlain(patch)) return patch === undefined ? base : patch;
  const out = isPlain(base) ? { ...base } : {};
  for (const [k, v] of Object.entries(patch)) {
    out[k] = isPlain(v) && isPlain(out[k]) ? deepMerge(out[k], v) : v;
  }
  return out;
}

/**
 * 쪽별 예외(layout.perPageRules)를 저장할 수 있는 모양으로 정리한다.
 * 쪽번호가 없는 빈 행·겹치는 쪽은 버리고, 값은 0 이상 정수로 굳혀 쪽번호 순으로 세운다.
 * UI 표와 외부 JSON이 같은 함수를 거치므로 두 길로 들어온 값이 갈라지지 않는다.
 * @param {Array} list 사람이 친 그대로의 행 목록
 */
export function normalizePerPageRules(list) {
  const out = [];
  const seen = new Set();
  for (const r of Array.isArray(list) ? list : []) {
    if (!isPlain(r)) continue;
    const page = Math.round(Number(r.page));
    if (!Number.isFinite(page) || page < 1) continue;
    if (seen.has(page)) continue;
    seen.add(page);
    out.push({
      page,
      min: Math.max(0, Math.round(Number(r.min) || 0)),
      max: Math.max(0, Math.round(Number(r.max) || 0)),
    });
  }
  return out.sort((a, b) => a.page - b.page);
}

/** "layout.grid.cols" 같은 경로로 값을 읽는다(없으면 undefined). */
export function getPath(obj, path) {
  let cur = obj;
  for (const key of String(path).split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = cur[key];
  }
  return cur;
}

/** "layout.grid.cols" 같은 경로에 값을 쓴다(중간 객체는 만들어 준다). */
export function setPath(obj, path, value) {
  const keys = String(path).split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!isPlain(cur[k]) && !Array.isArray(cur[k])) cur[k] = {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return obj;
}

/** 숫자 덩어리를 숫자로 비교하는 자연 정렬(batch-2 < batch-10). */
export function naturalCompare(a, b) {
  const ra = String(a).match(/\d+|\D+/g) || [];
  const rb = String(b).match(/\d+|\D+/g) || [];
  const n = Math.min(ra.length, rb.length);
  for (let i = 0; i < n; i++) {
    const x = ra[i];
    const y = rb[i];
    const dx = /^\d/.test(x);
    const dy = /^\d/.test(y);
    if (dx && dy) {
      const d = Number(x) - Number(y);
      if (d) return d < 0 ? -1 : 1;
    } else {
      const d = x.localeCompare(y, "ko");
      if (d) return d < 0 ? -1 : 1;
    }
  }
  return ra.length - rb.length;
}

/** 파일명 확장자를 소문자로 돌려준다(점 포함, 없으면 ""). */
export function extOf(name) {
  const m = /\.[^./\\]+$/.exec(String(name));
  return m ? m[0].toLowerCase() : "";
}

/** 확장자로 텍스트 소스인지 본다. */
export function isTextFile(name) {
  return TEXT_EXT.includes(extOf(name));
}

/** 확장자로 이미지인지 본다. */
export function isImageFile(name) {
  return IMAGE_EXT.includes(extOf(name));
}

/** 확장자로 프로젝트 파일(.json / .booklet.json)인지 본다. */
export function isProjectFile(name) {
  return PROJECT_EXT.includes(extOf(name));
}

/**
 * JSON 본문이 booklet 프로젝트처럼 생겼는가 — 객체이고 version·sources·layout·units 중 하나라도 있으면 그렇다.
 * 이름만 .json인 다른 파일(설정·데이터)을 프로젝트로 열어 작업을 날리는 일을 막는다.
 */
export function looksLikeProject(text) {
  let raw;
  try { raw = JSON.parse(String(text)); } catch { return false; }
  if (!isPlain(raw)) return false;
  return ["version", "sources", "layout", "units", "sheets", "numbering"].some((k) => raw[k] !== undefined);
}

/**
 * 폴더 드롭에서 걸러 낼 경로인지 본다.
 * `문제거리/` 아래 전부와, 이름이 `_discarded`로 시작하는 폴더·파일이 대상이다.
 */
export function isExcludedPath(path) {
  const parts = String(path).split(/[/\\]/).filter((seg) => seg && seg !== ".");
  return parts.some((seg) => EXCLUDED_DIRS.includes(seg) || seg.startsWith("_discarded"));
}

/** 파일명을 { base, variant } 로 나눈다. variant는 "원본"|"view"|"". */
export function variantOf(name) {
  const stem = String(name).replace(/\.[^./\\]+$/, "");
  const m = /^(.*?)[ _-](원본|view|View|VIEW)$/.exec(stem);
  if (m) return { base: m[1], variant: m[2].toLowerCase() === "view" ? "view" : "원본" };
  return { base: stem, variant: "" };
}

/**
 * 같은 밑동의 `_원본`/`_view`가 함께 있으면 하나만 켠다.
 * 선호 순위: preferOriginal이면 원본 → 무표기 → view, 아니면 view → 무표기 → 원본.
 */
export function dedupeVariants(sources, preferOriginal = true) {
  const rank = preferOriginal ? { "원본": 0, "": 1, view: 2 } : { view: 0, "": 1, "원본": 2 };
  const groups = new Map();
  for (const s of sources) {
    const { base, variant } = variantOf(s.name);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push({ s, variant });
  }
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const variants = new Set(members.map((m) => m.variant));
    if (variants.size < 2) continue; // 같은 종류가 여러 개면 손대지 않는다
    let best = members[0];
    for (const m of members) if (rank[m.variant] < rank[best.variant]) best = m;
    for (const m of members) m.s.enabled = m === best;
  }
  return sources;
}

/** 문자열의 UTF-8 바이트 길이. */
export function byteLength(str) {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(str).length;
  return unescape(encodeURIComponent(str)).length;
}

/** 4MB 정책: 넘치면 이미지 dataUrl을 비우고 다시 직렬화한다. */
export function serializeForSave(project, limit = STORAGE_LIMIT) {
  const json = JSON.stringify(project);
  if (byteLength(json) <= limit) return { json, imagesDropped: false, bytes: byteLength(json) };
  const slim = {
    ...project,
    images: (project.images || []).map((im) => ({ ...im, dataUrl: "" })),
  };
  const thin = JSON.stringify(slim);
  return { json: thin, imagesDropped: true, bytes: byteLength(thin) };
}

/**
 * 외부에서 온 프로젝트 JSON을 기본값 위에 병합한다.
 * 누락 필드는 기본값, 모양이 틀린 항목은 버리고 경고를 남긴다.
 */
export function mergeProject(raw) {
  const warnings = [];
  if (!isPlain(raw)) {
    return { project: defaultProject(), warnings: ["프로젝트 JSON이 객체가 아닙니다. 빈 프로젝트로 시작합니다."] };
  }
  if (raw.version === undefined) {
    warnings.push("프로젝트에 version이 없습니다. 1로 보고 읽습니다.");
  } else if (raw.version !== PROJECT_VERSION) {
    warnings.push(`프로젝트 version이 ${raw.version}입니다(이 앱은 ${PROJECT_VERSION}). 아는 필드만 읽습니다.`);
  }

  const project = deepMerge(defaultProject(), raw);
  project.version = PROJECT_VERSION;

  // sources 정규화 — id·name·text가 없는 항목은 살릴 수 없다.
  const seen = new Set();
  project.sources = (Array.isArray(raw.sources) ? raw.sources : []).flatMap((s, i) => {
    if (!isPlain(s) || typeof s.text !== "string") {
      warnings.push(`sources[${i}]에 text가 없어 건너뜁니다.`);
      return [];
    }
    let id = typeof s.id === "string" && s.id ? s.id : `s${i + 1}`;
    while (seen.has(id)) id = `${id}_`;
    seen.add(id);
    return [{
      id,
      name: typeof s.name === "string" && s.name ? s.name : `${id}.md`,
      text: s.text,
      profileId: typeof s.profileId === "string" && s.profileId ? s.profileId : PROFILE_ID.default,
      subject: isValid(SUBJECT, s.subject) ? s.subject : SUBJECT.default,
      order: Number.isFinite(s.order) ? s.order : i,
      enabled: s.enabled !== false,
    }];
  });
  project.sources.sort((a, b) => a.order - b.order).forEach((s, i) => { s.order = i; });

  // images / imagePlacements / rules / profiles는 배열이어야 한다.
  for (const key of ["images", "imagePlacements", "rules", "profiles"]) {
    if (!Array.isArray(project[key])) {
      if (raw[key] !== undefined) warnings.push(`${key}가 배열이 아니어서 비웁니다.`);
      project[key] = [];
    }
  }
  project.images = project.images.filter((im) => isPlain(im) && typeof im.id === "string");
  if (!isPlain(project.overrides)) project.overrides = {};
  if (!isPlain(project.units.map)) project.units.map = {};
  if (!Array.isArray(project.units.order)) project.units.order = [];
  if (!isPlain(project.units.suborder)) project.units.suborder = {};
  if (!Array.isArray(project.sheets.cover.lines)) project.sheets.cover.lines = [];

  // 쪽별 예외는 배열이어야 한다 — deepMerge는 배열을 통째로 갈아 끼우므로 모양만 여기서 굳힌다.
  const rawRules = project.layout.perPageRules;
  if (rawRules !== undefined && !Array.isArray(rawRules)) {
    warnings.push('layout.perPageRules가 배열이 아니어서 비웁니다.');
  }
  project.layout.perPageRules = normalizePerPageRules(rawRules);

  // 열거형 자리(용지·격자 채우기·번호 모드…)에 목록 밖 값이 들어와 있으면 기본값으로 되돌린다.
  // 병합 뒤에 돌려야 raw에 없던 자리까지 한 번에 훑는다.
  sanitizeEnums(project).forEach((w) => warnings.push(w));

  return { project, warnings };
}

/* ─────────────────────────── 파일 읽기 ─────────────────────────── */

/** File을 텍스트로 읽는다(File.text가 없으면 FileReader). */
function readText(file) {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error || new Error("파일을 읽지 못했습니다."));
    fr.readAsText(file, "utf-8");
  });
}

/** File을 data URL로 읽는다. */
function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error || new Error("이미지를 읽지 못했습니다."));
    fr.readAsDataURL(file);
  });
}

/** data URL의 픽셀 치수를 잰다(실패하면 0×0). */
export function measureDataUrl(dataUrl) {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") return resolve({ width: 0, height: 0 });
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || img.width || 0, height: img.naturalHeight || img.height || 0 });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

/** webkitGetAsEntry 트리를 재귀로 훑어 File 목록을 모은다(경로 포함). */
export async function filesFromEntry(entry, out = []) {
  if (!entry) return out;
  if (entry.isFile) {
    const file = await new Promise((res, rej) => entry.file(res, rej));
    try { Object.defineProperty(file, "_path", { value: entry.fullPath || file.name }); } catch { /* 읽기 전용이면 이름만 쓴다 */ }
    out.push(file);
    return out;
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    for (;;) {
      const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
      if (!batch.length) break;
      for (const e of batch) await filesFromEntry(e, out);
    }
  }
  return out;
}

/** DataTransfer에서 폴더 재귀를 포함해 File 목록을 뽑는다. */
export async function filesFromDataTransfer(dt) {
  const items = dt && dt.items ? Array.from(dt.items) : [];
  const entries = items
    .filter((it) => it.kind === "file")
    .map((it) => (it.webkitGetAsEntry ? it.webkitGetAsEntry() : null));
  if (entries.some(Boolean)) {
    const out = [];
    for (const e of entries) await filesFromEntry(e, out);
    if (out.length) return out;
  }
  return dt && dt.files ? Array.from(dt.files) : [];
}

/** 파일의 정렬 기준 경로(폴더 드롭이면 전체 경로). */
function pathOf(file) {
  return file._path || file.webkitRelativePath || file.name;
}

/* ─────────────────────────── 스토어 ─────────────────────────── */

/** 프로젝트 상태·저장·구독을 묶은 스토어를 만든다. */
export function createStore(opts = {}) {
  const limit = opts.limit || STORAGE_LIMIT;
  const storage = opts.storage !== undefined
    ? opts.storage
    : (typeof localStorage !== "undefined" ? localStorage : null);

  let project = defaultProject();
  let ui = defaultUi();
  let status = { bytes: 0, imagesDropped: false, error: null, savedAt: null };
  const listeners = new Set();
  const warnings = [];
  let saveTimer = null;
  let seq = 0;

  /** 구독자에게 현재 상태를 알린다. */
  function notify(reason) {
    for (const fn of listeners) {
      try { fn(project, reason); } catch (err) { console.error("구독자 오류:", err); }
    }
  }

  /** 스토어가 자체적으로 만든 경고를 쌓는다. */
  function warn(msg) {
    if (msg && !warnings.includes(msg)) warnings.push(msg);
  }

  /** 소스·이미지 id를 겹치지 않게 만든다. */
  function nextId(prefix, list) {
    const used = new Set(list.map((x) => x.id));
    do { seq += 1; } while (used.has(prefix + seq));
    return prefix + seq;
  }

  /** 상태를 갈아 끼우고 저장·알림을 예약한다. */
  function commit(reason) {
    api.autosave();
    notify(reason);
  }

  const api = {
    /** 현재 프로젝트(가변 객체 그대로 — 수정은 set/setPath로). */
    get() { return project; },

    /** 프로젝트 일부를 깊게 병합한다. */
    set(patch, reason = "set") {
      project = deepMerge(project, patch);
      commit(reason);
      return project;
    },

    /** 프로젝트를 통째로 교체한다(가져오기·초기화용). */
    replace(next, reason = "replace") {
      project = next;
      commit(reason);
      return project;
    },

    /** 경로 하나에 값을 쓴다(폼 바인딩의 유일한 통로). */
    setPath(path, value, reason = "path") {
      setPath(project, path, value);
      commit(reason);
      return project;
    },

    /** 경로 하나를 읽는다. */
    getPath(path) { return getPath(project, path); },

    /** 함수로 직접 고친 뒤 저장·알림만 돌린다. */
    update(fn, reason = "update") {
      fn(project);
      commit(reason);
      return project;
    },

    /** 변경 알림을 구독한다. 해지 함수를 돌려준다. */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** 스토어가 모은 경고(파일 읽기 실패·저장 실패 등). */
    getWarnings() { return warnings.slice(); },

    /** 경고를 비운다(재빌드 직전에 호출). */
    clearWarnings() { warnings.length = 0; },

    /** 저장 상태(용량·이미지 제외 여부·오류). */
    getStatus() { return { ...status }; },

    /** UI 전용 설정. */
    getUi() { return { ...ui }; },

    /** UI 전용 설정을 바꾸고 따로 저장한다. */
    setUi(patch) {
      ui = { ...ui, ...patch };
      if (storage) {
        try { storage.setItem(UI_KEY, JSON.stringify(ui)); } catch { /* 저장 못 해도 앱은 돈다 */ }
      }
      return ui;
    },

    /**
     * File 목록을 텍스트 소스·이미지로 갈라 담는다.
     * `문제거리/`·`_discarded…` 아래는 버리고, 자연 정렬 후 `_원본`/`_view` 중복을 정리한다.
     * 프로젝트 JSON이 섞여 있으면 그것 하나를 여는 것으로 갈음한다.
     */
    async addSources(files, options = {}) {
      const preferOriginal = options.preferOriginal !== undefined ? options.preferOriginal : ui.preferOriginal;
      // 이번 호출이 남긴 경고만 따로 모아 돌려준다 — 화면은 "왜 아무것도 안 들어갔는지"를 이걸로 말한다.
      const mine = [];
      const note = (msg) => { if (msg && !mine.includes(msg)) mine.push(msg); warn(msg); };
      const all = Array.from(files || []).slice();
      if (!all.length) {
        return { added: 0, images: 0, imported: false, warnings: ["선택된 파일이 없습니다."] };
      }
      const list = all.filter((f) => !isExcludedPath(pathOf(f)));
      const skipped = all.length - list.length;
      if (skipped) note(`폴더 안 “문제거리”·“_discarded…” 아래 파일 ${skipped}개는 넣지 않았습니다.`);
      list.sort((a, b) => naturalCompare(pathOf(a), pathOf(b)));

      // .json은 내용이 booklet 프로젝트처럼 생겼을 때만 프로젝트로 본다(다른 JSON은 건너뛰고 알린다).
      const projectFiles = [];
      const otherJson = [];
      for (const f of list) {
        if (!isProjectFile(f.name)) continue;
        let text = "";
        try {
          text = await readText(f);
        } catch (err) {
          note(`“${f.name}”을(를) 읽지 못했습니다: ${err && err.message ? err.message : err}`);
          otherJson.push(f);
          continue;
        }
        if (looksLikeProject(text)) projectFiles.push({ file: f, text });
        else { note(`“${f.name}”은(는) booklet 프로젝트 JSON이 아니어서 건너뜁니다.`); otherJson.push(f); }
      }
      const plain = list.filter((f) => !isProjectFile(f.name));

      // 프로젝트 JSON이 하나라도 있으면 그것을 여는 뜻으로 본다(원본 파일과 섞어 놓지 않는다).
      if (projectFiles.length) {
        if (projectFiles.length > 1) {
          note(`프로젝트 JSON이 ${projectFiles.length}개입니다. 첫 번째 “${projectFiles[0].file.name}”만 엽니다.`);
        }
        if (plain.length) {
          note("프로젝트 JSON과 원본 파일을 함께 놓아 JSON만 열었습니다. 원본 파일은 따로 놓으세요.");
        }
        const res = api.importJson(projectFiles[0].text);
        (res.warnings || []).forEach((w) => { if (!mine.includes(w)) mine.push(w); });
        return { added: 0, images: 0, imported: res.ok, name: projectFiles[0].file.name, warnings: mine };
      }

      const addedSources = [];
      const imageFiles = [];
      for (const file of plain) {
        if (isImageFile(file.name)) { imageFiles.push(file); continue; }
        if (!isTextFile(file.name)) {
          note(`“${file.name}”은(는) 다룰 수 없는 형식입니다. .md .txt .markdown 또는 이미지를 넣으세요.`);
          continue;
        }
        try {
          const text = await readText(file);
          if (!text.trim()) { note(`“${file.name}”이(가) 비어 있어 건너뜁니다.`); continue; }
          const src = {
            id: nextId("s", project.sources),
            name: file.name,
            text,
            profileId: "auto",
            subject: "auto",
            order: project.sources.length + addedSources.length,
            enabled: true,
          };
          addedSources.push(src);
        } catch (err) {
          note(`“${file.name}”을(를) 읽지 못했습니다: ${err && err.message ? err.message : err}`);
        }
      }

      if (addedSources.length) {
        project.sources = project.sources.concat(addedSources);
        dedupeVariants(project.sources, preferOriginal);
        project.sources.forEach((s, i) => { s.order = i; });
      }
      let images = 0;
      if (imageFiles.length) images = await api.addImages(imageFiles, { silent: true });

      if (!addedSources.length && !images) {
        // 아무것도 안 들어갔는데 이유도 없으면 사용자가 "멈췄다"고 느낀다 — 반드시 한 줄은 남긴다.
        if (!mine.length) note("넣을 수 있는 파일이 없었습니다. .md .txt .markdown, 이미지, 프로젝트 JSON만 받습니다.");
        return { added: 0, images: 0, imported: false, warnings: mine };
      }
      commit("addSources");
      return { added: addedSources.length, images, imported: false, warnings: mine };
    },

    /** 이미지 파일을 dataUrl + 치수와 함께 담는다. */
    async addImages(files, options = {}) {
      const added = [];
      for (const file of Array.from(files || [])) {
        if (!isImageFile(file.name)) {
          warn(`“${file.name}”은(는) 이미지가 아닙니다.`);
          continue;
        }
        try {
          const dataUrl = await readDataUrl(file);
          const dim = await measureDataUrl(dataUrl);
          added.push({
            id: nextId("img", project.images),
            name: file.name,
            dataUrl,
            width: dim.width,
            height: dim.height,
            size: file.size || byteLength(dataUrl),
          });
        } catch (err) {
          warn(`“${file.name}”을(를) 읽지 못했습니다: ${err && err.message ? err.message : err}`);
        }
      }
      if (added.length) project.images = project.images.concat(added);
      if (!options.silent) commit("addImages");
      return added.length;
    },

    /** 소스 하나를 지운다(딸린 배치·override도 정리). */
    removeSource(id) {
      project.sources = project.sources.filter((s) => s.id !== id);
      project.sources.forEach((s, i) => { s.order = i; });
      const dead = (key) => String(key).startsWith(id + "#");
      project.imagePlacements = project.imagePlacements.filter((p) => !dead(p.problemKey));
      for (const key of Object.keys(project.overrides)) if (dead(key)) delete project.overrides[key];
      for (const key of Object.keys(project.units.map)) if (dead(key) || key === id + "#*") delete project.units.map[key];
      commit("removeSource");
    },

    /** 이미지 하나를 지운다(그 이미지를 쓰던 배치도 함께). */
    removeImage(id) {
      project.images = project.images.filter((im) => im.id !== id);
      project.imagePlacements = project.imagePlacements.filter((p) => p.imageId !== id);
      commit("removeImage");
    },

    /** 주어진 id 순서대로 소스를 재정렬한다. */
    reorder(ids) {
      const byId = new Map(project.sources.map((s) => [s.id, s]));
      const next = [];
      for (const id of ids) if (byId.has(id)) { next.push(byId.get(id)); byId.delete(id); }
      for (const s of byId.values()) next.push(s);
      next.forEach((s, i) => { s.order = i; });
      project.sources = next;
      commit("reorder");
    },

    /** 소스를 한 칸 위·아래로 옮긴다. */
    moveSource(id, delta) {
      const ids = project.sources.map((s) => s.id);
      const i = ids.indexOf(id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= ids.length) return;
      ids.splice(j, 0, ids.splice(i, 1)[0]);
      api.reorder(ids);
    },

    /** 보기 좋게 들여쓴 프로젝트 JSON. */
    exportJson() { return JSON.stringify(project, null, 2); },

    /** JSON 문자열을 읽어 프로젝트로 삼는다. */
    importJson(text) {
      let raw;
      try {
        raw = JSON.parse(text);
      } catch (err) {
        const msg = `프로젝트 JSON을 해석하지 못했습니다: ${err.message}`;
        warn(msg);
        return { ok: false, warnings: [msg] };
      }
      const { project: merged, warnings: ws } = mergeProject(raw);
      project = merged;
      ws.forEach(warn);
      seq = 0;
      commit("importJson");
      return { ok: true, warnings: ws };
    },

    /** 500ms 디바운스 저장. */
    autosave() {
      if (!storage) return;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { saveTimer = null; api.saveNow(); }, 500);
    },

    /** 지금 바로 저장한다(4MB를 넘으면 이미지를 빼고 저장). */
    saveNow() {
      if (!storage) return status;
      const { json, imagesDropped, bytes } = serializeForSave(project, limit);
      try {
        storage.setItem(STORAGE_KEY, json);
        status = { bytes, imagesDropped, error: null, savedAt: Date.now() };
        if (imagesDropped) {
          warn("저장 용량 4MB를 넘어 이미지를 뺀 채로 저장했습니다. 브라우저를 닫기 전에 [내보내기 → JSON 저장]을 하세요.");
        }
      } catch (err) {
        status = { bytes, imagesDropped, error: String(err && err.message ? err.message : err), savedAt: status.savedAt };
        warn(`자동 저장에 실패했습니다(${status.error}). [내보내기 → JSON 저장]으로 직접 보관하세요.`);
      }
      return { ...status };
    },

    /**
     * 시작 상태를 읽는다. 문서에 심긴 #booklet-project가 최우선,
     * 없으면 localStorage, 그것도 없으면 새 프로젝트.
     */
    load() {
      if (storage) {
        try {
          const savedUi = storage.getItem(UI_KEY);
          if (savedUi) ui = { ...ui, ...JSON.parse(savedUi) };
        } catch { /* UI 설정이 깨졌으면 기본값 */ }
      }

      const el = typeof document !== "undefined" ? document.getElementById("booklet-project") : null;
      if (el && el.textContent.trim()) {
        const res = api.importJson(el.textContent);
        return { from: "embedded", warnings: res.warnings };
      }
      if (storage) {
        let saved = null;
        try { saved = storage.getItem(STORAGE_KEY); } catch { saved = null; }
        if (saved) {
          const res = api.importJson(saved);
          return { from: "storage", warnings: res.warnings };
        }
      }
      notify("load");
      return { from: "new", warnings: [] };
    },

    /** 프로젝트를 초기 상태로 되돌리고 저장본도 지운다. */
    reset() {
      project = defaultProject();
      warnings.length = 0;
      seq = 0;
      if (storage) {
        try { storage.removeItem(STORAGE_KEY); } catch { /* 못 지워도 덮어써진다 */ }
      }
      commit("reset");
      return project;
    },
  };

  return api;
}
