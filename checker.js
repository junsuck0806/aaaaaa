// ===== 설정 =====
// 브라우저에서 스팀 페이지를 직접 읽을 수 없어서 중계 서버(프록시)를 순서대로 시도합니다.
const PROXIES = [
  (u) => 'https://corsproxy.io/?url=' + encodeURIComponent(u),
  (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
];
const FETCH_TIMEOUT = 12000;
const RISK_LABEL = { high: '높음', mid: '보통', low: '낮음' };
const RISK_ORDER = { high: 0, mid: 1, low: 2 };

const SAMPLE = [
  'Example Map Rosewood Expansion',
  'Another Map Mod',
  'Better Vehicle Handling',
  'More Cars Pack',
  'Weapons Overhaul',
  'Custom UI Inventory Redesign',
  'Zombie Spawn Tweaks',
  'Better Cooking Recipes',
  'Korean Translation Fix',
  'Big Backpacks | BigBags',
  'Huge Bags | BigBags',
].join('\n');

// ===== 요소 =====
const urlInput = document.getElementById('collection-url');
const loadBtn = document.getElementById('load-btn');
const analyzeBtn = document.getElementById('analyze-btn');
const sampleBtn = document.getElementById('sample-btn');
const modText = document.getElementById('mod-text');
const statusEl = document.getElementById('status');
const fallbackBox = document.getElementById('fallback');
const resultSection = document.getElementById('result');
const resultBody = document.getElementById('result-body');

// ===== 도우미 =====
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
const fmt = (x) => x.toLocaleString('ko-KR');
const label = (m) => m.title || (m.id ? '#' + m.id : '(이름 없음)');

function setStatus(msg, type) {
  statusEl.hidden = !msg;
  statusEl.textContent = msg || '';
  statusEl.className = 'status ' + (type || '');
}

function extractId(text) {
  const s = String(text);
  const m = s.match(/[?&]id=(\d+)/) || s.match(/^\s*(\d{6,})\s*$/);
  return m ? m[1] : null;
}

// n개 중 k개를 고르는 경우의 수
function combos(n, k) {
  if (n < k) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

function groupBy(arr, keyFn) {
  const map = new Map();
  arr.forEach((x) => {
    const k = keyFn(x);
    if (!k) return;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(x);
  });
  return [...map.values()].filter((g) => g.length > 1);
}

// ===== 제목 → 종류 판별 =====
function buildMatcher(words) {
  const isLatin = (w) => /[a-z]/i.test(w);
  const latin = words
    .filter(isLatin)
    .map((w) => w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const other = words.filter((w) => !isLatin(w));
  const re = latin.length ? new RegExp('\\b(?:' + latin.join('|') + ')\\b', 'i') : null;
  return (title) => (re && re.test(title)) || other.some((w) => title.includes(w));
}
const MATCHERS = CATEGORIES.map((c) => buildMatcher(c.words));

// ===== 모음집 불러오기 =====
async function fetchText(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchViaProxy(target) {
  for (const make of PROXIES) {
    try {
      const text = await fetchText(make(target));
      if (text && text.length > 500) return text;
    } catch (e) {
      // 다음 프록시로 넘어갑니다
    }
  }
  throw new Error('proxy failed');
}

function parseCollectionHtml(html, collectionId) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const og = doc.querySelector('meta[property="og:url"]');
  const selfId = collectionId || (og ? extractId(og.getAttribute('content')) : null);
  const found = [];
  const seen = new Set();

  doc.querySelectorAll('.collectionItem').forEach((node) => {
    const a = node.querySelector('a[href*="filedetails"]');
    const id = a ? extractId(a.getAttribute('href')) : null;
    if (!id || id === selfId || seen.has(id)) return;
    const titleNode = node.querySelector('.workshopItemTitle');
    seen.add(id);
    found.push({ id, title: titleNode ? titleNode.textContent.trim() : '', modId: '' });
  });

  // 구조가 달라서 못 찾았을 때의 예비 방법 (관련 없는 링크가 섞일 수 있음)
  if (found.length === 0) {
    const re = /sharedfiles\/filedetails\/\?id=(\d+)/g;
    let m;
    while ((m = re.exec(html))) {
      if (m[1] !== selfId && !seen.has(m[1])) {
        seen.add(m[1]);
        found.push({ id: m[1], title: '', modId: '' });
      }
    }
  }
  return found;
}

// ===== 직접 입력 파싱 =====
function parseLines(text) {
  const out = [];
  text.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const parts = line.split('|').map((s) => s.trim()).filter(Boolean);
    let id = '', title = '', modId = '';
    parts.forEach((p) => {
      const pid = extractId(p);
      if (pid && !id) id = pid;
      else if (!title) title = p;
      else if (!modId) modId = p;
    });
    if (id || title) out.push({ id, title, modId });
  });
  return out;
}

function looksLikeHtml(text) {
  return /<(div|a|html|body)\b/i.test(text) && /sharedfiles\/filedetails/i.test(text);
}

function toText(mods) {
  return mods
    .map((m) => [m.id, m.title.replace(/\|/g, '/'), m.modId].filter(Boolean).join(' | '))
    .join('\n');
}

// ===== 분석 =====
function normTitle(t) {
  return t.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '');
}

function matchRule(m, key) {
  if (!key) return false;
  const k = String(key).toLowerCase();
  return (
    m.id === String(key) ||
    (m.modId && m.modId.toLowerCase() === k) ||
    (m.title && m.title.toLowerCase().includes(k))
  );
}

function analyze(mods) {
  const n = mods.length;
  const pairs = combos(n, 2);
  const triples = combos(n, 3);

  // 종류별 묶기
  const categorized = new Set();
  const flagged = new Set();
  const cats = [];
  CATEGORIES.forEach((cat, ci) => {
    const members = [];
    mods.forEach((m, i) => {
      if (m.title && MATCHERS[ci](m.title)) {
        members.push({ m, i });
        categorized.add(i);
      }
    });
    if (members.length >= 2) {
      cats.push({ cat, members });
      for (let a = 0; a < members.length; a++) {
        for (let b = a + 1; b < members.length; b++) {
          flagged.add(members[a].i + '-' + members[b].i);
        }
      }
    }
  });
  cats.sort(
    (x, y) =>
      RISK_ORDER[x.cat.risk] - RISK_ORDER[y.cat.risk] ||
      y.members.length - x.members.length
  );

  // 중복 검사
  const dupIds = groupBy(mods, (m) => m.id);
  const dupModIds = groupBy(mods, (m) => (m.modId ? m.modId.toLowerCase() : ''));
  const dupTitles = groupBy(mods, (m) => (m.title ? normTitle(m.title) : '')).filter(
    (g) => !(g[0].id && g.every((m) => m.id === g[0].id))
  );

  // 직접 등록한 충돌 규칙
  const known = [];
  KNOWN_CONFLICTS.forEach((rule) => {
    const as = mods.filter((m) => matchRule(m, rule.a));
    const bs = mods.filter((m) => matchRule(m, rule.b));
    as.forEach((a) => bs.forEach((b) => {
      if (a !== b) known.push({ a, b, reason: rule.reason });
    }));
  });

  return {
    n, pairs, triples,
    flaggedCount: flagged.size,
    cats,
    uncat: n - categorized.size,
    dupIds, dupModIds, dupTitles, known,
  };
}

// ===== 화면 그리기 =====
function statCard(title, value, sub) {
  const card = el('article', 'card');
  card.append(el('h3', '', title), el('p', 'stat-value', value), el('p', 'stat-sub', sub));
  return card;
}

function render(mods, r) {
  resultBody.innerHTML = '';

  // 숫자 요약
  const grid1 = el('div', 'grid grid-3');
  grid1.append(
    statCard('분석한 모드', fmt(r.n) + '개', '목록에 들어 있는 모드 수'),
    statCard('2개씩 겹치는 경우의 수', fmt(r.pairs) + '가지', 'n × (n−1) ÷ 2'),
    statCard('3개씩 겹치는 경우의 수', fmt(r.triples) + '가지', 'n × (n−1) × (n−2) ÷ 6')
  );
  resultBody.append(grid1);

  const pct = r.pairs ? ((r.flaggedCount / r.pairs) * 100).toFixed(1) : '0.0';
  const grid2 = el('div', 'grid grid-2 result-block');
  grid2.append(
    statCard('주의가 필요한 쌍', fmt(r.flaggedCount) + '쌍', `전체 ${fmt(r.pairs)}쌍 중 ${pct}% (같은 종류로 묶이는 쌍)`),
    statCard('등록한 충돌 규칙에 걸린 쌍', fmt(r.known.length) + '건', 'rules.js의 KNOWN_CONFLICTS 기준')
  );
  resultBody.append(grid2);

  // 먼저 확인할 점
  const findBlock = el('div', 'result-block');
  findBlock.append(el('h3', 'result-title', '먼저 확인할 점'));
  const list = el('ul', 'finding-list');

  r.dupIds.forEach((g) =>
    list.append(el('li', '', `같은 워크샵 ID가 ${g.length}번 들어 있습니다: ${label(g[0])}`)));
  r.dupModIds.forEach((g) =>
    list.append(el('li', '', `같은 Mod ID(${g[0].modId})를 쓰는 모드가 ${g.length}개입니다. 충돌 가능성이 높습니다: ${g.map(label).join(', ')}`)));
  r.dupTitles.forEach((g) =>
    list.append(el('li', '', `제목이 거의 같은 모드가 ${g.length}개입니다. 중복 설치일 수 있습니다: ${g.map(label).join(', ')}`)));
  r.known.forEach((k) =>
    list.append(el('li', '', `${label(k.a)} ↔ ${label(k.b)}: ${k.reason || '등록된 충돌'}`)));

  if (list.children.length === 0) {
    list.append(el('li', 'info', '자동으로 찾은 명백한 문제는 없습니다. 다만 이것이 충돌이 없다는 뜻은 아닙니다.'));
  }
  if (mods.every((m) => !m.modId)) {
    list.append(el('li', 'info', 'Mod ID가 입력되지 않아 Mod ID 중복 검사는 하지 못했습니다. "워크샵ID | 제목 | ModID" 형식으로 적으면 검사됩니다.'));
  }
  findBlock.append(list);
  resultBody.append(findBlock);

  // 종류별 겹침
  const catBlock = el('div', 'result-block');
  catBlock.append(el('h3', 'result-title', '종류별로 겹칠 수 있는 모드'));
  if (r.cats.length === 0) {
    catBlock.append(el('p', 'section-desc', '같은 종류로 묶이는 모드가 2개 이상인 경우가 없습니다.'));
  } else {
    const catGrid = el('div', 'grid grid-2');
    r.cats.forEach(({ cat, members }) => {
      const card = el('article', 'card cat-card');
      const h = el('h3', '', cat.label);
      h.append(el('span', 'badge ' + cat.risk, '주의 ' + RISK_LABEL[cat.risk]));
      card.append(h);
      card.append(el('p', '', `모드 ${fmt(members.length)}개 · 겹칠 수 있는 쌍 ${fmt(combos(members.length, 2))}개`));
      card.append(el('p', '', cat.note));

      const det = el('details');
      det.append(el('summary', '', '해당 모드 보기'));
      const ul = el('ul', 'member-list');
      members.forEach(({ m }) => ul.append(el('li', '', label(m))));
      det.append(ul);
      card.append(det);
      catGrid.append(card);
    });
    catBlock.append(catGrid);
  }
  if (r.uncat > 0) {
    catBlock.append(el('p', 'section-desc result-block', `제목만으로 종류를 알 수 없는 모드가 ${fmt(r.uncat)}개 있습니다. 이 모드들은 위 "주의가 필요한 쌍" 계산에서 빠졌습니다.`));
  }
  resultBody.append(catBlock);

  resultBody.append(
    el('p', 'disclaimer', '이 결과는 제목 키워드와 ID 중복을 바탕으로 한 "가능성" 계산입니다. 실제 충돌은 모드가 같은 파일이나 함수를 건드리는지에 따라 달라지므로 게임 안에서 오류 로그로 확인해야 합니다.')
  );
}

// ===== 실행 =====
function runAnalysis() {
  const text = modText.value;
  const fromHtml = looksLikeHtml(text);
  const mods = fromHtml ? parseCollectionHtml(text, null) : parseLines(text);

  if (mods.length === 0) {
    setStatus('분석할 모드가 없습니다. 목록을 확인해 주세요.', 'error');
    resultSection.hidden = true;
    return;
  }
  if (fromHtml) {
    modText.value = toText(mods); // 붙여넣은 소스를 깔끔한 목록으로 바꿔 줍니다
    setStatus(`페이지 소스에서 모드 ${mods.length}개를 찾았습니다.`, 'ok');
  } else {
    setStatus('', '');
  }
  render(mods, analyze(mods));
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: 'smooth' });
}

async function loadCollection() {
  const id = extractId(urlInput.value);
  if (!id) {
    setStatus('모음집 주소(또는 숫자 ID)를 확인해 주세요.', 'error');
    return;
  }
  loadBtn.disabled = true;
  setStatus('모음집을 불러오는 중입니다...', 'info');
  try {
    const html = await fetchViaProxy('https://steamcommunity.com/sharedfiles/filedetails/?id=' + id);
    const mods = parseCollectionHtml(html, id);
    if (mods.length === 0) throw new Error('empty');
    modText.value = toText(mods);
    runAnalysis();
    setStatus(`모드 ${mods.length}개를 불러왔습니다.`, 'ok');
  } catch (e) {
    setStatus('자동으로 불러오지 못했습니다. 아래 "자동 불러오기가 안 될 때" 방법으로 진행해 주세요.', 'error');
    fallbackBox.open = true;
  } finally {
    loadBtn.disabled = false;
  }
}

loadBtn.addEventListener('click', loadCollection);
urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadCollection(); });
analyzeBtn.addEventListener('click', runAnalysis);
sampleBtn.addEventListener('click', () => {
  modText.value = SAMPLE;
  runAnalysis();
});
