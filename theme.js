// Theme preference is independent of the profile and food diary.
(() => {
  const key = 'kalori-pusulasi-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';
  try {
    const saved = localStorage.getItem(key);
    if (['light', 'dark', 'system'].includes(saved)) preference = saved;
  } catch { /* Keep theme switching available when storage is unavailable. */ }

  function prefersDark() {
    try {
      if (window.AndroidBackup && typeof window.AndroidBackup.isSystemDark === 'function') {
        return window.AndroidBackup.isSystemDark();
      }
    } catch { /* Fall back to the browser's preference. */ }
    return system.matches;
  }
  function apply() {
    const dark = preference === 'dark' || (preference === 'system' && prefersDark());
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#101b18' : '#f6f7f3';
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === preference));
    });
    try {
      if (window.AndroidBackup && typeof window.AndroidBackup.setDarkMode === 'function') {
        window.AndroidBackup.setDarkMode(dark);
      }
    } catch { /* The web version and older APKs do not expose the native method. */ }
  }
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.addEventListener('click', () => {
        preference = button.dataset.themeChoice;
        try { localStorage.setItem(key, preference); } catch { /* Session-only preference. */ }
        apply();
      });
    });
    apply();
  });
  const followSystem = () => { if (preference === 'system') apply(); };
  if (system.addEventListener) system.addEventListener('change', followSystem);
  else system.addListener(followSystem);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = ['light', 'dark', 'system'].includes(event.newValue) ? event.newValue : 'system';
      apply();
    }
  });
})();
