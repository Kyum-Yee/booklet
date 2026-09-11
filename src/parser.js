// parser.js — 컴파일된 포맷 프로파일로 문제 텍스트를 줄 단위 상태기계로 읽어 Problem[]을 만든다.
// 되돌아가지 않는다(앞으로 1~2줄 훑어보기만 허용). DOM 무관.

import { resolveProfile, compileProfile, BUILTIN_PROFILES, BUILTIN_ORDER } from './format.js';
import { assignNumbers, groupRanges } from './numbering.js';
import { assignUnits, groupByUnits } from './units.js';

/** RegExp 또는 RegExp[]에 대해 첫 매치를 찾는다. */
function matchAny(re, line) {
  if (!re) return null;
  const list = Array.isArray(re) ? re : [re];
  for (let i = 0; i < list.length; i += 1) {
    const m = list[i].exec(line);
    if (m) return { m, alt: i, re: list[i] };
  }
  return null;
}

/** RegExp 또는 RegExp[] 중 하나라도 맞는지. */
function testAny(re, line) {
  return matchAny(re, line) !== null;
}

/** 빈 줄인지. */
function isBlank(line) {
  return !line || !line.trim();
}

/** 파이프 표 한 줄을 셀로 자른다(`\|`는 셀 안의 문자). */
function splitRow(line) {
  const t = line.trim().replace(/^\|/u, '').replace(/\|\s*$/u, '');
  const cells = [];
  let cur = '';
  for (let i = 0; i < t.length; i += 1) {
    const ch = t[i];
    if (ch === '\\' && t[i + 1] === '|') { cur += '|'; i += 1; continue; }
    if (ch === '|') { cells.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

/** 구분 행에서 열 정렬을 읽는다. */
function alignOf(sepCells) {
  return sepCells.map((c) => {
    const s = c.trim();
    const left = s.startsWith(':');
    const right = s.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return null;
  });
}

/**
 * 지문·발문·박스·해설이 모두 쓰는 공통 블록 파서.
 * @param {string[]} lines 원문 줄(들여쓰기 포함)
 * @param {object} compiled CompiledProfile
 * @param {{where?: string, figures?: object[], warnings?: string[], key?: string, inBox?: boolean}} [ctx]
 * @returns {object[]} Block[]
 */
export function parseBlocks(lines, compiled, ctx = {}) {
  const blocks = [];
  const where = ctx.where || 'stem';
  const figures = ctx.figures || null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i += 1; continue; }

    // 1) ``` 펜스 → figure (원문 보존)
    const fence = matchAny(compiled.fence, line);
    if (fence) {
      const lang = (fence.m.groups && fence.m.groups.lang) || '';
      let j = i + 1;
      const body = [];
      while (j < lines.length && !/^\s*```/u.test(lines[j])) { body.push(lines[j]); j += 1; }
      while (body.length && isBlank(body[0])) body.shift();
      while (body.length && isBlank(body[body.length - 1])) body.pop();
      // 펜스 첫 줄이 box.fenceHead(예 `[보기 1]`)에 맞으면 도형이 아니라 <보기> 상자
      const boxHead = compiled.box && compiled.box.fenceHead && body.length
        ? matchAny(compiled.box.fenceHead, body[0].trim()) : null;
      if (boxHead) {
        const g = boxHead.m.groups || {};
        const title = `${g.title || '보기'}${g.no ? ' ' + g.no : ''}`.trim();
        const inner = parseBlocks(body.slice(1), compiled, { ...ctx, inBox: true });
        blocks.push({ type: 'box', title, blocks: inner });
        i = j < lines.length ? j + 1 : j;
        continue;
      }
      const idx = figures ? figures.length : blocks.length;
      const block = { type: 'figure', text: body.join('\n'), lang, idx };
      if (figures) figures.push({ idx, where, text: block.text, lang });
      blocks.push(block);
      i = j < lines.length ? j + 1 : j;
      continue;
    }

    // 2) `$$ … $$` 블록 수식
    if (compiled.mathBlock && testAny(compiled.mathBlock, line)) {
      const trimmed = line.trim();
      if (trimmed.length > 4 && trimmed.endsWith('$$')) {
        blocks.push({ type: 'math', tex: trimmed.slice(2, -2).trim() });
        i += 1;
        continue;
      }
      const body = [trimmed.slice(2)];
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().endsWith('$$')) { body.push(lines[j]); j += 1; }
      if (j < lines.length) body.push(lines[j].trim().replace(/\$\$$/u, ''));
      blocks.push({ type: 'math', tex: body.join('\n').trim() });
      i = j + 1;
      continue;
    }

    // 3) 이미지 줄
    const img = matchAny(compiled.image, line);
    if (img) {
      const g = img.m.groups || {};
      blocks.push({ type: 'image', name: (g.name || '').trim(), imageId: null, caption: (g.caption || '').trim() });
      i += 1;
      continue;
    }

    // 4) 파이프 표
    if (compiled.tableRow && testAny(compiled.tableRow, line)) {
      const rows = [];
      let j = i;
      while (j < lines.length && testAny(compiled.tableRow, lines[j])) { rows.push(lines[j]); j += 1; }
      let header = null;
      let align = null;
      let bodyRows = rows;
      if (rows.length >= 2 && testAny(compiled.tableSep, rows[1])) {
        header = splitRow(rows[0]);
        align = alignOf(splitRow(rows[1]));
        bodyRows = rows.slice(2);
      }
      blocks.push({
        type: 'table',
        header,
        rows: bodyRows.map(splitRow),
        align: align || (header ? header.map(() => null) : null),
      });
      i = j;
      continue;
    }

    // 5) <보기>·<자료> 박스
    const box = compiled.box ? matchAny(compiled.box.open, line) : null;
    if (box) {
      const g = box.m.groups || {};
      const title = [(g.title || '').trim(), (g.no || '').trim()].filter(Boolean).join(' ');
      let j = i + 1;
      let end = lines.length;
      let consumed = lines.length;
      while (j < lines.length) {
        const cur = lines[j];
        if (compiled.box.close && testAny(compiled.box.close, cur)) { end = j; consumed = j + 1; break; }
        if (compiled.section && testAny(compiled.section, cur)) { end = j; consumed = j; break; }
        if (compiled.choice && testAny(compiled.choice, cur)) { end = j; consumed = j; break; }
        if (isBlank(cur) && j + 1 < lines.length && isBlank(lines[j + 1])) { end = j; consumed = j + 2; break; }
        j += 1;
      }
      const inner = parseBlocks(lines.slice(i + 1, end), compiled, { ...ctx, inBox: true });
      // 내용이 바로 선지로 이어지는 `<보기>`(빈 상자)는 그리지 않는다.
      if (inner.length) blocks.push({ type: 'box', title: title || '보기', blocks: inner });
      i = consumed;
      continue;
    }

    // 6) 4칸 이상 들여쓴 삽입 문장
    if (compiled.inserted && testAny(compiled.inserted, line) && !ctx.inBox) {
      const parts = [];
      let j = i;
      while (j < lines.length && testAny(compiled.inserted, lines[j])) { parts.push(lines[j].trim()); j += 1; }
      blocks.push({ type: 'inserted', text: parts.join(' ') });
      i = j;
      continue;
    }

    // 7) ㄱ. / (가) / - 목록
    const itemRe = ctx.inBox ? [compiled.boxItem, compiled.listItem] : [compiled.listItem];
    let listMatched = null;
    for (const re of itemRe) {
      const m = matchAny(re, line);
      if (m) { listMatched = { m, re }; break; }
    }
    if (listMatched) {
      const items = [];
      const markers = [];
      let j = i;
      while (j < lines.length) {
        const m = matchAny(listMatched.re, lines[j]);
        if (!m) break;
        const g = m.m.groups || {};
        markers.push((g.marker || '-').trim());
        items.push((g.text || '').trim());
        j += 1;
      }
      blocks.push({ type: 'list', marker: markers[0] || '-', items, markers });
      i = j;
      continue;
    }

    // 8) 그 밖의 비공백 줄 = 문단
    blocks.push({ type: 'p', text: line.trim() });
    i += 1;
  }
  return blocks;
}

/** 헤더 줄(파일 상단 `#`·`>`·`-`)에서 제목과 "키: 값" 필드를 모은다. */
function parseHeader(lines, compiled, warnings) {
  const header = { title: '', fields: {} };
  for (const line of lines) {
    if (isBlank(line)) continue;
    const hm = matchAny(compiled.headerLine, line);
    const content = hm ? (hm.m[1] !== undefined ? hm.m[1] : line).trim() : line.trim();
    const fm = matchAny(compiled.headerField, content);
    if (fm) {
      header.fields[fm.m[1].trim()] = (fm.m[2] || '').trim();
      continue;
    }
    if (!hm) {
      warnings.push(`첫 블록 앞의 줄을 헤더로 읽지 못해 건너뜁니다 — "${content.slice(0, 30)}". 헤더 줄은 # 또는 >로 시작해야 합니다.`);
      continue;
    }
    if (!header.title) header.title = content;
  }
  return header;
}

/** `[ref] …` 한 줄을 page·title·srcProblem·rest로 나눈다. */
function parseRef(raw, compiled) {
  const ref = { raw, page: null, title: null, srcProblem: null, rest: raw };
  const m = matchAny(compiled.refParts, raw);
  if (!m) return ref;
  const g = m.m.groups || {};
  ref.page = g.page ? g.page.trim() : null;
  ref.title = g.title ? g.title.trim() : (g.lead ? g.lead.trim() : null);
  ref.srcProblem = g.srcProblem ? g.srcProblem.trim() : null;
  ref.rest = (g.rest || '').trim();
  if (!ref.title) ref.title = null;
  return ref;
}

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩';

/** 선지 라벨을 1~10 정수로. */
function labelToNumber(label) {
  const idx = CIRCLED.indexOf(label);
  if (idx >= 0) return idx + 1;
  const n = Number(String(label).replace(/[^0-9]/gu, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** `(1)`·`1)` 같은 숫자 선지 라벨을 ①~⑩으로 맞춘다(이미 원문자면 그대로). */
function normalizeLabel(label) {
  const raw = String(label == null ? '' : label).trim();
  if (CIRCLED.includes(raw)) return raw;
  const n = labelToNumber(raw);
  return n >= 1 && n <= 10 ? CIRCLED[n - 1] : raw;
}

/** 정답 문자열에서 값(1~10 또는 숫자)을 순서대로 뽑는다. */
function answerValues(raw, compiled) {
  const parse = compiled.answer && compiled.answer.parse;
  const values = [];
  if (!parse) return values;
  parse.lastIndex = 0;
  const found = String(raw || '').match(parse) || [];
  for (const token of found) {
    const n = labelToNumber(token);
    const v = n > 0 ? n : Number(token);
    if (Number.isFinite(v) && !values.includes(v)) values.push(v);
  }
  return values;
}

/** 발문부터 선지 직전까지에서 지문(`"""`)이 뒤에 오는 변형을 찾아 잘라 낸다. */
function extractInlinePassage(lines, compiled) {
  if (!compiled.passage || !compiled.passage.open) return null;
  for (let i = 0; i < lines.length; i += 1) {
    const om = matchAny(compiled.passage.open, lines[i]);
    if (!om) continue;
    const closeRe = Array.isArray(compiled.passage.close)
      ? (compiled.passage.close[om.alt] || compiled.passage.close[0])
      : compiled.passage.close;
    let j = i + 1;
    while (j < lines.length && !testAny(closeRe, lines[j])) j += 1;
    return { start: i, end: j, body: lines.slice(i + 1, j) };
  }
  return null;
}

/** 펜스 첫 줄이 `passage.fenceHead`에 맞으면 그 펜스를 지문으로 잘라 낸다. */
function extractFencePassage(lines, compiled) {
  const head = compiled.passage && compiled.passage.fenceHead;
  if (!head || !compiled.fence) return null;
  let i = 0;
  while (i < lines.length) {
    if (!matchAny(compiled.fence, lines[i])) { i += 1; continue; }
    let j = i + 1;
    const body = [];
    while (j < lines.length && !/^\s*```/u.test(lines[j])) { body.push(lines[j]); j += 1; }
    if (body.length && testAny(head, body[0].trim())) {
      return { start: i, end: j, body: body.slice(1) };
    }
    i = j + 1;
  }
  return null;
}

/** metaLine 값에서 "2분" 같은 시간 표기만 뽑는다(없으면 값 전체). */
function timeValue(val) {
  const m = String(val || '').match(/\d+\s*(?:분|초|시간)/u);
  return m ? m[0].replace(/\s+/gu, '') : String(val || '').trim();
}

/** 본문(문항 부분) 파싱 — 번호·제목·메타·발문·지문·자료·선지. */
function parseBody(bodyLines, problem, compiled, ctx) {
  let i = 0;
  while (i < bodyLines.length && isBlank(bodyLines[i])) i += 1;

  // 번호 · 풀이시간 · 제목
  if (i < bodyLines.length) {
    const qh = matchAny(compiled.questionHead, bodyLines[i]);
    if (qh) {
      const g = qh.m.groups || {};
      problem.srcNum = g.num !== undefined ? g.num : null;
      problem.time = g.time ? g.time.trim() : null;
      problem.title = g.title && g.title.trim() ? g.title.trim() : null;
      const rest = g.rest ? g.rest.trim() : '';
      i += 1;
      if (rest) bodyLines = [rest, ...bodyLines.slice(i)], i = 0;
    }
  }

  // 문항 머리의 메타 줄(`- **풀이 권장 시간**: 2분`). timeKeys는 time으로, 나머지는 meta로.
  if (compiled.metaLine) {
    const timeKeys = compiled.timeKeys || [];
    while (i < bodyLines.length) {
      let k = i;
      while (k < bodyLines.length && isBlank(bodyLines[k])) k += 1;
      const mm = k < bodyLines.length ? matchAny(compiled.metaLine, bodyLines[k]) : null;
      if (!mm) break;
      const g = mm.m.groups || {};
      const key = (g.key || '').trim();
      const val = (g.val || '').trim();
      if (timeKeys.includes(key)) problem.time = timeValue(val);
      else if (key) problem.meta[key] = val;
      i = k + 1;
    }
  }
  while (i < bodyLines.length && isBlank(bodyLines[i])) i += 1;

  // 안내 문장(다음 글을 읽고 물음에 답하시오.)
  if (i < bodyLines.length && compiled.intro && testAny(compiled.intro, bodyLines[i].trim())) {
    problem.intro = bodyLines[i].trim();
    i += 1;
  }
  while (i < bodyLines.length && isBlank(bodyLines[i])) i += 1;

  // 지문(발문 앞)
  let passageBody = null;
  let passagePosition = 'before';
  if (i < bodyLines.length && compiled.passage && compiled.passage.open) {
    const om = matchAny(compiled.passage.open, bodyLines[i]);
    if (om) {
      const closeRe = Array.isArray(compiled.passage.close)
        ? (compiled.passage.close[om.alt] || compiled.passage.close[0])
        : compiled.passage.close;
      let j = i + 1;
      while (j < bodyLines.length && !testAny(closeRe, bodyLines[j])) j += 1;
      if (j >= bodyLines.length) {
        problem.warnings.push(`${problem.key}: 지문이 닫히지 않았습니다 — 지문 끝에 닫는 표시를 넣으세요.`);
      }
      passageBody = bodyLines.slice(i + 1, j);
      i = Math.min(j + 1, bodyLines.length);
    }
  }

  // 선지 시작 위치(펜스·지문 안은 건너뛴다)
  let choiceStart = -1;
  {
    let j = i;
    while (j < bodyLines.length) {
      const line = bodyLines[j];
      if (matchAny(compiled.fence, line)) {
        j += 1;
        while (j < bodyLines.length && !/^\s*```/u.test(bodyLines[j])) j += 1;
        j += 1;
        continue;
      }
      if (compiled.passage && compiled.passage.open && matchAny(compiled.passage.open, line)) {
        const om = matchAny(compiled.passage.open, line);
        const closeRe = Array.isArray(compiled.passage.close)
          ? (compiled.passage.close[om.alt] || compiled.passage.close[0])
          : compiled.passage.close;
        j += 1;
        while (j < bodyLines.length && !testAny(closeRe, bodyLines[j])) j += 1;
        j += 1;
        continue;
      }
      if (testAny(compiled.choiceInline, line) || testAny(compiled.choice, line)) { choiceStart = j; break; }
      j += 1;
    }
  }

  const stemLines = bodyLines.slice(i, choiceStart >= 0 ? choiceStart : bodyLines.length);

  // 발문이 지문보다 먼저 오는 변형
  let stemUsable = stemLines;
  if (!passageBody) {
    const inlinePassage = extractInlinePassage(stemLines, compiled);
    if (inlinePassage) {
      passageBody = inlinePassage.body;
      passagePosition = 'afterStem';
      stemUsable = [
        ...stemLines.slice(0, inlinePassage.start),
        ...stemLines.slice(Math.min(inlinePassage.end + 1, stemLines.length)),
      ];
    }
  }
  // 지문이 펜스(``` … `[지문]` …)로 오는 변형 — 도형이 아니라 지문으로 뺀다.
  if (!passageBody) {
    const fencePassage = extractFencePassage(stemUsable, compiled);
    if (fencePassage) {
      passageBody = fencePassage.body;
      passagePosition = fencePassage.start === 0 ? 'before' : 'afterStem';
      stemUsable = [
        ...stemUsable.slice(0, fencePassage.start),
        ...stemUsable.slice(Math.min(fencePassage.end + 1, stemUsable.length)),
      ];
    }
  }

  problem.stem = parseBlocks(stemUsable, compiled, {
    where: 'stem', figures: problem.figures, warnings: problem.warnings, key: problem.key,
  });

  if (passageBody) {
    problem.passage = {
      blocks: parseBlocks(passageBody, compiled, {
        where: 'passage', figures: problem.figures, warnings: problem.warnings, key: problem.key,
      }),
      inherited: false,
      ownerKey: problem.key,
    };
    problem.passagePosition = passagePosition;
  }

  // 선지
  if (choiceStart >= 0) {
    let j = choiceStart;
    const inline = matchAny(compiled.choiceInline, bodyLines[j]);
    if (inline) {
      const labels = bodyLines[j].trim().split(/\s+/u).filter(Boolean);
      problem.choices = labels.map((l) => ({ label: normalizeLabel(l), text: '' }));
      problem.choiceLayout = 'inline';
      j += 1;
    } else {
      let last = 0;
      while (j < bodyLines.length) {
        const line = bodyLines[j];
        if (isBlank(line)) {
          let k = j + 1;
          while (k < bodyLines.length && isBlank(bodyLines[k])) k += 1;
          const nx = k < bodyLines.length ? matchAny(compiled.choice, bodyLines[k]) : null;
          if (nx && labelToNumber(nx.m.groups.label) > last) { j = k; continue; }
          break;
        }
        const cm = matchAny(compiled.choice, line);
        if (cm) {
          const label = cm.m.groups.label;
          const n = labelToNumber(label);
          if (n <= last) break;
          last = n;
          problem.choices.push({ label: normalizeLabel(label), text: (cm.m.groups.text || '').trim() });
          j += 1;
          continue;
        }
        const cc = problem.choices.length ? matchAny(compiled.choiceContinuation, line) : null;
        if (cc) {
          const prev = problem.choices[problem.choices.length - 1];
          prev.text = `${prev.text} ${cc.m[1].trim()}`.trim();
          j += 1;
          continue;
        }
        break;
      }
    }
    // 선지 뒤에 남은 줄
    const tail = bodyLines.slice(j).filter((l) => !isBlank(l));
    if (tail.length) {
      const tailBlocks = parseBlocks(bodyLines.slice(j), compiled, {
        where: 'stem', figures: problem.figures, warnings: problem.warnings, key: problem.key,
      });
      const onlyBox = tailBlocks.every((b) => b.type === 'box');
      if (!onlyBox) {
        problem.warnings.push(`${problem.key}: 선지 뒤에 남은 줄 ${tail.length}개를 자료로 붙였습니다 — "${tail[0].trim().slice(0, 24)}". 선지 앞으로 옮기세요.`);
      }
      problem.stem.push(...tailBlocks);
    }
  }
  return problem;
}

/** 해설 파싱 — `[지문]`/`[풀이]`/`[팁]` 섹션과 `[정답]` 값. */
function parseExplanation(explLines, problem, compiled) {
  const sections = [];
  let current = { name: '', lines: [] };
  const flush = () => {
    if (current.lines.some((l) => !isBlank(l)) || current.name) sections.push(current);
    current = { name: '', lines: [] };
  };
  for (const line of explLines) {
    const sm = matchAny(compiled.section, line);
    if (sm) {
      flush();
      const g = sm.m.groups || {};
      current = { name: (g.name || '').trim(), lines: [] };
      if (g.rest && g.rest.trim()) current.lines.push(g.rest.trim());
      continue;
    }
    current.lines.push(line);
  }
  flush();

  const answerName = (compiled.answer && compiled.answer.section) || '정답';
  const out = [];
  for (const sec of sections) {
    if (sec.name === answerName || (answerName === '정답' && sec.name === '답')) {
      const raw = sec.lines.join(' ').trim();
      const values = answerValues(raw, compiled);
      problem.answer = { raw, values, multi: values.length > 1 };
      continue;
    }
    if (!sec.lines.some((l) => !isBlank(l))) continue;
    out.push({
      name: sec.name,
      blocks: parseBlocks(sec.lines, compiled, {
        where: 'explanation', figures: problem.figures, warnings: problem.warnings, key: problem.key,
      }),
    });
  }
  problem.explanation = { sections: out };
  if (out.length && !problem.answer) {
    problem.warnings.push(`${problem.key}: 해설은 있는데 [정답]을 찾지 못했습니다 — 해설 끝에 "[정답] 3"을 넣으세요.`);
  }
}

/** 문항의 본문 텍스트(과목 추정용). */
function problemText(problem) {
  const parts = [];
  const walk = (blocks) => {
    for (const b of blocks || []) {
      if (b.type === 'p' || b.type === 'inserted') parts.push(b.text);
      else if (b.type === 'list') parts.push(b.items.join(' '));
      else if (b.type === 'table') parts.push([...(b.header || []), ...b.rows.flat()].join(' '));
      else if (b.type === 'box') { parts.push(`<${b.title}>`); walk(b.blocks); }
      else if (b.type === 'figure') parts.push(b.text);
      else if (b.type === 'math') parts.push(b.tex);
    }
  };
  if (problem.passage && !problem.passage.inherited) walk(problem.passage.blocks);
  walk(problem.stem);
  parts.push(problem.choices.map((c) => c.text).join(' '));
  if (problem.intro) parts.push(problem.intro);
  return parts.join('\n');
}

/** subjectHints 점수로 소스 전체의 과목을 추정한다(문항마다 규칙별 최대 3회까지 셈). */
function estimateSubject(problems, compiled) {
  const scores = new Map();
  for (const p of problems) {
    const text = problemText(p);
    for (const [subject, hints] of Object.entries(compiled.subjectHints || {})) {
      let s = 0;
      for (const re of hints) {
        re.lastIndex = 0;
        const found = text.match(re);
        if (found) s += Math.min(found.length, 3);
      }
      scores.set(subject, (scores.get(subject) || 0) + s);
    }
  }
  let best = '';
  let bestScore = 0;
  let tie = false;
  for (const [subject, s] of scores) {
    if (s > bestScore) { best = subject; bestScore = s; tie = false; } else if (s === bestScore && s > 0) tie = true;
  }
  return bestScore > 0 && !tie ? best : '기타';
}

/** 지문이 없는 문항에 직전 문항의 지문을 물려준다(같은 소스 안에서만). */
function inheritPassages(problems, compiled) {
  if (!compiled.passage || compiled.passage.inherit === false) return;
  let owner = null;
  for (const p of problems) {
    if (p.passage && !p.passage.inherited) { owner = p; continue; }
    const first = p.stem.find((b) => b.type === 'p');
    const head = first ? first.text : '';
    if (!head || !testAny(compiled.stemNeedsPassage, head)) continue;
    if (!owner) {
      p.warnings.push(`${p.key}: 지문 계승 대상이 없습니다 — 발문이 앞 지문을 가리키는데 이 소스에 앞선 지문이 없습니다.`);
      continue;
    }
    p.passage = { blocks: owner.passage.blocks, inherited: true, ownerKey: owner.key };
    p.passagePosition = owner.passagePosition || 'before';
  }
}

/** 빈 Problem 뼈대. */
function blankProblem(sourceId, index) {
  return {
    key: `${sourceId}#${index}`,
    sourceId,
    index,
    srcNum: null,
    num: null,
    title: null,
    time: null,
    meta: {},
    ref: null,
    header: null,
    intro: null,
    passage: null,
    passagePosition: 'before',
    stem: [],
    choices: [],
    choiceLayout: 'auto',
    explanation: { sections: [] },
    answer: null,
    figures: [],
    subject: '기타',
    unit: null,
    subunit: null,
    warnings: [],
  };
}

/** 본문 줄에서 인용 접두(`> `)를 벗긴다. 펜스 안(아스키 도형)은 원문 그대로 둔다. */
function stripQuotePrefix(lines, re) {
  if (!re) return lines;
  let inFence = false;
  return lines.map((line) => {
    if (/^\s*```/u.test(line)) { inFence = !inFence; return line; }
    return inFence ? line : line.replace(re, '');
  });
}

/** 원문 번호 문자열을 정수로("문항 3" → 3). 읽을 수 없으면 0. */
function srcNumOf(problem) {
  const m = String(problem.srcNum == null ? '' : problem.srcNum).match(/\d+/u);
  return m ? Number(m[0]) : 0;
}

/** 파일 끝 정답표 섹션을 `[{num, raw, lines}]`로 읽는다. */
function parseAnswerKeySection(lines, compiled) {
  const entries = [];
  let cur = null;
  for (const line of lines) {
    const em = matchAny(compiled.answerKey.entry, line);
    if (em) {
      const g = em.m.groups || {};
      cur = { num: Number(g.num), raw: (g.answer || '').trim(), lines: [] };
      entries.push(cur);
      continue;
    }
    if (cur) cur.lines.push(line);
  }
  return entries;
}

/** 정답표 항목을 문항 번호로 짝지어 정답·해설로 붙인다(짝이 없으면 양쪽 다 경고). */
function applyAnswerKey(entries, problems, compiled, warnings) {
  const byNum = new Map();
  for (const p of problems) {
    const n = srcNumOf(p);
    if (n > 0 && !byNum.has(n)) byNum.set(n, p);
  }
  const matched = new Set();
  for (const e of entries) {
    const p = byNum.get(e.num);
    if (!p) {
      warnings.push(`정답표의 [문항 ${e.num} 정답]에 맞는 문항이 없습니다 — 문항 번호와 정답표 번호를 맞추세요.`);
      continue;
    }
    matched.add(e.num);
    const values = answerValues(e.raw, compiled);
    p.answer = { raw: e.raw, values, multi: values.length > 1 };
    const blocks = parseBlocks(e.lines, compiled, {
      where: 'explanation', figures: p.figures, warnings: p.warnings, key: p.key,
    });
    if (blocks.length) p.explanation = { sections: [{ name: '풀이', blocks }] };
  }
  for (const [n, p] of byNum) {
    if (matched.has(n) || p.answer) continue;
    p.warnings.push(`${p.key}: 정답표에 [문항 ${n} 정답] 항목이 없습니다 — 정답 섹션에 그 번호를 추가하세요.`);
  }
}

/** 헤더 줄과 블록(문항 후보) 덩어리로 가른다. */
function splitBlocks(all, compiled, warnings) {
  let headerLines = [];
  const segments = [];
  if (compiled.block && compiled.block.start) {
    let first = -1;
    for (let i = 0; i < all.length; i += 1) {
      if (testAny(compiled.block.start, all[i])) { first = i; break; }
    }
    if (first < 0) {
      warnings.push('블록 구분선을 찾지 못했습니다 — 파일 전체를 한 문항으로 읽습니다.');
      segments.push(all);
    } else {
      headerLines = all.slice(0, first);
      let cur = [];
      for (let i = first + 1; i < all.length; i += 1) {
        if (testAny(compiled.block.start, all[i])) { segments.push(cur); cur = []; continue; }
        cur.push(all[i]);
      }
      segments.push(cur);
    }
  } else {
    let cur = null;
    for (let i = 0; i < all.length; i += 1) {
      if (testAny(compiled.questionHead, all[i])) {
        if (cur) segments.push(cur);
        cur = [all[i]];
        continue;
      }
      if (cur) cur.push(all[i]);
      else headerLines.push(all[i]);
    }
    if (cur) segments.push(cur);
  }
  return { headerLines, segments };
}

/** 프로파일 하나로 소스를 끝까지 읽는다(자동 감지는 parseSource가 이 함수를 여러 번 부른다). */
function parseWith(source, compiled, opts = {}) {
  const sourceId = source.id || 's1';
  const warnings = [];
  const text = String(source.text || '').replace(/^﻿/u, '').replace(/\r\n?/gu, '\n');
  const all = text.split('\n')
    .filter((l) => !testAny(compiled.ignoreLine, l))
    .map((l) => l.replace(/[ \t]+$/u, ''));

  // 파일 끝 정답표 섹션은 블록에서 떼어 둔다(그 뒤는 전부 정답표).
  let answerLines = [];
  let body = all;
  if (compiled.answerKey && compiled.answerKey.start) {
    const at = all.findIndex((l) => testAny(compiled.answerKey.start, l));
    if (at >= 0) { answerLines = all.slice(at + 1); body = all.slice(0, at); }
  }

  // 문항이라 볼 표지(문항 머리·선지)가 하나도 없으면 이 파일은 문항 파일이 아니다.
  const hasHead = body.some((l) => testAny(compiled.questionHead, l));
  const hasChoice = body.some((l) => testAny(compiled.choice, l) || testAny(compiled.choiceInline, l));

  const { headerLines, segments } = splitBlocks(body, compiled, warnings);
  if (!hasHead && !hasChoice) {
    const header = parseHeader(headerLines.length ? headerLines : body, compiled, []);
    return {
      problems: [],
      header,
      warnings: ['문항으로 읽을 수 없어 건너뜁니다(구분선·[문제]·선지 없음)'],
    };
  }

  const header = parseHeader(headerLines, compiled, warnings);
  const problems = [];

  for (const rawSeg of segments) {
    const seg = stripQuotePrefix(rawSeg, compiled.quotePrefix);
    if (!seg || !seg.some((l) => !isBlank(l))) continue;
    const problem = blankProblem(sourceId, problems.length);
    problem.header = header;

    let i = 0;
    while (i < seg.length && isBlank(seg[i])) i += 1;
    if (compiled.ref) {
      const rm = matchAny(compiled.ref, seg[i]);
      if (rm) {
        problem.ref = parseRef((rm.m[1] || '').trim(), compiled);
        i += 1;
      }
    }

    let bodyStart = i;
    if (compiled.problemStart) {
      for (let j = i; j < seg.length; j += 1) {
        if (testAny(compiled.problemStart, seg[j])) { bodyStart = j + 1; break; }
      }
    }
    let explStart = -1;
    let explInclusive = false;
    if (compiled.explanationStart) {
      for (let j = bodyStart; j < seg.length; j += 1) {
        if (testAny(compiled.explanationStart, seg[j])) { explStart = j; break; }
      }
    }
    // `[해설]` 줄이 따로 없는 포맷은 첫 섹션 줄(`정답: 3`·`답 ③`)부터 해설로 본다.
    if (explStart < 0 && compiled.section) {
      const passage = compiled.passage || {};
      for (let j = bodyStart; j < seg.length; j += 1) {
        if (testAny(passage.open, seg[j]) || testAny(passage.close, seg[j])) continue;
        if (testAny(compiled.section, seg[j])) { explStart = j; explInclusive = true; break; }
      }
    }
    const bodyLines = seg.slice(bodyStart, explStart >= 0 ? explStart : seg.length);
    const explLines = explStart >= 0 ? seg.slice(explInclusive ? explStart : explStart + 1) : [];

    parseBody(bodyLines, problem, compiled, {});
    if (explLines.length) parseExplanation(explLines, problem, compiled);

    // 문항이라 볼 근거가 하나도 없는 블록(꼬리에 남은 펜스·주석 등)은 건너뛴다.
    const hasText = problem.stem.some((b) => b.type === 'p') || (problem.passage && problem.passage.blocks.length);
    if (!problem.choices.length && !problem.answer && problem.srcNum === null && !hasText) {
      const sample = seg.find((l) => !isBlank(l)) || '';
      warnings.push(`문항 내용이 없는 블록을 건너뜁니다 — "${sample.trim().slice(0, 24)}". [문제] 줄과 선지가 있는지 확인하세요.`);
      continue;
    }

    if (!problem.choices.length) {
      problem.warnings.push(`${problem.key}: 선지를 찾지 못했습니다 — 선지는 줄 첫머리의 ①~⑤로 시작해야 합니다.`);
    } else if (problem.choices.length < 4) {
      problem.warnings.push(`${problem.key}: 선지가 ${problem.choices.length}개뿐입니다 — 빠진 선지가 없는지 확인하세요.`);
    }
    if (!problem.stem.length && !problem.passage) {
      problem.warnings.push(`${problem.key}: 발문을 찾지 못했습니다 — [문제] 다음 줄부터 발문을 적으세요.`);
    }
    problems.push(problem);
  }

  if (answerLines.length) {
    applyAnswerKey(parseAnswerKeySection(answerLines, compiled), problems, compiled, warnings);
  }

  inheritPassages(problems, compiled);

  const declared = source.subject && source.subject !== 'auto' ? source.subject : null;
  const subject = declared || opts.subject || estimateSubject(problems, compiled);
  for (const p of problems) p.subject = subject;

  for (const p of problems) warnings.push(...p.warnings);
  return { problems, header, warnings };
}

/** 자동 감지에 쓰는 프로파일별 지문(指紋) — 이 표지가 없는 프로파일은 아예 시도하지 않는다. */
const SIGNATURE = {
  batch: /^---[ \t]*$|^\[문제\][ \t]*$|^\[ref\]/mu,
  mdheading: /^#{2,4}[ \t]*\[문항[ \t]*\d/mu,
  plain: /^[ \t]*\d{1,3}[ \t]*[.)][ \t]*\S/mu,
};

const builtinCache = new Map();

/** 내장 프로파일의 컴파일 결과를 한 번만 만들어 재사용한다. */
function builtinCompiled(id) {
  if (!builtinCache.has(id)) builtinCache.set(id, compileProfile(BUILTIN_PROFILES[id]));
  return builtinCache.get(id);
}

/** 파싱 결과의 우열 기준 — 선지를 갖춘 문항 수 > 적은 경고 > 많은 문항 수. */
function scoreOf(res) {
  return {
    solid: res.problems.filter((p) => p.choices.length >= 2).length,
    warn: res.warnings.length,
    count: res.problems.length,
  };
}

/** a가 b보다 나은 결과인지(동점이면 먼저 시도한 쪽을 남긴다). */
function beats(a, b) {
  if (a.solid !== b.solid) return a.solid > b.solid;
  if (a.warn !== b.warn) return a.warn < b.warn;
  return a.count > b.count;
}

/**
 * 소스 하나(파일 하나)를 파싱한다. profileId가 "auto"·없음·내장 프로파일이면
 * 내장 프로파일들을 겨뤄 가장 잘 읽히는 것을 고르고 `profileId`로 알려 준다.
 * @param {{id?: string, name?: string, text: string, subject?: string, profileId?: string}} source
 * @param {object} compiled CompiledProfile (선언된 프로파일)
 * @param {{detect?: boolean}} [opts] detect:false면 주어진 프로파일만 쓴다
 * @returns {{problems: object[], header: object, warnings: string[], profileId: string}}
 */
export function parseSource(source, compiled, opts = {}) {
  const declaredId = (source && source.profileId) || (compiled && compiled.id) || 'auto';
  const isBuiltin = Object.prototype.hasOwnProperty.call(BUILTIN_PROFILES, declaredId);
  const detect = opts.detect !== false
    && (declaredId === 'auto' || !source.profileId || isBuiltin);
  if (!detect) {
    const only = parseWith(source, compiled, opts);
    only.profileId = declaredId;
    return only;
  }

  const text = String(source.text || '');
  const order = [];
  if (isBuiltin) order.push(declaredId);
  if (SIGNATURE.mdheading.test(text) && !order.includes('mdheading')) order.push('mdheading');
  for (const id of BUILTIN_ORDER) {
    if (order.includes(id)) continue;
    if (SIGNATURE[id] && !SIGNATURE[id].test(text)) continue;
    order.push(id);
  }
  if (!order.includes('plain')) order.push('plain');
  if (!order.length) order.push('batch');

  // 사용자가 내장 프로파일을 콕 집어 골랐다면, 문항을 더 많이 읽어 내는 프로파일에만 자리를 내준다.
  const explicit = isBuiltin && !!source.profileId && source.profileId !== 'auto';
  let best = null;
  let bestScore = null;
  let bestId = null;
  for (const id of order) {
    // plain은 마지막 구제책 — 앞선 프로파일이 이미 문항을 읽어 냈으면 시도하지 않는다.
    if (id === 'plain' && bestScore && bestScore.solid > 0) continue;
    const prof = (id === declaredId && compiled) ? compiled : builtinCompiled(id);
    if (!prof) continue;
    const res = parseWith(source, prof, opts);
    const score = scoreOf(res);
    if (!best) { best = res; bestScore = score; bestId = id; continue; }
    const wins = (explicit && bestId === declaredId)
      ? score.solid > bestScore.solid
      : beats(score, bestScore);
    if (wins) { best = res; bestScore = score; bestId = id; }
  }
  if (best) best.profileId = bestId;
  if (!best) {
    best = parseWith(source, compiled, opts);
    best.profileId = declaredId;
  }
  return best;
}

/**
 * 프로젝트 전체를 파싱하고 번호·단원까지 채운다.
 * 경고는 파서 안에서 소스명을 붙이지 않고, 여기서 최상위 목록에만 `이름: `을 한 번 붙인다.
 * @returns {{problems: object[], sources: object[], warnings: string[]}}
 */
export function parseProject(project) {
  const proj = project || {};
  const sources = (proj.sources || [])
    .filter((s) => s && s.enabled !== false)
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const problems = [];
  const summaries = [];
  const warnings = [];

  const nameOf = new Map();

  for (const source of sources) {
    const compiled = resolveProfile(proj, source.profileId);
    const res = parseSource(source, compiled, {});
    const overrides = proj.overrides || {};
    for (const p of res.problems) {
      const ov = overrides[p.key];
      if (ov && ov.exclude) p.excluded = true;
    }
    problems.push(...res.problems);
    const name = source.name || source.id;
    nameOf.set(source.id, name);
    summaries.push({
      id: source.id,
      name,
      header: res.header,
      count: res.problems.length,
      profileId: res.profileId || source.profileId || 'batch',
      warnings: res.warnings,
    });
    for (const w of res.warnings) warnings.push(`${name}: ${w}`);
  }

  assignUnits(problems, proj);
  // 번호는 조판 순서(단원 → 소단원 → 등장 순)를 따라야 본문·정답·차례가 맞는다.
  const groups = groupByUnits(problems, proj.units || {});
  const ordered = groups.flatMap((g) => g.subunits.flatMap((s) => s.problems));
  if (ordered.length === problems.length) problems.splice(0, problems.length, ...ordered);
  assignNumbers(problems, proj.numbering || { mode: 'sequential', start: 1, pad: 0 }, groups);
  groupRanges(problems);

  // 번호·단원 단계에서 새로 생긴 문항 경고를 소스 목록과 최상위 목록에 한 번씩 반영한다.
  const bySource = new Map(summaries.map((s) => [s.id, s]));
  for (const p of problems) {
    const name = nameOf.get(p.sourceId) || p.sourceId;
    const summary = bySource.get(p.sourceId);
    for (const w of p.warnings) {
      if (summary && !summary.warnings.includes(w)) summary.warnings.push(w);
      const line = `${name}: ${w}`;
      if (!warnings.includes(line)) warnings.push(line);
    }
  }
  return { problems, sources: summaries, warnings };
}
