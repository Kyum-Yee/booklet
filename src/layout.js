// layout.js — 페이지네이션 엔진: 기하 계산 → 스트림 → 측정 → 셀 패킹 → 페이지 조립 → 차례 2-pass.
// 렌더 함수는 doc.renderers로 주입받으므로 이 파일은 toc.js·sheets.js 외의 src 모듈을 import하지 않는다.
// [브라우저 전용]

import { buildTocEntries, renderToc, tocParts, subunitKey } from './toc.js';
import { answerSheetAtoms, explanationAtoms } from './sheets.js';

const MM = 96 / 25.4; // 1mm → CSS px
const HEAD_MM = 7;
const FOOT_MM = 7;
const PAGE_SIZES = {
  A4: { w: 210, h: 297 },
  B4: { w: 257, h: 364 },
  B5: { w: 182, h: 257 },
  Letter: { w: 215.9, h: 279.4 },
};

/** LayoutSettings 기본값(§2.6). project.layout이 비어 있어도 조판이 되도록 전부 채운다. */
export const DEFAULT_LAYOUT = {
  page: 'A4',
  orientation: 'portrait',
  margin: { top: 18, right: 14, bottom: 16, left: 14 },
  grid: { cols: 2, rows: 1 },
  gutter: 8,
  rowGap: 6,
  columnRule: true,
  rowRule: false,
  fillOrder: 'auto',
  font: {
    family: "'Noto Serif KR', 'Apple SD Gothic Neo', 'Malgun Gothic', serif",
    size: 10,
    lineHeight: 1.55,
    mathScale: 1,
  },
  header: { left: '{title}', center: '', right: '{unit}' },
  footer: { left: '', center: '{page}', right: '' },
  examStyle: false,
  problemGap: 5,
  // 칸 아래 여유(mm): 측정과 실제 렌더의 오차(글꼴 지연·양끝맞춤 재배치·반올림)를 흡수해 마지막 줄이 잘리지 않게 한다.
  cellSlack: 3,
  numberStyle: 'plain',
  showTime: false,
  showRef: false,
  showSrcNum: false,
  // mdheading의 `### [문항 N] 제목`에서 온 problem.title을 번호 뒤에 작게 병기할지.
  // render.js가 settings.showTitle을 읽는데 여기에 기본값이 없으면 UI에서 켤 길이 없다.
  showTitle: false,
  passageStyle: 'boxed',
  choiceStyle: 'auto',
  keep: {
    headWithStem: true,
    stemWithFirstChoice: true,
    choicesTogether: true,
    allowPassageSplit: true,
    allowTableSplit: true,
    // 단원·소단원 띠는 그 뒤 첫 문항과 한 칸에 함께 놓는다(띠만 칸 끝에 남는 일을 막는다).
    bandWithFirst: true,
    // 여러 문항이 나눠 읽는 지문은 첫 문항의 일부로 본다(지문 끝과 번호·발문을 한 칸에).
    passageWithFirst: true,
    // 붙여 두기가 안 될 때 그 쪽 글자를 줄여 본다(perPageFont를 꺼 두어도 이것만은 돈다).
    shrinkToKeep: true,
  },
  // 한 쪽에서 **시작**하는 문항 수의 최소·최대(0 = 제한 없음). 문제 시트에만 건다.
  perPage: { min: 0, max: 0 },
  // 쪽번호별 예외. [{ page: 5, min: 2, max: 3 }] — 그 쪽은 전역 대신 이 값을 쓴다(0 = 제한 없음).
  perPageRules: [],
  // 최소 미달 쪽의 글자를 step(pt)씩 줄여 minSize까지 다시 배치한다.
  perPageFont: { enabled: true, minSize: 8, step: 0.25 },
  figure: { mode: 'svg', maxWidth: 100 },
  unitBand: { enabled: true, style: 'band' },
  subunitBand: { enabled: true },
};

/** 평범한 객체만 깊게 병합한다(배열·null은 통째로 교체). */
function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch === undefined ? base : patch;
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const k of Object.keys(patch)) {
    const v = patch[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && base && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      out[k] = deepMerge(base[k], v);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

/** HTML 특수문자 이스케이프. */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 배율을 먹인 본문 글자 크기(pt 문자열). 소수 넷째 자리에서 끊어 배율 키가 흔들리지 않게 한다. */
function fontPt(size, scale) {
  return `${Math.round(size * scale * 10000) / 10000}pt`;
}

/** 소수 꼬리를 정리한 숫자 문자열(경고 문장에 8pt를 "8"로 찍는다). */
function trimNum(n) {
  return String(Math.round(Number(n) * 100) / 100);
}

/** 머리말·꼬리말 세 칸 중 하나라도 내용이 있으면 참. */
function hasText(band) {
  if (!band) return false;
  return ['left', 'center', 'right'].some((k) => String(band[k] || '').trim() !== '');
}

/* ─────────────────────────── 1. 기하 ─────────────────────────── */

/**
 * 용지·여백·격자로부터 페이지·셀의 픽셀 치수를 계산한다.
 * @param {Object} settings LayoutSettings
 * @param {{cols:number, rows:number}} grid 격자(해설 시트는 자체 격자를 넘긴다)
 * @param {string} id 기하 식별자(측정 컨테이너 키)
 */
export function computeGeometry(settings, grid, id = 'main') {
  const s = settings;
  const size = typeof s.page === 'string' ? PAGE_SIZES[s.page] || PAGE_SIZES.A4 : s.page;
  let wmm = size.w;
  let hmm = size.h;
  if (s.orientation === 'landscape') {
    const t = wmm;
    wmm = hmm;
    hmm = t;
  }
  const m = s.margin;
  const headMm = hasText(s.header) || s.examStyle ? HEAD_MM : 0;
  const footMm = hasText(s.footer) || s.examStyle ? FOOT_MM : 0;
  const cols = Math.max(1, grid.cols | 0);
  const rows = Math.max(1, grid.rows | 0);
  const bodyWmm = wmm - m.left - m.right;
  const bodyHmm = hmm - m.top - m.bottom - headMm - footMm;
  const cellWmm = (bodyWmm - s.gutter * (cols - 1)) / cols;
  const cellHmm = (bodyHmm - s.rowGap * (rows - 1)) / rows;

  const order = s.fillOrder === 'auto' ? (rows === 1 ? 'column' : 'row') : s.fillOrder;
  const fillSeq = [];
  if (order === 'column') {
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) fillSeq.push(r * cols + c);
  } else {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) fillSeq.push(r * cols + c);
  }

  const px = (mm) => Math.round(mm * MM * 100) / 100;
  return {
    id,
    cols,
    rows,
    cellCount: cols * rows,
    fillSeq,
    order,
    pageW: px(wmm),
    pageH: px(hmm),
    padT: px(m.top),
    padR: px(m.right),
    padB: px(m.bottom),
    padL: px(m.left),
    headH: px(headMm),
    footH: px(footMm),
    bodyW: px(bodyWmm),
    bodyH: px(bodyHmm),
    cellW: px(cellWmm),
    // 0.5px 여유: 브라우저 반올림으로 마지막 원자가 칸 밖으로 삐져나오는 것을 막는다
    cellH: px(cellHmm) - 0.5,
    gutter: px(s.gutter),
    rowGap: px(s.rowGap),
    problemGap: px(s.problemGap),
    // 배치 예산에서만 빼는 여유. 보이는 칸 높이(--cell-h)는 그대로라 내용 아래에 빈 띠가 남는다.
    slack: px(Math.max(0, Number(s.cellSlack) || 0)),
  };
}

/** 기하 값을 CSS 변수로 요소에 심는다(mount 기본값 + 페이지별 덮어쓰기 공용). */
function applyGeomVars(el, geom) {
  const v = {
    '--page-w': geom.pageW + 'px',
    '--page-h': geom.pageH + 'px',
    '--pad-t': geom.padT + 'px',
    '--pad-r': geom.padR + 'px',
    '--pad-b': geom.padB + 'px',
    '--pad-l': geom.padL + 'px',
    '--body-w': geom.bodyW + 'px',
    '--body-h': geom.bodyH + 'px',
    '--cell-w': geom.cellW + 'px',
    '--cell-h': geom.cellH + 0.5 + 'px',
    '--cols': String(geom.cols),
    '--rows': String(geom.rows),
    '--gutter': geom.gutter + 'px',
    '--row-gap': geom.rowGap + 'px',
    '--head-h': geom.headH + 'px',
    '--foot-h': geom.footH + 'px',
  };
  for (const k of Object.keys(v)) el.style.setProperty(k, v[k]);
}

/** 글꼴·간격 변수를 mount에 심는다(측정 컨테이너가 같은 값을 상속해야 측정=배치). */
function applyFontVars(mount, s) {
  mount.style.setProperty('--font-family', s.font.family);
  mount.style.setProperty('--font-size', s.font.size + 'pt');
  // 쪽마다 덮어써지는 --font-size와 달리 책 전체에서 하나인 값(머리말·꼬리말이 본다).
  mount.style.setProperty('--font-size-base', s.font.size + 'pt');
  mount.style.setProperty('--line-height', String(s.font.lineHeight));
  mount.style.setProperty('--math-scale', String(s.font.mathScale ?? 1));
  mount.style.setProperty('--problem-gap', s.problemGap + 'mm');
  mount.style.setProperty('--fig-max', (s.figure?.maxWidth ?? 100) + '%');
}

/** 인쇄용 @page 규칙을 head에 주입(갱신)한다. */
function injectPageStyle(geom) {
  let st = document.getElementById('page-size');
  if (!st) {
    st = document.createElement('style');
    st.id = 'page-size';
    document.head.appendChild(st);
  }
  const wmm = geom.pageW / MM;
  const hmm = geom.pageH / MM;
  st.textContent = `@page { size: ${wmm.toFixed(2)}mm ${hmm.toFixed(2)}mm; margin: 0; }`;
}

/* ─────────────────────────── 2. 측정 ─────────────────────────── */

/** KaTeX가 있으면 아직 그리지 않은 .math 스팬만 그린다(중복 렌더 방지). */
function renderMath(root, warnings) {
  const katex = typeof window !== 'undefined' ? window.katex : null;
  if (!katex || !root || !root.querySelectorAll) return;
  const list = root.querySelectorAll('.math:not([data-katex])');
  for (const el of list) {
    const tex = el.getAttribute('data-tex') || el.textContent || '';
    try {
      katex.render(tex, el, { displayMode: el.getAttribute('data-display') === '1', throwOnError: false, strict: 'ignore' });
      el.setAttribute('data-katex', '1');
    } catch (err) {
      el.setAttribute('data-katex', 'err');
      if (warnings) warnings.push(`수식을 그리지 못했습니다: ${tex} — 원문을 그대로 둡니다.`);
    }
  }
}

/** 요소의 실제 차지 높이(경계 상자 + 상하 margin). */
/**
 * 노드가 놓인 좌표계의 시각 배율(조상에 transform: scale이 걸리면 getBoundingClientRect가 줄어든 값을 준다).
 * 프리뷰는 --zoom으로 축소되므로 측정값을 이 배율로 나눠 레이아웃 px로 되돌려야 한다.
 */
function scaleOf(node) {
  const w = node.offsetWidth;
  if (!w) return 1;
  const s = node.getBoundingClientRect().width / w;
  return s > 0 && Number.isFinite(s) ? s : 1;
}

function outerHeight(node) {
  const r = node.getBoundingClientRect().height / scaleOf(node);
  const cs = getComputedStyle(node);
  return r + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
}

/**
 * 기하 × 글자 배율별 오프스크린 측정 컨테이너 묶음을 만든다.
 * 셀 폭·글꼴 변수가 실제 페이지와 같아야 하므로 mount 안에 붙인다.
 * 배율마다 통이 따로 있는 것은 쪽당 최소 문항 수를 채우려고 글자를 줄인 쪽 때문이다 —
 * 그 쪽의 원자는 줄인 글자로 재야 하고, 통을 바꿔 끼우면 같은 노드를 그대로 다시 쓸 수 있다.
 */
function createMeasurer(mount, settings, warnings) {
  const root = document.createElement('div');
  root.className = 'measure-root';
  mount.appendChild(root);
  const byKey = new Map();
  const baseSize = Number(settings.font && settings.font.size) || 10;

  /** 기하·배율 한 쌍의 측정 통(없으면 만든다). 배율 1은 mount의 글자 크기를 그대로 물려받는다. */
  function ensure(geom, scale = 1) {
    const key = `${geom.id}@${scale}`;
    let c = byKey.get(key);
    if (c) return c;
    const holder = document.createElement('div');
    holder.style.width = geom.cellW + 'px';
    if (scale !== 1) holder.style.setProperty('--font-size', fontPt(baseSize, scale));
    holder.innerHTML =
      '<section class="page"><div class="pg-body"><div class="cell">' +
      '<div class="pg-pool"></div>' +
      '<div class="passage ' + (settings.passageStyle === 'boxed' ? 'boxed' : '') + '" data-probe>' +
      '<div class="atom" style="height:40px"></div></div>' +
      '<div class="passage ' + (settings.passageStyle === 'boxed' ? 'boxed cont' : '') + '" data-probe-cont>' +
      '<div class="atom" style="height:40px"></div></div>' +
      '<div class="atom" data-scratch></div>' +
      '<div class="passage ' + (settings.passageStyle === 'boxed' ? 'boxed' : '') + '">' +
      '<div class="atom" data-scratch-p></div></div>' +
      '</div></div></section>';
    const cell = holder.querySelector('.cell');
    cell.style.width = geom.cellW + 'px';
    root.appendChild(holder);
    c = {
      geom,
      holder,
      pool: holder.querySelector('.pg-pool'),
      probe: holder.querySelector('[data-probe]'),
      probeCont: holder.querySelector('[data-probe-cont]'),
      scratch: holder.querySelector('[data-scratch]'),
      scratchP: holder.querySelector('[data-scratch-p]'),
      chrome: 0,
      chromeCont: 0,
    };
    c.chrome = Math.max(0, outerHeight(c.probe) - 40);
    c.chromeCont = Math.max(0, outerHeight(c.probeCont) - 40);
    byKey.set(key, c);
    return c;
  }

  let measureCalls = 0;

  /** 조각 후보 하나의 높이를 잰다(이진탐색용, 한 번에 한 요소). */
  function measureHtml(geom, kind, html, scale = 1) {
    const c = ensure(geom, scale);
    const target = kind === 'passage' ? c.scratchP : c.scratch;
    target.innerHTML = html;
    renderMath(target, warnings);
    measureCalls++;
    return outerHeight(target);
  }

  /**
   * 원자의 측정용 노드를 만들어(없으면) 측정 통에 붙인다.
   * 지문 원자는 `.passage` 껍데기 안에서 재야 한다 — 상자의 좌우 안여백만큼 글 폭이 좁아지므로
   * 껍데기 없이 재면 줄 수가 모자라게 나와 칸을 넘긴다.
   */
  function attach(c, a) {
    if (!a._node) {
      const box = document.createElement('div');
      box.className = 'atom';
      a._node = box;
      if (a.kind === 'passage') {
        const wrap = document.createElement('div');
        wrap.className = 'passage' + (settings.passageStyle === 'boxed' ? ' boxed' : '');
        wrap.appendChild(box);
        a._wrap = wrap;
      }
    }
    const host = a._wrap || a._node;
    if (!host.isConnected) c.pool.appendChild(host);
  }

  /** 아직 재지 않았거나 html이 바뀐 원자들의 높이를 한 번의 리플로우로 읽는다. */
  function measureItems(items) {
    const fresh = new Map(); // geomId → [items]
    for (const it of items) {
      const a = it.atom;
      if (a._mh === a.html && a._h != null) continue;
      if (!fresh.has(it.geom.id)) fresh.set(it.geom.id, []);
      fresh.get(it.geom.id).push(it);
    }
    if (!fresh.size) return;
    // 1) DOM 쓰기만 모아서
    for (const [, list] of fresh) {
      for (const it of list) {
        const a = it.atom;
        attach(ensure(it.geom, 1), a);
        a._node.innerHTML = a.html;
        a._mhNode = a.html;
        a._sp = undefined;
        a._hBy = null;
      }
    }
    // 2) 수식은 배치 후 한 번에
    for (const [gid] of fresh) renderMath(byKey.get(`${gid}@1`).pool, warnings);
    // 3) 읽기만 모아서 (한 번의 리플로우)
    const rects = [];
    // 배율은 통(pool)마다 한 번: 프리뷰 축소(transform: scale)가 조상에 걸려 있으면 rect가 줄어든다.
    const zoomOf = new Map();
    for (const [gid] of fresh) zoomOf.set(gid, scaleOf(byKey.get(`${gid}@1`).pool));
    for (const [gid, list] of fresh) {
      const zoom = zoomOf.get(gid) || 1;
      for (const it of list) rects.push(it.atom._node.getBoundingClientRect().height / zoom);
    }
    let i = 0;
    for (const [, list] of fresh) {
      for (const it of list) {
        const a = it.atom;
        const cs = getComputedStyle(a._node);
        a._h = rects[i++] + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
        a._mh = a.html;
      }
    }
    // 4) 다 잰 노드는 통에서 떼어 낸다. 이어질 조각 측정(measureHtml)은 이진탐색마다
    //    강제 리플로우를 부르는데, 통에 원자 수백 개가 남아 있으면 그때마다 그 전부를
    //    다시 배치하느라 조판이 원자 수의 제곱으로 느려진다. 노드 자체는 _node로 계속
    //    쥐고 있으므로(수식도 그린 채로) 조립 때 그대로 다시 쓴다.
    for (const [gid] of fresh) {
      const pool = byKey.get(`${gid}@1`).pool;
      while (pool.firstChild) pool.removeChild(pool.firstChild);
    }
  }

  /**
   * 원자 하나의 높이를 그 쪽의 글자 배율로 잰다(배율 1은 _h, 나머지는 _hBy에 쌓는다).
   * 노드는 하나뿐이라 통 사이를 옮겨 다니며 재고, 다 재면 다시 떼어 조립 때 그대로 쓴다.
   * @param {Object} item 배치 항목 { atom, geom, … }
   * @param {number} scale 그 쪽의 글자 배율(1이면 기본 크기)
   */
  function heightOf(item, scale = 1) {
    const a = item.atom;
    if (scale === 1) {
      if (a._mh !== a.html || a._h == null) measureItems([item]);
      return a._h;
    }
    if (!a._hBy || a._hByHtml !== a.html) {
      a._hBy = {};
      a._hByHtml = a.html;
    }
    if (a._hBy[scale] != null) return a._hBy[scale];
    const c = ensure(item.geom, scale);
    attach(c, a);
    const host = a._wrap || a._node;
    if (host.parentElement !== c.pool) c.pool.appendChild(host);
    if (a._mhNode !== a.html) {
      a._node.innerHTML = a.html;
      a._mhNode = a.html;
    }
    renderMath(a._node, warnings);
    const zoom = scaleOf(c.pool) || 1;
    const cs = getComputedStyle(a._node);
    const h =
      a._node.getBoundingClientRect().height / zoom +
      (parseFloat(cs.marginTop) || 0) +
      (parseFloat(cs.marginBottom) || 0);
    host.remove();
    a._hBy[scale] = h;
    measureCalls++;
    return h;
  }

  function chromeOf(geom, cont, scale = 1) {
    const c = ensure(geom, scale);
    return cont ? c.chromeCont : c.chrome;
  }

  return {
    root,
    ensure,
    measureHtml,
    measureItems,
    heightOf,
    chromeOf,
    calls: () => measureCalls,
    destroy: () => root.remove(),
  };
}

/* ─────────────────────────── 3. 분할기 ─────────────────────────── */

/** html 문자열의 최상위 요소를 자식 없이 복제해 껍데기를 얻는다. */
function rootShell(html) {
  const t = document.createElement('template');
  t.innerHTML = String(html || '').trim();
  const root = t.content.firstElementChild;
  return root ? root.cloneNode(false) : null;
}

/** splitParts를 원자 껍데기에 담아 조각 HTML을 만드는 분할기. */
function partsSplitter(atom) {
  const shell = rootShell(atom.html);
  if (!shell) return null;
  const parts = atom.splitParts;
  return {
    count: parts.length,
    table: false,
    htmlFor(from, to, cont) {
      const el = shell.cloneNode(false);
      if (cont) el.setAttribute('data-cont', '1');
      if (to < parts.length) el.setAttribute('data-open-end', '1');
      el.innerHTML = parts.slice(from, to).join('');
      return el.outerHTML;
    },
  };
}

/** 표를 행(또는 tbody 묶음) 단위로 나누는 분할기. thead는 조각마다 반복된다. */
function tableSplitter(atom) {
  const t = document.createElement('template');
  t.innerHTML = String(atom.html || '').trim();
  const root = t.content.firstElementChild;
  if (!root) return null;
  const table = root.matches('table') ? root : root.querySelector('table');
  if (!table) return null;
  const bodies = Array.from(table.children).filter((n) => n.tagName === 'TBODY');
  let mode;
  let units;
  if (bodies.length >= 2) {
    mode = 'tbody';
    units = bodies.map((n) => n.outerHTML);
  } else {
    const holder = bodies[0] || table;
    const rows = Array.from(holder.children).filter((n) => n.tagName === 'TR');
    if (rows.length < 2) return null;
    mode = 'tr';
    units = rows.map((n) => n.outerHTML);
  }
  return {
    count: units.length,
    table: true,
    htmlFor(from, to, cont) {
      const clone = root.cloneNode(true);
      const tb = clone.matches('table') ? clone : clone.querySelector('table');
      if (mode === 'tbody') {
        Array.from(tb.children)
          .filter((n) => n.tagName === 'TBODY')
          .forEach((n) => n.remove());
        tb.insertAdjacentHTML('beforeend', units.slice(from, to).join(''));
      } else {
        const holder = Array.from(tb.children).find((n) => n.tagName === 'TBODY') || tb;
        holder.innerHTML = units.slice(from, to).join('');
      }
      if (cont) clone.setAttribute('data-cont', '1');
      return clone.outerHTML;
    },
  };
}

/** 요소에서 뿌리까지의 자식 번호 경로(조각을 만들 때 같은 자리를 다시 찾으려고 쓴다). */
function childPath(root, node) {
  const path = [];
  let cur = node;
  while (cur && cur !== root) {
    path.unshift(Array.prototype.indexOf.call(cur.parentElement.children, cur));
    cur = cur.parentElement;
  }
  return path;
}

/** 인라인 표지(`<span class="expl-name">` 등)는 홀로 남으면 흉하므로 뒤 형제와 한 덩어리로 묶는다. */
const INLINE_TAGS = new Set(['SPAN', 'B', 'I', 'EM', 'STRONG', 'A', 'SUP', 'SUB', 'MARK', 'S', 'U']);

/**
 * splitParts도 표도 없는 원자를 자식 요소 단위로 나누는 마지막 수단 분할기.
 * `<보기>` 상자처럼 한 칸보다 큰 덩어리가 통째로 잘려 사라지는 것을 막는다.
 * 껍데기(제목·테두리)는 조각마다 되풀이하고, 이어짐 표시로 `data-cont`/`data-open-end`를 붙인다.
 */
function childSplitter(atom) {
  const t = document.createElement('template');
  t.innerHTML = String(atom.html || '').trim();
  const root = t.content.firstElementChild;
  if (!root) return null;

  // 조각을 담을 그릇: 자식이 가장 많은 곳(상자는 .box-body, 그 밖에는 뿌리 자신).
  let host = root;
  const cands = [root].concat(Array.from(root.querySelectorAll(':scope > *, :scope > * > *')));
  for (const el of cands) if (el.children.length > host.children.length) host = el;
  if (host.children.length < 2) return null;

  const units = [];
  let pending = '';
  for (const child of Array.from(host.children)) {
    if (INLINE_TAGS.has(child.tagName)) {
      pending += child.outerHTML;
      continue;
    }
    units.push(pending + child.outerHTML);
    pending = '';
  }
  if (pending) {
    if (units.length) units[units.length - 1] += pending;
    else units.push(pending);
  }
  if (units.length < 2) return null;

  const path = childPath(root, host);
  return {
    count: units.length,
    table: false,
    htmlFor(from, to, cont) {
      const clone = root.cloneNode(true);
      let h = clone;
      for (const i of path) h = h.children[i];
      h.innerHTML = units.slice(from, to).join('');
      if (cont) clone.setAttribute('data-cont', '1');
      if (to < units.length) clone.setAttribute('data-open-end', '1');
      return clone.outerHTML;
    },
  };
}

/** 원자에 맞는 분할기(있으면)를 만들어 캐시한다. */
function splitterFor(atom) {
  if (atom._sp !== undefined) return atom._sp;
  let sp = null;
  if (Array.isArray(atom.splitParts) && atom.splitParts.length > 1) sp = partsSplitter(atom);
  if (!sp) sp = tableSplitter(atom);
  if (!sp) sp = childSplitter(atom);
  atom._sp = sp;
  return sp;
}

/** keep 설정에 비추어 이 원자를 쪼개도 되는지. */
function splitAllowed(atom, keep) {
  const sp = atom._sp;
  if (!sp) return false;
  if (sp.table) return keep.allowTableSplit !== false;
  if (atom.kind === 'passage') return keep.allowPassageSplit !== false;
  return atom.splittable !== false;
}

/* ─────────────────────────── 4. 스트림 ─────────────────────────── */

/** 원자 종류의 한국어 이름(경고 문장에 쓴다 — 사용자에게 "material"은 아무 뜻도 아니다). */
const KIND_NAME = {
  head: '번호·발문',
  intro: '안내 문장',
  passage: '지문',
  stem: '발문',
  material: '발문 자료(표·도형·보기 상자)',
  choices: '선지',
  'expl-head': '해설 머리',
  expl: '해설',
  toc: '차례',
  cover: '표지',
  unitpage: '단원 표지',
  'unit-band': '대단원 띠',
  'subunit-band': '소단원 띠',
  answers: '정답 표',
  'sheet-title': '시트 제목',
  'sheet-band': '시트 소제목',
};

/** 원자 종류를 사람이 읽을 이름으로. 모르는 종류는 그대로 돌려준다. */
function kindName(k) {
  return KIND_NAME[k] || String(k || '내용');
}

/** 원자 html의 최상위 data-q 속성에서 문항 키를 뽑는다. */
function keyOf(atom) {
  const m = /\sdata-q="([^"]*)"/.exec(atom.html || '');
  return m && m[1] ? m[1] : null;
}

/**
 * 표지 → 차례 → 단원/문항 → 정답 → 해설 순서의 배치 항목 스트림을 만든다.
 * @returns {{items: Array, groups: Array, problems: Array}}
 */
function buildStream(doc, project, ctx) {
  const S = ctx.settings;
  const R = doc.renderers || {};
  const sheets = deepMerge(
    {
      cover: { enabled: false, lines: [] },
      problems: true,
      answers: { enabled: true, perRow: 10, title: '빠른 정답' },
      explanations: { enabled: true, grid: { cols: 2, rows: 1 }, title: '정답과 해설', renamePassage: true },
      toc: { enabled: true, front: true, perUnit: true, pageNumbers: true, title: '차례' },
    },
    project.sheets || {}
  );
  const warnings = ctx.warnings;
  const overrides = project.overrides || {};
  const problems = (doc.problems || []).filter((p) => !(overrides[p.key] && overrides[p.key].exclude));
  const groups =
    typeof R.groupByUnits === 'function'
      ? R.groupByUnits(problems, project.units || {})
      : [{ unit: '', subunits: [{ subunit: '', problems }] }];

  const items = [];
  const push = (atom, o = {}) =>
    items.push({
      atom,
      key: o.key !== undefined ? o.key : keyOf(atom),
      geom: o.geom || ctx.geomMain,
      sheet: o.sheet || 'problems',
      newPage: !!o.newPage,
      unit: o.unit ?? null,
      subunit: o.subunit ?? null,
      firstOfProblem: !!o.firstOfProblem,
      // 경고 문장에 쓸 문항 번호. 키(s2#1)만으로는 어느 문항인지 사람이 못 찾는다.
      num: o.num ?? null,
      mark: o.mark || null,
      tocScope: o.tocScope || null,
    });

  // 표지
  if (sheets.cover && sheets.cover.enabled) {
    const lines = (sheets.cover.lines || []).map((l) => `<div class="cv-line">${esc(l)}</div>`).join('');
    push(
      {
        kind: 'cover',
        html:
          `<div class="cover" data-q=""><div class="cv-title">${esc(project.title || '')}</div>` +
          (project.subtitle ? `<div class="cv-sub">${esc(project.subtitle)}</div>` : '') +
          `<div class="cv-rule"></div>${lines}</div>`,
        splittable: false,
      },
      { sheet: 'cover', newPage: true }
    );
  }

  // 앞 차례(자리표 — 2-pass로 채운다)
  if (sheets.toc && sheets.toc.enabled && sheets.toc.front) {
    push({ kind: 'toc', html: '<nav class="toc" data-q=""></nav>', splittable: true, splitParts: [] }, { sheet: 'toc', newPage: true, tocScope: 'front', mark: { toc: true } });
  }

  /* app.js는 렌더 컨텍스트를 doc.ctx·doc.figureMode로 넘겨준다(DESIGN §3 app.js).
     그것을 무시하고 project에서 다시 읽으면 UI가 손본 인라인 규칙·도형 모드가 조판에 반영되지
     않는다 — 주입된 값이 있으면 그것을 쓰고, 없을 때만 project에서 읽는다.
     settings만은 늘 S를 쓴다: project.layout은 기본값이 채워지지 않은 날것이라 여백·글꼴이 빌 수 있다. */
  const inj = (doc && doc.ctx) || {};
  const ctxRender = {
    settings: S,
    rules: Array.isArray(inj.rules) && inj.rules.length ? inj.rules : project.rules || [],
    images: inj.images || project.images || [],
    imagePlacements: inj.imagePlacements || project.imagePlacements || [],
    figureMode:
      typeof inj.figureMode === 'function'
        ? inj.figureMode
        : typeof doc.figureMode === 'function'
          ? doc.figureMode
          : (key, idx) => {
              const o = overrides[key];
              const f = o && o.figures && o.figures[String(idx)];
              return f || (S.figure && S.figure.mode) || 'svg';
            },
    asciiToSvg: R.asciiToSvg,
    renderers: R,
    warnings,
  };

  // 본문
  for (const g of groups) {
    const unitLabel = g.unit && String(g.unit).trim() ? g.unit : '';
    const unitCount = (g.subunits || []).reduce((n, s) => n + (s.problems || []).length, 0);
    if (S.unitBand && S.unitBand.enabled && unitLabel) {
      if (S.unitBand.style === 'page') {
        push(
          { kind: 'unitpage', html: '<div class="unit-page" data-q=""></div>', splittable: false },
          { newPage: true, unit: g.unit, tocScope: 'unit:' + g.unit, mark: { unit: g.unit } }
        );
      } else {
        push(
          {
            kind: 'unit-band',
            html: `<div class="unit-band" data-q="">${esc(unitLabel)}</div>`,
            splittable: false,
            keepWithNext: true,
          },
          { unit: g.unit, mark: { unit: g.unit } }
        );
        if (sheets.toc && sheets.toc.enabled && sheets.toc.perUnit) {
          push(
            { kind: 'toc', html: '<nav class="toc" data-q=""></nav>', splittable: true, splitParts: [] },
            { unit: g.unit, tocScope: 'unit:' + g.unit, mark: { toc: true } }
          );
        }
      }
    }
    for (const s of g.subunits || []) {
      const subLabel = s.subunit && String(s.subunit).trim() ? s.subunit : '';
      if (S.subunitBand && S.subunitBand.enabled && subLabel) {
        push(
          {
            kind: 'subunit-band',
            html: `<div class="subunit-band" data-q=""><span>${esc(subLabel)}</span><span class="sb-count">${(s.problems || []).length}문항</span></div>`,
            splittable: false,
            keepWithNext: true,
          },
          { unit: g.unit, subunit: s.subunit, mark: { unit: g.unit, subunit: s.subunit } }
        );
      }
      for (const p of s.problems || []) {
        let out;
        try {
          out = R.renderProblem ? R.renderProblem(p, { ...ctxRender, subject: p.subject }) : null;
        } catch (err) {
          warnings.push(`${p.num ?? p.key}번 문항을 그리는 중 오류가 났습니다(${err && err.message}). 이 문항은 건너뜁니다.`);
          continue;
        }
        const atoms = (out && out.atoms) || [];
        if (!atoms.length) {
          warnings.push(`${p.num ?? p.key}번 문항의 내용이 비어 배치하지 않았습니다. 원문 블록을 확인하세요.`);
          continue;
        }
        atoms.forEach((a, i) =>
          push(a, {
            key: p.key,
            num: p.num,
            unit: g.unit,
            subunit: s.subunit,
            firstOfProblem: i === 0,
            mark: i === 0 ? { problem: p.key, unit: g.unit, subunit: s.subunit } : null,
          })
        );
      }
    }
    void unitCount;
  }

  // 정답 시트
  if (sheets.answers && sheets.answers.enabled) {
    const atoms = answerSheetAtoms(problems, {
      perRow: sheets.answers.perRow,
      title: sheets.answers.title,
      groups,
      renderAnswerTable: R.renderAnswerTable,
      warnings,
    });
    atoms.forEach((a, i) => push(a, { sheet: 'answers', newPage: i === 0, mark: i === 0 ? { answers: true } : null }));
  }

  // 해설 시트(자체 격자)
  if (sheets.explanations && sheets.explanations.enabled) {
    const atoms = explanationAtoms(problems, {
      ...ctxRender,
      groups,
      title: sheets.explanations.title,
      renamePassage: sheets.explanations.renamePassage !== false,
    });
    const numOf = new Map(problems.map((p) => [p.key, p.num]));
    atoms.forEach((a, i) =>
      push(a, {
        sheet: 'explanations',
        geom: ctx.geomExpl,
        newPage: i === 0,
        key: keyOf(a),
        num: numOf.get(keyOf(a)) ?? null,
        firstOfProblem: a.kind === 'expl-head',
        mark: i === 0 ? { explanations: true } : null,
      })
    );
  }

  return { items, groups, problems, sheets };
}

/** 2-pass: 차례 자리표 원자의 html을 현재 index로 다시 만든다. */
function refreshTocAtoms(items, groups, index, ctx, sheets) {
  const cfg = sheets.toc || {};
  const entries = buildTocEntries(groups, index, {
    pageNumbers: cfg.pageNumbers !== false,
    answersTitle: (sheets.answers && sheets.answers.title) || '빠른 정답',
    explanationsTitle: (sheets.explanations && sheets.explanations.title) || '정답과 해설',
  });
  for (const it of items) {
    if (!it.tocScope) continue;
    if (it.tocScope === 'front') {
      it.atom.html = renderToc(entries.front, cfg.title || '차례', { pageNumbers: cfg.pageNumbers !== false });
      it.atom.splitParts = tocParts(entries.front, cfg.title || '차례', { pageNumbers: cfg.pageNumbers !== false });
    } else {
      const unit = it.tocScope.slice(5);
      const rows = entries.perUnit.get(unit) || entries.perUnit.get(unit === '' ? undefined : unit) || [];
      if (it.atom.kind === 'unitpage') {
        const inner =
          `<div class="up-kicker">단원</div><div class="up-title">${esc(unit || '단원 미지정')}</div><div class="up-rule"></div>` +
          (cfg.enabled && cfg.perUnit ? renderToc(rows, '', { pageNumbers: cfg.pageNumbers !== false }) : '');
        it.atom.html = `<div class="unit-page" data-q="">${inner}</div>`;
      } else {
        it.atom.html = renderToc(rows, '', { pageNumbers: cfg.pageNumbers !== false });
        it.atom.splitParts = tocParts(rows, '', { pageNumbers: cfg.pageNumbers !== false });
      }
    }
  }
}

/* ─────────────────────────── 5. 패킹 ─────────────────────────── */

/** 빈 index 골격. */
function emptyIndex() {
  return {
    problemPage: new Map(),
    unitPage: new Map(),
    subunitPage: new Map(),
    answersPage: null,
    explanationsPage: null,
    tocPages: [],
  };
}

/** index를 문자열로 요약해 2-pass 수렴을 판정한다. */
function indexSignature(ix) {
  const a = [...ix.problemPage.entries()].map(([k, v]) => k + ':' + v).join(',');
  const b = [...ix.unitPage.entries()].map(([k, v]) => k + ':' + v).join(',');
  const c = [...ix.subunitPage.entries()].map(([k, v]) => k + ':' + v).join(',');
  return `${a}|${b}|${c}|${ix.answersPage}|${ix.explanationsPage}|${ix.tocPages.join('.')}`;
}

/** 되감기 신호 — 쪽이 최소 문항 수를 못 채웠으니 배율을 낮추고 그 쪽 첫머리부터 다시 놓으라는 뜻. */
const REWIND = { rewind: true };

/** 총 되감기 상한. 배율은 쪽마다 단조 감소하므로 정상 문서는 이 수 근처에도 가지 않는다. */
const REWIND_CAP = 3000;

/** 되물릴 수 있는 원자 종류(지문·선지는 이어짐 표시가 걸려 있어 건드리지 않는다). */
const PULLABLE = new Set(['head', 'intro', 'stem', 'material', 'passage', 'unit-band', 'subunit-band', 'toc']);

/** 번호·발문 앞에 오는 원자(여러 문항이 나눠 읽는 지문과 그 안내 문장). */
const PRE_HEAD = new Set(['intro', 'passage']);

/** 띠 원자인가 — 대단원 띠·대단원별 차례·소단원 띠는 뒤 문항과 한 사슬로 묶인다. */
function isBandItem(it) {
  if (!it) return false;
  const k = it.atom.kind;
  if (k === 'unit-band' || k === 'subunit-band') return true;
  return k === 'toc' && typeof it.tocScope === 'string' && it.tocScope.startsWith('unit:');
}

/** 두 항목이 같은 흐름(같은 시트·같은 기하)에 있는가. */
function sameFlow(a, b) {
  return !!a && !!b && a.sheet === b.sheet && a.geom === b.geom;
}

/**
 * 칸 끝에 띠만 남은 칸의 수(옵션 `keep.bandWithFirst`가 켜져 있으면 0이어야 한다).
 * 띠 뒤에 차례만 붙고 문항 head 없이 칸이 끝나는 경우도 고아로 센다.
 * @param {Array} pages pack이 남긴 페이지 기록
 */
export function findBandOrphans(pages) {
  let n = 0;
  for (const p of pages || []) {
    for (const recs of p.cells) {
      if (!recs.length) continue;
      let i = recs.length - 1;
      let sawBand = false;
      while (i >= 0 && (recs[i].kind === 'unit-band' || recs[i].kind === 'subunit-band' || recs[i].kind === 'toc')) {
        if (recs[i].kind !== 'toc') sawBand = true;
        i--;
      }
      if (sawBand) n++;
    }
  }
  return n;
}

/**
 * 붙여 두기 규칙이 실제로 깨진 칸의 수.
 * (1) 칸이 번호·발문(head)으로 끝나고 그 문항이 다음 칸에서 이어지는 경우,
 * (2) 칸이 발문·자료로 끝나고 그 문항의 선지가 다음 칸 첫머리에서 시작하는 경우.
 * @param {Array} pages pack이 남긴 페이지 기록
 * @param {Object} keep LayoutSettings.keep
 */
export function findKeepOrphans(pages, keep = {}) {
  const cells = [];
  for (const p of pages || []) for (const ci of p.geom.fillSeq) cells.push(p.cells[ci]);
  let n = 0;
  for (let i = 0; i < cells.length; i++) {
    const recs = cells[i];
    if (!recs.length) continue;
    const last = recs[recs.length - 1];
    let next = null;
    for (let j = i + 1; j < cells.length && !next; j++) if (cells[j].length) next = cells[j][0];
    if (!next || !last.key || next.key !== last.key) continue;
    if (last.kind === 'head') { n++; continue; }
    // 지문을 쪼개지 않는 설정: 문단 사이에서 끊긴 지문, 지문 뒤 자료·선지가 다음 칸으로 간 것도 고아다.
    if (keep.allowPassageSplit === false && last.kind === 'passage' && !last.overflow && !last.runOver &&
        (next.kind === 'passage' || next.kind === 'material' || next.kind === 'choices') && !next.cont) { n++; continue; }
    if (keep.stemWithFirstChoice === false) continue;
    if (next.kind !== 'choices' || next.cont) continue;
    if (last.kind === 'stem' || last.kind === 'material' || last.kind === 'intro') n++;
  }
  return n;
}

/**
 * 여러 문항이 나눠 읽는 지문이 첫 문항과 갈라진 칸의 수.
 * 지문이 여러 칸에 이어지는 것은 정상이고, **지문이 끝난 자리에서** 번호·발문만
 * 다음 칸으로 넘어간 것(또는 안내 문장만 남은 것)을 고아로 센다.
 * @param {Array} pages pack이 남긴 페이지 기록
 * @param {Object} keep LayoutSettings.keep
 */
export function findPassageOrphans(pages, keep = {}, out = null) {
  if (keep.passageWithFirst === false) return 0;
  const cells = [];
  for (const p of pages || []) {
    for (const ci of p.geom.fillSeq) cells.push({ page: p.no ?? p.n, cell: ci, recs: p.cells[ci] });
  }
  let n = 0;
  for (let i = 0; i < cells.length; i++) {
    const recs = cells[i].recs;
    if (!recs.length) continue;
    const last = recs[recs.length - 1];
    if (last.kind !== 'intro' && last.kind !== 'passage') continue;
    let next = null;
    for (let j = i + 1; j < cells.length && !next; j++) if (cells[j].recs.length) next = cells[j].recs[0];
    if (!next || next.key !== last.key) continue;
    if (next.kind !== 'head' && !(last.kind === 'intro' && next.kind === 'passage')) continue;
    n++;
    if (out) {
      out.push({
        page: cells[i].page,
        cell: cells[i].cell,
        key: last.key,
        num: (last.item && last.item.num) ?? null,
        last: last.kind,
        next: next.kind,
      });
    }
  }
  return n;
}

/**
 * 스트림을 페이지·셀에 채운다. DOM은 만들지 않고 배치 기록만 남긴다.
 * 매번 깨끗한 상태에서 시작한다 — 글자 배율도 이 안에서 처음부터 다시 정한다.
 * @returns {{pages: Array, index: Object, warnings: string[], overflow: number}}
 */
function pack(items, ctx) {
  const S = ctx.settings;
  const keep = S.keep || {};
  const M = ctx.measurer;
  const warnings = [];
  const index = emptyIndex();
  const pages = [];
  let passageStarted = new Set();
  let pageNo = 0;
  let cur = null;
  let cellPos = 0;
  let used = 0;
  let run = { passage: false, key: null };
  let lastUnit = null;
  let lastSubunit = null;
  let overflowCount = 0;
  // 되감기 커서 — newPage가 스냅샷에 적는 "지금 놓는 중인 항목과 그 조각 번호".
  let curIndex = 0;
  let curFrom = 0;
  let pendingRestore = null;
  let rewinds = 0;

  /* ── 쪽당 시작 문항 수(§2.6 perPage·perPageRules·perPageFont) ── */
  const pp = S.perPage || {};
  const ppf = S.perPageFont || {};
  const baseSize = Number(S.font.size) || 10;
  const stepPt = Math.max(0.05, Number(ppf.step) || 0.25);
  const minSize = Math.max(1, Math.min(baseSize, Number(ppf.minSize) || 8));
  // 줄일 수 있는 단계 수는 글자 크기 사이의 거리로만 정해진다. 그 단계를 쪽당 최소 문항 수에
  // 쓸지(fontOn), 붙여 두기에 쓸지(keepShrinkOn)는 서로 다른 스위치가 따로 정한다.
  const stepsMax = minSize < baseSize ? Math.max(0, Math.floor((baseSize - minSize) / stepPt + 1e-9)) : 0;
  const fontOn = ppf.enabled !== false && stepsMax > 0;
  const maxSteps = fontOn ? stepsMax : 0;
  const keepShrinkOn = keep.shrinkToKeep !== false && stepsMax > 0;
  const keepShrunk = new Set(); // 붙여 두기 때문에 글자를 줄인 쪽(page.n)
  const gMin = Math.max(0, Math.round(Number(pp.min) || 0));
  const gMax = Math.max(0, Math.round(Number(pp.max) || 0));
  const ruleBy = new Map();
  for (const r of Array.isArray(S.perPageRules) ? S.perPageRules : []) {
    const n = Math.round(Number(r && r.page));
    if (!Number.isFinite(n) || n <= 0) continue;
    ruleBy.set(n, {
      min: Math.max(0, Math.round(Number(r.min) || 0)),
      max: Math.max(0, Math.round(Number(r.max) || 0)),
    });
  }
  const retries = new Map(); // page.n → 글자를 줄인 단계 수

  /** 그 쪽에 걸린 시작 문항 수 한계. 0·미지정은 제한 없음이고 문제 시트에만 건다. */
  function limitsOf(p) {
    if (!p || p.sheet !== 'problems' || p.no == null) return { min: 0, max: Infinity };
    const r = ruleBy.get(p.no);
    const mn = r ? r.min : gMin;
    const mx = r ? r.max : gMax;
    return { min: mn > 0 ? mn : 0, max: mx > 0 ? mx : Infinity };
  }

  /** 줄인 단계 수 → 글자 배율(단조 감소하며 minSize에서 멈춘다). */
  function scaleFor(steps) {
    if (!steps) return 1;
    const size = Math.max(minSize, baseSize - steps * stepPt);
    return Math.round((size / baseSize) * 10000) / 10000;
  }

  /** 지금 쪽의 글자 배율. */
  function curScale() {
    return cur ? cur.scale || 1 : 1;
  }

  /** 이 쪽에서 더 줄일 수 있는 가장 작은 배율(이미 줄인 만큼은 빼고 센다). */
  function floorScale() {
    return scaleFor(stepsMax);
  }

  /**
   * 붙여 두기가 깨질 자리에서 "글자를 줄이면 붙일 수 있는가"를 **재 보고** 이 쪽을 되감는다.
   * 다 줄여도 안 되는 자리에서 줄이면 문서 전체가 8pt가 되므로, 바닥 배율에서 재어 보고
   * 그때도 안 들어가면 줄이지 않는다(그 자리는 기존 최후 수단으로 넘긴다).
   * @param {(scale:number)=>number} needAt 배율을 받아 필요한 높이를 돌려주는 함수
   * @param {number} budget 그 높이가 들어가야 할 자리(대개 한 칸)
   * @returns {boolean} 줄일 수 없을 때만 false를 돌려준다(줄일 수 있으면 REWIND를 던진다)
   */
  function shrinkToKeep(needAt, budget) {
    if (!keepShrinkOn || !cur || cur.sheet !== 'problems' || cur.no == null) return false;
    const done = retries.get(cur.n) || 0;
    if (done >= stepsMax || rewinds >= REWIND_CAP) return false;
    if (needAt(floorScale()) > budget) return false;
    retries.set(cur.n, done + 1);
    for (const k of [...retries.keys()]) if (k > cur.n) retries.delete(k);
    keepShrunk.add(cur.n);
    rewinds += 1;
    pendingRestore = cur;
    throw REWIND;
  }

  /* ── 지문 묶음(run): 같은 문항의 지문 원자가 잇달아 놓인 구간 ──
     지문은 문단마다 원자 하나라서 "지문을 쪼개지 않는다"는 설정이 원자 하나만 지키면 문단 사이에서
     끊긴다. 설정이 꺼져 있으면 묶음 전체를 한 덩어리로 다룬다(한 칸보다 클 때만 문단 사이에서 나눈다). */
  const passageWhole = keep.allowPassageSplit === false;
  const runOverWarned = new Set(); // 한 칸보다 큰 지문 묶음은 문항마다 한 번만 알린다

  /** i에서 시작하는 지문 묶음의 마지막 항목 번호. */
  function runEnd(i) {
    const it = items[i];
    let j = i;
    while (
      items[j + 1] && items[j + 1].atom.kind === 'passage' && items[j + 1].key === it.key &&
      sameFlow(items[j + 1], it) && !items[j + 1].newPage
    ) j += 1;
    return j;
  }

  /** i에서 시작하는 지문 묶음의 첫 항목 번호. */
  function runStart(i) {
    const it = items[i];
    let j = i;
    while (
      items[j - 1] && items[j - 1].atom.kind === 'passage' && items[j - 1].key === it.key &&
      sameFlow(items[j - 1], it) && !it.newPage && !items[j].newPage
    ) j -= 1;
    return j;
  }

  /** 묶음 i..j의 높이(껍데기 제외). */
  function runHeight(i, j, sc) {
    let h = 0;
    for (let k = i; k <= j; k += 1) h += M.heightOf(items[k], sc);
    return h;
  }

  /** 이 지문 묶음이 한 칸보다 커서 문단 사이 끊김을 허용해야 하는가(문항마다 한 번 경고). */
  function runOversized(item, sc) {
    if (!passageWhole || item.atom.kind !== 'passage') return false;
    const a = runStart(item._i);
    const b = runEnd(item._i);
    const h = runHeight(a, b, sc) + M.chromeOf(item.geom, false, sc);
    const cap = capOf(item.geom);
    if (h <= cap) return false;
    if (!runOverWarned.has(item.key)) {
      runOverWarned.add(item.key);
      warnings.push(
        `${label(item)}: 지문이 한 칸보다 커서 붙여 두라는 설정을 어기고 문단 사이에서 나눴습니다. 격자를 줄이거나 글자 크기를 낮추면 한 덩어리로 들어갑니다.`
      );
    }
    return true;
  }

  /** 한 칸의 배치 예산(보이는 칸 높이 − 여유). mm 기준이라 글자 배율과 무관하다. */
  function capOf(geom) {
    return geom.cellH - (geom.slack || 0) - (ctx.extraSlack || 0);
  }

  /**
   * 닫히는 쪽이 최소 문항 수를 채웠는지 본다. 못 채웠고 아직 줄일 여지가 있으면
   * 배율을 한 단계 낮추고 되감기를 예약한다(그 쪽 뒤에 매겨 둔 배율은 버린다).
   */
  function wantsRewind(p) {
    const min = p.min || 0;
    if (!min || p.started >= min) return false;
    const done = retries.get(p.n) || 0;
    if (fontOn && done < maxSteps && rewinds < REWIND_CAP) {
      retries.set(p.n, done + 1);
      for (const k of [...retries.keys()]) if (k > p.n) retries.delete(k);
      rewinds += 1;
      pendingRestore = p;
      return true;
    }
    warnings.push(
      fontOn
        ? `${p.no}쪽: 최소 ${min}문항을 채우지 못했습니다(글자를 ${trimNum(minSize)}pt까지 줄여도 ${p.started}문항). 최소값을 낮추거나 격자·여백을 조정하세요.`
        : `${p.no}쪽: 최소 ${min}문항을 채우지 못했습니다(시작 문항 ${p.started}개). 배치 탭의 “최소 미달 시 글자 크기 줄이기”를 켜면 글자를 줄여 더 담습니다.`
    );
    return false;
  }

  /** 스냅샷으로 되돌리고, 그 쪽부터 다시 놓을 자리(항목 번호·조각 번호)를 돌려준다. */
  function restore(p) {
    const s = p.snap;
    pages.length = s.pagesLen;
    pageNo = s.pageNo;
    index.problemPage = new Map(s.problemPage);
    index.unitPage = new Map(s.unitPage);
    index.subunitPage = new Map(s.subunitPage);
    index.answersPage = s.answersPage;
    index.explanationsPage = s.explanationsPage;
    index.tocPages = s.tocPages.slice();
    passageStarted = new Set(s.passageStarted);
    lastUnit = s.lastUnit;
    lastSubunit = s.lastSubunit;
    run = { ...s.run };
    cur = null;
    cellPos = 0;
    used = 0;
    return { i: s.itemIndex, from: s.from };
  }

  /**
   * 새 쪽을 연다. 같은 시트 안에서 쪽이 닫히는 것이므로 닫히는 쪽의 최소 문항 수를 먼저 본다
   * (시트가 바뀌거나 스트림이 끝나 닫히는 쪽 = 시트 마지막 쪽은 자연히 짧으므로 면제).
   */
  function newPage(geom, sheet) {
    if (cur && cur.sheet === sheet && cur.geom === geom && wantsRewind(cur)) throw REWIND;
    const n = pages.length + 1;
    const prevNo = pageNo;
    const p = {
      n,
      no: sheet === 'cover' ? null : ++pageNo,
      geom,
      sheet,
      unit: lastUnit,
      subunit: lastSubunit,
      unitOwn: false,
      started: 0,
      scale: sheet === 'problems' ? scaleFor(retries.get(n) || 0) : 1,
      cells: Array.from({ length: geom.cellCount }, () => []),
      snap: {
        itemIndex: curIndex,
        from: curFrom,
        pagesLen: pages.length,
        pageNo: prevNo,
        problemPage: new Map(index.problemPage),
        unitPage: new Map(index.unitPage),
        subunitPage: new Map(index.subunitPage),
        answersPage: index.answersPage,
        explanationsPage: index.explanationsPage,
        tocPages: index.tocPages.slice(),
        passageStarted: new Set(passageStarted),
        lastUnit,
        lastSubunit,
        run: { ...run },
      },
    };
    const lim = limitsOf(p);
    p.min = lim.min;
    p.max = lim.max;
    pages.push(p);
    cellPos = 0;
    used = 0;
    run = { passage: false, key: null };
    return p;
  }

  function nextCell() {
    if (cellPos + 1 < cur.geom.cellCount) {
      cellPos++;
      used = 0;
      run = { passage: false, key: null };
    } else {
      cur = newPage(cur.geom, cur.sheet);
    }
  }

  function chromeFor(item, continued, scale) {
    if (item.atom.kind !== 'passage') return 0;
    if (run.passage && run.key === item.key) return 0;
    return M.chromeOf(item.geom, continued, scale);
  }

  function gapFor(item, from) {
    return item.firstOfProblem && from === 0 && used > 0 ? item.geom.problemGap : 0;
  }

  /**
   * 붙어 있어야 할 뒤 원자가 **실제로** 요구하는 최소 높이.
   * 어림(두 줄)으로 재면 상자·표처럼 첫 조각이 테두리·제목까지 안고 오는 원자에서 어긋난다 —
   * 판정만 통과하고 배치는 실패해 발문만 칸 끝에 남는다. 그래서 첫 배치가 실제로 쓰는
   * 조각 수(선지는 minPieces와 같은 2, 그 밖은 1)를 그대로 재 온다. 지문 껍데기도 더한다.
   */
  function followNeed(next, scale, depth = 0) {
    const na = next.atom;
    const nh = M.heightOf(next, scale);
    const chrome = na.kind === 'passage' ? M.chromeOf(next.geom, passageStarted.has(next.key), scale) : 0;
    const nsp = splitterFor(na);
    let need;
    if (na.kind === 'passage' && passageWhole && runOversized(next, scale)) {
      // 한 칸보다 큰 묶음은 어차피 문단 사이에서 나뉜다 — 첫 문단만 데리고 있으면 된다.
      need = nh + chrome;
    } else if (na.kind === 'passage' && passageWhole) {
      // 지문 묶음 전체가 요구 높이다. 묶음 뒤에 같은 문항의 자료·선지(발문 뒤 지문)나
      // 번호·발문(발문 앞 지문)이 오면 그 몫도 이어 센다 — 지문 끝만 겨우 앉히면 붙인 보람이 없다.
      const end = runEnd(next._i);
      need = runHeight(next._i, end, scale) + chrome;
      if (depth === 0) {
        const after = items[end + 1];
        if (after && sameFlow(after, next) && !after.newPage && after.key === next.key &&
            (after.atom.kind !== 'head' || keep.passageWithFirst !== false)) {
          need += followNeed(after, scale, 1);
        }
      }
    } else if (!nsp || !splitAllowed(na, keep)) {
      need = nh + chrome;
    } else {
      const pieces = Math.min(nsp.count, na.kind === 'choices' && keep.stemWithFirstChoice !== false ? 2 : 1);
      const ck = `${scale}|${pieces}`;
      if (!nsp._need) nsp._need = {};
      if (nsp._need[ck] == null) nsp._need[ck] = M.measureHtml(next.geom, na.kind, nsp.htmlFor(0, pieces, false), scale);
      need = Math.min(nh + chrome, nsp._need[ck] + chrome);
    }
    // 번호·발문은 제 뒤 자료·첫 선지까지 데리고 있어야 한다 — 지문 뒤에 번호만 겨우 앉히고
    // <보기>를 다음 칸으로 넘기면 붙여 둔 보람이 없으므로, 그 몫까지 미리 셈에 넣는다.
    if (depth === 0 && na.kind === 'head' && keep.headWithStem !== false) {
      const after = items[next._i + 1];
      if (after && sameFlow(after, next) && !after.newPage && after.key === next.key) {
        need += followNeed(after, scale, 1);
      }
    }
    return need;
  }

  /**
   * 이 원자 바로 뒤에 붙어야 할 번호·발문이 요구하는 높이(지문 사슬용).
   * 지문을 쪼갤 때 마지막 조각 뒤에 이만큼을 남겨 두면 번호·발문이 같은 칸에 앉는다.
   */
  function reserveFor(item, scale) {
    if (keep.passageWithFirst === false) return 0;
    const k = item.atom.kind;
    if (k !== 'passage' && k !== 'intro') return 0;
    const nx = items[item._i + 1];
    if (!nx || nx.key !== item.key || nx.newPage || !sameFlow(nx, item)) return 0;
    if (nx.atom.kind !== 'head') return 0;
    // 지문을 가진 문항은 문항 간격(problemGap)이 맨 앞 원자에 이미 붙었으므로 여기서는 더하지 않는다.
    return followNeed(nx, scale);
  }

  function marks(item, page) {
    const mk = item.mark;
    if (!mk) return;
    const no = page.no ?? page.n;
    if (mk.unit != null && !index.unitPage.has(mk.unit)) index.unitPage.set(mk.unit, no);
    if (mk.subunit != null) {
      // 대단원 이름에 "/"·"&"·"("가 들어가도 키가 겹치지 않게 JSON 배열 문자열을 쓴다.
      const k = subunitKey(mk.unit, mk.subunit);
      if (!index.subunitPage.has(k)) index.subunitPage.set(k, no);
    }
    if (mk.problem && !index.problemPage.has(mk.problem)) index.problemPage.set(mk.problem, no);
    if (mk.answers && index.answersPage == null) index.answersPage = no;
    if (mk.explanations && index.explanationsPage == null) index.explanationsPage = no;
  }

  /** marks가 남긴 자국을 지운다(되물린 원자가 다른 쪽으로 옮겨 갈 때 쪽번호를 되돌린다). */
  function unmark(item, page) {
    const mk = item.mark;
    item._marked = false;
    if (!mk) return;
    const no = page.no ?? page.n;
    if (mk.unit != null && index.unitPage.get(mk.unit) === no) index.unitPage.delete(mk.unit);
    if (mk.subunit != null) {
      const k = subunitKey(mk.unit, mk.subunit);
      if (index.subunitPage.get(k) === no) index.subunitPage.delete(k);
    }
    if (mk.problem && index.problemPage.get(mk.problem) === no) index.problemPage.delete(mk.problem);
  }

  function commit(item, rec) {
    const a = item.atom;
    const cellIdx = cur.geom.fillSeq[cellPos];
    const consumed = rec.gap + rec.chrome + rec.h;
    const entry = {
      kind: a.kind,
      key: item.key,
      node: rec.node || null,
      html: rec.html || null,
      cont: !!rec.cont,
      overflow: !!rec.overflow,
      // 한 칸보다 큰 지문 묶음의 문단 사이 끊김은 허용된 것이라 고아로 세지 않는다.
      runOver: a.kind === 'passage' && runOverWarned.has(item.key),
      // 아래 다섯은 되물리기·사후 검증용이다(조립은 읽지 않는다).
      item,
      whole: !!rec.whole,
      used: consumed,
      first: !!rec.first,
      marked: false,
    };
    cur.cells[cellIdx].push(entry);
    used += consumed;
    // 쪽당 문항 수는 번호가 찍히는 자리(head)로 센다 — 지문을 가진 문항은 안내 문장·지문이
    // 먼저 오므로 firstOfProblem으로 세면 지문만 얹힌 쪽이 한 문항으로 잡힌다.
    if (rec.first && a.kind === 'head' && cur.sheet === 'problems') cur.started += 1;
    if (a.kind === 'passage') {
      run = { passage: true, key: item.key };
      passageStarted.add(item.key);
    } else {
      run = { passage: false, key: null };
    }
    if (item.unit != null && !cur.unitOwn) {
      cur.unit = item.unit;
      cur.subunit = item.subunit;
      cur.unitOwn = true;
    }
    if (item.unit != null) {
      lastUnit = item.unit;
      lastSubunit = item.subunit;
    }
    if (a.kind === 'toc') {
      const no = cur.no ?? cur.n;
      if (!index.tocPages.includes(no)) index.tocPages.push(no);
    }
    if (!item._marked) {
      marks(item, cur);
      item._marked = true;
      entry.marked = true;
    }
    if (rec.overflow) overflowCount++;
  }

  /** 앞 기록이 이 원자와 반드시 붙어 있어야 하는 사이인가(head–자료 · 발문–첫 선지). */
  function boundTo(prevRec, item) {
    if (!prevRec || !prevRec.item) return false;
    if (isBandItem(prevRec.item)) {
      // 띠는 그 뒤 첫 문항의 첫 원자(안내 문장·지문·번호)와 붙는다 — 홀로 칸 끝에 남지 않는다.
      if (keep.bandWithFirst === false || !prevRec.whole) return false;
      return item.sheet === 'problems' && (item.firstOfProblem || isBandItem(item));
    }
    if (prevRec.key == null || prevRec.key !== item.key) return false;
    if (!prevRec.whole || !PULLABLE.has(prevRec.kind)) return false;
    const a = prevRec.item.atom;
    if (a.kind === 'passage') {
      // 지문은 통째일 때만 사슬에 든다: 다음 지문 문단·자료·선지, 그리고 번호·발문(옵션)과 붙는다.
      if (!passageWhole || runOversized(prevRec.item, curScale())) return false;
      const k = item.atom.kind;
      if (k === 'head') return keep.passageWithFirst !== false;
      return k === 'passage' || k === 'material' || k === 'choices';
    }
    if (a.keepWithNext && (a.kind !== 'head' || keep.headWithStem !== false)) return true;
    return item.atom.kind === 'choices' && keep.stemWithFirstChoice !== false;
  }

  /**
   * 이 원자와 붙어 있어야 할 앞 기록들을 칸 끝에서부터 사슬로 모은다.
   * 번호·발문 → <보기> → 선지처럼 셋이 물려 있을 때, 가운데만 데려가면 번호가 홀로 남는다.
   * @returns {{recs: Array, take: Array}} take는 앞에서부터의 순서를 지킨 사슬
   */
  function boundChain(item) {
    const recs = cur ? cur.cells[cur.geom.fillSeq[cellPos]] : [];
    const take = [];
    let follower = item;
    for (let i = recs.length - 1; i >= 0; i--) {
      if (!boundTo(recs[i], follower)) break;
      take.unshift(recs[i]);
      follower = recs[i].item;
    }
    return { recs, take };
  }

  /**
   * 되물릴 수 있는 사슬만 돌려준다. 두 경우에 못 옮긴다 —
   * 사슬이 칸을 통째로 차지했거나(옮겨 봐야 제자리걸음), 사슬 앞이 이 칸에서 끝난 지문이라
   * 사슬만 떼어 가면 지문이 홀로 남는 경우다(지문은 첫 문항의 일부라 갈라 놓을 수 없다).
   */
  function pullable(item) {
    const { recs, take } = boundChain(item);
    if (!take.length || take.length >= recs.length) return null;
    const before = recs[recs.length - take.length - 1];
    if (
      before && before.kind === 'passage' && keep.passageWithFirst !== false &&
      take[0].kind === 'head' && before.key === take[0].key
    ) {
      return null;
    }
    return { recs, take };
  }

  /** 앞 사슬을 되물릴 수 없는 상태(칸을 다 차지했거나 지문에 묶여 있다). */
  function stuckOnChain(item) {
    const { take } = boundChain(item);
    return take.length > 0 && pullable(item) === null;
  }

  /**
   * 다음 칸으로 넘기기 직전, 칸 끝에 홀로 남을 앞 사슬을 통째로 되물려 함께 데려간다.
   * followNeed가 아무리 정확해도 조각 높이는 놓아 보아야 아는 자리가 남는다 — 마지막 안전망이다.
   */
  function pullBack(item) {
    if (!cur) return false;
    const movable = pullable(item);
    if (!movable) return false;
    const { recs, take } = movable;
    for (const rec of take) {
      recs.pop();
      used -= rec.used;
      if (rec.first && rec.kind === 'head' && cur.sheet === 'problems') cur.started -= 1;
      if (rec.marked) unmark(rec.item, cur);
      // 지문 묶음의 첫 문단이 옮겨 가면 새 칸에서 "이어짐"이 아니라 새 상자로 시작한다.
      if (rec.kind === 'passage' && rec.item._i === runStart(rec.item._i)) passageStarted.delete(rec.key);
    }
    const prev = recs[recs.length - 1];
    run = prev && prev.kind === 'passage' ? { passage: true, key: prev.key } : { passage: false, key: null };
    nextCell();
    for (const rec of take) {
      const sc = curScale();
      commit(rec.item, {
        node: rec.node,
        html: rec.html,
        h: M.heightOf(rec.item, sc),
        gap: gapFor(rec.item, 0),
        chrome: chromeFor(rec.item, passageStarted.has(rec.key), sc),
        first: rec.first,
        whole: true,
      });
    }
    return true;
  }

  /** 다음 칸으로. 이 원자와 붙어 있어야 할 앞 사슬은 데리고 간다. */
  function advance(item, from) {
    if (from === 0 && cur) {
      if (pullBack(item)) return;
      const { recs, take } = boundChain(item);
      if (take.length && take.length >= recs.length) {
        // 글자를 줄이면 함께 들어가는 자리인지 먼저 재 본다(되면 이 쪽을 되감는다).
        const chainH = (s) => take.reduce((n, r) => n + M.heightOf(r.item, s), 0) + M.heightOf(item, s);
        shrinkToKeep(chainH, capOf(item.geom));
        warnings.push(
          `${label(item)}: ${kindName(take[0].kind)}과(와) ${kindName(item.atom.kind)}을(를) 한 칸에 함께 두지 못했습니다(합치면 한 칸보다 큽니다). 격자를 줄이거나 글자 크기를 낮추세요.`
        );
      }
    }
    nextCell();
  }

  /** 경고에 쓸 이름. 번호가 있으면 사람이 찾을 수 있는 "12번 문항(s2#1)"으로. */
  function label(item) {
    if (item.num != null) return `${item.num}번 문항(${item.key})`;
    if (item.key) return `${item.key} 문항`;
    return `${kindName(item.atom.kind)} 요소`;
  }

  function place(item, next, from0) {
    const a = item.atom;
    const cap = capOf(item.geom);
    const sp = splitterFor(a);
    let from = from0 || 0;
    let guard = 0;
    let warnedSplit = false;
    // 앞 원자를 되물릴 수도 없고 이 원자를 통째로 놓을 수도 없을 때만 켜진다(아래 바닥 참조).
    let rescueOn = false;
    // 지문 뒤 번호·발문 몫을 남겨 두는 일을 포기했을 때(다 줄여도 안 되는 자리)만 켜진다.
    let reserveOff = false;

    while (guard++ < 500) {
      curFrom = from;
      const sc = curScale();
      const h0 = M.heightOf(item, sc);
      const gap = gapFor(item, from);
      const chrome = chromeFor(item, from > 0 || passageStarted.has(item.key), sc);
      const avail = cap - used - gap - chrome;
      const atStart = used === 0;
      // 빈 칸에도 들어가지 않는 원자는 keep 규칙보다 "잘려 사라지지 않는 것"이 앞선다.
      const mustSplit = !!sp && sp.count > 1 && h0 > cap - chromeFor(item, false, sc);
      /* 구조: 앞 원자(번호·발문)를 되물릴 수도 없고 이 원자를 통째로 놓을 수도 없을 때만 선다.
         통째로 두겠다는 설정을 어기고 쪼개는 편이, 발문만 덩그러니 남은 칸보다 낫다 —
         쪼갠 자리는 data-cont로 이어짐이 표시된다. */
      const rescue = rescueOn && from === 0;
      const canSplit = !!sp && (splitAllowed(a, keep) || mustSplit || rescue);
      if ((mustSplit || rescue) && !splitAllowed(a, keep) && !warnedSplit) {
        warnedSplit = true;
        warnings.push(
          mustSplit
            ? `${label(item)}: ${kindName(a.kind)}이(가) 한 칸보다 커서 붙여 두라는 설정을 어기고 ${sp.count}조각으로 나눴습니다. 격자를 줄이거나 글자 크기를 낮추면 한 덩어리로 들어갑니다.`
            : `${label(item)}: 앞 내용과 떨어지지 않게 ${kindName(a.kind)}을(를) 나눠 이어 붙였습니다. 격자를 줄이거나 글자 크기를 낮추면 한 덩어리로 들어갑니다.`
        );
      }

      // 지문·안내 문장 뒤에 곧바로 올 번호·발문의 몫. 지문을 쪼갤 때 이만큼을 남겨 둔다.
      const reserve = reserveOff ? 0 : reserveFor(item, sc);
      if (typeof window !== 'undefined' && window.__TRACE === item.key) {
        (window.__TRACEOUT = window.__TRACEOUT || []).push({
          kind: a.kind, from, used: Math.round(used), avail: Math.round(avail), h0: Math.round(h0),
          cap: Math.round(cap), pieces: sp ? sp.count : 0, next: next && next.atom.kind,
          nkey: next && next.key, reserve: Math.round(reserve), i: item._i,
        });
      }

      if (from === 0 && h0 <= avail) {
        const wantsNext =
          (a.keepWithNext && (a.kind !== 'head' || keep.headWithStem !== false)) ||
          (next && next.atom.kind === 'head' && keep.passageWithFirst !== false && next.key === item.key) ||
          (next && next.atom.kind === 'choices' && keep.stemWithFirstChoice !== false) ||
          (a.kind === 'passage' && passageWhole && next && next.key === item.key &&
            (next.atom.kind === 'passage' || next.atom.kind === 'material' || next.atom.kind === 'choices') &&
            !runOversized(item, sc));
        const needKeep =
          wantsNext &&
          next &&
          !next.newPage &&
          next.sheet === item.sheet &&
          next.geom === item.geom &&
          (next.key === item.key || !item.key);
        if (!needKeep) {
          commit(item, { node: a._node, h: h0, gap, chrome, first: true, whole: true });
          return;
        }
        const need = followNeed(next, sc);
        if (h0 + need <= avail) {
          commit(item, { node: a._node, h: h0, gap, chrome, first: true, whole: true });
          return;
        }
        // 앞 사슬이 칸을 다 차지해 되물릴 데가 없으면, 옮겨 봐야 같은 자리다 — 여기 놓는다.
        // (옮기면 앞 사슬만 남은 칸이 생긴다. 뒤 원자는 다음 칸에서 이어 붙거나 쪼개진다.)
        if (atStart || stuckOnChain(item)) {
          // 그 전에 이 쪽 글자를 줄이면 둘이 함께 들어가는지 재 본다(자리는 지금 남은 만큼으로
          // 잡는다 — 빈 칸을 기준으로 재면 어느 자리에서나 "줄이면 된다"가 되어 문서가 다 작아진다).
          shrinkToKeep((s) => M.heightOf(item, s) + followNeed(next, s), avail);
          warnings.push(
            `${label(item)}: ${kindName(a.kind)} 뒤에 이어질 ${kindName(next.atom.kind)}을(를) 둘 자리가 칸에 남지 않아 떼어 놓았습니다. 격자를 줄이거나 글자 크기를 낮춰 보세요.`
          );
          commit(item, { node: a._node, h: h0, gap, chrome, first: true, whole: true });
          return;
        }
        advance(item, from);
        continue;
      }

      if (canSplit) {
        // 선지는 첫 배치에서 둘 이상 놓아야 한 줄만 떨어져 나가지 않는다.
        // 다만 쪼개서라도 붙이는 마지막 수단(rescue)에서는 한 줄이라도 붙이는 편이 낫다.
        const minPieces = !mustSplit && !rescue && a.kind === 'choices' && from === 0 && keep.stemWithFirstChoice !== false ? 2 : 1;
        const k = fitCount(sp, from, avail, item, sc, reserve);
        if (k - from >= minPieces) {
          const isLast = k === sp.count;
          const html = sp.htmlFor(from, k, from > 0);
          commit(item, { html, h: sp._lastH, gap, chrome, cont: from > 0, first: from === 0 });
          from = k;
          curFrom = from;
          if (isLast) return;
          nextCell();
          continue;
        }
        /* 번호·발문 몫을 남기느라 한 조각도 못 놓는 자리. 빈 칸에서도 그렇다면 글자를 줄여
           보고, 다 줄여도 안 되면 그때만 몫 남기기를 포기한다(지문과 번호가 갈라진다). */
        if (reserve > 0 && atStart) {
          shrinkToKeep((s) => M.measureHtml(item.geom, a.kind, sp.htmlFor(from, from + 1, from > 0), s) + reserveFor(item, s), avail);
          reserveOff = true;
          warnings.push(
            `${label(item)}: 지문과 번호·발문을 한 칸에 붙이지 못해 지문 끝에서 갈랐습니다. 격자를 줄이거나 글자 크기를 낮춰 보세요.`
          );
          continue;
        }
      }

      if (atStart) {
        const html = from > 0 && sp ? sp.htmlFor(from, sp.count, true) : null;
        const h = html ? M.measureHtml(item.geom, a.kind, html, sc) : h0;
        const over = h > cap - chrome;
        if (over) {
          warnings.push(
            `${label(item)}: ${kindName(a.kind)} 조각의 높이(${Math.round(h)}px)가 한 칸(${Math.round(cap)}px)보다 커서 칸을 넘칩니다. 격자를 1×1로 바꾸거나 글자 크기·도형 폭을 줄이세요.`
          );
        }
        commit(item, {
          html,
          node: html ? null : a._node,
          h,
          gap,
          chrome,
          cont: from > 0,
          overflow: over,
          first: from === 0,
          whole: !html,
        });
        return;
      }
      /* 이 칸에는 아무것도 못 놓는다. 앞 사슬이 칸을 다 차지해 되물릴 수조차 없다면,
         마지막 수단으로 이 원자를 쪼개 앞 사슬에 붙인다. */
      if (from === 0 && !rescueOn && !!sp && sp.count > 1 && !splitAllowed(a, keep) && stuckOnChain(item)) {
        // 쪼개기 전에, 글자를 줄이면 통째로 붙는 자리인지 재 본다.
        const { take } = boundChain(item);
        shrinkToKeep(
          (s) => take.reduce((n, r) => n + M.heightOf(r.item, s), 0) + M.heightOf(item, s),
          capOf(item.geom)
        );
        rescueOn = true;
        continue;
      }
      advance(item, from);
    }
    warnings.push(`${label(item)}: 배치가 끝나지 않아 강제로 중단했습니다(내부 한계 도달).`);
  }

  /**
   * 이진탐색으로 avail에 들어가는 최대 조각 수를 찾는다(측정 O(log n)회).
   * reserve가 있으면 **마지막 조각까지 다 넣는 경우에만** 그만큼을 더 남겨 둔다 —
   * 지문 끝과 번호·발문이 같은 칸에 앉게 하려고 분할점을 앞으로 당기는 장치다.
   */
  function fitCount(sp, from, avail, item, scale, reserve = 0) {
    if (reserve > 0) {
      const k = fitCount(sp, from, avail, item, scale, 0);
      if (k < sp.count || sp._lastH + reserve <= avail) return k;
      return fitCount(sp, from, avail - reserve, item, scale, 0);
    }
    const kind = item.atom.kind;
    const cont = from > 0;
    const first = M.measureHtml(item.geom, kind, sp.htmlFor(from, from + 1, cont), scale);
    if (first > avail) {
      sp._lastH = first;
      return from;
    }
    let lo = from + 1;
    let hi = sp.count;
    let lastH = first;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const h = M.measureHtml(item.geom, kind, sp.htmlFor(from, mid, cont), scale);
      if (h <= avail) {
        lo = mid;
        lastH = h;
      } else {
        hi = mid - 1;
      }
    }
    sp._lastH = lastH;
    return lo;
  }

  /**
   * i에서 시작하는 사슬을 훑는다: [연속한 띠] → [안내 문장·지문] → 번호·발문.
   * 사슬은 **시작 자리에서만** 따진다(띠이거나 문항의 첫 원자일 때) — 지문 둘째 조각마다
   * 다시 따지면 칸을 넘길 이유가 없는데도 넘기게 된다.
   * @returns {{first: number, headIndex: number, head: Object, pre: number[]}|null}
   */
  function chainAt(i) {
    const it = items[i];
    if (!it || it.sheet !== 'problems') return null;
    if (!it.firstOfProblem && !(keep.bandWithFirst !== false && isBandItem(it))) return null;
    let j = i;
    if (keep.bandWithFirst !== false) {
      while (j < items.length && isBandItem(items[j]) && sameFlow(items[j], it) && (j === i || !items[j].newPage)) j += 1;
    }
    const pre = [];
    const key = items[j] ? items[j].key : null;
    if (keep.passageWithFirst !== false) {
      while (
        j < items.length && items[j] && PRE_HEAD.has(items[j].atom.kind) &&
        items[j].key === key && sameFlow(items[j], it) && (j === i || !items[j].newPage)
      ) {
        pre.push(j);
        j += 1;
      }
    }
    const head = items[j];
    if (!head || head.atom.kind !== 'head' || !sameFlow(head, it) || (j !== i && head.newPage)) return null;
    return { first: i, headIndex: j, head, pre };
  }

  /**
   * 사슬의 높이 = 띠들 + 안내 문장·지문 전부 + 번호·발문 + 그 뒤가 요구하는 최소 높이.
   * @param {Object} chain chainAt의 결과
   */
  function chainHeight(chain, sc) {
    let h = 0;
    for (let j = chain.first; j < chain.headIndex; j += 1) {
      h += M.heightOf(items[j], sc);
      // 상자 껍데기는 묶음의 첫 문단에만 붙는다(문단마다 더하면 사슬이 실제보다 커진다).
      if (items[j].atom.kind === 'passage' && (j === chain.first || items[j - 1].atom.kind !== 'passage')) {
        h += M.chromeOf(items[j].geom, false, sc);
      }
    }
    // 문항 간격은 사슬 안의 "문항 첫 원자"에 붙는다. 칸 첫머리에서 시작하는 사슬만 면제.
    const gapless = used === 0 && items[chain.first].firstOfProblem;
    if (!gapless) h += items[chain.first].geom.problemGap;
    h += followNeed(chain.head, sc);
    return h;
  }

  /**
   * 놓기 전에 살펴야 하는 두 가지 — 놓고 나면 되돌릴 수 없는 것들이다.
   * (1) 쪽당 최대: 이 쪽에서 이미 max개가 시작했으면 칸이 남아도 새 쪽으로 넘어간다.
   * (2) 사슬: 띠·안내 문장·지문과 첫 문항이 한 칸에서 끊기지 않고 이어질 때만 첫 원자를 놓는다.
   */
  function prePlace(i, it) {
    const chain = chainAt(i);
    if (chain && cur.sheet === 'problems' && cur.started >= limitsOf(cur).max) {
      cur = newPage(cur.geom, cur.sheet);
    }
    if (!chain || chain.headIndex === i) return;   // 사슬이랄 것이 없다(번호·발문이 곧 시작)
    const cap = capOf(it.geom);
    // 지문을 쪼갤 수 있으면 긴 사슬도 이어 놓을 수 있다 — 마지막 조각 뒤에 번호·발문 몫을
    // 남기는 일은 place()의 reserve가 맡는다. 그래서 여기서는 "통째로 옮길지"만 따진다.
    const splittable = chain.pre.some((j) => {
      const a = items[j].atom;
      return a.kind === 'passage' && splitAllowed(a, keep) && !!splitterFor(a);
    });
    let guard = 0;
    while (guard++ < cur.geom.cellCount + 2) {
      const need = chainHeight(chain, curScale());
      if (used === 0) {
        if (need > cap && !splittable) {
          shrinkToKeep((s) => chainHeight(chain, s), cap);
          warnings.push(
            `${label(chain.head)}: 단원 제목·지문과 첫 문항을 한 칸에 함께 두지 못했습니다(합치면 한 칸보다 큽니다). 격자를 줄이거나 글자 크기를 낮추세요.`
          );
        }
        return;
      }
      if (used + need <= cap) return;
      if (need > cap && splittable) return;   // 여기서 시작해 지문을 이어 간다
      nextCell();
    }
  }

  /* 되감기가 있어 for 문이 아니다: 쪽이 최소 문항 수를 못 채우면 그 쪽이 열릴 때의
     스냅샷으로 돌아가 항목 번호 i와 조각 번호 from을 되돌린 뒤 같은 자리를 다시 놓는다. */
  // 항목 번호를 원자에 적어 둔다 — followNeed·reserveFor가 "이 원자 다음 것"을 찾는 데 쓴다.
  items.forEach((it, n) => { it._i = n; });

  let i = 0;
  let nextFrom = 0;
  let loopGuard = 0;
  const loopMax = items.length * 4 + REWIND_CAP * 2 + 100;
  while (i < items.length) {
    if (loopGuard++ > loopMax) {
      warnings.push('배치가 끝나지 않아 중단했습니다(내부 한계 도달). 쪽당 최소 문항 수를 낮춰 보세요.');
      break;
    }
    const it = items[i];
    it._marked = false;
    const nx = items[i + 1];
    const next = nx && sameFlow(nx, it) && !nx.newPage ? nx : null;
    try {
      curIndex = i;
      curFrom = nextFrom;
      if (!cur || it.newPage || it.geom !== cur.geom || it.sheet !== cur.sheet) cur = newPage(it.geom, it.sheet);
      if (nextFrom === 0) prePlace(i, it);
      place(it, next, nextFrom);
      i += 1;
      nextFrom = 0;
    } catch (err) {
      if (err !== REWIND) throw err;
      const back = restore(pendingRestore);
      pendingRestore = null;
      i = back.i;
      nextFrom = back.from;
    }
  }

  // 붙여 두기 때문에 줄인 쪽은 마지막 배율로 한 번만 알린다(줄여 가는 과정은 알릴 것이 없다).
  for (const p of pages) {
    if (!keepShrunk.has(p.n) || (p.scale || 1) === 1) continue;
    warnings.push(`${p.no}쪽: 붙여 두기를 위해 글자를 ${trimNum(baseSize * p.scale)}pt로 줄였습니다.`);
  }

  // 같은 문항의 원자 여럿이 똑같은 문장을 낼 수 있다 — 한 번만 보여 준다(순서는 그대로).
  return {
    pages,
    index,
    warnings: [...new Set(warnings)],
    overflow: overflowCount,
    totalPages: pageNo,
    // 쪽당 문항 수 보고(문제 시트만). max의 Infinity는 "제한 없음"이라 0으로 되돌려 적는다.
    perPage: pages
      .filter((p) => p.sheet === 'problems' && p.no != null)
      .map((p) => ({
        page: p.no,
        count: p.started,
        scale: p.scale,
        min: p.min || 0,
        max: p.max === Infinity ? 0 : p.max,
      })),
    fontAdjusted: pages.filter((p) => (p.scale || 1) !== 1).length,
    shrunkForKeep: pages.filter((p) => keepShrunk.has(p.n) && (p.scale || 1) !== 1).length,
    rewinds,
  };
}

/* ─────────────────────────── 6. 조립 ─────────────────────────── */

/** 토큰 문자열을 값으로 치환한다({page} {unit} …). */
function subst(tpl, t) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (k in t ? String(t[k]) : m));
}

/** 머리말/꼬리말 한 줄을 만든다(examStyle이면 수능식 좌우 반전·교시 표기). */
function bandEl(cls, band, t, S, page) {
  const el = document.createElement(cls === 'head' ? 'header' : 'footer');
  el.className = cls === 'head' ? 'pg-head' : 'pg-foot';
  if (S.examStyle) {
    const odd = (page.no || 0) % 2 === 1;
    if (cls === 'head') {
      // 과목이 비면 책 제목으로 대신한다("제1교시  영역"처럼 가운데가 빈 머리말을 막는다).
      const title = `제${t.period || 1}교시 ${t.subject || t.title || ''} 영역`.replace(/\s{2,}/g, ' ');
      el.innerHTML =
        `<span class="h-l">${odd ? esc(t.unit || '') : ''}</span>` +
        `<span class="h-c">${esc(title)}</span>` +
        `<span class="h-r">${odd ? '' : esc(t.unit || '')}</span>`;
    } else {
      el.innerHTML = `<span class="exam-num ${odd ? 'side-r' : 'side-l'}">${esc(t.page)}</span>`;
    }
    return el;
  }
  const L = subst(band.left, t);
  const C = subst(band.center, t);
  const Rt = subst(band.right, t);
  if (!L && !C && !Rt) el.classList.add('empty');
  el.innerHTML = `<span class="h-l">${esc(L)}</span><span class="h-c">${esc(C)}</span><span class="h-r">${esc(Rt)}</span>`;
  return el;
}

/**
 * 머리말 토큰 `{subject}`에 넣을 과목명을 정한다.
 * project.meta.subject는 "auto"가 기본값(과목을 문항마다 파서가 추정하라는 뜻)이므로
 * 그대로 찍으면 머리말에 "제1교시 auto 영역"이 나온다. auto·빈 값이면 문항들이 실제로
 * 추정받은 과목 중 가장 많은 것을 쓰고, 그것도 없으면 빈 문자열로 둔다.
 * @param {string} declared project.meta.subject
 * @param {Array} problems doc.problems
 */
function resolveSubject(declared, problems) {
  const d = String(declared || '').trim();
  if (d && d !== 'auto') return d;
  const tally = new Map();
  for (const p of problems || []) {
    const s = String((p && p.subject) || '').trim();
    if (!s || s === '기타' || s === 'auto') continue;
    tally.set(s, (tally.get(s) || 0) + 1);
  }
  let best = '';
  let n = 0;
  for (const [k, v] of tally) if (v > n) { best = k; n = v; }
  return best;
}

/**
 * 조립된 페이지에서 내용이 칸 높이를 넘긴 칸을 찾는다.
 * scrollHeight는 절대 배치 요소(KaTeX mathml, 상자 제목 등)까지 세어 실제보다 크게 나오므로
 * 흐름 자식들의 실제 바닥 좌표로 잰다(1px 허용).
 */
function findClippedCells(pages) {
  const out = [];
  for (const pg of pages) {
    const cells = pg.querySelectorAll('.cell');
    cells.forEach((cell, i) => {
      const zoom = scaleOf(cell);
      const top = cell.getBoundingClientRect().top;
      let bottom = top;
      for (const child of cell.children) {
        const r = child.getBoundingClientRect();
        if (r.height === 0) continue;
        if (r.bottom > bottom) bottom = r.bottom;
      }
      const by = (bottom - top) / zoom - cell.clientHeight;
      if (by > 1) out.push({ cell, page: Number(pg.dataset.page) || 0, index: i, by });
    });
  }
  return out;
}

function px(mm) {
  return Math.round(mm * MM * 100) / 100;
}

/** 배치 기록 하나를 실제 DOM 노드로. 측정 노드가 있으면 재사용(수식 재렌더 방지). */
function nodeFor(rec, warnings) {
  if (rec.node) {
    if (rec.overflow) rec.node.classList.add('overflow');
    return rec.node;
  }
  const d = document.createElement('div');
  d.className = 'atom' + (rec.overflow ? ' overflow' : '');
  d.innerHTML = rec.html || '';
  renderMath(d, warnings);
  return d;
}

/**
 * 한 지문이 칸 몇 개에 나뉘어 놓였는지 미리 센다(문항 키 → 덩어리 수).
 * 조립하면서 세면 "이 덩어리가 마지막인가"를 알 수 없어, 뒤가 더 있는데도 상자 아래를
 * 닫아 버린다 — 독자는 다 끝난 상자로 읽고 다음 칸에서 문장 도중에 시작하는 상자를 만난다.
 * @param {Array} pages pack이 남긴 페이지 기록
 */
function countPassageRuns(pages) {
  const total = new Map();
  for (const p of pages) {
    for (const recs of p.cells) {
      let i = 0;
      while (i < recs.length) {
        if (recs[i].kind !== 'passage') { i++; continue; }
        const key = recs[i].key;
        total.set(key, (total.get(key) || 0) + 1);
        while (i < recs.length && recs[i].kind === 'passage') i++;
      }
    }
  }
  return total;
}

/**
 * 배치 기록 배열을 부모에 붙이되 연속된 지문 조각은 .passage 래퍼로 묶는다.
 * @param {Object} pass 지문 상태 { total: Map, seen: Map } — 이어짐 표시(cont/open-end)를 정한다
 */
function appendRun(parent, recs, S, pass, warnings) {
  let i = 0;
  while (i < recs.length) {
    if (recs[i].kind === 'passage') {
      let j = i;
      while (j < recs.length && recs[j].kind === 'passage') j++;
      const key = recs[i].key;
      const nth = pass.seen.get(key) || 0;      // 이 지문의 몇 번째 덩어리인가(0부터)
      const total = pass.total.get(key) || 1;
      pass.seen.set(key, nth + 1);
      const wrap = document.createElement('div');
      wrap.className = 'passage' + (S.passageStyle === 'boxed' ? ' boxed' : '') + (nth > 0 ? ' cont' : '');
      // 뒤에 더 있는 덩어리는 아래를 열어 둔다(위를 여는 cont와 짝이 맞는다).
      if (nth + 1 < total) wrap.setAttribute('data-open-end', '1');
      for (const r of recs.slice(i, j)) wrap.appendChild(nodeFor(r, warnings));
      parent.appendChild(wrap);
      i = j;
    } else {
      parent.appendChild(nodeFor(recs[i], warnings));
      i++;
    }
  }
}

/** 패킹 결과를 페이지 DOM으로 조립한다. */
function assemble(packed, ctx, meta) {
  const S = ctx.settings;
  const warnings = ctx.warnings;
  const seenQ = new Set();
  const pass = { total: countPassageRuns(packed.pages), seen: new Map() };
  const out = [];

  for (const p of packed.pages) {
    const sec = document.createElement('section');
    sec.className = 'page' + (S.examStyle ? ' exam' : '') + (p.sheet === 'cover' ? ' cover-page' : '');
    sec.dataset.page = p.no == null ? '' : String(p.no);
    sec.dataset.index = String(p.n);
    sec.dataset.sheet = p.sheet;
    applyGeomVars(sec, p.geom);
    // 쪽당 최소 문항 수를 채우려고 글자를 줄인 쪽은 그 쪽에서만 --font-size를 덮어쓴다.
    // 머리말·꼬리말도 .page 안이지만 mm·고정 높이로 짜여 있어 자리는 그대로 남는다.
    const fscale = p.scale || 1;
    sec.dataset.fontScale = String(fscale);
    if (fscale !== 1) sec.style.setProperty('--font-size', fontPt(Number(S.font.size) || 10, fscale));

    const t = {
      title: meta.title || '',
      subtitle: meta.subtitle || '',
      subject: meta.subject || '',
      grade: meta.grade || '',
      round: meta.round || '',
      period: meta.period || '',
      institute: meta.institute || '',
      date: meta.date || '',
      unit: p.unit || '',
      subunit: p.subunit || '',
      page: p.no == null ? '' : String(p.no),
      pages: String(packed.totalPages),
    };

    if (p.sheet !== 'cover') sec.appendChild(bandEl('head', S.header || {}, t, S, p));
    const body = document.createElement('div');
    body.className = 'pg-body';
    for (let ci = 0; ci < p.geom.cellCount; ci++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.cell = String(ci);
      const recs = p.cells[ci];
      let i = 0;
      while (i < recs.length) {
        const key = recs[i].key;
        if (key) {
          let j = i;
          while (j < recs.length && recs[j].key === key) j++;
          const art = document.createElement('article');
          art.className = 'q' + (seenQ.has(key) ? ' cont' : '');
          art.dataset.q = key;
          seenQ.add(key);
          appendRun(art, recs.slice(i, j), S, pass, warnings);
          cell.appendChild(art);
          i = j;
        } else {
          let j = i;
          while (j < recs.length && !recs[j].key) j++;
          appendRun(cell, recs.slice(i, j), S, pass, warnings);
          i = j;
        }
      }
      body.appendChild(cell);
    }
    // 칸 사이 괘선
    if (S.columnRule && p.geom.cols > 1) {
      for (let c = 1; c < p.geom.cols; c++) {
        const r = document.createElement('i');
        r.className = 'col-rule';
        r.style.left = `calc(${p.geom.cellW * c}px + ${p.geom.gutter * (c - 0.5)}px)`;
        body.appendChild(r);
      }
    }
    if (S.rowRule && p.geom.rows > 1) {
      // geom.cellH는 측정용으로 0.5px 깎아 둔 값이다. 괘선은 눈에 보이는 칸 높이(--cell-h)를
      // 기준으로 놓아야 행 사이 한가운데에 정확히 앉는다.
      const cellH = p.geom.cellH + 0.5;
      for (let rr = 1; rr < p.geom.rows; rr++) {
        const r = document.createElement('i');
        r.className = 'row-rule';
        r.style.top = `calc(${cellH * rr}px + ${p.geom.rowGap * (rr - 0.5)}px)`;
        body.appendChild(r);
      }
    }
    sec.appendChild(body);
    if (p.sheet !== 'cover') sec.appendChild(bandEl('foot', S.footer || {}, t, S, p));
    out.push(sec);
  }
  return out;
}

/* ─────────────────────────── 7. 진입점 ─────────────────────────── */

/**
 * 문서·프로젝트를 받아 페이지 DOM을 만들어 mount에 붙인다.
 * @param {Object} doc parseProject 결과 + doc.renderers(app.js가 주입)
 * @param {Object} project Project
 * @param {HTMLElement} mount 프리뷰 루트(비우고 채운다)
 * @returns {Promise<{pages: HTMLElement[], index: Object, warnings: string[]}>}
 */
export async function buildBooklet(doc, project, mount) {
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  const S = deepMerge(DEFAULT_LAYOUT, (project && project.layout) || {});
  const warnings = [];
  if (!doc || !doc.renderers) {
    warnings.push('렌더러(doc.renderers)가 없습니다. app.js가 renderProblem·renderExplanation 등을 주입해야 합니다.');
  }
  const explGrid = (project.sheets && project.sheets.explanations && project.sheets.explanations.grid) || { cols: 2, rows: 1 };
  const geomMain = computeGeometry(S, S.grid, 'main');
  const geomExpl = computeGeometry(S, explGrid, 'expl');

  mount.classList.add('bk-mount');
  mount.textContent = '';
  applyGeomVars(mount, geomMain);
  applyFontVars(mount, S);
  injectPageStyle(geomMain);

  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (err) {
      /* 글꼴 준비 실패는 측정 정확도만 떨어뜨리므로 무시한다 */
    }
  }

  const measurer = createMeasurer(mount, S, warnings);
  const ctx = { settings: S, project, doc, warnings, geomMain, geomExpl, measurer };
  const { items, groups, sheets } = buildStream(doc, project, ctx);

  // 차례 2-pass: 차례에 **찍힌** 쪽과 배치 결과가 같아질 때까지 돈다.
  // (이전 판은 직전 pass의 index로 차례를 그린 뒤 마지막 pack 결과를 돌려주어,
  //  마지막 pass에서 쪽이 한 장 밀리면 차례 숫자만 옛것으로 남았다 — 쪽번호 어긋남의 원인.)
  let index = emptyIndex();
  let packed = null;
  let converged = false;
  let passes = 0;
  const MAX_PASS = 6;
  for (let pass = 0; pass < MAX_PASS; pass++) {
    passes++;
    refreshTocAtoms(items, groups, index, ctx, sheets); // 차례가 보여 주는 쪽 = index
    measurer.measureItems(items);
    packed = pack(items, ctx);
    if (indexSignature(packed.index) === indexSignature(index)) {
      converged = true; // 보여 준 쪽 = 실제 쪽
      break;
    }
    index = packed.index;
  }
  if (!converged) {
    // 마지막으로 실제 쪽을 차례에 반영한다(한 장 차이가 남더라도 최신 숫자를 보여 준다).
    refreshTocAtoms(items, groups, packed.index, ctx, sheets);
    measurer.measureItems(items);
    passes++;
    const last = pack(items, ctx);
    if (indexSignature(last.index) === indexSignature(packed.index)) {
      converged = true;
      packed = last;
    } else {
      packed = last;
      warnings.push(
        `차례 쪽번호가 ${MAX_PASS + 1}번 다시 계산해도 한 값으로 모이지 않았습니다(쪽 수가 차례 길이에 따라 오르내림). 차례 제목을 줄이거나 시트 순서를 고정해 보세요.`
      );
    }
  }

  const meta = { title: project.title || '', subtitle: project.subtitle || '', ...(project.meta || {}) };
  meta.subject = resolveSubject(meta.subject, doc && doc.problems);
  let pages = assemble(packed, ctx, meta);
  let frag = document.createDocumentFragment();
  for (const p of pages) frag.appendChild(p);
  mount.appendChild(frag);

  // 사후 검증: 실제로 그려진 칸이 넘치면(측정 오차) 여유를 2mm씩 키워 다시 배치한다(최대 3회).
  // 넘침은 .cell의 overflow:hidden에 조용히 잘려 나가므로, 여기서 잡지 않으면 인쇄물에서만 드러난다.
  let repairs = 0;
  let clipped = findClippedCells(pages);
  while (clipped.length && repairs < 3) {
    repairs++;
    ctx.extraSlack = (ctx.extraSlack || 0) + px(2);
    for (const p of pages) p.remove();
    refreshTocAtoms(items, groups, packed.index, ctx, sheets);
    measurer.measureItems(items);
    packed = pack(items, ctx);
    pages = assemble(packed, ctx, meta);
    frag = document.createDocumentFragment();
    for (const p of pages) frag.appendChild(p);
    mount.appendChild(frag);
    clipped = findClippedCells(pages);
  }
  if (repairs) {
    warnings.push(`칸 넘침이 감지되어 아래 여유를 ${2 * repairs}mm 더 두고 ${repairs}번 다시 배치했습니다(배치 탭의 "칸 아래 여유"를 키우면 처음부터 맞습니다).`);
  }
  for (const c of clipped) {
    c.cell.classList.add('overflowed');
    warnings.push(`${c.page}쪽 ${c.index + 1}번 칸의 내용이 ${Math.round(c.by)}px 넘쳐 아래가 잘립니다. 글자 크기·격자를 조정하거나 "칸 아래 여유"를 키우세요.`);
  }
  const measures = measurer.calls();
  measurer.destroy();

  // 사후 점검: 띠·붙여 두기 규칙이 실제 배치에서 지켜졌는지 센다(둘 다 0이어야 한다).
  const bandOrphans = findBandOrphans(packed.pages);
  const keepOrphans = findKeepOrphans(packed.pages, S.keep || {});
  const passageSites = [];
  const passageOrphans = findPassageOrphans(packed.pages, S.keep || {}, passageSites);
  for (const s of passageSites.slice(0, 8)) {
    warnings.push(
      `${s.num != null ? `${s.num}번 문항` : s.key}: 지문과 번호·발문이 ${s.page}쪽에서 갈라졌습니다. 격자를 줄이거나 글자 크기를 낮춰 보세요.`
    );
  }
  if (bandOrphans && (S.keep || {}).bandWithFirst !== false) {
    warnings.push(`단원 제목만 칸 끝에 남은 칸이 ${bandOrphans}개 있습니다. 격자를 줄이거나 글자 크기를 낮춰 보세요.`);
  }
  if (keepOrphans) {
    warnings.push(`번호·발문이 뒤 내용과 떨어진 칸이 ${keepOrphans}개 있습니다. 격자를 줄이거나 글자 크기를 낮춰 보세요.`);
  }

  const all = warnings.concat(packed.warnings, doc && doc.warnings ? doc.warnings : []);
  const t1 = (typeof performance !== 'undefined' ? performance : Date).now();
  return {
    pages,
    index: packed.index,
    warnings: all,
    stats: {
      pages: packed.totalPages,
      overflow: packed.overflow,
      ms: Math.round(t1 - t0),
      atoms: items.length,
      passes,        // 차례 쪽번호가 수렴하기까지 돈 배치 횟수(1이면 첫 판에 맞은 것)
      repairs,       // 사후 넘침 검증으로 다시 배치한 횟수
      clipped: clipped.length,   // 끝내 남은 넘침 칸 수
      measures,      // 조각 높이를 재느라 강제 리플로우를 부른 횟수(조판 시간의 주범)
      converged,
      // 쪽당 시작 문항 수 [{ page, count, scale, min, max }] — 문제 시트 쪽만
      perPage: packed.perPage || [],
      fontAdjusted: packed.fontAdjusted || 0,   // 글자를 줄인 쪽 수
      shrunkForKeep: packed.shrunkForKeep || 0, // 그중 붙여 두기 때문에 줄인 쪽 수
      rewinds: packed.rewinds || 0,             // 되감은 횟수(최소 문항 수 + 붙여 두기)
      bandOrphans,   // 띠만 칸 끝에 남은 칸 수(옵션이 켜져 있으면 0)
      keepOrphans,   // 번호·발문이 뒤 내용과 떨어진 칸 수
      passageOrphans, // 지문과 첫 문항이 갈라진 칸 수
      passageSites: passageSites.slice(0, 12),   // 그 자리들(쪽·칸·문항 번호)
    },
  };
}

export default buildBooklet;
