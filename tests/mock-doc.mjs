// mock-doc.mjs — parser/render 없이 layout.js를 끝까지 돌리기 위한 가짜 doc·project.
// Problem/Block/Atom 계약(DESIGN §2.2~§2.3, §3 render.js)을 그대로 따른다.
// [DOM 무관 · 브라우저/node 양쪽에서 import 가능]

/* ───────────────────────── 0. 인라인 처리 ───────────────────────── */

const escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** HTML 특수문자 이스케이프. */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => escMap[c]);
}

/** 수식 보호 → 이스케이프 → 화이트리스트 복원 → 규칙 적용 → 수식 복원 (rules.inline의 축약판). */
export function inline(text, scope = 'all', subject = '') {
  const segs = [];
  let s = String(text == null ? '' : text);
  s = s.replace(/\$\$([^$]+)\$\$|\$([^$\n]+)\$/g, (m, disp, ins) => {
    segs.push({ tex: (disp || ins).trim(), display: disp ? 1 : 0 });
    return `${segs.length - 1}`;
  });
  s = esc(s);
  s = s.replace(/&lt;(\/?)(u|b|i|em|strong|sub|sup|s|mark|br)&gt;/g, '<$1$2>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  if (scope === 'choices' && subject === '국어') s = s.replace(/'([^'\n]{1,60})'/g, "<b>'$1'</b>");
  s = s.replace(/([㉠-㉭ⓐ-ⓔ])/g, '<span class="mk">$1</span>');
  s = s.replace(/(\[[A-E]\])/g, '<span class="mk">$1</span>');
  s = s.replace(/(\d+)/g, (m, i) => {
    const g = segs[+i];
    const raw = g.display ? `$$${g.tex}$$` : `$${g.tex}$`;
    return `<span class="math" data-tex="${esc(g.tex)}" data-display="${g.display}">${esc(raw)}</span>`;
  });
  return s;
}

/** 한국어/영어 문장 경계로 조각을 낸다(지문 문단 분할용 splitParts). */
export function splitSentences(text) {
  const out = [];
  const re = /[^.。]*?(?:다\.\s+|요\.\s+|음\.\s+|\.\s+(?=[A-Z])|\?\s+|!\s+)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    out.push(text.slice(last, re.lastIndex));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.filter((x) => x.trim().length);
}

/* ───────────────────────── 1. 문항 데이터 ───────────────────────── */

const P = (text) => ({ type: 'p', text });

const KOR_PASSAGE_A = [
  '과학사에서 어떤 이론이 낡은 이론을 대체하는 과정은 좀처럼 단번에 이루어지지 않는다. 새 이론이 옳다는 것이 밝혀지는 순간과, 그 이론이 공동체의 표준으로 받아들여지는 순간 사이에는 대개 한 세대에 가까운 시차가 놓여 있다.',
  '19세기 말의 물리학자들은 자신들이 다루는 학문이 거의 완성되었다고 믿었다. 뉴턴의 역학은 천체의 운동을 정밀하게 예측했고, 맥스웰의 전자기학은 빛의 정체를 밝혔으며, 열역학은 증기 기관의 효율을 계산해 냈다. 남은 일은 소수점 아래 자릿수를 늘리는 일뿐이라는 말이 공공연히 오갔다.',
  '그러나 두 개의 작은 얼룩이 남아 있었다. 하나는 흑체 복사의 스펙트럼이 고전 이론의 예측과 어긋난다는 사실이었고, 다른 하나는 에테르를 찾으려는 실험이 번번이 실패한다는 사실이었다. 당대의 물리학자들은 이 얼룩을 곧 닦아 낼 수 있으리라 여겼다. 그것들이 건물의 얼룩이 아니라 주춧돌의 균열이라는 것을 알아차린 사람은 거의 없었다.',
  '플랑크가 1900년에 내놓은 해법은 스스로도 달가워하지 않은 것이었다. 그는 진동자가 주고받는 에너지가 연속적인 값이 아니라 어떤 최소 단위의 정수배로만 존재한다고 가정했을 때, 비로소 실험값과 맞아떨어지는 식을 얻었다. 플랑크는 이 가정을 계산을 맞추기 위한 임시방편으로 여겼고, 이후 여러 해 동안 고전적인 방식으로 같은 결과를 유도해 보려 애썼다. 그가 세운 상수는 훗날 자연의 근본 상수 가운데 하나로 자리 잡았지만, 정작 그 자신은 그 상수가 무엇을 뜻하는지 오래도록 인정하지 않았다. 새로운 것을 발견한 사람과 그것을 믿는 사람이 반드시 같지는 않다는 사실을, 과학사는 이 대목에서 유난히 선명하게 보여 준다. 아인슈타인이 1905년에 광전 효과를 설명하며 빛 자체가 알갱이의 성질을 지닌다고 주장했을 때에도 사정은 비슷했다. 그 주장은 십 년이 넘도록 대다수 물리학자에게 지나친 비약으로 여겨졌고, 밀리컨은 그것이 틀렸음을 보이려고 정밀한 실험을 설계했다가 오히려 아인슈타인의 예측을 확인해 주고 말았다.',
  '이러한 지체를 단순히 보수성의 결과로만 볼 수는 없다. 낡은 이론은 오랜 세월에 걸쳐 수많은 현상을 성공적으로 설명해 왔고, 그 성공의 목록은 새 이론이 아직 갖추지 못한 자산이다. 한두 개의 변칙 사례 때문에 그 자산을 통째로 버리는 것은 합리적인 선택이 아니다.',
  '쿤은 이 상황을 설명하기 위해 정상 과학이라는 개념을 제시했다. 정상 과학은 이미 확립된 틀 안에서 퍼즐을 푸는 활동이며, 변칙 사례는 퍼즐이 아직 풀리지 않았다는 신호로 해석된다. 틀 자체를 의심하는 일은 퍼즐이 도무지 풀리지 않고 쌓여 갈 때에야 비로소 시작된다.',
  '그렇다면 언제 틀이 바뀌는가. 쿤에 따르면 결정적인 실험 하나가 승부를 가르는 일은 드물다. 오히려 새 틀 안에서 자란 젊은 세대가 학계의 다수가 되는 시점, 즉 인적 구성이 바뀌는 시점이 전환의 실질적인 계기가 된다.',
  '플랑크 자신이 남긴 회고는 이 점에서 자주 인용된다. 그는 새로운 과학적 진리가 반대자를 설득해서 승리하는 것이 아니라, 반대자들이 결국 세상을 떠나고 새 진리에 익숙한 세대가 자라남으로써 승리한다고 적었다. 이 문장은 흔히 냉소로 읽히지만, 자세히 보면 학문 공동체가 어떻게 작동하는지에 대한 담담한 관찰에 가깝다.',
  '다만 이 관찰을 일반화할 때는 조심할 필요가 있다. 20세기 후반 이후의 과학은 논문 유통 속도와 국제적 협업의 규모에서 이전과 크게 달라졌다. 판 구조론이 1960년대에 십여 년 만에 지질학계를 장악한 사례는, 증거의 형태가 충분히 압도적이고 소통의 통로가 넓을 때 전환이 훨씬 빠를 수 있음을 보여 준다.',
  '반대로 전환이 빠르다는 것이 언제나 미덕인 것도 아니다. 검증이 충분히 쌓이기 전에 새로운 틀로 몰려가는 일이 잦아지면, 공동체는 유행에 따라 흔들리고 재현되지 않는 결과가 쌓인다. 최근 여러 분야에서 제기된 재현성 위기는 이 위험이 가설에 그치지 않음을 보여 준다.',
  '결국 과학의 변화 속도는 개별 연구자의 용기나 아집만으로 결정되지 않는다. 그것은 증거의 무게, 소통의 구조, 세대의 교체, 그리고 무엇을 충분한 근거로 볼 것인가에 대한 공동체의 합의가 함께 만들어 내는 현상이다.',
  '따라서 과학사를 읽을 때 우리가 물어야 할 것은 누가 먼저 옳았는가만이 아니다. 옳은 주장이 어떤 경로를 거쳐 공동의 지식이 되었는가, 그 경로에서 무엇이 지체를 만들고 무엇이 지체를 줄였는가를 함께 물을 때, 과학은 비로소 사람이 하는 일로 이해된다.',
];

const KOR_PASSAGE_B = [
  '(가) 흰 벽에 걸린 액자 속에서 / 아버지는 여전히 젊으시다 // 사진은 늙지 않는다는 말을 / 나는 오래 믿지 않았다',
  '(나) 언어는 사물에 붙은 이름표가 아니라, 사물을 나누는 가위에 가깝다. 우리가 무지개를 일곱 빛깔로 보는 것은 무지개가 일곱 개의 띠로 되어 있어서가 아니라, 우리말이 그 연속된 띠를 일곱 개의 칸으로 잘라 놓았기 때문이다.',
  '이 견해를 극단으로 밀고 가면, 언어가 다르면 세계도 다르다는 결론에 이른다. 실제로 어떤 언어는 앞뒤와 좌우 대신 동서남북으로만 공간을 가리키며, 그 언어의 화자들은 낯선 실내에서도 방위 감각을 잃지 않는 것으로 알려져 있다.',
  '그러나 반론도 만만치 않다. 색채 어휘가 두 개뿐인 언어의 화자도 미묘한 색의 차이를 구별해 내며, 다만 그것을 한 낱말로 부르지 않을 뿐이다. 언어는 우리가 무엇을 볼 수 있는지를 결정한다기보다, 무엇에 먼저 눈길을 주는지를 조율한다는 것이다.',
];

const CHEM_FIG = [
  '  P(atm)',
  '   ^',
  ' 3 |        ,--*  C',
  '   |      ,-\'',
  ' 2 |   *-\'        B',
  '   |  /',
  ' 1 | *  A',
  '   +----+----+----+---> T(K)',
  '      200  400  600',
].join('\n');

const CHEM_DEVICE = [
  '  +=====+        +=====+',
  '  |  A  |--|X|-->|  B  |',
  '  | (g) |        | (g) |',
  '  +=====+        +=====+',
  '   1.0 L          2.0 L',
].join('\n');

/** 문항 하나를 만든다(빠진 필드는 계약상의 기본값으로). */
function prob(o) {
  return {
    key: o.key,
    sourceId: o.key.split('#')[0],
    index: Number(o.key.split('#')[1]),
    srcNum: o.srcNum ?? null,
    num: o.num,
    time: o.time ?? null,
    ref: o.ref ?? null,
    header: o.header ?? null,
    intro: o.intro ?? null,
    passage: o.passage ?? null,
    stem: o.stem ?? [],
    choices: o.choices ?? [],
    choiceLayout: o.choiceLayout ?? 'auto',
    explanation: o.explanation ?? { sections: [] },
    answer: o.answer ?? null,
    figures: o.figures ?? [],
    subject: o.subject,
    unit: o.unit,
    subunit: o.subunit,
    groupRange: o.groupRange ?? null,
    warnings: [],
  };
}

/** 선지 배열 생성기. */
const ch = (...texts) => texts.map((t, i) => ({ label: '①②③④⑤'[i], text: t }));

/** 해설 섹션 생성기. */
const expl = (...pairs) => ({ sections: pairs.map(([name, ...lines]) => ({ name, blocks: lines.map(P) })) });

const U1 = 'Ⅰ. 국어 — 독서와 문법';
const U2 = 'Ⅱ. 영어 — 독해와 추론';
const U3 = 'Ⅲ. 수학·화학 — 계산과 자료 해석';
const S11 = '독서 · 과학기술';
const S12 = '문법 · 어휘';
const S21 = '빈칸 추론';
const S22 = '문장 삽입';
const S31 = '미분과 도함수';
const S32 = '물질과 에너지';

/** 24문항(국어 10 · 영어 4 · 수학 6 · 화학 4)을 만든다. */
export function makeProblems() {
  const list = [];
  const passA = { blocks: KOR_PASSAGE_A.map(P), inherited: false, ownerKey: 's1#0' };
  const passB = { blocks: KOR_PASSAGE_B.map(P), inherited: false, ownerKey: 's1#3' };

  // ── 국어 독서 세트 A (1~3): 12문단 긴 지문, 2·3번은 계승
  list.push(
    prob({
      key: 's1#0',
      num: 1,
      srcNum: '01',
      time: '2분',
      subject: '국어',
      unit: U1,
      subunit: S11,
      intro: '다음 글을 읽고 물음에 답하시오.',
      passage: passA,
      groupRange: { from: 1, to: 3 },
      ref: { title: '과학사 독서 세트', page: '12쪽' },
      stem: [P('윗글의 내용과 일치하지 않는 것은?')],
      choices: ch(
        '플랑크는 자신이 도입한 가정을 오랫동안 임시방편으로 여겼다.',
        '밀리컨은 아인슈타인의 광량자 가설을 반박하려다 도리어 그것을 확인했다.',
        '쿤은 결정적 실험 하나가 이론 전환의 승부를 가른다고 보았다.',
        '판 구조론은 비교적 짧은 기간에 지질학계의 표준이 되었다.',
        '재현성 위기는 빠른 이론 전환이 지닌 위험을 보여 주는 사례로 언급된다.'
      ),
      answer: { raw: '3', values: [3], multi: false },
      explanation: expl(
        ['지문', '과학 이론의 전환이 왜 지체되는지를 정상 과학·세대 교체·소통 구조의 세 축으로 설명한 글이다.'],
        [
          '풀이',
          '7문단에서 쿤은 "결정적인 실험 하나가 승부를 가르는 일은 드물다"라고 했으므로 ③은 지문과 어긋난다.',
          '나머지 선지는 각각 4문단, 4문단 후반, 9문단, 10문단에서 확인된다.',
        ],
        ['팁', '"드물다"와 같은 빈도 부사는 선지에서 단정형으로 뒤집히는 일이 잦다. 표시해 두고 대조하라.']
      ),
    }),
    prob({
      key: 's1#1',
      num: 2,
      srcNum: '02',
      subject: '국어',
      unit: U1,
      subunit: S11,
      passage: { blocks: passA.blocks, inherited: true, ownerKey: 's1#0' },
      groupRange: { from: 1, to: 3 },
      stem: [
        P('윗글을 바탕으로 <보기>를 이해한 내용으로 가장 적절한 것은?'),
        {
          type: 'box',
          title: '보기',
          blocks: [
            P('19세기 말 어느 학회에서 한 원로 학자는 "이제 물리학에 남은 것은 측정의 정밀도를 높이는 일뿐"이라고 말했다. 같은 자리에 있던 한 대학원생은 흑체 복사 자료를 들고 와 예측과 실측의 어긋남을 보였으나, 좌중은 그것을 곧 해결될 사소한 문제로 여겼다.'),
          ],
        },
      ],
      choices: ch(
        '원로 학자의 발언은 정상 과학이 자신의 틀을 의심하지 않는 국면을 보여 준다.',
        '대학원생의 자료는 변칙 사례가 곧바로 틀의 교체를 부른다는 것을 보여 준다.',
        '좌중의 반응은 소통의 통로가 넓을수록 전환이 빨라짐을 보여 준다.',
        '원로 학자의 발언은 세대 교체가 이미 끝났음을 뜻한다.',
        '대학원생의 태도는 재현성 위기의 전형적인 원인에 해당한다.'
      ),
      answer: { raw: '1', values: [1], multi: false },
      explanation: expl(['풀이', '6문단의 정상 과학 개념과 3문단의 "곧 닦아 낼 수 있으리라"라는 태도가 <보기>의 발언과 직접 맞물린다.']),
    }),
    prob({
      key: 's1#2',
      num: 3,
      srcNum: '03',
      subject: '국어',
      unit: U1,
      subunit: S11,
      passage: { blocks: passA.blocks, inherited: true, ownerKey: 's1#0' },
      groupRange: { from: 1, to: 3 },
      stem: [P('㉠의 문맥적 의미로 가장 적절한 것은?')],
      choices: ch('굳어진 관행', '축적된 설명력', '측정의 정밀도', '세대의 교체', '학문의 완성'),
      answer: { raw: '2', values: [2], multi: false },
      explanation: expl(['풀이', '5문단의 "자산"은 낡은 이론이 오래 쌓아 온 설명 성공의 목록을 가리킨다.']),
    })
  );

  // ── 국어 독서 세트 B (4~6): (가)(나) 복합 지문
  list.push(
    prob({
      key: 's1#3',
      num: 4,
      subject: '국어',
      unit: U1,
      subunit: S11,
      intro: '다음 글을 읽고 물음에 답하시오.',
      passage: passB,
      groupRange: { from: 4, to: 6 },
      stem: [P('(가)와 (나)에 대한 설명으로 가장 적절한 것은?')],
      choices: ch(
        "(가)는 '사진'을 시간의 정지를, (나)는 언어를 분절의 도구를 표상하는 데 쓴다.",
        "(가)의 '액자'는 화자의 회한을 완화하는 장치이다.",
        '(나)는 언어 상대성 가설을 전면 부정한다.',
        "(가)와 (나)는 모두 '보는 일'의 주관성을 부정한다.",
        '(나)는 색채 어휘의 수와 색 지각 능력이 비례한다고 본다.'
      ),
      answer: { raw: '1', values: [1], multi: false },
      explanation: expl(['풀이', '(나)의 마지막 문단은 "무엇을 볼 수 있는지"가 아니라 "무엇에 먼저 눈길을 주는지"라고 했다.']),
    }),
    prob({
      key: 's1#4',
      num: 5,
      subject: '국어',
      unit: U1,
      subunit: S11,
      passage: { blocks: passB.blocks, inherited: true, ownerKey: 's1#3' },
      groupRange: { from: 4, to: 6 },
      stem: [P('[A]에 대한 이해로 적절하지 <u>않은</u> 것은?')],
      choices: ch('무지개의 예는 분절의 자의성을 드러낸다.', '가위의 비유는 언어의 도구성을 강조한다.', '방위 어휘의 예는 반례로 제시되었다.', '색채 어휘의 예는 강한 상대성 가설을 제한한다.', '두 예는 서로 다른 층위에서 기능한다.'),
      answer: { raw: '3', values: [3], multi: false },
      explanation: expl(['풀이', '방위 어휘의 예는 반례가 아니라 상대성 가설을 지지하는 사례로 제시되었다.']),
    }),
    prob({
      key: 's1#5',
      num: 6,
      subject: '국어',
      unit: U1,
      subunit: S11,
      passage: { blocks: passB.blocks, inherited: true, ownerKey: 's1#3' },
      groupRange: { from: 4, to: 6 },
      stem: [P('(가)의 표현상 특징으로 적절한 것을 <보기>에서 모두 고른 것은?'), {
        type: 'box',
        title: '보기',
        blocks: [
          { type: 'list', marker: 'ㄱ', items: ['현재형 어미를 통해 대상을 고정된 상태로 제시한다.', '부정 표현을 통해 화자의 태도 변화를 드러낸다.', '색채어의 대비를 통해 정서를 심화한다.'] },
        ],
      }],
      choices: ch('ㄱ', 'ㄴ', 'ㄱ, ㄴ', 'ㄴ, ㄷ', 'ㄱ, ㄴ, ㄷ'),
      choiceLayout: 'grid5',
      answer: { raw: '3', values: [3], multi: false },
      explanation: expl(['풀이', 'ㄷ의 색채어 대비는 (가)에 나타나지 않는다.']),
    })
  );

  // ── 국어 문법 (7~10)
  const grammarStems = [
    ['다음 중 음운 변동의 유형이 나머지와 <u>다른</u> 것은?', ch('굳이[구지]', '해돋이[해도지]', '같이[가치]', '옷맵시[온맵씨]', 'miss'), 4],
    ['<자료>를 바탕으로 형태소를 분석한 내용으로 적절하지 <u>않은</u> 것은?', ch('먹였다 → 먹-+-이-+-었-+-다', '높푸르다 → 높-+푸르-+-다', '헛웃음 → 헛-+웃-+-음', '드나들다 → 들-+나-+들-+-다', '치솟다 → 치-+솟-+-다'), 4],
    ['밑줄 친 부분의 문장 성분이 나머지와 <u>다른</u> 것은?', ch('물이 얼음이 되었다.', '그는 학생이 아니다.', '아이가 어른이 다 되었다.', '나는 그를 친구로 삼았다.', '색이 붉게 변하였다.'), 4],
    ['다음 중 높임 표현이 바르게 쓰인 것은?', ch('주문하신 커피 나오셨습니다.', '할아버지께서는 귀가 밝으십니다.', '고객님, 이 상품은 품절이십니다.', '사장님 말씀이 계시겠습니다.', '어머니께서 아버지에게 말했다.'), 2],
  ];
  grammarStems.forEach((g, i) => {
    const stem = [P(g[0])];
    if (i === 1) {
      stem.push({
        type: 'box',
        title: '자료',
        blocks: [
          {
            type: 'table',
            header: ['구분', '예', '갈래'],
            rows: [
              ['파생어', '먹이다', '접사 결합'],
              ['합성어', '높푸르다', '어근 결합'],
              ['통사적 합성어', '돌아가다', '연결 어미 개재'],
            ],
            align: ['center', 'center', 'center'],
          },
        ],
      });
    }
    list.push(
      prob({
        key: `s1#${6 + i}`,
        num: 7 + i,
        subject: '국어',
        unit: U1,
        subunit: S12,
        stem,
        choices: g[1],
        answer: { raw: String(g[2]), values: [g[2]], multi: false },
        explanation: expl(['풀이', `정답은 ${g[2]}번이다. 나머지 선지는 같은 유형으로 묶인다.`]),
      })
    );
  });

  // ── 영어 (11~14)
  const engBlank =
    'Most people assume that expertise is mainly a matter of accumulated hours. Yet studies of chess players, surgeons and musicians converge on a less comfortable finding: hours spent in comfortable repetition produce almost no improvement after the first few years. What separates the top performers is not the total time but the proportion of that time spent at the edge of failure, where errors are frequent, visible and immediately corrected. This is why ______________.';
  list.push(
    prob({
      key: 's2#0',
      num: 11,
      subject: '영어',
      unit: U2,
      subunit: S21,
      intro: '다음 글을 읽고 물음에 답하시오.',
      passage: { blocks: [P(engBlank)], inherited: false, ownerKey: 's2#0' },
      groupRange: { from: 11, to: 12 },
      stem: [P('빈칸에 들어갈 말로 가장 적절한 것은?')],
      choices: ch(
        'a longer career rarely guarantees a better performance',
        'talent matters more than any form of practice',
        'teachers should praise effort rather than results',
        'repetition is the only reliable path to mastery',
        'feedback delayed by a day is as useful as immediate feedback'
      ),
      answer: { raw: '1', values: [1], multi: false },
      explanation: expl(['풀이', 'the edge of failure에서 보낸 시간의 비율이 관건이라는 논지이므로, 경력의 길이가 성취를 보장하지 않는다는 ①이 적절하다.']),
    }),
    prob({
      key: 's2#1',
      num: 12,
      subject: '영어',
      unit: U2,
      subunit: S21,
      passage: { blocks: [P(engBlank)], inherited: true, ownerKey: 's2#0' },
      groupRange: { from: 11, to: 12 },
      stem: [P('윗글의 주제로 가장 적절한 것은?')],
      choices: ch('the limits of mere repetition', 'the biology of muscle memory', 'the history of chess ratings', 'the ethics of surgical training', 'the economics of music education'),
      answer: { raw: '1', values: [1], multi: false },
      explanation: expl(['풀이', '반복만으로는 한계가 있다는 것이 글 전체의 초점이다.']),
    }),
    prob({
      key: 's2#2',
      num: 13,
      subject: '영어',
      unit: U2,
      subunit: S22,
      intro: '글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳을 고르시오.',
      passage: {
        blocks: [
          { type: 'inserted', text: 'But the same mechanism that keeps us safe also keeps us still.' },
          P('Fear is an old technology. ( ① ) It was built for a world in which the cost of a false alarm was a wasted afternoon and the cost of a missed signal was death. ( ② ) Under that arithmetic, a nervous animal outlived a calm one. ( ③ ) In a city, however, most alarms are false, and the animal that never moves pays a price of its own. ( ④ ) The modern task is therefore not to abolish fear but to renegotiate its threshold. ( ⑤ )'),
        ],
        inherited: false,
        ownerKey: 's2#2',
      },
      stem: [P('')],
      choices: ch('', '', '', '', ''),
      choiceLayout: 'inline',
      answer: { raw: '3', values: [3], multi: false },
      explanation: expl(['풀이', '역접의 But이 안전 장치의 이면을 도입하므로 ③이 적절하다.']),
    }),
    prob({
      key: 's2#3',
      num: 14,
      subject: '영어',
      unit: U2,
      subunit: S22,
      stem: [P('다음 글의 밑줄 친 부분 중, 어법상 <u>틀린</u> 것은?')],
      choices: ch(
        'The report, which was released last week, ① contain three errors.',
        'Neither of the proposals ② was accepted by the committee.',
        'She insisted that the deadline ③ be extended by a week.',
        'Having finished the draft, he ④ went straight to bed.',
        'The number of applicants ⑤ has doubled since March.'
      ),
      answer: { raw: '1', values: [1], multi: false },
      explanation: expl(['풀이', '주어 The report가 단수이므로 contain이 아니라 contains여야 한다.']),
    })
  );

  // ── 수학 (15~20): grid5 짧은 선지 + 수식
  const mathItems = [
    ['함수 $f(x)=x^3-3x^2+2$ 에 대하여 $f\'(1)$ 의 값은?', ['$-3$', '$-1$', '$0$', '$1$', '$3$'], 1],
    ['$\\lim_{x \\to 0} \\dfrac{\\sin 3x}{x}$ 의 값은?', ['$0$', '$1$', '$2$', '$3$', '$6$'], 4],
    ['곡선 $y=x^2$ 위의 점 $(1,\\,1)$ 에서의 접선의 기울기는?', ['$\\tfrac12$', '$1$', '$\\tfrac32$', '$2$', '$3$'], 4],
    ['$\\displaystyle\\int_0^1 (3x^2+1)\\,dx$ 의 값은?', ['$1$', '$\\tfrac32$', '$2$', '$\\tfrac52$', '$3$'], 3],
    ['등비수열 $\\{a_n\\}$ 에서 $a_1=2$, $r=3$ 일 때 $a_4$ 의 값은?', ['$18$', '$27$', '$54$', '$81$', '$162$'], 3],
    ['$f(x)=e^{2x}$ 일 때 $f\'\'(0)$ 의 값은?', ['$1$', '$2$', '$4$', '$6$', '$8$'], 3],
  ];
  mathItems.forEach((m, i) => {
    list.push(
      prob({
        key: `s3#${i}`,
        num: 15 + i,
        subject: '수학',
        unit: U3,
        subunit: S31,
        time: i === 0 ? '3분' : null,
        stem: [P(m[0])],
        choices: ch(...m[1]),
        choiceLayout: 'grid5',
        answer: { raw: String(m[2]), values: [m[2]], multi: false },
        explanation: expl(['풀이', `계산하면 답은 ${m[2]}번이다.`, '도함수의 정의를 그대로 적용하면 같은 결과를 얻는다.']),
      })
    );
  });

  // ── 화학 (21~24): 펜스 도형 · 표 · 보기 박스
  list.push(
    prob({
      key: 's4#0',
      num: 21,
      subject: '화학',
      unit: U3,
      subunit: S32,
      stem: [
        P('그림은 어떤 기체의 온도에 따른 압력 변화를 나타낸 것이다. 이에 대한 설명으로 옳은 것만을 <보기>에서 있는 대로 고른 것은?'),
        { type: 'figure', text: CHEM_FIG, lang: '', idx: 0 },
        {
          type: 'box',
          title: '보기',
          blocks: [{ type: 'list', marker: 'ㄱ', items: ['A에서 C로 갈수록 평균 운동 에너지가 커진다.', 'B에서 기체의 부피는 일정하다.', 'C에서의 압력은 A에서의 3배이다.'] }],
        },
      ],
      choices: ch('ㄱ', 'ㄷ', 'ㄱ, ㄴ', 'ㄴ, ㄷ', 'ㄱ, ㄴ, ㄷ'),
      choiceLayout: 'grid5',
      answer: { raw: '3', values: [3], multi: false },
      figures: [{ idx: 0, where: 'stem', text: CHEM_FIG, lang: '' }],
      explanation: expl(['풀이', '온도가 높을수록 평균 운동 에너지가 크므로 ㄱ은 옳다. 그래프의 기울기가 일정하므로 부피는 일정하다.', 'C의 압력은 3 atm, A는 1 atm이지만 절대 온도의 비를 함께 보아야 하므로 ㄷ은 옳지 않다.']),
    }),
    prob({
      key: 's4#1',
      num: 22,
      subject: '화학',
      unit: U3,
      subunit: S32,
      stem: [
        P('표는 세 가지 기체의 물리량을 나타낸 것이다. 이에 대한 설명으로 옳은 것은?'),
        {
          type: 'table',
          header: ['기체', '분자량', '부피(L)', '온도(K)', '압력(atm)'],
          rows: [
            ['(가)', '2', '1.0', '300', '1.0'],
            ['(나)', '32', '2.0', '300', '0.5'],
            ['(다)', '44', '1.0', '600', '2.0'],
            ['(라)', '28', '4.0', '300', '0.25'],
          ],
          align: ['center', 'center', 'center', 'center', 'center'],
        },
      ],
      choices: ch('(가)와 (나)의 몰수는 같다.', '(다)의 몰수가 가장 크다.', '(라)의 밀도가 가장 크다.', '(가)의 밀도가 가장 크다.', '네 기체의 몰수는 모두 같다.'),
      answer: { raw: '1, 5', values: [1, 5], multi: true },
      explanation: expl(['풀이', '$PV=nRT$ 에서 $n=PV/RT$ 이므로 네 경우 모두 $n$ 이 같다. 따라서 ①과 ⑤가 모두 성립한다.']),
    }),
    prob({
      key: 's4#2',
      num: 23,
      subject: '화학',
      unit: U3,
      subunit: S32,
      stem: [
        P('그림은 두 용기를 밸브로 연결한 장치를 나타낸 것이다. 밸브를 열었을 때에 대한 설명으로 옳은 것은?'),
        { type: 'figure', text: CHEM_DEVICE, lang: '', idx: 1 },
      ],
      choices: ch('전체 압력은 두 압력의 합과 같다.', '각 기체의 부분 압력은 감소한다.', '온도가 일정하면 전체 몰수는 변한다.', 'A의 부분 압력은 증가한다.', '평형에 도달하면 두 용기의 조성이 달라진다.'),
      answer: { raw: '2', values: [2], multi: false },
      figures: [{ idx: 1, where: 'stem', text: CHEM_DEVICE, lang: '' }],
      explanation: expl(['풀이', '부피가 3.0 L로 늘어나므로 각 기체의 부분 압력은 줄어든다.']),
    }),
    prob({
      key: 's4#3',
      num: 24,
      subject: '화학',
      unit: U3,
      subunit: S32,
      time: '4분',
      stem: [P('열역학 제2법칙에 대한 설명으로 옳지 <u>않은</u> 것은?')],
      choices: ch(
        '고립계의 엔트로피는 감소하지 않는다.',
        '$\\Delta G = \\Delta H - T\\Delta S$ 에서 $\\Delta G<0$ 이면 자발적이다.',
        '가역 과정에서 우주의 엔트로피 변화는 0이다.',
        '엔트로피는 상태 함수가 아니다.',
        '온도가 높을수록 같은 열량이 만드는 엔트로피 변화는 작다.'
      ),
      answer: { raw: '4', values: [4], multi: false },
      explanation: expl(
        ['풀이', '엔트로피는 경로가 아니라 상태에 의해 결정되는 상태 함수이므로 ④가 옳지 않다.'],
        ['팁', '$dS=\\delta q_{rev}/T$ 의 분모에 $T$ 가 있다는 사실만 기억해도 ⑤를 판정할 수 있다.']
      ),
    })
  );

  return list;
}

/* ───────────────────────── 2. 가짜 렌더러 ───────────────────────── */

/** 선지 배치를 정한다(override → settings → 길이 휴리스틱). */
export function choiceLayoutFor(problem, settings) {
  if (problem.choiceLayout && problem.choiceLayout !== 'auto') return problem.choiceLayout;
  if (settings && settings.choiceStyle && settings.choiceStyle !== 'auto') return settings.choiceStyle;
  const texts = (problem.choices || []).map((c) => c.text || '');
  const max = texts.reduce((n, t) => Math.max(n, t.length), 0);
  if (max === 0) return 'inline';
  if (max <= 8) return 'grid5';
  if (max <= 20) return 'grid2';
  return 'list';
}

/** Block 하나를 HTML로. */
function blockHtml(b, ctx, subject) {
  switch (b.type) {
    case 'p':
      return `<p>${inline(b.text, 'passage', subject)}</p>`;
    case 'table': {
      const head = b.header
        ? `<thead><tr>${b.header.map((c) => `<th class="ta-c">${inline(c, 'stem', subject)}</th>`).join('')}</tr></thead>`
        : '';
      const rows = b.rows
        .map((r) => `<tr>${r.map((c) => `<td class="ta-c">${inline(c, 'stem', subject)}</td>`).join('')}</tr>`)
        .join('');
      return `<table class="tbl">${head}<tbody>${rows}</tbody></table>`;
    }
    case 'box': {
      const inner = (b.blocks || []).map((x) => blockHtml(x, ctx, subject)).join('');
      const title = (b.title || '보기').split('').join(' ');
      return `<div class="box"><span class="box-title">&lt; ${esc(title)} &gt;</span><div class="box-body">${inner}</div></div>`;
    }
    case 'list': {
      const items = (b.items || [])
        .map((t, i) => {
          const marker = b.marker === 'ㄱ' ? 'ㄱㄴㄷㄹㅁ'[i] + '.' : b.marker;
          return `<li><span class="l-marker">${esc(marker)}</span><span>${inline(t, 'box', subject)}</span></li>`;
        })
        .join('');
      return `<ul class="lst">${items}</ul>`;
    }
    case 'inserted':
      return `<div class="inserted">${inline(b.text, 'stem', subject)}</div>`;
    case 'figure': {
      const conv = ctx.asciiToSvg ? ctx.asciiToSvg(b.text, {}) : { confidence: 0 };
      if (conv && conv.confidence >= 0.5) return `<figure class="fig svg" data-figure-idx="${b.idx}">${conv.svg}</figure>`;
      return `<figure class="fig ascii" data-figure-idx="${b.idx}"><pre>${esc(b.text)}</pre></figure>`;
    }
    case 'math':
      return `<div class="math" data-tex="${esc(b.tex)}" data-display="1">${esc(b.tex)}</div>`;
    case 'image':
      return `<div class="img-missing">[이미지: ${esc(b.name)}]</div>`;
    default:
      return `<p>${esc(b.text || '')}</p>`;
  }
}

/** 문제 시트용 원자. 순서: intro → 지문 → 번호+발문 → 자료 → 선지. */
export function renderProblem(problem, ctx) {
  const S = ctx.settings || {};
  const key = problem.key;
  const subject = problem.subject;
  const atoms = [];
  const own = problem.passage && !problem.passage.inherited;

  if (problem.intro && own) {
    let intro = problem.intro;
    if (S.examStyle && problem.groupRange) intro = `[${problem.groupRange.from}~${problem.groupRange.to}] ${intro}`;
    atoms.push({
      kind: 'intro',
      html: `<div class="q-intro${S.examStyle ? ' exam-range' : ''}" data-q="${key}">${inline(intro, 'stem', subject)}</div>`,
      splittable: false,
      keepWithNext: true,
      keepWithPrev: false,
    });
  }

  if (own) {
    const blocks = problem.passage.blocks;
    blocks.forEach((b, i) => {
      const inner = b.type === 'p' ? inline(b.text, 'passage', subject) : blockHtml(b, ctx, subject);
      const attrs = `${i === 0 ? ' data-first' : ''}${i === blocks.length - 1 ? ' data-last' : ''}${b.type === 'p' ? '' : ' class-extra'}`;
      const cls = 'passage-part' + (b.type === 'p' ? '' : ' no-indent');
      const html = `<div class="${cls}" data-q="${key}"${i === 0 ? ' data-first' : ''}${i === blocks.length - 1 ? ' data-last' : ''}>${inner}</div>`;
      const atom = { kind: 'passage', html, splittable: true, keepWithNext: false, keepWithPrev: false };
      if (b.type === 'p' && b.text.length > 220) {
        const parts = splitSentences(b.text).map((t) => inline(t, 'passage', subject));
        if (parts.length > 1) atom.splitParts = parts;
      }
      void attrs;
      atoms.push(atom);
    });
  }

  const stem = problem.stem || [];
  const firstIsP = stem[0] && stem[0].type === 'p';
  const numCls = S.numberStyle === 'boxed' ? ' num-boxed' : S.numberStyle === 'circled' ? ' num-circled' : '';
  const bits = [`<span class="q-num${numCls}">${esc(problem.num)}</span>`];
  if (S.showSrcNum && problem.srcNum) bits.push(`<span class="q-srcnum">(${esc(problem.srcNum)})</span>`);
  if (S.showTime && problem.time) bits.push(`<span class="q-time">${esc(problem.time)}</span>`);
  if (S.showRef && problem.ref && problem.ref.title) bits.push(`<span class="q-ref">${esc(problem.ref.title)}</span>`);
  if (firstIsP && stem[0].text) bits.push(`<span class="q-stem">${inline(stem[0].text, 'stem', subject)}</span>`);
  atoms.push({
    kind: 'head',
    html: `<div class="q-head" data-q="${key}">${bits.join('')}</div>`,
    splittable: false,
    keepWithNext: (S.keep && S.keep.headWithStem) !== false,
    keepWithPrev: false,
  });

  stem.slice(firstIsP ? 1 : 0).forEach((b) => {
    atoms.push({
      kind: 'material',
      html: `<div class="stem" data-q="${key}">${blockHtml(b, ctx, subject)}</div>`,
      splittable: b.type === 'table',
      keepWithNext: false,
      keepWithPrev: true,
    });
  });

  if (problem.choices && problem.choices.length) {
    const layout = choiceLayoutFor(problem, S);
    const lis = problem.choices
      .map(
        (c) =>
          `<li><span class="c-label">${esc(c.label)}</span><span class="c-text">${inline(c.text, 'choices', subject)}</span></li>`
      )
      .join('');
    atoms.push({
      kind: 'choices',
      html: `<ol class="choices layout-${layout}" data-q="${key}">${lis}</ol>`,
      splittable: layout === 'list' || layout === 'grid2',
      splitParts: layout === 'list' || layout === 'grid2' ? problem.choices.map((c) => `<li><span class="c-label">${esc(c.label)}</span><span class="c-text">${inline(c.text, 'choices', subject)}</span></li>`) : undefined,
      keepWithNext: false,
      keepWithPrev: true,
    });
  }

  return { atoms };
}

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

/** 정답 값을 표시 문자열로. */
function ansText(answer) {
  if (!answer) return null;
  if (answer.values && answer.values.length) {
    return answer.values.map((v) => (v >= 1 && v <= 10 ? CIRCLED[v - 1] : String(v))).join(', ');
  }
  return answer.raw || null;
}

/** 해설 시트용 원자. */
export function renderExplanation(problem, ctx) {
  const key = problem.key;
  const subject = problem.subject;
  const atoms = [];
  const a = ansText(problem.answer);
  atoms.push({
    kind: 'expl-head',
    html:
      `<div class="expl expl-head" data-q="${key}"><span class="q-num">${esc(problem.num)}</span>` +
      (a ? `<span class="ans">${esc(a)}</span>` : '<span class="ans">—</span>') +
      (problem.ref && problem.ref.title ? `<span class="q-ref">${esc(problem.ref.title)}</span>` : '') +
      '</div>',
    splittable: false,
    keepWithNext: true,
    keepWithPrev: false,
  });
  for (const sec of (problem.explanation && problem.explanation.sections) || []) {
    const name = ctx && ctx.renamePassage !== false && sec.name === '지문' ? '지문 요약' : sec.name;
    const parts = (sec.blocks || []).map((b) => blockHtml(b, ctx || {}, subject));
    atoms.push({
      kind: 'expl',
      html: `<div class="expl expl-sec" data-q="${key}">${name ? `<span class="expl-name">${esc(name)}</span>` : ''}${parts.join('')}</div>`,
      splittable: parts.length > 1,
      splitParts: parts.length > 1 ? [name ? `<span class="expl-name">${esc(name)}</span>` : '', ...parts].filter(Boolean) : undefined,
      keepWithNext: false,
      keepWithPrev: true,
    });
  }
  return { atoms };
}

/** 빠른 정답 표(번호 행 + 정답 행을 한 tbody로 묶어 분할 시 짝이 깨지지 않게 한다). */
export function renderAnswerTable(problems, opts = {}) {
  const perRow = opts.perRow || 10;
  const groups = [];
  for (let i = 0; i < problems.length; i += perRow) groups.push(problems.slice(i, i + perRow));
  const bodies = groups
    .map((row) => {
      const pad = perRow - row.length;
      const nums = row.map((p) => `<td class="ans-num">${esc(p.num)}</td>`).join('') + '<td class="ans-num"></td>'.repeat(pad);
      const vals =
        row
          .map((p) => {
            const t = ansText(p.answer);
            return `<td class="${t ? 'ans-val' : 'ans-val missing'}">${esc(t || '—')}</td>`;
          })
          .join('') + '<td class="ans-val"></td>'.repeat(pad);
      return `<tbody><tr>${nums}</tr><tr>${vals}</tr></tbody>`;
    })
    .join('');
  return `<table class="ans-table">${bodies}</table>`;
}

/** 대단원·소단원으로 묶는다(등장 순서 유지, units.order/suborder 반영). */
export function groupByUnits(problems, unitsCfg = {}) {
  const order = unitsCfg.order || [];
  const suborder = unitsCfg.suborder || {};
  const map = new Map();
  for (const p of problems) {
    const u = p.unit || '';
    if (!map.has(u)) map.set(u, new Map());
    const sm = map.get(u);
    const s = p.subunit || '';
    if (!sm.has(s)) sm.set(s, []);
    sm.get(s).push(p);
  }
  const units = [...map.keys()].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return units.map((u) => {
    const sm = map.get(u);
    const so = suborder[u] || [];
    const subs = [...sm.keys()].sort((a, b) => {
      const ia = so.indexOf(a);
      const ib = so.indexOf(b);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return { unit: u, subunits: subs.map((s) => ({ subunit: s, problems: sm.get(s) })) };
  });
}

/** ascii2svg 스텁: 신뢰도 0을 돌려주어 layout이 <pre> 경로를 타게 한다. */
export function asciiToSvg() {
  return { svg: '', width: 0, height: 0, confidence: 0, kind: 'unknown', warnings: [] };
}

/* ───────────────────────── 3. doc / project ───────────────────────── */

/** layout.js가 기대하는 doc 객체(renderers 포함). */
export function makeDoc() {
  const problems = makeProblems();
  return {
    problems,
    sources: [
      { id: 's1', name: 'kor_set.md', header: null, count: 10, warnings: [] },
      { id: 's2', name: 'eng_batch.md', header: null, count: 4, warnings: [] },
      { id: 's3', name: 'math_batch.md', header: null, count: 6, warnings: [] },
      { id: 's4', name: 'chem_batch9.md', header: null, count: 4, warnings: [] },
    ],
    warnings: [],
    renderers: { renderProblem, renderExplanation, renderAnswerTable, groupByUnits, asciiToSvg },
  };
}

/** 대단원 3 · 소단원 6 · 시트 전부 on · 차례 front+perUnit인 Project. */
export function makeProject(patch = {}) {
  const base = {
    version: 1,
    title: '2026 통합 실전 문제집',
    subtitle: '조판 엔진 검증용 데모',
    meta: { subject: '국어', grade: '고3', institute: '조판연구소', date: '2026-09-10', round: '3', period: '1' },
    sources: [],
    profiles: [],
    rules: [],
    layout: {
      page: 'A4',
      orientation: 'portrait',
      margin: { top: 18, right: 14, bottom: 16, left: 14 },
      grid: { cols: 2, rows: 1 },
      gutter: 8,
      rowGap: 6,
      columnRule: true,
      rowRule: false,
      fillOrder: 'auto',
      font: { family: "'Noto Serif KR', 'Apple SD Gothic Neo', 'Malgun Gothic', serif", size: 10, lineHeight: 1.55, mathScale: 1 },
      header: { left: '{title}', center: '', right: '{unit}' },
      footer: { left: '', center: '{page} / {pages}', right: '' },
      examStyle: false,
      problemGap: 5,
      numberStyle: 'plain',
      showTime: true,
      showRef: false,
      showSrcNum: false,
      passageStyle: 'boxed',
      choiceStyle: 'auto',
      keep: { headWithStem: true, stemWithFirstChoice: true, choicesTogether: true, allowPassageSplit: true, allowTableSplit: true },
      figure: { mode: 'svg', maxWidth: 100 },
      unitBand: { enabled: true, style: 'band' },
      subunitBand: { enabled: true },
    },
    numbering: { mode: 'sequential', start: 1, pad: 0 },
    units: {
      source: 'manual',
      order: [U1, U2, U3],
      suborder: { [U1]: [S11, S12], [U2]: [S21, S22], [U3]: [S31, S32] },
      map: {},
    },
    sheets: {
      cover: { enabled: true, lines: ['조판 엔진 검증용 · 24문항', '국어 10 · 영어 4 · 수학 6 · 화학 4'] },
      problems: true,
      answers: { enabled: true, perRow: 10, title: '빠른 정답' },
      explanations: { enabled: true, grid: { cols: 2, rows: 1 }, title: '정답과 해설', renamePassage: true },
      toc: { enabled: true, front: true, perUnit: true, pageNumbers: true, title: '차례' },
    },
    images: [],
    imagePlacements: [],
    overrides: {},
  };
  const out = JSON.parse(JSON.stringify(base));
  const merge = (a, b) => {
    for (const k of Object.keys(b || {})) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  };
  return merge(out, patch);
}

export const UNITS = { U1, U2, U3, S11, S12, S21, S22, S31, S32 };
