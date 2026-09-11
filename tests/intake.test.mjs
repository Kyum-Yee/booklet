// 파일 넣기(addSources)의 "아무 일도 안 일어나는" 갈래마다 이유가 남는지 — 업로드가 멈춘 듯 보이는 일을 막는다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore, looksLikeProject } from "../src/store.js";

function makeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
function fakeFile(name, text = "본문") {
  return { name, size: text.length, text: async () => text };
}

test("빈 목록을 넣으면 '선택된 파일이 없습니다'를 돌려준다", async () => {
  const store = createStore({ storage: makeStorage() });
  const res = await store.addSources([]);
  assert.equal(res.added, 0);
  assert.match(res.warnings[0], /선택된 파일이 없습니다/);
});

test("받지 않는 확장자만 넣으면 이유가 돌아오고 커밋은 없다", async () => {
  const store = createStore({ storage: makeStorage() });
  let commits = 0;
  store.subscribe(() => { commits++; });
  const res = await store.addSources([fakeFile("문서.pdf"), fakeFile("표.xlsx")]);
  assert.equal(res.added, 0);
  assert.equal(res.images, 0);
  assert.equal(res.warnings.length, 2, "파일마다 한 줄");
  assert.match(res.warnings[0], /다룰 수 없는 형식/);
  assert.equal(commits, 0);
});

test("booklet 프로젝트가 아닌 .json은 프로젝트로 열지 않고 건너뛴다", async () => {
  const store = createStore({ storage: makeStorage() });
  await store.addSources([fakeFile("먼저.md")]);
  const res = await store.addSources([fakeFile("settings.json", JSON.stringify({ theme: "dark" }))]);
  assert.equal(res.imported, false, "프로젝트로 열리지 않는다");
  assert.equal(store.get().sources.length, 1, "앞서 넣은 소스가 살아 있다");
  assert.match(res.warnings[0], /프로젝트 JSON이 아니어서/);
});

test("깨진 .json도 작업을 날리지 않는다", async () => {
  const store = createStore({ storage: makeStorage() });
  await store.addSources([fakeFile("먼저.md")]);
  const res = await store.addSources([fakeFile("bad.json", "{ not json")]);
  assert.equal(res.imported, false);
  assert.equal(store.get().sources.length, 1);
});

test("프로젝트 .json과 다른 .json이 섞이면 프로젝트만 열고 나머지는 알린다", async () => {
  const store = createStore({ storage: makeStorage() });
  const res = await store.addSources([
    fakeFile("data.json", JSON.stringify([1, 2, 3])),
    fakeFile("p.booklet.json", JSON.stringify({ version: 1, title: "열림" })),
  ]);
  assert.equal(res.imported, true);
  assert.equal(store.get().title, "열림");
  assert.ok(res.warnings.some((w) => /data\.json/.test(w)));
});

test("성공한 호출은 그 호출의 경고만 돌려준다(누적 경고와 섞이지 않는다)", async () => {
  const store = createStore({ storage: makeStorage() });
  await store.addSources([fakeFile("문서.pdf")]);           // 누적 경고 1
  const res = await store.addSources([fakeFile("a.md"), fakeFile("빈.md", "   ")]);
  assert.equal(res.added, 1);
  assert.equal(res.warnings.length, 1);
  assert.match(res.warnings[0], /비어 있어/);
  assert.equal(store.getWarnings().length, 2, "저장소에는 둘 다 남는다");
});

test("looksLikeProject — 객체이고 프로젝트 키가 하나라도 있어야 한다", () => {
  assert.equal(looksLikeProject('{"version":1}'), true);
  assert.equal(looksLikeProject('{"sources":[]}'), true);
  assert.equal(looksLikeProject('{"layout":{"grid":{"cols":2}}}'), true);
  assert.equal(looksLikeProject('{"theme":"dark"}'), false);
  assert.equal(looksLikeProject("[1,2]"), false);
  assert.equal(looksLikeProject("null"), false);
  assert.equal(looksLikeProject("nope"), false);
});
