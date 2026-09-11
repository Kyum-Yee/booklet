// units.js — 문항의 대단원·소단원 도출(수동 지정 > 헤더 `단원:` > [ref] 휴리스틱)과 단원별 묶기.

/** ref.rest에서 단원 후보를 자르는 표지들. */
const MARKER_RE = /(유형\s*\d+|연습 문제|UNIT\s*\d+|단원 종합|차시별 학습지)/u;
const ROMAN_RE = /^(?:[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]|[0-9]{2})[.\s\-–]*[^\s]+(?:\s[^\s]+){0,3}/u;

/** 앞뒤 중괄호·대괄호 껍데기를 벗긴다({현대소설 3. …} → 현대소설 3. …). */
function unwrap(s) {
  const t = (s || '').trim();
  const m = t.match(/^[{[]([^}\]]*)[}\]]$/u);
  return m ? m[1].trim() : t;
}

/** ref.rest를 대단원·소단원으로 가르는 휴리스틱 4종(순서대로 첫 매치). */
function splitRest(rest, refTitle) {
  const text = unwrap(rest);
  if (!text) return { unit: '', subunit: refTitle || '' };

  const dash = text.split(/\s+—\s+/u);
  if (dash.length >= 2) {
    return { unit: dash[0].trim(), subunit: dash.slice(1).join(' — ').trim() };
  }
  const mk = text.match(MARKER_RE);
  if (mk && mk.index > 0) {
    return { unit: text.slice(0, mk.index).trim(), subunit: text.slice(mk.index).trim() };
  }
  const rm = text.match(ROMAN_RE);
  if (rm && rm[0].length < text.length) {
    return { unit: rm[0].trim(), subunit: text.slice(rm[0].length).trim() };
  }
  return { unit: text, subunit: refTitle || '' };
}

/**
 * 헤더의 `단원`/`영역` 값 한 줄을 대단원·소단원으로 가른다.
 * `A — B [C]` → unit A, subunit C(대괄호 밖은 버림). `A — B` → unit A, subunit B.
 * `A / B`(괄호 없음) → unit A, subunit B. 그 밖에는 전체가 대단원.
 * @returns {{unit: string, subunit: string}|null}
 */
export function splitHeaderUnit(value) {
  const raw = (value || '').trim();
  if (!raw) return null;

  const dash = raw.split(/\s+—\s+/u);
  if (dash.length >= 2) {
    let tail = dash.slice(1).join(' — ').trim();
    const bracket = tail.match(/\[([^\]]+)\]\s*$/u);
    if (bracket) tail = bracket[1].trim();
    return { unit: dash[0].trim(), subunit: tail };
  }
  const slash = raw.split(' / ');
  if (slash.length === 2 && !raw.includes('(')) {
    return { unit: slash[0].trim(), subunit: slash[1].trim() };
  }
  return { unit: raw, subunit: '' };
}

/**
 * 문항 하나의 단원·소단원을 도출한다.
 * @param {object} problem
 * @param {object} source  소스(고정 지정 `unit`/`subunit`을 가질 수 있음)
 * @param {object} header  소스 헤더(`fields["단원"]`)
 * @returns {{unit: string, subunit: string, from: 'map'|'header'|'ref'|'none'}}
 */
export function deriveUnits(problem, source, header) {
  if (source && (source.unit || source.subunit)) {
    return { unit: source.unit || '', subunit: source.subunit || '', from: 'map' };
  }
  const ref = problem && problem.ref;
  const refTitle = ref && ref.title ? ref.title : '';
  const fields = (header && header.fields) || {};
  // 헤더 제목(`# Batch 14 — …`)은 쓰지 않는다 — 단원 필드만 본다.
  const headerUnit = fields['단원'] || fields['대단원'] || fields['영역'] || '';

  if (headerUnit) {
    const split = splitHeaderUnit(headerUnit) || { unit: headerUnit.trim(), subunit: '' };
    const fromRef = ref ? splitRest(ref.rest, refTitle) : { unit: '', subunit: '' };
    const subunit = refTitle || split.subunit || fromRef.subunit || '';
    return { unit: split.unit, subunit, from: 'header' };
  }

  if (ref) {
    const s = splitRest(ref.rest, refTitle);
    if (s.unit || s.subunit) return { unit: s.unit, subunit: s.subunit, from: 'ref' };
  }
  return { unit: '', subunit: '', from: 'none' };
}

/** `units.map`에서 문항 키(정확히 일치 또는 `s1#*` 와일드카드)에 맞는 항목을 찾는다. */
function mappedUnits(map, key) {
  if (!map) return null;
  if (map[key]) return map[key];
  const sourceId = String(key).split('#')[0];
  return map[`${sourceId}#*`] || map[`${sourceId}#`] || null;
}

/**
 * 모든 문항의 unit·subunit을 채운다(수동 지정이 가장 세다).
 * @param {object[]} problems
 * @param {object} project
 */
export function assignUnits(problems, project = {}) {
  const cfg = project.units || {};
  const map = cfg.map || {};
  const sources = new Map((project.sources || []).map((s) => [s.id, s]));
  for (const p of problems) {
    const manual = mappedUnits(map, p.key);
    if (manual && (manual.unit || manual.subunit)) {
      p.unit = manual.unit || '';
      p.subunit = manual.subunit || '';
      p.unitFrom = 'map';
      continue;
    }
    const source = sources.get(p.sourceId) || null;
    const derived = deriveUnits(p, source, p.header);
    p.unit = derived.unit;
    p.subunit = derived.subunit;
    p.unitFrom = derived.from;
  }
}

/**
 * 대단원 → 소단원 → 문항으로 묶는다(order·suborder 우선, 나머지는 등장 순).
 * @returns {{unit: string, subunits: {subunit: string, problems: object[]}[]}[]}
 */
export function groupByUnits(problems, unitsCfg = {}) {
  const order = Array.isArray(unitsCfg.order) ? unitsCfg.order : [];
  const suborder = unitsCfg.suborder || {};
  const units = new Map();
  for (const p of problems) {
    if (p.excluded) continue;
    const u = p.unit || '';
    const s = p.subunit || '';
    if (!units.has(u)) units.set(u, new Map());
    const subs = units.get(u);
    if (!subs.has(s)) subs.set(s, []);
    subs.get(s).push(p);
  }
  const unitNames = [...units.keys()];
  unitNames.sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return 0;
  });
  return unitNames.map((unit) => {
    const subs = units.get(unit);
    const names = [...subs.keys()];
    const wanted = Array.isArray(suborder[unit]) ? suborder[unit] : [];
    names.sort((a, b) => {
      const ia = wanted.indexOf(a);
      const ib = wanted.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return 0;
    });
    return { unit, subunits: names.map((subunit) => ({ subunit, problems: subs.get(subunit) })) };
  });
}
