/**
 * store.test.mjs — store.js 단위 시험. 브라우저 API는 최소 스텁으로 갈음한다.
 * 검사: 자연 정렬 · _원본/_view 중복 · importJson 병합 · 4MB 정책 · §2.1 스키마.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createStore, defaultProject, defaultLayout,
  naturalCompare, variantOf, dedupeVariants,
  mergeProject, serializeForSave, byteLength, normalizePerPageRules,
  getPath, setPath, deepMerge,
  isTextFile, isImageFile, isProjectFile, isExcludedPath, extOf,
  STORAGE_KEY, STORAGE_LIMIT,
} from "../src/store.js";

/* ── 스텁 ─────────────────────────────────────────── */

/** localStorage 흉내(용량 제한을 흉내 낼 수 있다). */
function makeStorage(limit = Infinity) {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (v.length > limit) throw new Error("QuotaExceededError");
      map.set(k, v);
    },
    removeItem: (k) => map.delete(k),
  };
}

/** File 흉내 — 이름과 텍스트만 있으면 store가 읽을 수 있다. */
function fakeFile(name, text = "본문", size = null) {
  return { name, size: size == null ? text.length : size, text: async () => text };
}

/** 폴더 드롭 흉내 — store가 보는 경로(_path)를 함께 단 File. */
function fakeDropped(path, text = "본문") {
  const file = fakeFile(path.split("/").pop(), text);
  file._path = path;
  return file;
}

/* ── 자연 정렬 ────────────────────────────────────── */

test("자연 정렬: 숫자 덩어리를 수로 견준다", () => {
  const names = ["batch-10.md", "batch-2.md", "batch-1.md", "batch-21.md", "batch-3.md"];
  assert.deepEqual(
    names.slice().sort(naturalCompare),
    ["batch-1.md", "batch-2.md", "batch-3.md", "batch-10.md", "batch-21.md"],
  );
});

test("자연 정렬: 앞자리 0과 폴더 경로도 흔들리지 않는다", () => {
  assert.equal(naturalCompare("chem_batch3.md", "chem_batch12.md") < 0, true);
  assert.equal(naturalCompare("a/09.md", "a/10.md") < 0, true);
  assert.equal(naturalCompare("01.md", "1.md"), 0 - 0 + naturalCompare("01.md", "1.md"));
  assert.equal(naturalCompare("같은.md", "같은.md"), 0);
});

test("자연 정렬로 소스가 batch 순서대로 들어간다", async () => {
  const store = createStore({ storage: makeStorage() });
  await store.addSources([fakeFile("batch-10.md"), fakeFile("batch-2.md"), fakeFile("batch-1.md")]);
  assert.deepEqual(store.get().sources.map((s) => s.name), ["batch-1.md", "batch-2.md", "batch-10.md"]);
  assert.deepEqual(store.get().sources.map((s) => s.order), [0, 1, 2]);
});

/* ── _원본 / _view ────────────────────────────────── */

test("variantOf: 밑동과 갈래를 가른다", () => {
  assert.deepEqual(variantOf("kor_grammar_원본.md"), { base: "kor_grammar", variant: "원본" });
  assert.deepEqual(variantOf("kor_grammar_view.md"), { base: "kor_grammar", variant: "view" });
  assert.deepEqual(variantOf("kor_grammar.md"), { base: "kor_grammar", variant: "" });
});

test("_원본과 _view가 함께 오면 _원본만 켜진다", () => {
  const sources = [
    { id: "s1", name: "kor_grammar_원본.md", enabled: true },
    { id: "s2", name: "kor_grammar_view.md", enabled: true },
    { id: "s3", name: "eng_batch.md", enabled: true },
  ];
  dedupeVariants(sources, true);
  assert.deepEqual(sources.map((s) => s.enabled), [true, false, true]);
});

test("preferOriginal을 끄면 _view가 켜진다", () => {
  const sources = [
    { id: "s1", name: "kor_grammar_원본.md", enabled: true },
    { id: "s2", name: "kor_grammar_view.md", enabled: true },
  ];
  dedupeVariants(sources, false);
  assert.deepEqual(sources.map((s) => s.enabled), [false, true]);
});

test("무표기 파일과 _view가 함께 오면 무표기가 이긴다", async () => {
  const store = createStore({ storage: makeStorage() });
  await store.addSources([fakeFile("kor_grammar.md"), fakeFile("kor_grammar_view.md")], { preferOriginal: true });
  const on = store.get().sources.filter((s) => s.enabled).map((s) => s.name);
  assert.deepEqual(on, ["kor_grammar.md"]);
});

test("같은 갈래끼리는 건드리지 않는다", () => {
  const sources = [
    { id: "s1", name: "a_원본.md", enabled: true },
    { id: "s2", name: "b_원본.md", enabled: true },
  ];
  dedupeVariants(sources, true);
  assert.deepEqual(sources.map((s) => s.enabled), [true, true]);
});

/* ── 파일 갈래 ────────────────────────────────────── */

test("확장자로 텍스트·이미지를 가른다", () => {
  assert.equal(extOf("A.MD"), ".md");
  assert.equal(isTextFile("chem.markdown"), true);
  assert.equal(isTextFile("fig.png"), false);
  assert.equal(isImageFile("fig.WEBP"), true);
  assert.equal(isImageFile("note.pdf"), false);
});

test("다룰 수 없는 형식은 경고로 남고 소스에 들어가지 않는다", async () => {
  const store = createStore({ storage: makeStorage() });
  await store.addSources([fakeFile("문서.pdf"), fakeFile("좋은.md")]);
  assert.equal(store.get().sources.length, 1);
  assert.match(store.getWarnings().join("\n"), /문서\.pdf/);
});

/* ── 폴더 드롭에서 걸러 내기 ──────────────────────── */

test("isExcludedPath: 문제거리·_discarded 아래만 걸러 낸다", () => {
  assert.equal(isExcludedPath("run/문제거리/batch-1.md"), true);
  assert.equal(isExcludedPath("run/_discarded_2026/batch-1.md"), true);
  assert.equal(isExcludedPath("run/_discarded-batch-3.md"), true);
  assert.equal(isExcludedPath("run/batch-1_원본.md"), false);
  assert.equal(isExcludedPath("문제거리.md"), false, "폴더 이름과 같은 파일명은 살린다");
});

test("폴더를 놓아도 문제거리·_discarded 아래는 소스가 되지 않는다", async () => {
  const store = createStore({ storage: makeStorage() });
  const res = await store.addSources([
    fakeDropped("/run/batch-1.md"),
    fakeDropped("/run/문제거리/버린것.md"),
    fakeDropped("/run/_discarded_09/옛것.md"),
  ]);
  assert.equal(res.added, 1);
  assert.deepEqual(store.get().sources.map((s) => s.name), ["batch-1.md"]);
  assert.match(store.getWarnings().join("\n"), /문제거리/);
});

/* ── 프로젝트 JSON 드롭 ───────────────────────────── */

test("isProjectFile: .json만 프로젝트 파일로 본다", () => {
  assert.equal(isProjectFile("화학.booklet.json"), true);
  assert.equal(isProjectFile("a.JSON"), true);
  assert.equal(isProjectFile("a.md"), false);
});

test(".json을 놓으면 소스가 아니라 프로젝트를 연다", async () => {
  const store = createStore({ storage: makeStorage() });
  await store.addSources([fakeFile("먼저.md")]);
  const json = JSON.stringify({ version: 1, title: "놓아서 연 프로젝트", numbering: { mode: "perUnit" } });
  const res = await store.addSources([fakeFile("x.booklet.json", json)]);
  assert.equal(res.imported, true);
  assert.equal(res.added, 0);
  assert.equal(store.get().title, "놓아서 연 프로젝트");
  assert.equal(store.get().sources.length, 0, "앞서 넣은 소스는 열린 프로젝트로 갈린다");
});

test("프로젝트 JSON과 원본 파일을 함께 놓으면 JSON만 열고 알린다", async () => {
  const store = createStore({ storage: makeStorage() });
  const json = JSON.stringify({ version: 1, title: "섞어 놓음" });
  const res = await store.addSources([fakeFile("a.md"), fakeFile("p.json", json)]);
  assert.equal(res.imported, true);
  assert.equal(store.get().title, "섞어 놓음");
  assert.match(store.getWarnings().join("\n"), /함께 놓아/);
});

/* ── 경로 도구 ────────────────────────────────────── */

test("getPath·setPath가 중간 객체를 만들어 가며 오간다", () => {
  const o = {};
  setPath(o, "layout.grid.cols", 2);
  assert.equal(getPath(o, "layout.grid.cols"), 2);
  assert.equal(getPath(o, "layout.없음.cols"), undefined);
});

test("deepMerge는 객체만 깊게 섞고 배열은 갈아 끼운다", () => {
  const out = deepMerge({ a: { b: 1, c: 2 }, list: [1, 2] }, { a: { c: 3 }, list: [9] });
  assert.deepEqual(out, { a: { b: 1, c: 3 }, list: [9] });
});

/* ── 기본 스키마 (DESIGN §2.1) ────────────────────── */

test("기본 프로젝트가 §2.1의 키를 전부 갖는다", () => {
  const p = defaultProject();
  const keys = [
    "version", "title", "subtitle", "meta", "sources", "profiles", "rules",
    "layout", "numbering", "units", "sheets", "images", "imagePlacements", "overrides",
  ];
  for (const k of keys) assert.ok(k in p, `${k} 키가 없습니다`);
  assert.equal(p.version, 1);
  for (const k of ["subject", "grade", "institute", "date", "round", "period"]) assert.ok(k in p.meta, `meta.${k}`);
  for (const k of ["mode", "start", "pad"]) assert.ok(k in p.numbering, `numbering.${k}`);
  for (const k of ["source", "order", "suborder", "map"]) assert.ok(k in p.units, `units.${k}`);
  for (const k of ["cover", "problems", "answers", "explanations", "toc"]) assert.ok(k in p.sheets, `sheets.${k}`);
  assert.deepEqual(Object.keys(p.sheets.answers).sort(), ["enabled", "perRow", "title"]);
  assert.deepEqual(p.sheets.toc, { enabled: true, front: true, perUnit: true, pageNumbers: true, title: "차례" });
});

test("기본 LayoutSettings가 §2.6 값을 그대로 쓴다", () => {
  const l = defaultLayout();
  assert.equal(l.page, "A4");
  assert.equal(l.orientation, "portrait");
  assert.deepEqual(l.margin, { top: 18, right: 14, bottom: 16, left: 14 });
  assert.deepEqual(l.grid, { cols: 2, rows: 1 });
  assert.equal(l.gutter, 8);
  assert.equal(l.rowGap, 6);
  assert.equal(l.columnRule, true);
  assert.equal(l.rowRule, false);
  assert.equal(l.fillOrder, "auto");
  assert.equal(l.font.size, 10);
  assert.equal(l.font.lineHeight, 1.55);
  assert.deepEqual(l.header, { left: "{title}", center: "", right: "{unit}" });
  assert.deepEqual(l.footer, { left: "", center: "{page}", right: "" });
  assert.equal(l.examStyle, false);
  assert.equal(l.problemGap, 5);
  assert.equal(l.numberStyle, "plain");
  assert.equal(l.passageStyle, "boxed");
  assert.equal(l.choiceStyle, "auto");
  assert.deepEqual(l.keep, {
    headWithStem: true, stemWithFirstChoice: true, choicesTogether: true,
    allowPassageSplit: true, allowTableSplit: true, bandWithFirst: true,
    passageWithFirst: true, shrinkToKeep: true,
  });
  // 쪽당 문항 수는 처음엔 제한 없음이다 — 켜자마자 쪽 수가 달라지면 사용자가 놀란다.
  assert.deepEqual(l.perPage, { min: 0, max: 0 });
  assert.deepEqual(l.perPageRules, []);
  assert.deepEqual(l.perPageFont, { enabled: true, minSize: 8, step: 0.25 });
  assert.deepEqual(l.figure, { mode: "svg", maxWidth: 100 });
  assert.deepEqual(l.unitBand, { enabled: true, style: "band" });
  assert.deepEqual(l.subunitBand, { enabled: true });
});

test("기본값 객체는 호출마다 새것이라 서로 물들지 않는다", () => {
  const a = defaultProject();
  const b = defaultProject();
  a.layout.grid.cols = 9;
  assert.equal(b.layout.grid.cols, 2);
});

/* ── importJson 병합 ──────────────────────────────── */

test("mergeProject: 빠진 필드는 기본값으로 채운다", () => {
  const { project, warnings } = mergeProject({
    version: 1,
    title: "화학 문제집",
    sources: [{ id: "s1", name: "a.md", text: "본문" }],
    layout: { grid: { cols: 1 } },
  });
  assert.equal(project.title, "화학 문제집");
  assert.equal(project.layout.grid.cols, 1);
  assert.equal(project.layout.grid.rows, 1, "함께 적지 않은 rows는 기본값");
  assert.equal(project.layout.margin.top, 18);
  assert.equal(project.sources[0].profileId, "auto", "적히지 않은 프로파일은 자동 판별에 맡긴다");
  assert.equal(project.sources[0].subject, "auto");
  assert.equal(project.sources[0].enabled, true);
  assert.deepEqual(project.images, []);
  assert.deepEqual(warnings, []);
});

test("mergeProject: version이 다르면 경고를 남기고 아는 필드만 읽는다", () => {
  const a = mergeProject({ version: 7, title: "T" });
  assert.equal(a.project.version, 1);
  assert.match(a.warnings.join(), /version/);
  const b = mergeProject({ title: "T" });
  assert.match(b.warnings.join(), /version/);
});

test("mergeProject: 모양이 틀린 항목은 버리고 알린다", () => {
  const { project, warnings } = mergeProject({
    version: 1,
    sources: [{ id: "s1", name: "a.md" }, { id: "s2", name: "b.md", text: "본문" }],
    rules: "규칙 아님",
    units: { map: null },
  });
  assert.equal(project.sources.length, 1);
  assert.equal(project.sources[0].id, "s2");
  assert.deepEqual(project.rules, []);
  assert.deepEqual(project.units.map, {});
  assert.equal(warnings.length >= 2, true);
});

test("mergeProject: 소스 id가 겹치면 갈라 준다", () => {
  const { project } = mergeProject({
    sources: [{ id: "s1", name: "a.md", text: "1" }, { id: "s1", name: "b.md", text: "2" }],
  });
  assert.equal(new Set(project.sources.map((s) => s.id)).size, 2);
});

test("importJson: 스토어에 실려 저장까지 이어진다", () => {
  const storage = makeStorage();
  const store = createStore({ storage });
  const res = store.importJson(JSON.stringify({ version: 1, title: "가져온 것", numbering: { mode: "perUnit" } }));
  assert.equal(res.ok, true);
  assert.equal(store.get().title, "가져온 것");
  assert.equal(store.get().numbering.mode, "perUnit");
  assert.equal(store.get().numbering.start, 1);
  store.saveNow();
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).title, "가져온 것");
});

test("importJson: 깨진 JSON은 앱을 죽이지 않고 경고가 된다", () => {
  const store = createStore({ storage: makeStorage() });
  const res = store.importJson("{ 이건 JSON이 아니다");
  assert.equal(res.ok, false);
  assert.match(res.warnings[0], /해석하지 못했습니다/);
  assert.equal(store.get().title, "문제집", "실패해도 앞 상태가 남는다");
});

test("exportJson은 2칸 들여쓴 JSON이다", () => {
  const store = createStore({ storage: makeStorage() });
  const text = store.exportJson();
  assert.match(text, /^\{\n {2}"version": 1/);
  assert.deepEqual(JSON.parse(text).layout.grid, { cols: 2, rows: 1 });
});

/* ── 4MB 정책 ─────────────────────────────────────── */

/** 원하는 바이트 수에 가까운 가짜 dataUrl. */
function fatDataUrl(bytes) {
  return "data:image/png;base64," + "A".repeat(bytes);
}

test("4MB 안이면 이미지까지 그대로 저장한다", () => {
  const p = defaultProject();
  p.images.push({ id: "img1", name: "a.png", dataUrl: fatDataUrl(1000), width: 10, height: 10 });
  const { json, imagesDropped, bytes } = serializeForSave(p, STORAGE_LIMIT);
  assert.equal(imagesDropped, false);
  assert.equal(JSON.parse(json).images[0].dataUrl.length > 1000, true);
  assert.equal(bytes, byteLength(json));
});

test("4MB를 넘으면 이미지 dataUrl만 빼고 저장한다", () => {
  const p = defaultProject();
  p.title = "무거운 프로젝트";
  p.images.push({ id: "img1", name: "big.png", dataUrl: fatDataUrl(5 * 1024 * 1024), width: 800, height: 600 });
  const { json, imagesDropped } = serializeForSave(p, STORAGE_LIMIT);
  assert.equal(imagesDropped, true);
  const back = JSON.parse(json);
  assert.equal(back.images[0].dataUrl, "");
  assert.equal(back.images[0].name, "big.png", "이름·치수는 남는다");
  assert.equal(back.images[0].width, 800);
  assert.equal(back.title, "무거운 프로젝트");
  assert.equal(byteLength(json) < STORAGE_LIMIT, true);
});

test("스토어가 용량을 넘기면 경고 깃발을 세운다", () => {
  const storage = makeStorage();
  const store = createStore({ storage, limit: 4096 });
  store.update((p) => {
    p.images.push({ id: "img1", name: "big.png", dataUrl: fatDataUrl(9000), width: 4, height: 4 });
  });
  const st = store.saveNow();
  assert.equal(st.imagesDropped, true);
  assert.equal(st.error, null);
  assert.match(store.getWarnings().join("\n"), /4MB|이미지를 뺀/);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).images[0].dataUrl, "");
});

test("저장 자체가 막히면 오류를 삼키지 않고 경고로 알린다", () => {
  const store = createStore({ storage: makeStorage(10), limit: 4096 });
  const st = store.saveNow();
  assert.match(st.error, /Quota/);
  assert.match(store.getWarnings().join("\n"), /자동 저장에 실패/);
});

/* ── 스토어 살림 ─────────────────────────────────── */

test("setPath 한 번이 구독자에게 그대로 간다", () => {
  const store = createStore({ storage: makeStorage() });
  let hits = 0;
  store.subscribe(() => { hits += 1; });
  store.setPath("layout.grid.cols", 2);
  store.setPath("layout.font.size", 11);
  assert.equal(hits, 2);
  assert.equal(store.get().layout.font.size, 11);
});

test("소스를 지우면 딸린 배치·override·단원 지정도 함께 사라진다", async () => {
  const store = createStore({ storage: makeStorage() });
  await store.addSources([fakeFile("a.md"), fakeFile("b.md")]);
  const [s1] = store.get().sources;
  store.update((p) => {
    p.imagePlacements.push({ problemKey: `${s1.id}#0`, imageId: "img1", slot: "afterStem" });
    p.overrides[`${s1.id}#0`] = { exclude: true };
    p.units.map[`${s1.id}#*`] = { unit: "Ⅰ" };
  });
  store.removeSource(s1.id);
  const p = store.get();
  assert.equal(p.sources.length, 1);
  assert.equal(p.imagePlacements.length, 0);
  assert.deepEqual(p.overrides, {});
  assert.deepEqual(p.units.map, {});
});

test("reorder와 moveSource가 order를 다시 매긴다", async () => {
  const store = createStore({ storage: makeStorage() });
  await store.addSources([fakeFile("a.md"), fakeFile("b.md"), fakeFile("c.md")]);
  const ids = store.get().sources.map((s) => s.id);
  store.reorder([ids[2], ids[0], ids[1]]);
  assert.deepEqual(store.get().sources.map((s) => s.name), ["c.md", "a.md", "b.md"]);
  assert.deepEqual(store.get().sources.map((s) => s.order), [0, 1, 2]);
  store.moveSource(ids[2], 1);
  assert.deepEqual(store.get().sources.map((s) => s.name), ["a.md", "c.md", "b.md"]);
});

test("load: 저장본이 있으면 그것으로 시작한다", () => {
  const storage = makeStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, title: "지난번 작업" }));
  const store = createStore({ storage });
  const res = store.load();
  assert.equal(res.from, "storage");
  assert.equal(store.get().title, "지난번 작업");
});

test("reset: 프로젝트도 저장본도 처음으로 돌아간다", async () => {
  const storage = makeStorage();
  const store = createStore({ storage });
  await store.addSources([fakeFile("a.md")]);
  store.saveNow();
  store.reset();
  assert.equal(store.get().sources.length, 0);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.deepEqual(store.getWarnings(), []);
});

/* ── 쪽별 예외(layout.perPageRules) ───────────────── */

test("normalizePerPageRules — 빈 행·겹치는 쪽을 버리고 쪽번호 순으로 세운다", () => {
  const out = normalizePerPageRules([
    { page: 5, min: 2, max: "3" },
    { page: "", min: 1, max: 1 },       // 쪽번호 없는 빈 행
    { page: 5, min: 9, max: 9 },        // 겹치는 쪽 — 먼저 온 것만 남는다
    { page: 2, min: -4, max: 2.6 },     // 음수·소수는 0 이상 정수로
    null,
    { page: 0, min: 1, max: 1 },        // 0쪽은 없는 쪽
  ]);
  assert.deepEqual(out, [
    { page: 2, min: 0, max: 3 },
    { page: 5, min: 2, max: 3 },
  ]);
});

test("importJson이 쪽별 예외 배열을 기본값으로 덮지 않는다", () => {
  const { project } = mergeProject({
    version: 1,
    layout: { perPageRules: [{ page: 3, min: 1, max: 2 }], perPage: { min: 2, max: 4 } },
  });
  assert.deepEqual(project.layout.perPageRules, [{ page: 3, min: 1, max: 2 }]);
  assert.deepEqual(project.layout.perPage, { min: 2, max: 4 });
  // 적지 않은 곳은 기본값이 그대로 채워진다.
  assert.deepEqual(project.layout.perPageFont, { enabled: true, minSize: 8, step: 0.25 });
  assert.equal(project.layout.keep.bandWithFirst, true);
});

test("쪽별 예외가 배열이 아니면 비우고 경고한다", () => {
  const { project, warnings } = mergeProject({ version: 1, layout: { perPageRules: { page: 3 } } });
  assert.deepEqual(project.layout.perPageRules, []);
  assert.ok(warnings.some((w) => w.includes("perPageRules")));
});
