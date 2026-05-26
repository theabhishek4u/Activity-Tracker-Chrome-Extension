// LifeTracker 30 — Dashboard Script

let allDays = [];
let selectedDate = null;
const tooltip = document.getElementById('tooltip');

// ─── Utilities ──────────────────────────────────────────────────────────────

function formatTime(seconds) {
  if (!seconds || seconds < 60) return `${seconds || 0}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function todayKey() { return new Date().toISOString().slice(0, 10); }

function formatDate(dateKey) {
  const d = new Date(dateKey + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime12(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getFavicon(domain) {
  return `https://www.google.com/s2/favicons?sz=16&domain=${domain}`;
}

async function getData(key) {
  return new Promise(r => chrome.storage.local.get(key, res => r(res[key] || null)));
}

async function getDay(dateKey) {
  const d = await getData(`day_${dateKey}`);
  return d || { date: dateKey, visits: [], searches: [], tabsOpened: 0, tabsClosed: 0, downloadsStarted: 0, totalActiveTime: 0, pageInteractions: 0, hourlyActivity: new Array(24).fill(0), topDomains: {} };
}

async function loadAllDays() {
  const list = await getData('days_list') || [];
  const days = [];
  for (const d of list) days.push(await getDay(d));
  return days;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    document.getElementById(`page-${item.dataset.page}`).classList.add('active');
    renderPage(item.dataset.page);
  });
});

// ─── Day Picker ──────────────────────────────────────────────────────────────

function renderDayList() {
  const list = document.getElementById('dayList');
  const days = [...allDays].reverse();
  list.innerHTML = '';
  if (days.length === 0) {
    list.innerHTML = `<div style="font-family:'Space Mono',monospace;font-size:10px;color:var(--muted);padding:6px">No data yet</div>`;
    return;
  }
  days.forEach(day => {
    const btn = document.createElement('button');
    btn.className = `day-btn${day.date === selectedDate ? ' active' : ''}`;
    const hasActivity = day.visits && day.visits.length > 0;
    btn.innerHTML = `
      <span>${day.date === todayKey() ? 'Today' : formatDate(day.date).replace(/^\w+,\s*/, '')}</span>
      ${hasActivity ? '<div class="day-activity-dot"></div>' : ''}
    `;
    btn.addEventListener('click', () => {
      selectedDate = day.date;
      renderDayList();
      const activePage = document.querySelector('.nav-item.active')?.dataset.page || 'overview';
      renderPage(activePage);
    });
    list.appendChild(btn);
  });
}

// ─── Render Pages ─────────────────────────────────────────────────────────────

function renderPage(page) {
  const day = allDays.find(d => d.date === selectedDate) || { date: selectedDate, visits: [], searches: [], tabsOpened: 0, tabsClosed: 0, downloadsStarted: 0, totalActiveTime: 0, pageInteractions: 0, hourlyActivity: new Array(24).fill(0), topDomains: {} };

  if (page === 'overview') renderOverview(day);
  if (page === 'sites') renderSites(day);
  if (page === 'timeline') renderTimeline(day);
  if (page === 'searches') renderSearches(day);
  if (page === 'heatmap') renderHeatmap();
  if (page === 'export') {}
}

function renderOverview(day) {
  document.getElementById('overview-sub').textContent = day.date === todayKey()
    ? `Today — ${formatDate(day.date)}`
    : formatDate(day.date);

  const totalVisits = day.visits?.length || 0;
  const uniqueDomains = Object.keys(day.topDomains || {}).length;

  document.getElementById('cards-row').innerHTML = `
    <div class="card"><div class="card-accent"></div>
      <div class="card-val" style="color:var(--accent);font-size:26px">${formatTime(day.totalActiveTime)}</div>
      <div class="card-label">Active Time</div><div class="card-sub">browsing today</div></div>
    <div class="card c2"><div class="card-accent"></div>
      <div class="card-val">${totalVisits}</div>
      <div class="card-label">Page Visits</div><div class="card-sub">${uniqueDomains} unique sites</div></div>
    <div class="card c3"><div class="card-accent"></div>
      <div class="card-val">${day.tabsOpened || 0}</div>
      <div class="card-label">Tabs Opened</div><div class="card-sub">${day.tabsClosed || 0} closed</div></div>
    <div class="card c4"><div class="card-accent"></div>
      <div class="card-val">${(day.searches || []).length}</div>
      <div class="card-label">Searches</div><div class="card-sub">${day.downloadsStarted || 0} downloads</div></div>
  `;

  // Hourly bars
  const hourly = day.hourlyActivity || new Array(24).fill(0);
  const currentHour = new Date().getHours();
  const maxH = Math.max(...hourly, 1);
  const labels = ['12a','','','','4a','','','','8a','','','','12p','','','','4p','','','','8p','','',''];

  const peakHour = hourly.indexOf(Math.max(...hourly));
  const peakVal = hourly[peakHour];
  document.getElementById('peak-hour-badge').textContent = peakVal > 0
    ? `Peak: ${peakHour}:00 (${formatTime(peakVal)})` : 'No data';

  document.getElementById('hourly-bars').innerHTML = hourly.map((v, h) => {
    const ht = Math.max(Math.round((v / maxH) * 72), v > 0 ? 2 : 0);
    return `<div class="h-bar-col">
      <div class="h-bar${h === currentHour ? ' now' : ''}" style="height:${ht}px"
        data-tip="${h}:00 — ${formatTime(v)}"></div>
    </div>`;
  }).join('');

  document.getElementById('hourly-labels').innerHTML = hourly.map((_, h) =>
    `<div class="h-label">${labels[h] || ''}</div>`).join('');

  // Tooltips on bars
  document.querySelectorAll('[data-tip]').forEach(el => {
    el.addEventListener('mousemove', e => {
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 10) + 'px';
      tooltip.style.top = (e.clientY - 28) + 'px';
      tooltip.textContent = el.dataset.tip;
    });
    el.addEventListener('mouseleave', () => tooltip.style.display = 'none');
  });

  // Top sites mini
  const domains = Object.entries(day.topDomains || {}).sort((a,b) => b[1].time - a[1].time).slice(0,6);
  document.getElementById('sites-count-badge').textContent = `${domains.length} sites`;
  const maxT = domains[0]?.[1]?.time || 1;

  document.getElementById('top-sites-mini').innerHTML = domains.length === 0
    ? `<div class="empty-state">No site data yet</div>`
    : domains.map(([d, s]) => `
      <div style="padding:9px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;font-size:12px">
        <img src="${getFavicon(d)}" style="width:14px;height:14px;border-radius:3px" onerror="this.style.display='none'">
        <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d}</span>
        <div style="text-align:right">
          <div style="font-family:'Space Mono',monospace;font-size:11px;color:var(--accent)">${formatTime(s.time)}</div>
          <div style="font-family:'Space Mono',monospace;font-size:9px;color:var(--muted)">${s.visits}×</div>
          <div class="progress-bar" style="width:70px"><div class="progress-fill" style="width:${Math.round(s.time/maxT*100)}%"></div></div>
        </div>
      </div>
    `).join('');

  // Recent visits
  const visits = [...(day.visits || [])].sort((a,b) => b.startTime - a.startTime).slice(0,15);
  document.getElementById('visits-badge').textContent = `${totalVisits} total`;
  document.getElementById('recent-visits').innerHTML = visits.length === 0
    ? `<div class="empty-state">No visits yet</div>`
    : visits.map(v => `
      <div class="visit-row">
        <span class="visit-time">${formatTime12(v.startTime)}</span>
        <img src="${getFavicon(v.domain || '')}" style="width:14px;height:14px;border-radius:3px;flex-shrink:0" onerror="this.style.display='none'">
        <span class="visit-title" title="${v.url}">${v.title || v.url}</span>
        <span class="visit-duration">${formatTime(v.duration)}</span>
      </div>
    `).join('');
}

function renderSites(day) {
  const domains = Object.entries(day.topDomains || {}).sort((a,b) => b[1].time - a[1].time);
  const totalTime = domains.reduce((s,[,v]) => s + v.time, 0) || 1;

  document.getElementById('sites-total-badge').textContent = `${domains.length} domains`;
  document.getElementById('sites-table').innerHTML = domains.length === 0
    ? `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--muted);font-family:'Space Mono',monospace;font-size:12px">No data for this day</td></tr>`
    : domains.map(([d, s], i) => `
      <tr>
        <td class="td-num">${i+1}</td>
        <td><div class="td-domain">
          <img class="td-favicon" src="${getFavicon(d)}" onerror="this.style.display='none'">
          <span>${d}</span>
        </div></td>
        <td class="td-num">${s.visits}</td>
        <td class="td-time">${formatTime(s.time)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="progress-bar" style="width:100px">
              <div class="progress-fill" style="width:${Math.round(s.time/totalTime*100)}%"></div>
            </div>
            <span style="font-family:'Space Mono',monospace;font-size:10px;color:var(--muted)">${Math.round(s.time/totalTime*100)}%</span>
          </div>
        </td>
      </tr>
    `).join('');
}

function renderTimeline(day) {
  const visits = [...(day.visits || [])].sort((a,b) => b.startTime - a.startTime);
  document.getElementById('timeline-badge').textContent = `${visits.length} visits`;
  document.getElementById('timeline-list').innerHTML = visits.length === 0
    ? `<div class="empty-state">No visits for this day</div>`
    : visits.map(v => `
      <div class="visit-row">
        <span class="visit-time">${formatTime12(v.startTime)}</span>
        <img src="${getFavicon(v.domain || '')}" style="width:14px;height:14px;border-radius:3px;flex-shrink:0" onerror="this.style.display='none'">
        <span class="visit-title" title="${v.url}">${v.title || v.url}</span>
        <span style="font-family:'Space Mono',monospace;font-size:10px;color:var(--muted2);flex-shrink:0;margin-right:8px">${v.domain || ''}</span>
        <span class="visit-duration">${formatTime(v.duration)}</span>
      </div>
    `).join('');
}

function renderSearches(day) {
  const searches = day.searches || [];
  const engines = {};
  searches.forEach(s => { engines[s.engine] = (engines[s.engine] || 0) + 1; });
  const topEng = Object.entries(engines).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';

  document.getElementById('total-searches').textContent = searches.length;
  document.getElementById('search-engines-count').textContent = Object.keys(engines).length;
  document.getElementById('top-engine').textContent = topEng;

  document.getElementById('searches-cloud').innerHTML = searches.length === 0
    ? `<div class="empty-state" style="width:100%">No searches for this day</div>`
    : searches.map(s => `
      <div class="search-tag">
        <span class="search-eng">${s.engine || '?'}</span>
        <span style="font-size:12px">${s.query}</span>
      </div>
    `).join('');
}

function renderHeatmap() {
  const today = todayKey();
  let totalTime = 0, totalVisits = 0, activeDays = 0;

  const dayMap = {};
  allDays.forEach(d => { dayMap[d.date] = d; });

  // 30 day cells
  const cells = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const data = dayMap[key];
    cells.push({ key, data, isToday: key === today });
    if (data && data.totalActiveTime > 0) {
      totalTime += data.totalActiveTime;
      totalVisits += data.visits?.length || 0;
      activeDays++;
    }
  }

  const maxTime = Math.max(...cells.map(c => c.data?.totalActiveTime || 0), 1);

  document.getElementById('hm-total-time').textContent = formatTime(totalTime);
  document.getElementById('hm-total-visits').textContent = totalVisits;
  document.getElementById('hm-active-days').textContent = activeDays;
  document.getElementById('hm-avg-time').textContent = activeDays > 0 ? formatTime(Math.round(totalTime / activeDays)) : '0s';

  // 5-row x 6-col grid (30 days)
  let rows = '';
  for (let row = 0; row < 5; row++) {
    let rowCells = '';
    for (let col = 0; col < 6; col++) {
      const idx = row * 6 + col;
      if (idx >= cells.length) break;
      const { key, data, isToday } = cells[idx];
      const t = data?.totalActiveTime || 0;
      let level = 0;
      if (t > 0) level = Math.ceil((t / maxTime) * 4);
      rowCells += `<div class="hm-cell l${level}${isToday ? ' today' : ''}"
        data-tip="${formatDate(key)}: ${formatTime(t)}, ${data?.visits?.length || 0} visits"
        data-date="${key}"></div>`;
    }
    rows += `<div class="heatmap-row"><div class="heatmap-cells">${rowCells}</div></div>`;
  }

  document.getElementById('heatmap-grid').innerHTML = rows;

  // Tooltips
  document.querySelectorAll('.hm-cell').forEach(el => {
    el.addEventListener('mousemove', e => {
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY - 32) + 'px';
      tooltip.textContent = el.dataset.tip;
    });
    el.addEventListener('mouseleave', () => tooltip.style.display = 'none');
    el.addEventListener('click', () => {
      selectedDate = el.dataset.date;
      renderDayList();
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelector('[data-page="overview"]').classList.add('active');
      document.getElementById('page-overview').classList.add('active');
      renderPage('overview');
    });
  });

  // 30-day table
  const sorted = [...cells].reverse();
  document.getElementById('hm-table').innerHTML = sorted.map(({ key, data }) => `
    <tr>
      <td style="font-family:'Space Mono',monospace;font-size:12px">${formatDate(key)}${key === today ? ' <span style="color:var(--accent2);font-size:9px">TODAY</span>' : ''}</td>
      <td class="td-time">${formatTime(data?.totalActiveTime || 0)}</td>
      <td class="td-num">${data?.visits?.length || 0}</td>
      <td class="td-num">${data?.searches?.length || 0}</td>
      <td class="td-num">${data?.tabsOpened || 0}</td>
    </tr>
  `).join('');
}

// ─── Export ──────────────────────────────────────────────────────────────────

document.getElementById('exportJSON').addEventListener('click', async () => {
  const data = { exported: new Date().toISOString(), days: allDays };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lifetracker-${todayKey()}.json`;
  a.click();
});

document.getElementById('exportCSV').addEventListener('click', async () => {
  let csv = 'Date,URL,Domain,Title,Start Time,Duration (s)\n';
  allDays.forEach(day => {
    (day.visits || []).forEach(v => {
      csv += `"${day.date}","${v.url}","${v.domain || ''}","${(v.title || '').replace(/"/g,'""')}","${new Date(v.startTime).toISOString()}","${v.duration}"\n`;
    });
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lifetracker-${todayKey()}.csv`;
  a.click();
});

document.getElementById('clearData').addEventListener('click', async () => {
  if (!confirm('Clear ALL tracking data? This cannot be undone.')) return;
  await chrome.storage.local.clear();
  allDays = [];
  selectedDate = todayKey();
  renderDayList();
  renderPage('overview');
});

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  allDays = await loadAllDays();
  selectedDate = todayKey();

  // If no data for today yet, still set it
  if (!allDays.find(d => d.date === selectedDate)) {
    allDays.push({ date: selectedDate, visits: [], searches: [], tabsOpened: 0, tabsClosed: 0, downloadsStarted: 0, totalActiveTime: 0, pageInteractions: 0, hourlyActivity: new Array(24).fill(0), topDomains: {} });
  }

  renderDayList();
  renderPage('overview');
}

init();

// Auto-refresh every 30 seconds
setInterval(async () => {
  allDays = await loadAllDays();
  const activePage = document.querySelector('.nav-item.active')?.dataset.page || 'overview';
  renderPage(activePage);
}, 30000);
