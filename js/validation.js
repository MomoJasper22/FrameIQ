(function() {
  let detectedMode = null;
  const HISTORY_KEY = 'referenceStringHistory';

  // History functions
  function getHistory() {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(value) {
    if (!value.trim()) return;
    let history = getHistory();
    // Remove duplicates
    history = history.filter(item => item !== value.trim());
    // Add to front
    history.unshift(value.trim());
    // Keep last 20
    history = history.slice(0, 20);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  }

  function renderHistory() {
    const historyList = document.getElementById('historyList');
    const historyDropdown = document.getElementById('historyDropdown');
    if (!historyList) return;
    const history = getHistory();
    historyList.innerHTML = '';
    if (history.length === 0) {
      historyList.innerHTML = '<p class="text-xs helper-text px-2 py-1">No history yet</p>';
      return;
    }
    history.forEach((item, index) => {
      const button = document.createElement('button');
      button.className = 'w-full text-left text-sm px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-colors';
      button.textContent = item;
      button.title = item;
      button.addEventListener('click', () => {
        document.getElementById('referenceString').value = item;
        window.validateInputType(document.getElementById('referenceString'));
        hideHistoryDropdown();
      });
      historyList.appendChild(button);
    });
  }

  function toggleHistoryDropdown() {
    const historyDropdown = document.getElementById('historyDropdown');
    if (!historyDropdown) return;
    historyDropdown.classList.toggle('hidden');
    if (!historyDropdown.classList.contains('hidden')) {
      renderHistory();
    }
  }

  function hideHistoryDropdown() {
    const historyDropdown = document.getElementById('historyDropdown');
    if (!historyDropdown) return;
    historyDropdown.classList.add('hidden');
  }

  function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(() => element.classList.remove('shake'), 400);
  }

  function validateInputType(input) {
    const value = input.value;
    const badge = document.getElementById('inputModeBadge');

    // 1. Remove special characters
    const allowedPattern = /[^a-zA-Z0-9,\s]/g;
    if (allowedPattern.test(value)) {
      window.showError('Special characters are not allowed');
      input.value = value.replace(allowedPattern, '');
      shakeElement(input);
      return;
    }

    if (!value.trim()) {
      detectedMode = null;
      updateModeBadge('auto', badge);
      return;
    }

    // Get non-separator characters
    const chars = value.replace(/[,\s]/g, '');
    if (chars.length === 0) {
      detectedMode = null;
      updateModeBadge('auto', badge);
      return;
    }

    // Check for mixed alphanumeric tokens
    const tokens = value.split(/[,\s]+/).filter(t => t.length > 0);
    for (const token of tokens) {
      const hasLetter = /[a-zA-Z]/.test(token);
      const hasDigit = /[0-9]/.test(token);
      if (hasLetter && hasDigit) {
        window.showError('Cannot mix letters and digits');
        shakeElement(input);
        // Remove offending token
        const safeTokens = tokens.filter(t => !(/[a-zA-Z]/.test(t) && /[0-9]/.test(t)));
        input.value = safeTokens.join(',');
        return;
      }
    }

    // Detect mode
    const firstChar = chars[0];
    const isFirstNumeric = /^[0-9]$/.test(firstChar);
    const isFirstAlphabet = /^[a-zA-Z]$/.test(firstChar);

    detectedMode = isFirstNumeric ? 'numeric' : isFirstAlphabet ? 'alphabet' : null;
    updateModeBadge(detectedMode || 'auto', badge);

    // Enforce mode
    if (detectedMode === 'numeric' && /[a-zA-Z]/.test(chars)) {
      window.showError('Numeric mode: alphabetic characters are not allowed');
      input.value = value.replace(/[a-zA-Z]/g, '');
      shakeElement(input);
    } else if (detectedMode === 'alphabet' && /[0-9]/.test(chars)) {
      window.showError('Alphabetic mode: numeric characters are not allowed');
      input.value = value.replace(/[0-9]/g, '');
      shakeElement(input);
    }
  }

  function updateModeBadge(mode, badge) {
    badge.className = 'mode-badge ml-2';
    switch (mode) {
      case 'numeric':
        badge.classList.add('mode-numeric');
        badge.innerHTML = '<i class="fas fa-hashtag mr-1"></i>NUMERIC';
        break;
      case 'alphabet':
        badge.classList.add('mode-alphabet');
        badge.innerHTML = '<i class="fas fa-font mr-1"></i>ALPHABET';
        break;
      default:
        badge.classList.add('mode-empty');
        badge.textContent = 'Auto-detect';
    }
  }

  function clearInputMode() {
    detectedMode = null;
    const badge = document.getElementById('inputModeBadge');
    const input = document.getElementById('referenceString');
    updateModeBadge('auto', badge);
    input.value = '';
    input.focus();
  }

  function parseReferenceString(inputStr) {
    return inputStr
      .replace(/,/g, ' ')
      .split(/\s+/)
      .filter(str => str.trim() !== '')
      .map(str => str.trim());
  }

  function generateRandomPreset(count, type) {
    const safeCount = Math.min(count, 100);
    const values = [];

    if (type === 'numeric') {
      for (let i = 0; i < safeCount; i++) {
        values.push(Math.floor(Math.random() * 10));
      }
    } else if (type === 'alphabet') {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (let i = 0; i < safeCount; i++) {
        values.push(letters[Math.floor(Math.random() * letters.length)]);
      }
    }

    const input = document.getElementById('referenceString');
    input.value = values.join(',');
    validateInputType(input);
  }

  function isValidPageSet(pages) {
    const hasNumbers = pages.some(p => /^[0-9]+$/.test(p));
    const hasLetters = pages.some(p => /^[a-zA-Z]+$/.test(p));
    const hasMixedTokens = pages.some(p => /^[a-zA-Z0-9]+$/.test(p) && /[a-zA-Z]/.test(p) && /[0-9]/.test(p));

    if (hasMixedTokens) {
      return { valid: false, reason: 'Mixed alphanumeric tokens are not allowed. Use either numbers OR letters.' };
    }

    if (hasNumbers && hasLetters) {
      return { valid: false, reason: 'Cannot mix numeric and alphabetic values. Use either numbers OR letters.' };
    }

    return { valid: true };
  }

  // Event listeners for history
  document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('historyToggle');
    const clearBtn = document.getElementById('clearHistoryBtn');
    const historyDropdown = document.getElementById('historyDropdown');
    
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleHistoryDropdown();
      });
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearHistory();
      });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!historyDropdown?.contains(e.target) && !toggleBtn?.contains(e.target)) {
        hideHistoryDropdown();
      }
    });
  });

  // Expose
  window.validateInputType = validateInputType;
  window.updateModeBadge = updateModeBadge;
  window.clearInputMode = clearInputMode;
  window.parseReferenceString = parseReferenceString;
  window.generateRandomPreset = generateRandomPreset;
  window.shakeElement = shakeElement;
  window.isValidPageSet = isValidPageSet;
  window.saveHistory = saveHistory;
  window.clearHistory = clearHistory;
  window.toggleHistoryDropdown = toggleHistoryDropdown;
  window.hideHistoryDropdown = hideHistoryDropdown;
})();
