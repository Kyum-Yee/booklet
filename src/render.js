// render.js — Problem → 원자(Atom) 단위 HTML 문자열. DOM 무관.
// 아스키 도형은 ctx.asciiToSvg(주입)로만 그린다(모듈을 직접 import하지 않는다).

import { inline, plainLength, sanitizeTex, __internal } from './rules.js';
import { CHOICE_STYLE, NUMBER_STYLE, FIGURE_MODE, IMAGE_SLOT, figureSlot } from './options.js';

const { escapeHtml, escapeAttr } = __internal;
// 이름 앞의 RENDER_는 export.js가 모듈을 한 스코프에 이어 붙일 때 같은 상수와 부딪히지 않게 한다.
const RENDER_CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩';

/** 항목 스스로 라벨을 달고 있는지(㉠ · (가) · ㄱ. · [A] · ① · (1)). */
const SELF_LABEL_RE = /^(?:[㉠-㉭]|[ⓐ-ⓩ]|[①-⑩]|\([가-힣]\)|\(\d{1,2}\)|\[[A-Za-z0-9]{1,3}\]|[ㄱ-ㅎ][.)]|[A-Za-z][.)]\s)/u;

/** 1~10을 ①~⑩으로(그 밖의 값은 그대로). */
function circled(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 10 ? RENDER_CIRCLED[n - 1] : String(v);
}

/** 원자 최상위 요소에 data-q를 박는다. */
function withQ(html, key) {
  return html.replace(/^<([a-zA-Z][\w-]*)/u, (m, tag) => `<${tag} data-q="${escapeAttr(key)}"`);
}

/** 문단을 문장 단위로 자른다(한국어 `다./요./까?`, 영어 `. ` 뒤 대문자). */
function splitSentences(text) {
  const parts = String(text)
    .split(/(?<=[다요][.!?])\s+|(?<=[까죠][?])\s+|(?<=[.?!])\s+(?=["'“(]*[A-Z])/u)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts;
}

/** 문단이 충분히 길고 조각이 3개 이상일 때만 분할 조각을 만든다. */
function sentenceParts(text) {
  if (!text || text.length < 200) return null;
  const parts = splitSentences(text);
  return parts.length >= 3 ? parts : null;
}

/** 인라인 처리용 ctx. */
function textCtx(ctx, scope) {
  return { scope, subject: ctx.subject || '', rules: ctx.rules, warnings: ctx.warnings };
}

/** 표 한 칸. */
function renderCell(cell, tag, align, ctx, scope) {
  const cls = align === 'center' ? ' class="ta-c"' : align === 'right' ? ' class="ta-r"' : '';
  return `<${tag}${cls}>${inline(cell, textCtx(ctx, scope))}</${tag}>`;
}

/** 아스키 도형 → SVG(주입된 변환기가 자신 있을 때만) 또는 `<pre>`. */
function renderFigure(block, ctx, scope) {
  const key = ctx.problemKey || '';
  const mode = typeof ctx.figureMode === 'function'
    ? ctx.figureMode(key, block.idx)
    : ((ctx.settings && ctx.settings.figure && ctx.settings.figure.mode) || FIGURE_MODE.default);
  if (mode === FIGURE_MODE.ids.svg && typeof ctx.asciiToSvg === 'function') {
    try {
      const res = ctx.asciiToSvg(block.text, ctx.figureOpts || {});
      if (res && res.svg && (res.confidence === undefined || res.confidence >= 0.5)) {
        return `<figure class="fig svg" data-figure-idx="${block.idx}">${res.svg}</figure>`;
      }
    } catch (err) {
      if (Array.isArray(ctx.warnings)) {
        ctx.warnings.push(`${key}: 도형 ${block.idx}번을 SVG로 그리지 못해 원문 그대로 넣습니다 — ${err.message}`);
      }
    }
  }
  void scope;
  return `<figure class="fig ascii" data-figure-idx="${block.idx}"><pre>${escapeHtml(block.text)}</pre></figure>`;
}

/** 업로드 이미지 블록. 이름이 맞는 이미지를 찾지 못하면 자리 표시와 경고. */
function renderImage(block, ctx, width, caption) {
  const images = ctx.images || [];
  const want = String(block.name || '').trim().toLowerCase();
  const found = images.find((im) => String(im.name || '').trim().toLowerCase() === want)
    || images.find((im) => String(im.name || '').toLowerCase().endsWith(want));
  const cap = caption || block.caption || '';
  if (!found) {
    if (Array.isArray(ctx.warnings)) {
      ctx.warnings.push(`${ctx.problemKey || ''}: 이미지 "${block.name}"을(를) 찾지 못했습니다 — 이미지 탭에서 같은 이름으로 올리세요.`);
    }
    return `<div class="img-missing">[이미지: ${escapeHtml(block.name || '')}]</div>`;
  }
  const w = width || '100%';
  return `<figure class="fig img"><img src="${escapeAttr(found.dataUrl || '')}" alt="${escapeAttr(block.name || '')}" style="width:${escapeAttr(w)}">${cap ? `<figcaption>${inline(cap, textCtx(ctx, 'stem'))}</figcaption>` : ''}</figure>`;
}

/** Block 하나를 HTML로. */
function renderBlock(block, ctx, scope) {
  switch (block.type) {
    case 'p':
      return `<p class="para">${inline(block.text, textCtx(ctx, scope))}</p>`;
    case 'table': {
      const align = block.align || [];
      let html = '<table class="tbl">';
      if (block.header) {
        html += `<thead><tr>${block.header.map((c, i) => renderCell(c, 'th', align[i], ctx, scope)).join('')}</tr></thead>`;
      }
      html += '<tbody>';
      for (const row of block.rows || []) {
        html += `<tr>${row.map((c, i) => renderCell(c, 'td', align[i], ctx, scope)).join('')}</tr>`;
      }
      html += '</tbody></table>';
      return html;
    }
    case 'figure':
      return renderFigure(block, ctx, scope);
    case 'box': {
      const inner = (block.blocks || []).map((b) => renderBlock(b, ctx, 'box')).join('');
      return `<div class="box"><div class="box-title">&lt;${escapeHtml(block.title)}&gt;</div><div class="box-body">${inner}</div></div>`;
    }
    case 'list': {
      const markers = block.markers && block.markers.length ? block.markers : null;
      const items = block.items || [];
      const dash = block.marker === '-' || block.marker === '•' || block.marker === '·';
      // 항목이 이미 ㉠·(가)·ㄱ.·[A]·① 같은 라벨로 시작하면 점을 또 찍지 않는다.
      const selfLabelled = items.length > 0 && items.every((t) => SELF_LABEL_RE.test(String(t).trim()));
      const bullet = dash && !selfLabelled;
      const html = items.map((t, i) => {
        const mk = markers ? markers[i] : block.marker;
        const label = (dash || !mk)
          ? ''
          : `<span class="l-mark">${escapeHtml(mk)}${/[.)]$/u.test(mk) ? '' : '.'}</span> `;
        return `<li>${label}<span class="l-text">${inline(t, textCtx(ctx, scope))}</span></li>`;
      }).join('');
      return `<ul class="list${bullet ? ' bullet' : ' marked'}">${html}</ul>`;
    }
    case 'inserted':
      return `<div class="inserted">${inline(block.text, textCtx(ctx, scope))}</div>`;
    case 'math':
      return `<div class="math-block"><span class="math" data-tex="${escapeAttr(sanitizeTex(block.tex))}" data-display="1">${escapeHtml(`$$${block.tex}$$`)}</span></div>`;
    case 'image':
      return renderImage(block, ctx);
    case 'raw':
      return block.html || '';
    default:
      return '';
  }
}

/**
 * Block 배열을 이어 붙인 HTML.
 * @param {object[]} blocks
 * @param {object} ctx { settings, rules, subject, images, warnings, asciiToSvg, figureMode, problemKey }
 */
export function renderBlocks(blocks, ctx = {}) {
  return (blocks || []).map((b) => renderBlock(b, ctx, ctx.scope || 'stem')).join('');
}

/**
 * 선지 배치 결정 — overrides > settings.choiceStyle > 인라인 > 길이 휴리스틱.
 * @returns {'list'|'inline'|'grid2'|'grid5'}
 */
export function choiceLayoutFor(problem, settings = {}) {
  const ovMap = settings.overrides || {};
  const ov = (problem.overrides && problem.overrides.choiceLayout)
    || (ovMap[problem.key] && ovMap[problem.key].choiceLayout);
  const AUTO = CHOICE_STYLE.ids.auto;
  if (ov && ov !== AUTO) return ov;
  if (settings.choiceStyle && settings.choiceStyle !== AUTO) return settings.choiceStyle;
  if (problem.choiceLayout && problem.choiceLayout !== AUTO) return problem.choiceLayout;
  const choices = problem.choices || [];
  if (!choices.length) return CHOICE_STYLE.ids.list;
  const lens = choices.map((c) => plainLength(c.text));
  if (choices.length === 5 && lens.every((l) => l <= 12)) return CHOICE_STYLE.ids.grid5;
  if (lens.every((l) => l <= 28)) return CHOICE_STYLE.ids.grid2;
  return CHOICE_STYLE.ids.list;
}

/** imagePlacements에서 이 문항의 슬롯별 배치를 모은다. */
function placementsFor(ctx, key) {
  const list = (ctx.imagePlacements || []).filter((p) => p && p.problemKey === key);
  const bySlot = new Map();
  for (const p of list) {
    if (!bySlot.has(p.slot)) bySlot.set(p.slot, []);
    bySlot.get(p.slot).push(p);
  }
  return bySlot;
}

/** 배치된 이미지를 material 원자로. */
function imageAtoms(placements, slot, ctx, key) {
  const list = placements.get(slot) || [];
  return list.map((p) => {
    const image = (ctx.images || []).find((im) => im.id === p.imageId);
    const block = { type: 'image', name: image ? image.name : (p.imageId || ''), caption: p.caption || '' };
    const html = renderImage(block, ctx, p.width || '100%', p.caption || '');
    return { kind: 'material', html: withQ(html, key), splittable: false, keepWithNext: false, keepWithPrev: true };
  });
}

/** 지문 한 덩어리를 passage-part 원자로. */
function passageAtoms(problem, ctx, key) {
  const blocks = (problem.passage && problem.passage.blocks) || [];
  const atoms = [];
  blocks.forEach((block, i) => {
    const first = i === 0 ? ' data-first="1"' : '';
    const last = i === blocks.length - 1 ? ' data-last="1"' : '';
    const open = `<div class="passage-part" data-q="${escapeAttr(key)}"${first}${last}>`;
    if (block.type === 'p') {
      const parts = sentenceParts(block.text);
      atoms.push({
        kind: 'passage',
        html: `${open}${inline(block.text, textCtx(ctx, 'passage'))}</div>`,
        splittable: true,
        keepWithNext: false,
        keepWithPrev: i > 0,
        splitParts: parts
          ? parts.map((t) => `<div class="passage-part" data-q="${escapeAttr(key)}" data-cont="1">${inline(t, textCtx(ctx, 'passage'))}</div>`)
          : undefined,
      });
      return;
    }
    atoms.push({
      kind: 'passage',
      html: `${open}${renderBlock(block, { ...ctx, problemKey: key }, 'passage')}</div>`,
      splittable: false,
      keepWithNext: false,
      keepWithPrev: i > 0,
    });
  });
  return atoms;
}

/**
 * 문제 시트용 원자 목록.
 * @returns {{atoms: object[]}}
 */
export function renderProblem(problem, ctx = {}) {
  const settings = ctx.settings || {};
  const key = problem.key;
  const c = { ...ctx, problemKey: key, subject: ctx.subject || problem.subject };
  const atoms = [];
  const placements = placementsFor(c, key);
  const ownsPassage = !!(problem.passage && !problem.passage.inherited);
  const afterStem = problem.passagePosition === 'afterStem';

  // 안내 문장(지문을 가진 문항만). 모의고사 스타일이면 [n~m]으로 범위를 알린다.
  if (ownsPassage) {
    let intro = problem.intro;
    if (settings.examStyle) {
      const g = problem.groupRange;
      const base = intro || '다음 글을 읽고 물음에 답하시오.';
      intro = g && g.from !== g.to ? `[${g.from}~${g.to}] ${base}` : base;
    }
    if (intro) {
      atoms.push({
        kind: 'intro',
        html: `<p class="q-intro" data-q="${escapeAttr(key)}">${inline(intro, textCtx(c, 'stem'))}</p>`,
        splittable: false,
        keepWithNext: true,
      });
    }
  }

  const passage = ownsPassage ? passageAtoms(problem, c, key) : [];
  if (!afterStem) {
    atoms.push(...passage);
    atoms.push(...imageAtoms(placements, IMAGE_SLOT.ids.afterPassage, c, key));
  }

  // 번호 + 발문 = 한 원자
  const stemBlocks = (problem.stem || []).slice();
  let stemHtml = '';
  if (stemBlocks.length && stemBlocks[0].type === 'p') {
    stemHtml = inline(stemBlocks.shift().text, textCtx(c, 'stem'));
  }
  const numStyle = settings.numberStyle && settings.numberStyle !== NUMBER_STYLE.ids.plain
    ? ` num-${settings.numberStyle}` : '';
  const numText = problem.numText != null ? problem.numText : (problem.num != null ? String(problem.num) : (problem.srcNum || ''));
  let head = `<div class="q-head" data-q="${escapeAttr(key)}"><span class="q-num${numStyle}">${escapeHtml(numText)}</span>`;
  if (settings.showSrcNum && problem.srcNum != null) head += `<span class="q-src">(${escapeHtml(String(problem.srcNum))})</span>`;
  if (settings.showTime && problem.time) head += `<span class="q-time">${escapeHtml(problem.time)}</span>`;
  if (settings.showRef && problem.ref && problem.ref.raw) head += `<span class="q-ref">${escapeHtml(problem.ref.raw)}</span>`;
  if (settings.showTitle && problem.title) head += `<span class="q-title">${inline(problem.title, textCtx(c, 'stem'))}</span>`;
  head += `<span class="q-stem">${stemHtml}</span></div>`;
  atoms.push({ kind: 'head', html: head, splittable: false, keepWithNext: true });

  if (afterStem) {
    atoms.push(...passage);
    atoms.push(...imageAtoms(placements, IMAGE_SLOT.ids.afterPassage, c, key));
  }

  // 나머지 발문 자료(표·도형·<보기> 등)
  stemBlocks.forEach((block) => {
    const html = withQ(renderBlock(block, c, 'stem'), key);
    atoms.push({
      kind: 'material',
      html,
      splittable: block.type === 'table',
      keepWithNext: false,
      keepWithPrev: true,
    });
    if (block.type === 'figure') atoms.push(...imageAtoms(placements, figureSlot(block.idx), c, key));
  });
  atoms.push(...imageAtoms(placements, IMAGE_SLOT.ids.afterStem, c, key));
  atoms.push(...imageAtoms(placements, IMAGE_SLOT.ids.beforeChoices, c, key));

  // 선지
  if (problem.choices && problem.choices.length) {
    const layout = choiceLayoutFor(problem, settings);
    const items = problem.choices.map((ch) => {
      const text = ch.text ? `<span class="c-text">${inline(ch.text, textCtx(c, 'choices'))}</span>` : '';
      return `<li><span class="c-label">${escapeHtml(ch.label)}</span>${text}</li>`;
    });
    const open = `<ol class="choices layout-${layout}" data-q="${escapeAttr(key)}">`;
    const keep = !settings.keep || settings.keep.choicesTogether !== false;
    atoms.push({
      kind: 'choices',
      html: `${open}${items.join('')}</ol>`,
      splittable: !keep,
      keepWithPrev: !!(settings.keep && settings.keep.stemWithFirstChoice),
      keepWithNext: false,
      splitParts: items.map((li) => `<ol class="choices layout-${layout}" data-q="${escapeAttr(key)}" data-cont="1">${li}</ol>`),
    });
  }
  return { atoms };
}

/** 정답 표기 문자열(다중은 "②, ③, ④", 값이 없으면 —). */
function answerText(problem) {
  const a = problem.answer;
  if (!a) return '—';
  if (a.values && a.values.length) return a.values.map(circled).join(', ');
  return a.raw ? a.raw : '—';
}

/**
 * 해설 시트용 원자 목록.
 * @returns {{atoms: object[]}}
 */
export function renderExplanation(problem, ctx = {}) {
  const key = problem.key;
  const c = { ...ctx, problemKey: key, subject: ctx.subject || problem.subject };
  const settings = ctx.settings || {};
  const rename = ctx.renamePassage !== false;
  const atoms = [];
  const numText = problem.numText != null ? problem.numText : String(problem.num || '');
  let head = `<div class="expl-head" data-q="${escapeAttr(key)}"><span class="q-num">${escapeHtml(numText)}</span>`;
  head += `<span class="ans">${escapeHtml(answerText(problem))}</span>`;
  if (settings.showRef && problem.ref && problem.ref.raw) head += `<span class="q-ref">${escapeHtml(problem.ref.raw)}</span>`;
  head += '</div>';
  atoms.push({ kind: 'expl-head', html: head, splittable: false, keepWithNext: true });

  const placements = placementsFor(c, key);
  for (const sec of (problem.explanation && problem.explanation.sections) || []) {
    const name = rename && sec.name === '지문' ? '지문 요약' : sec.name;
    const label = name ? `<span class="expl-name">${escapeHtml(name)}</span>` : '';
    const body = (sec.blocks || []).map((b) => renderBlock(b, c, 'explanation')).join('');
    atoms.push({
      kind: 'expl',
      html: `<div class="expl-sec" data-q="${escapeAttr(key)}">${label}${body}</div>`,
      splittable: true,
      keepWithPrev: true,
      keepWithNext: false,
    });
  }
  atoms.push(...imageAtoms(placements, IMAGE_SLOT.ids.explanation, c, key));
  return { atoms };
}

/**
 * 빠른 정답 표 HTML.
 * @param {object[]} problems
 * @param {{perRow?: number, title?: string, groups?: object[]}} [opts]
 */
export function renderAnswerTable(problems, opts = {}) {
  const perRow = opts.perRow || 10;
  const title = opts.title || '빠른 정답';
  const table = (list) => {
    let html = '<table class="ans-table"><tbody>';
    for (let i = 0; i < list.length; i += perRow) {
      const chunk = list.slice(i, i + perRow);
      html += '<tr>';
      for (const p of chunk) {
        const num = p.numText != null ? p.numText : String(p.num || '');
        html += `<td><div class="ans-num">${escapeHtml(num)}</div><div class="ans-val">${escapeHtml(answerText(p))}</div></td>`;
      }
      for (let k = chunk.length; k < perRow; k += 1) html += '<td class="empty"></td>';
      html += '</tr>';
    }
    return `${html}</tbody></table>`;
  };
  const active = (problems || []).filter((p) => !p.excluded);
  let body = '';
  if (Array.isArray(opts.groups) && opts.groups.length) {
    for (const g of opts.groups) {
      const list = g.subunits.flatMap((s) => s.problems).filter((p) => !p.excluded);
      if (!list.length) continue;
      if (g.unit) body += `<h3 class="ans-unit">${escapeHtml(g.unit)}</h3>`;
      body += table(list);
    }
  } else {
    body = table(active);
  }
  return `<div class="answers"><h2 class="sheet-title">${escapeHtml(title)}</h2>${body}</div>`;
}

export const __render = { splitSentences, sentenceParts, circled, withQ, answerText };
