// LifeTracker 30 — Background Service Worker
// Tracks: page visits, time spent, tabs, downloads, idle state, searches

const RETENTION_DAYS = 30;
const IDLE_THRESHOLD = 60; // seconds

let activeTabId = null;
let activeTabStart = null;
let activeTabUrl = null;
let activeTabTitle = null;

// ─── Utility ────────────────────────────────────────────────────────────────

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dayKey(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function getDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isTrackable(url) {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

function extractSearchQuery(url) {
  try {
    const u = new URL(url);
    const engines = {
      'google.com': 'q',
      'bing.com': 'q',
      'duckduckgo.com': 'q',
      'yahoo.com': 'p',
      'baidu.com': 'wd',
      'yandex.com': 'text',
      'ecosia.org': 'q',
      'brave.com': 'q'
    };
    const host = u.hostname.replace(/^www\./, '');
    for (const [engine, param] of Object.entries(engines)) {
      if (host.includes(engine)) {
        const q = u.searchParams.get(param);
        if (q) return { engine: engine.split('.')[0], query: q };
      }
    }
  } catch {}
  return null;
}

// ─── Storage Helpers ─────────────────────────────────────────────────────────

async function getData(key) {
  return new Promise(resolve => {
    chrome.storage.local.get(key, result => resolve(result[key] || null));
  });
}

async function setData(key, value) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

async function getDay(dateKey) {
  const data = await getData(`day_${dateKey}`);
  return data || {
    date: dateKey,
    visits: [],         // { url, domain, title, startTime, duration, visitId }
    searches: [],       // { engine, query, time }
    tabsOpened: 0,
    tabsClosed: 0,
    downloadsStarted: 0,
    totalActiveTime: 0, // seconds
    totalIdleTime: 0,
    pageInteractions: 0,
    hourlyActivity: new Array(24).fill(0), // seconds per hour
    topDomains: {}      // domain -> { visits, time }
  };
}

async function saveDay(dateKey, dayData) {
  await setData(`day_${dateKey}`, dayData);
}

async function getDaysList() {
  const list = await getData('days_list');
  return list || [];
}

async function addDayToList(dateKey) {
  let list = await getDaysList();
  if (!list.includes(dateKey)) {
    list.push(dateKey);
    list.sort();
    // Keep only last 30 days
    if (list.length > RETENTION_DAYS) {
      const removed = list.splice(0, list.length - RETENTION_DAYS);
      for (const old of removed) {
        chrome.storage.local.remove(`day_${old}`);
      }
    }
    await setData('days_list', list);
  }
}

// ─── Visit Tracking ──────────────────────────────────────────────────────────

async function startTracking(tabId, url, title) {
  if (!isTrackable(url)) return;
  activeTabId = tabId;
  activeTabStart = Date.now();
  activeTabUrl = url;
  activeTabTitle = title || url;
}

async function stopTracking() {
  if (!activeTabId || !activeTabStart || !activeTabUrl) return;
  if (!isTrackable(activeTabUrl)) return;

  const duration = Math.round((Date.now() - activeTabStart) / 1000);
  if (duration < 2) return; // ignore flickers

  const dateKey = todayKey();
  const day = await getDay(dateKey);
  await addDayToList(dateKey);

  const domain = getDomain(activeTabUrl);
  const hour = new Date().getHours();

  // Add visit
  day.visits.push({
    url: activeTabUrl,
    domain,
    title: activeTabTitle,
    startTime: activeTabStart,
    duration,
    visitId: `${activeTabStart}_${Math.random().toString(36).slice(2)}`
  });

  // Update active time
  day.totalActiveTime += duration;

  // Hourly activity
  if (hour >= 0 && hour < 24) {
    day.hourlyActivity[hour] = (day.hourlyActivity[hour] || 0) + duration;
  }

  // Top domains
  if (domain) {
    if (!day.topDomains[domain]) day.topDomains[domain] = { visits: 0, time: 0 };
    day.topDomains[domain].visits++;
    day.topDomains[domain].time += duration;
  }

  // Check for search
  const search = extractSearchQuery(activeTabUrl);
  if (search) {
    day.searches.push({ ...search, time: activeTabStart });
  }

  await saveDay(dateKey, day);

  activeTabId = null;
  activeTabStart = null;
  activeTabUrl = null;
  activeTabTitle = null;
}

// ─── Tab Events ───────────────────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await stopTracking();
  try {
    const tab = await chrome.tabs.get(tabId);
    await startTracking(tabId, tab.url, tab.title);
  } catch {}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    if (activeTabId === tabId && activeTabUrl !== tab.url) {
      await stopTracking();
    }
    if (tab.active) {
      await startTracking(tabId, tab.url, tab.title);
    }
  }
  // Update title
  if (changeInfo.title && tabId === activeTabId) {
    activeTabTitle = changeInfo.title;
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabId === activeTabId) await stopTracking();
  const dateKey = todayKey();
  const day = await getDay(dateKey);
  await addDayToList(dateKey);
  day.tabsClosed = (day.tabsClosed || 0) + 1;
  await saveDay(dateKey, day);
});

chrome.tabs.onCreated.addListener(async () => {
  const dateKey = todayKey();
  const day = await getDay(dateKey);
  await addDayToList(dateKey);
  day.tabsOpened = (day.tabsOpened || 0) + 1;
  await saveDay(dateKey, day);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await stopTracking();
  } else {
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId });
      if (tab) await startTracking(tab.id, tab.url, tab.title);
    } catch {}
  }
});

// ─── Downloads ───────────────────────────────────────────────────────────────

chrome.downloads.onCreated.addListener(async (item) => {
  const dateKey = todayKey();
  const day = await getDay(dateKey);
  await addDayToList(dateKey);
  day.downloadsStarted = (day.downloadsStarted || 0) + 1;

  if (!day.downloads) day.downloads = [];
  day.downloads.push({
    filename: item.filename || item.url,
    url: item.url,
    fileSize: item.fileSize,
    time: Date.now()
  });

  await saveDay(dateKey, day);
});

// ─── Idle Detection ──────────────────────────────────────────────────────────

chrome.idle.setDetectionInterval(IDLE_THRESHOLD);

chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === 'idle' || state === 'locked') {
    await stopTracking();
  } else if (state === 'active') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab) await startTracking(tab.id, tab.url, tab.title);
    } catch {}
  }
});

// ─── Periodic Save (every minute) ────────────────────────────────────────────

chrome.alarms.create('periodic_save', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'periodic_save') {
    // Save current session progress without resetting
    if (activeTabId && activeTabStart && activeTabUrl && isTrackable(activeTabUrl)) {
      const partialDuration = Math.round((Date.now() - activeTabStart) / 1000);
      if (partialDuration > 5) {
        const dateKey = todayKey();
        const day = await getDay(dateKey);
        await addDayToList(dateKey);
        day.totalActiveTime = (day.totalActiveTime || 0) + partialDuration;
        const hour = new Date().getHours();
        if (hour >= 0 && hour < 24) {
          day.hourlyActivity[hour] = (day.hourlyActivity[hour] || 0) + partialDuration;
        }
        await saveDay(dateKey, day);
        // Reset start to avoid double-counting
        activeTabStart = Date.now();
      }
    }
  }
});

// ─── Content Script Messages ──────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.type === 'PAGE_INTERACTION') {
    const dateKey = todayKey();
    const day = await getDay(dateKey);
    await addDayToList(dateKey);
    day.pageInteractions = (day.pageInteractions || 0) + (msg.count || 1);
    await saveDay(dateKey, day);
  }

  if (msg.type === 'GET_SUMMARY') {
    const days = await getDaysList();
    const summaries = [];
    for (const d of days) {
      const day = await getDay(d);
      summaries.push(day);
    }
    return summaries;
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab) await startTracking(tab.id, tab.url, tab.title);
  } catch {}
}

init();
