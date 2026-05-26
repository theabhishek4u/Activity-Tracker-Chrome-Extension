// LifeTracker 30 — Popup Script

document.getElementById('dashBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

function formatTime(seconds) {
  if (!seconds || seconds < 60) return `${seconds || 0}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getFaviconUrl(domain) {
  return `https://www.google.com/s2/favicons?sz=16&domain=${domain}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function getData(key) {
  return new Promise(resolve => {
    chrome.storage.local.get(key, result => resolve(result[key] || null));
  });
}

async function getDay(dateKey) {
  const data = await getData(`day_${dateKey}`);
  return data || {
    date: dateKey,
    visits: [],
    searches: [],
    tabsOpened: 0,
    tabsClosed: 0,
    downloadsStarted: 0,
    totalActiveTime: 0,
    pageInteractions: 0,
    hourlyActivity: new Array(24).fill(0),
    topDomains: {}
  };
}

async function render() {
  const dateKey = todayKey();
  const day = await getDay(dateKey);

  const content = document.getElementById('content');

  if (!day.visits || day.visits.length === 0) {
    content.innerHTML = `
      <div class="no-data">
        <div style="font-size:28px;margin-bottom:12px">👁️</div>
        <div>No activity tracked yet today.</div>
        <div style="margin-top:6px;font-size:10px">Start browsing to see your stats!</div>
      </div>
    `;
    return;
  }

  // Top domains
  const domains = Object.entries(day.topDomains || {})
    .sort((a, b) => b[1].time - a[1].time)
    .slice(0, 5);

  const maxTime = domains[0]?.[1]?.time || 1;

  const topSitesHTML = domains.map(([domain, stats], i) => {
    const barWidth = Math.round((stats.time / maxTime) * 100);
    return `
      <div class="site-row">
        <div class="site-bar" style="width:${barWidth}%"></div>
        <span class="site-rank">#${i + 1}</span>
        <img class="site-favicon" src="${getFaviconUrl(domain)}" onerror="this.style.display='none'">
        <span class="site-name">${domain}</span>
        <span class="site-visits">${stats.visits}×</span>
        <span class="site-time">${formatTime(stats.time)}</span>
      </div>
    `;
  }).join('');

  // Hourly chart
  const hourly = day.hourlyActivity || new Array(24).fill(0);
  const currentHour = new Date().getHours();
  const maxHourly = Math.max(...hourly, 1);

  const barsHTML = hourly.map((val, h) => {
    const height = Math.max(Math.round((val / maxHourly) * 36), val > 0 ? 2 : 0);
    const isNow = h === currentHour;
    const labels = ['12a','','','','4a','','','','8a','','','','12p','','','','4p','','','','8p','','',''];
    return `
      <div class="bar-col">
        <div class="bar-fill ${isNow ? 'now' : ''}" style="height:${height}px" title="${h}:00 — ${formatTime(val)}"></div>
        <div class="bar-label">${labels[h] || ''}</div>
      </div>
    `;
  }).join('');

  // Recent searches
  const recentSearches = (day.searches || []).slice(-4).reverse();
  const searchesHTML = recentSearches.length > 0 ? `
    <div class="section-title">Recent Searches</div>
    <div class="searches-list">
      ${recentSearches.map(s => `
        <div class="search-item">
          <span class="search-engine">${s.engine || '?'}</span>
          <span class="search-query">${s.query}</span>
        </div>
      `).join('')}
    </div>
  ` : '';

  const totalVisits = day.visits.length;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  content.innerHTML = `
    <div class="today-header">
      <span class="today-label">Today</span>
      <span class="today-date">${today}</span>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value" style="color:var(--accent)">${formatTime(day.totalActiveTime)}</div>
        <div class="stat-label">Active Time</div>
        <div class="stat-sub">online today</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-value" style="color:var(--accent2)">${totalVisits}</div>
        <div class="stat-label">Page Visits</div>
        <div class="stat-sub">${Object.keys(day.topDomains || {}).length} unique sites</div>
      </div>
      <div class="stat-card green">
        <div class="stat-value" style="color:var(--green)">${day.tabsOpened || 0}</div>
        <div class="stat-label">Tabs Opened</div>
        <div class="stat-sub">${day.tabsClosed || 0} closed</div>
      </div>
      <div class="stat-card red">
        <div class="stat-value" style="color:var(--red)">${(day.searches || []).length}</div>
        <div class="stat-label">Searches</div>
        <div class="stat-sub">${day.downloadsStarted || 0} downloads</div>
      </div>
    </div>

    <div class="section-title">Activity by Hour</div>
    <div class="hourly-chart">
      <div class="bar-row">${barsHTML}</div>
    </div>

    <div class="section-title">Top Sites</div>
    <div class="top-sites">${topSitesHTML}</div>

    ${searchesHTML}

    <div class="footer">
      <div class="footer-stat">
        <div class="footer-val">${day.pageInteractions?.toLocaleString() || 0}</div>
        <div class="footer-lbl">Interactions</div>
      </div>
      <div class="divider"></div>
      <div class="footer-stat">
        <div class="footer-val">${day.downloadsStarted || 0}</div>
        <div class="footer-lbl">Downloads</div>
      </div>
      <div class="divider"></div>
      <div class="footer-stat">
        <div class="footer-val">30d</div>
        <div class="footer-lbl">Retention</div>
      </div>
    </div>
  `;
}

render();
