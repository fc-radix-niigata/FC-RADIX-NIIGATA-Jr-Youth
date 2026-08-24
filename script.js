// ===== HERO SLIDER =====
const slides = document.querySelectorAll('.hero-slide');
const dots   = document.querySelectorAll('.hero-dot');
let current = 0;
let sliderTimer;

function goToSlide(index) {
  slides[current].classList.remove('active');
  dots[current].classList.remove('active');
  current = index;
  slides[current].classList.add('active');
  dots[current].classList.add('active');
}
function nextSlide() { goToSlide((current + 1) % slides.length); }
function startSlider() { sliderTimer = setInterval(nextSlide, 5000); }

if (slides.length) {
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      clearInterval(sliderTimer);
      goToSlide(Number(dot.dataset.index));
      startSlider();
    });
  });
  startSlider();
}

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const mainNav   = document.getElementById('mainNav');

hamburger.addEventListener('click', () => {
  mainNav.classList.toggle('open');
  hamburger.classList.toggle('active');
});
mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    hamburger.classList.remove('active');
  });
});

// ===== BACK TO TOP =====
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  backToTop.classList.toggle('visible', window.scrollY > 400);
});

// ===== HEADER SHRINK ON SCROLL =====
const siteHeader = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  siteHeader.style.background = window.scrollY > 10
    ? 'rgba(13,27,42,0.98)'
    : 'rgba(13,27,42,0.95)';
});

// ===== MATCH RESULT TABS =====
const tabs   = document.querySelectorAll('.match-tab');
const groups = document.querySelectorAll('.match-group');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const team = tab.dataset.team;
    tabs.forEach(t => t.classList.remove('active'));
    groups.forEach(g => g.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`.match-group[data-team="${team}"]`).classList.add('active');
  });
});

// ===== SCROLL REVEAL =====
const observer = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      obs.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.news-card, .class-card, .staff-card, .match-item, .trial-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

// ===== SCHEDULE CALENDAR（sgrum同期） =====
const MONTHS_JA = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

let calYear, calMonth;
let scheduleData = {}; // Netlify Function または schedule-data.js から取得

function renderCalendar(year, month) {
  const body  = document.getElementById('calBody');
  const label = document.getElementById('calMonthLabel');
  const loading = document.getElementById('calLoading');
  if (!body || !label) return;

  label.textContent = `${year}年 ${MONTHS_JA[month - 1]}`;

  const today    = new Date();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();
  const prevLast = new Date(year, month - 1, 0).getDate();

  let html = '';
  let day  = 1 - firstDay;

  for (let row = 0; row < 6; row++) {
    if (day > lastDate) break;
    html += '<tr>';
    for (let col = 0; col < 7; col++, day++) {
      let displayDay, dateKey, isOther = false;
      const isSun = col === 0, isSat = col === 6;

      if (day < 1) {
        displayDay = prevLast + day; isOther = true;
        const pm = month === 1 ? 12 : month - 1;
        const py = month === 1 ? year - 1 : year;
        dateKey = `${py}${String(pm).padStart(2,'0')}${String(displayDay).padStart(2,'0')}`;
      } else if (day > lastDate) {
        displayDay = day - lastDate; isOther = true;
        const nm = month === 12 ? 1 : month + 1;
        const ny = month === 12 ? year + 1 : year;
        dateKey = `${ny}${String(nm).padStart(2,'0')}${String(displayDay).padStart(2,'0')}`;
      } else {
        displayDay = day;
        dateKey = `${year}${String(month).padStart(2,'0')}${String(day).padStart(2,'0')}`;
      }

      const isToday = !isOther
        && day === today.getDate()
        && month === today.getMonth() + 1
        && year === today.getFullYear();

      const tdClass = [isOther?'other':'', isSun?'sun':'', isSat?'sat':''].filter(Boolean).join(' ');
      const numSpan = `<span class="cal-day-num${isToday?' today':''}">${displayDay}</span>`;
      const evtHtml = (scheduleData[dateKey] || [])
        .map(e => `<span class="cal-event ${e.cls}" title="${e.label} ${e.time}">${e.label}<span class="cal-event-time"> ${e.time}</span></span>`)
        .join('');

      html += `<td class="${tdClass}">${numSpan}${evtHtml}</td>`;
    }
    html += '</tr>';
  }

  body.innerHTML = html;
  if (loading) loading.style.display = 'none';
}

async function loadSchedule() {
  const loading = document.getElementById('calLoading');
  if (loading && !Object.keys(scheduleData).length) loading.style.display = 'block';

  const bust = Date.now();

  // ① Netlify Function 経由でsgrumから最新データを取得（公開環境）
  try {
    const res = await fetch(`/api/schedule?t=${bust}`, { cache: 'no-store' });
    if (res.ok) {
      scheduleData = await res.json();
      renderCalendar(calYear, calMonth);
      return;
    }
  } catch (e) { /* 次の手段へ */ }

  // ② 自動更新された schedule.json を取得（GitHub Pages等・キャッシュ回避）
  try {
    const res = await fetch(`schedule.json?t=${bust}`, { cache: 'no-store' });
    if (res.ok) {
      scheduleData = await res.json();
      renderCalendar(calYear, calMonth);
      return;
    }
  } catch (e) { /* 次の手段へ */ }

  // ③ フォールバック: schedule-data.js の静的データ
  if (typeof SCHEDULE_DATA !== 'undefined') {
    scheduleData = SCHEDULE_DATA;
  }
  renderCalendar(calYear, calMonth);
}

function initCalendar() {
  if (!document.getElementById('calBody')) return;
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth() + 1;
  loadSchedule();
}

document.getElementById('calPrev')?.addEventListener('click', () => {
  calMonth--;
  if (calMonth < 1) { calMonth = 12; calYear--; }
  renderCalendar(calYear, calMonth);
});
document.getElementById('calNext')?.addEventListener('click', () => {
  calMonth++;
  if (calMonth > 12) { calMonth = 1; calYear++; }
  renderCalendar(calYear, calMonth);
});

initCalendar();

// 更新が多いため、タブに戻ったときと10分ごとに再取得する
if (document.getElementById('calBody')) {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadSchedule();
  });
  setInterval(loadSchedule, 10 * 60 * 1000);
}

// ===== 練習体験会：終了日程／キャンセル待ちの自動表示 =====
(function () {
  const cards = document.querySelectorAll('.trial-card[data-date]');
  if (!cards.length) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  cards.forEach(card => {
    const d = new Date(card.dataset.date + 'T00:00:00');
    const cap = card.querySelector('.trial-cap');

    if (d < today) {
      // 開催済み
      card.classList.add('is-past');
      if (cap) cap.textContent = '終了しました';
    } else if (card.dataset.status === 'waitlist') {
      // 満席・キャンセル待ち
      card.classList.add('is-waitlist');
      if (cap) cap.textContent = 'キャンセル待ち';
    }
  });
})();
