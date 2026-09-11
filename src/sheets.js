// sheets.js — 정답 시트·해설 시트의 원자 생성.
// 정답 표 HTML은 주입된 renderAnswerTable을 우선 쓰고, 없으면 같은 클래스 계약으로 자체 생성한다.
// [DOM 무관 · 순수 문자열]

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

/** HTML 특수문자 이스케이프. */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 정답 하나를 표시 문자열로. 1~10은 동그라미 숫자, 그 외는 원문 그대로. */
export function answerLabel(answer) {
  if (!answer) return null;
  const vals = Array.isArray(answer.values) && answer.values.length ? answer.values : null;
  if (vals) {
    return vals
      .map((v) => (Number.isInteger(v) && v >= 1 && v <= 10 ? CIRCLED[v - 1] : String(v)))
      .join(', ');
  }
  const raw = String(answer.raw || '').trim();
  return raw || null;
}

/**
 * 문항 목록을 perRow 칸짜리 정답 표 HTML로. renderAnswerTable이 없을 때의 기본 구현.
 * 번호 줄과 정답 줄을 따로 `<tr>`로 내면 layout이 표를 행 단위로 쪼갤 때 그 둘이 서로 다른
 * 칸으로 갈라져 "번호만 있는 줄"이 남는다. 그래서 한 칸(`<td>`) 안에 번호와 정답을 위아래로
 * 담아 한 문항이 절대 쪼개지지 않게 한다(render.js의 정답 표와 같은 구조 · page.css가 이를 그린다).
 */
export function defaultAnswerTable(problems, opts = {}) {
  const perRow = Math.max(2, opts.perRow || 10);
  let body = '';
  for (let i = 0; i < problems.length; i += perRow) {
    const row = problems.slice(i, i + perRow);
    body += '<tr>';
    for (const p of row) {
      const label = answerLabel(p.answer);
      const cls = label ? 'ans-val' : 'ans-val missing';
      body += `<td><div class="ans-num">${esc(p.num ?? p.srcNum ?? '')}</div>`;
      body += `<div class="${cls}">${esc(label || '—')}</div></td>`;
    }
    // 마지막 줄의 빈 칸: 테두리는 이어 두되 바탕을 흐리게 해 "답이 빠진 칸"과 구별한다.
    for (let k = row.length; k < perRow; k += 1) body += '<td class="empty"></td>';
    body += '</tr>';
  }
  return `<table class="ans-table"><tbody>${body}</tbody></table>`;
}

/**
 * 주입된 renderAnswerTable은 제목(`<h2 class="sheet-title">`)과 바깥 `<div class="answers">`까지
 * 함께 돌려준다. 시트 원자는 제목을 따로 한 번만 놓으므로 여기서 껍데기를 벗겨 표만 남긴다
 * (안 벗기면 단원마다 "빠른 정답" 제목이 되풀이되고 `.answers`가 이중으로 겹친다).
 * @param {string} html renderAnswerTable 결과
 */
export function stripAnswerChrome(html) {
  let s = String(html || '').trim();
  const open = /^<div\s+class="answers"[^>]*>/u.exec(s);
  if (open && /<\/div>$/u.test(s)) s = s.slice(open[0].length, -'</div>'.length);
  s = s.replace(/^\s*<h2\s+class="sheet-title"[^>]*>[\s\S]*?<\/h2>/u, '');
  return s.trim();
}

/**
 * 정답 시트 원자. 제목 + 대단원 소제목 + 표(행 단위 분할 가능).
 * @param {Array} problems Problem[]
 * @param {Object} cfg { perRow, title, groups, renderAnswerTable, warnings }
 * @returns {Array} Atom[]
 */
export function answerSheetAtoms(problems, cfg = {}) {
  const perRow = cfg.perRow || 10;
  const title = cfg.title || '빠른 정답';
  const warnings = cfg.warnings || [];
  const make = typeof cfg.renderAnswerTable === 'function' ? cfg.renderAnswerTable : defaultAnswerTable;
  const atoms = [];

  atoms.push({
    kind: 'sheet-title',
    html: `<h2 class="sheet-title" data-q="">${esc(title)}</h2>`,
    splittable: false,
    keepWithNext: true,
    keepWithPrev: false,
  });

  for (const p of problems) {
    if (!p.answer || !answerLabel(p.answer)) {
      warnings.push(`${p.num ?? p.key}번 문항에 정답이 없어 정답 표에 "—"로 표시했습니다. 해설의 [정답] 줄을 확인하세요.`);
    }
  }

  const groups = cfg.groups && cfg.groups.length ? cfg.groups : [{ unit: '', subunits: [{ subunit: '', problems }] }];
  for (const g of groups) {
    const list = (g.subunits || []).flatMap((s) => s.problems || []);
    if (!list.length) continue;
    if (g.unit && String(g.unit).trim() && groups.length > 1) {
      atoms.push({
        kind: 'sheet-band',
        html: `<div class="subunit-band" data-q=""><span>${esc(g.unit)}</span><span class="sb-count">${list.length}문항</span></div>`,
        splittable: false,
        keepWithNext: true,
        keepWithPrev: false,
      });
    }
    atoms.push({
      kind: 'answers',
      html: `<div class="answers" data-q="">${stripAnswerChrome(make(list, { perRow, title: '' }))}</div>`,
      splittable: true,
      keepWithNext: false,
      keepWithPrev: false,
    });
  }
  return atoms;
}

/**
 * 해설 시트 원자. 제목 + 대단원 띠 + 문항별 renderExplanation 결과를 이어 붙인다.
 * @param {Array} problems Problem[]
 * @param {Object} ctx { renderers, settings, groups, title, renamePassage, warnings, ... }
 * @returns {Array} Atom[]
 */
export function explanationAtoms(problems, ctx = {}) {
  const title = ctx.title || '정답과 해설';
  const warnings = ctx.warnings || [];
  const renderExplanation = ctx.renderers && ctx.renderers.renderExplanation;
  const atoms = [];

  atoms.push({
    kind: 'sheet-title',
    html: `<h2 class="sheet-title" data-q="">${esc(title)}</h2>`,
    splittable: false,
    keepWithNext: true,
    keepWithPrev: false,
  });

  if (typeof renderExplanation !== 'function') {
    warnings.push('해설 렌더러(renderExplanation)가 주입되지 않아 해설 시트를 비웠습니다. app.js가 doc.renderers를 채워야 합니다.');
    return atoms;
  }

  const groups = ctx.groups && ctx.groups.length ? ctx.groups : [{ unit: '', subunits: [{ subunit: '', problems }] }];
  for (const g of groups) {
    const list = (g.subunits || []).flatMap((s) => s.problems || []);
    if (!list.length) continue;
    if (g.unit && String(g.unit).trim() && groups.length > 1) {
      atoms.push({
        kind: 'unit-band',
        html: `<div class="unit-band" data-q="">${esc(g.unit)}</div>`,
        splittable: false,
        keepWithNext: true,
        keepWithPrev: false,
      });
    }
    for (const p of list) {
      let out;
      try {
        out = renderExplanation(p, { ...ctx, subject: p.subject });
      } catch (err) {
        warnings.push(`${p.num ?? p.key}번 해설을 그리는 중 오류가 났습니다(${err && err.message}). 해당 문항은 건너뜁니다.`);
        continue;
      }
      const list2 = (out && out.atoms) || [];
      if (!list2.length) {
        warnings.push(`${p.num ?? p.key}번에 해설이 없습니다. [해설] 구역을 확인하세요.`);
        continue;
      }
      for (const a of list2) atoms.push(a);
    }
  }
  return atoms;
}
