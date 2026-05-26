// LifeTracker 30 — Content Script
// Tracks: clicks, scroll depth, keystrokes (count only), time on page

(function () {
  let interactionCount = 0;
  let flushTimer = null;
  let maxScrollDepth = 0;
  let keystrokeCount = 0;

  function flush() {
    if (interactionCount > 0) {
      try {
        chrome.runtime.sendMessage({
          type: 'PAGE_INTERACTION',
          count: interactionCount,
          scrollDepth: maxScrollDepth,
          keystrokes: keystrokeCount,
          url: location.href
        });
      } catch {}
      interactionCount = 0;
      keystrokeCount = 0;
    }
  }

  function scheduleFlush() {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 3000);
  }

  // Track clicks
  document.addEventListener('click', () => {
    interactionCount++;
    scheduleFlush();
  }, { passive: true, capture: true });

  // Track scrolling
  document.addEventListener('scroll', () => {
    const scrolled = window.scrollY + window.innerHeight;
    const total = document.documentElement.scrollHeight;
    const depth = total > 0 ? Math.round((scrolled / total) * 100) : 0;
    if (depth > maxScrollDepth) maxScrollDepth = depth;
    interactionCount++;
    scheduleFlush();
  }, { passive: true });

  // Track keystrokes (count only, NOT content)
  document.addEventListener('keydown', () => {
    keystrokeCount++;
    interactionCount++;
    scheduleFlush();
  }, { passive: true, capture: true });

  // Flush on unload
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
})();
