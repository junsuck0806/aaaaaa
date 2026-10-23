// 모바일 메뉴
const menuBtn = document.getElementById('menu-btn');
const nav = document.getElementById('nav');
menuBtn.addEventListener('click', () => nav.classList.toggle('open'));
nav.querySelectorAll('a').forEach(link =>
  link.addEventListener('click', () => nav.classList.remove('open'))
);

// 생존 가이드 탭
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// 직업 검색
const searchInput = document.getElementById('job-search');
const jobCards = document.querySelectorAll('.job-card');
const emptyMsg = document.getElementById('job-empty');
searchInput.addEventListener('input', () => {
  const keyword = searchInput.value.trim().toLowerCase();
  let shown = 0;
  jobCards.forEach(card => {
    const match = card.textContent.toLowerCase().includes(keyword);
    card.hidden = !match;
    if (match) shown++;
  });
  emptyMsg.hidden = shown !== 0;
});

// 체크리스트 (브라우저에 저장)
const STORAGE_KEY = 'zomboid-checklist';
const boxes = document.querySelectorAll('#checklist input[type="checkbox"]');
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
} catch (e) {
  saved = {};
}
boxes.forEach(box => {
  box.checked = !!saved[box.id];
  box.addEventListener('change', () => {
    saved[box.id] = box.checked;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch (e) {}
  });
});
document.getElementById('reset-check').addEventListener('click', () => {
  saved = {};
  boxes.forEach(box => (box.checked = false));
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
});

// 맨 위로 버튼
const toTop = document.getElementById('to-top');
window.addEventListener('scroll', () => {
  toTop.classList.toggle('show', window.scrollY > 400);
});
toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// 푸터 연도
document.getElementById('year').textContent = new Date().getFullYear();
