(function() {
  const THEME_KEY = 'os-sim-theme';

  function initTheme() {
    const hasInitialized = localStorage.getItem('os-sim-theme-initialized');
    if (!hasInitialized) {
      localStorage.removeItem(THEME_KEY);
      localStorage.setItem('os-sim-theme-initialized', 'true');
    }
    
    const savedTheme = localStorage.getItem(THEME_KEY);
    const theme = savedTheme || 'light';
    applyTheme(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  }

  // Event listener
  document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleTheme);
    }
  });

  // Expose to window
  window.initTheme = initTheme;
  window.toggleTheme = toggleTheme;
})();
