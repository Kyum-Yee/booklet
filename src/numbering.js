// numbering.js — 문항 번호 정리(sequential · source · perUnit)와 지문 공유 범위 [n~m].
// 제외(exclude)된 문항은 번호를 받지 않고 건너뛴다. 모드 이름은 options.NUMBERING_MODE 하나만 본다.

import { NUMBERING_MODE } from './options.js';

/** 번호를 자릿수에 맞춰 문자열로. */
export function formatNum(n, pad = 0) {
  const s = String(n);
  return pad > 0 ? s.padStart(pad, '0') : s;
}

/** 원문 번호 문자열을 정수로("01" → 1). 읽을 수 없으면 null. */
function srcNumToInt(srcNum) {
  if (srcNum === null || srcNum === undefined) return null;
  const m = String(srcNum).match(/\d+/u);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * problem.num을 채운다. mode: sequential(기본) · source · perUnit.
 * @param {object[]} problems
 * @param {{mode?: string, start?: number, pad?: number}} numbering
 * @param {object[]} [groups] perUnit에서 쓸 단원 그룹(없으면 problem.unit으로 묶는다)
 */
export function assignNumbers(problems, numbering = {}, groups = null) {
  const mode = numbering.mode || NUMBERING_MODE.default;
  const start = Number.isFinite(numbering.start) ? numbering.start : 1;
  const pad = numbering.pad || 0;
  const active = problems.filter((p) => !p.excluded);

  if (mode === NUMBERING_MODE.ids.source) {
    const seen = new Map();
    let prev = start - 1;
    for (const p of active) {
      let n = srcNumToInt(p.srcNum);
      if (n === null) {
        n = prev + 1;
        p.warnings.push(`${p.key}: 원문 번호가 없어 ${n}번으로 매겼습니다 — 번호 모드를 "이어서"로 바꾸면 경고가 사라집니다.`);
      } else if (seen.has(n)) {
        const dup = n;
        n = prev + 1;
        p.warnings.push(`${p.key}: 원문 번호 ${dup}이(가) ${seen.get(dup)}과 겹쳐 ${n}번으로 바꿨습니다.`);
      } else if (n <= prev) {
        const back = n;
        n = prev + 1;
        p.warnings.push(`${p.key}: 원문 번호 ${back}이(가) 앞 문항보다 작아 ${n}번으로 바꿨습니다.`);
      }
      seen.set(n, p.key);
      p.num = n;
      p.numText = formatNum(n, pad);
      prev = n;
    }
    return;
  }

  if (mode === NUMBERING_MODE.ids.perUnit) {
    const counters = new Map();
    const keyOf = (p) => (p.unit || '');
    if (Array.isArray(groups) && groups.length) {
      for (const g of groups) {
        let n = start;
        for (const sub of g.subunits || []) {
          for (const p of sub.problems || []) {
            if (p.excluded) continue;
            p.num = n;
            p.numText = formatNum(n, pad);
            n += 1;
          }
        }
      }
      return;
    }
    for (const p of active) {
      const k = keyOf(p);
      const n = counters.has(k) ? counters.get(k) + 1 : start;
      counters.set(k, n);
      p.num = n;
      p.numText = formatNum(n, pad);
    }
    return;
  }

  let n = start;
  for (const p of active) {
    p.num = n;
    p.numText = formatNum(n, pad);
    n += 1;
  }
}

/**
 * 지문을 공유하는 묶음(같은 ownerKey)의 번호 범위를 problem.groupRange에 채운다.
 * 지문이 없는 문항은 groupRange가 null.
 */
export function groupRanges(problems) {
  const byOwner = new Map();
  for (const p of problems) {
    p.groupRange = null;
    if (!p.passage || !p.passage.ownerKey) continue;
    const key = p.passage.ownerKey;
    if (!byOwner.has(key)) byOwner.set(key, []);
    byOwner.get(key).push(p);
  }
  for (const list of byOwner.values()) {
    const nums = list.map((p) => p.num).filter((n) => Number.isFinite(n));
    if (!nums.length) continue;
    const range = { from: Math.min(...nums), to: Math.max(...nums) };
    for (const p of list) p.groupRange = range;
  }
}
