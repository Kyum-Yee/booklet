// toc.js — 차례 항목 생성과 점선 리더 HTML.
// layout.js의 2-pass가 쪽수 없이 1차 호출, 쪽수를 채워 2차 호출한다(높이가 같아야 수렴한다).
// [DOM 무관 · 순수 문자열]

/** HTML 특수문자를 이스케이프한다(차례 라벨은 원문 텍스트이므로 태그를 허용하지 않는다). */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 쪽수를 표시 문자열로 바꾼다(1차 pass에서는 자리만 차지하도록 같은 자릿수의 자리표를 쓴다). */
function pageLabel(page) {
  return page == null || page <= 0 ? '&nbsp;&nbsp;' : String(page);
}

/**
 * 소단원 쪽 색인의 키. 대단원·소단원 이름에 `/` `&` `(` 가 들어가도 절대 겹치지 않는다.
 * (`unit + "/" + subunit`으로 이으면 "차시별 학습지 (02. A / 03. B)" 같은 이름끼리 키가 충돌해
 *  엉뚱한 쪽번호를 물려받는다 — layout.marks와 이 파일이 같은 함수를 쓴다.)
 * @param {string} unit 대단원
 * @param {string} subunit 소단원
 */
export function subunitKey(unit, subunit) {
  return JSON.stringify([unit == null ? '' : String(unit), subunit == null ? '' : String(subunit)]);
}

/**
 * 단원 그룹과 배치 index로 차례 항목을 만든다.
 * @param {Array} groups groupByUnits 결과 [{ unit, subunits:[{ subunit, problems }] }]
 * @param {Object} index layout의 index({ problemPage, unitPage, subunitPage, answersPage, explanationsPage })
 * @param {Object} opts { pageNumbers, showCount, answersTitle, explanationsTitle, includeSheets }
 * @returns {{ front: Array, perUnit: Map }}
 */
export function buildTocEntries(groups, index, opts = {}) {
  const o = {
    pageNumbers: true,
    showCount: true,
    includeSheets: true,
    answersTitle: '빠른 정답',
    explanationsTitle: '정답과 해설',
    ...opts,
  };
  const get = (map, key) => (map && typeof map.get === 'function' ? map.get(key) : undefined);
  const front = [];
  const perUnit = new Map();

  for (const g of groups || []) {
    const unitLabel = g.unit && String(g.unit).trim() ? g.unit : '단원 미지정';
    const unitCount = (g.subunits || []).reduce((n, s) => n + (s.problems ? s.problems.length : 0), 0);
    const unitEntry = {
      level: 1,
      unit: g.unit,
      subunit: null,
      label: unitLabel,
      page: null,
      count: unitCount,
    };
    front.push(unitEntry);

    const subs = [];
    let firstSubPage = null;
    for (const s of g.subunits || []) {
      const subLabel = s.subunit && String(s.subunit).trim() ? s.subunit : '기타';
      const probs = s.problems || [];
      // 소단원 쪽: 소단원 띠가 놓인 쪽 → 없으면 그 소단원 첫 문항의 쪽.
      let page = get(index.subunitPage, subunitKey(g.unit, s.subunit));
      if (page == null && probs[0]) page = get(index.problemPage, probs[0].key);
      if (page != null && (firstSubPage == null || page < firstSubPage)) firstSubPage = page;
      const entry = {
        level: 2,
        unit: g.unit,
        subunit: s.subunit,
        label: subLabel,
        page: o.pageNumbers ? page ?? null : null,
        count: probs.length,
      };
      front.push(entry);
      subs.push(entry);
    }

    // 대단원 쪽: 띠/표지가 놓인 쪽 → 없으면 첫 소단원 쪽 → 없으면 첫 문항 쪽.
    let unitPage = get(index.unitPage, g.unit);
    if (unitPage == null) unitPage = firstSubPage;
    if (unitPage == null) {
      const first = (g.subunits || []).flatMap((s) => s.problems || [])[0];
      if (first) unitPage = get(index.problemPage, first.key);
    }
    unitEntry.page = o.pageNumbers ? unitPage ?? null : null;
    perUnit.set(g.unit, subs);
  }

  if (o.includeSheets) {
    if (index.answersPage != null) {
      front.push({ level: 1, label: o.answersTitle, page: o.pageNumbers ? index.answersPage : null, count: 0 });
    }
    if (index.explanationsPage != null) {
      front.push({ level: 1, label: o.explanationsTitle, page: o.pageNumbers ? index.explanationsPage : null, count: 0 });
    }
  }
  return { front, perUnit };
}

/** 차례 한 줄(점선 리더 + 우측 쪽번호) HTML. */
export function tocRowHtml(e, opts = {}) {
  const cls = e.level === 1 ? 'toc-row toc-l1' : 'toc-row toc-l2';
  const count = opts.showCount !== false && e.count ? `<span class="toc-count">${e.count}문항</span>` : '';
  const page = opts.pageNumbers === false ? '' : `<span class="toc-page">${pageLabel(e.page)}</span>`;
  return `<div class="${cls}"><span class="toc-label">${esc(e.label)}</span>${count}<span class="toc-dots"></span>${page}</div>`;
}

/**
 * 차례 전체 HTML. 원자 분할을 위해 layout이 자식 요소 단위로 쪼갤 수 있는 평평한 구조로 낸다.
 * @param {Array} entries TocEntry[]
 * @param {string} title 제목(빈 문자열이면 제목 줄 생략)
 * @param {Object} opts { pageNumbers, showCount, dataQ }
 */
export function renderToc(entries, title, opts = {}) {
  const parts = tocParts(entries, title, opts);
  const q = opts.dataQ ? ` data-q="${esc(opts.dataQ)}"` : ' data-q=""';
  return `<nav class="toc"${q}>${parts.join('')}</nav>`;
}

/** renderToc의 조각(제목 + 각 줄) — layout의 splitParts로 그대로 쓴다. */
export function tocParts(entries, title, opts = {}) {
  const parts = [];
  if (title) parts.push(`<h2 class="toc-title">${esc(title)}</h2>`);
  for (const e of entries || []) parts.push(tocRowHtml(e, opts));
  if (!parts.length) parts.push('<div class="toc-row"><span class="toc-label">항목 없음</span></div>');
  return parts;
}
