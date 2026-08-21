(function() {
  // Modal state and data
  window._ratioModalState = { hits: 0, faults: 0, total: 0, frameCount: 0 };
  // Toast timers to prevent leaks
  const toastTimers = {
    success: { fadeOut: null, remove: null },
    error: { fadeOut: null, remove: null }
  };

  // DRY Helper: Create toast notification
  function createToast(message, type = 'success') {
    // Clear existing toast and its timers
    const existing = document.querySelector(`.toast-${type}`);
    if (existing) {
      if (toastTimers[type]) {
        clearTimeout(toastTimers[type].fadeOut);
        clearTimeout(toastTimers[type].remove);
      }
      existing.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast-${type} fixed top-6 right-6 px-6 py-3 rounded-xl shadow-lg z-50 animate-fade-in-up`;

    // Add icon
    const icon = document.createElement('i');
    icon.className = type === 'success' 
      ? 'fas fa-check-circle mr-2' 
      : 'fas fa-circle-exclamation mr-2';
    toast.appendChild(icon);

    // Add message
    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    toast.appendChild(textSpan);

    // Apply styles
    if (type === 'error') {
      toast.style.background = 'var(--error-toast-bg)';
      toast.style.color = '#ffffff';
    } else {
      toast.style.background = 'rgba(34, 197, 94, 0.9)';
      toast.style.color = '#ffffff';
    }

    document.body.appendChild(toast);

    // Auto-remove
    const duration = type === 'success' ? 2500 : 3000;
    toastTimers[type] = {
      fadeOut: setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        toastTimers[type].remove = setTimeout(() => toast.remove(), 500);
      }, duration)
    };
  }

  // Algorithm explanations
  const ALGORITHM_EXPLANATIONS = {
    FIFO: {
      title: 'FIFO (First-In-First-Out)',
      text: 'This algorithm replaces the oldest page in memory. The page that has been in memory the longest is selected for replacement when a new page needs to be loaded. It uses a queue to track page insertion order. On a hit, the queue remains unchanged. FIFO is simple to implement but can suffer from Belady\'s anomaly, where increasing the number of frames can sometimes increase page faults.'
    },
    LRU: {
      title: 'LRU (Least Recently Used)',
      text: 'This algorithm replaces the page that has not been used for the longest period of time. It tracks when each page was last accessed and evicts the least recently accessed page (Frame N of the queue). On a hit, the accessed page is moved to Frame 1 (marked as Most Recently Used), protecting it from immediate eviction. LRU generally provides better performance than FIFO as it takes advantage of temporal locality.'
    }
  };



  function showError(message) {
    createToast(message, 'error');
  }

  function showSuccess(message) {
    createToast(message, 'success');
  }

  function selectAlgorithm(algo) {
    document.getElementById('algorithm').value = algo;
    document.getElementById('fifoCard').classList.toggle('selected', algo === 'FIFO');
    document.getElementById('lruCard').classList.toggle('selected', algo === 'LRU');
  }

  function resetSimulation() {
    // Stop playback first
    if (window.stopPlayback) {
      window.stopPlayback();
    }
    
    // Reset play/pause UI
    const playPauseIcon = document.getElementById('playPauseIcon');
    const playPauseText = document.getElementById('playPauseText');
    if (playPauseIcon) playPauseIcon.className = 'fas fa-play';
    if (playPauseText) playPauseText.textContent = 'Play';
    
    // Clear input mode
    if (window.clearInputMode) {
      window.clearInputMode();
    }
    
    const frameInput = document.getElementById('frameCount');
    const resultsSection = document.getElementById('resultsSection');
    
    frameInput.value = '3';
    selectAlgorithm('FIFO');

    resultsSection.style.opacity = '0';
    setTimeout(() => {
      resultsSection.classList.add('hidden-initial');
      resultsSection.style.display = 'none';
    }, 300);

    // Reset modal state
    window._ratioModalState = { hits: 0, faults: 0, total: 0, frameCount: 0 };
    showSuccess('Simulator Reset');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Modal helpers
  function getModalElements() {
    return {
      modal: document.getElementById('ratioModal'),
      title: document.getElementById('ratioModalTitle'),
      desc: document.getElementById('ratioModalDesc'),
      formula: document.getElementById('ratioModalFormula'),
      example: document.getElementById('ratioModalExample'),
      result: document.getElementById('ratioModalResult'),
      resultNote: document.getElementById('ratioModalResultNote'),
      icon: document.getElementById('ratioModalIcon')
    };
  }

  function openInfoModal(type) {
    const els = getModalElements();
    if (!els.modal) return;

    const { hits, faults, total, frameCount } = window._ratioModalState;

    let config;
    switch (type) {
      case 'hitRatio':
        config = {
          title: 'How is the Hit Ratio computed?',
          desc: 'The Hit Ratio is the proportion of page references that were already present in memory. A higher hit ratio means the algorithm kept the working set resident more often.',
          formula: 'Hit Ratio = Number of Hits / Total References',
          getResult: () => total > 0 ? Math.round((hits / total) * 100) + '%' : '0%',
          getExample: () => total > 0 ? `= ${hits} / ${total} = ${window.formatRatio(hits / total)}` : 'Run a simulation first to see a worked example.',
          getResultNote: () => '(conversion from a decimal to a percentage.)',
          resultColor: 'var(--card-ratio-hit-accent)',
          iconBg: 'linear-gradient(135deg, #14b8a6 0%, #2dd4bf 100%)',
          iconIcon: 'fa-bullseye'
        };
        break;
      case 'faultRatio':
        config = {
          title: 'How is the Fault Ratio computed?',
          desc: 'The Fault Ratio (also called Page Fault Rate) is the proportion of page references that were NOT in memory and had to be loaded from disk. A lower fault ratio means the algorithm avoided expensive disk I/O more often.',
          formula: 'Fault Ratio = Number of Page Faults / Total References',
          getResult: () => total > 0 ? Math.round((faults / total) * 100) + '%' : '0%',
          getExample: () => total > 0 ? `= ${faults} / ${total} = ${window.formatRatio(faults / total)}` : 'Run a simulation first to see a worked example.',
          getResultNote: () => '(conversion from a decimal to a percentage.)',
          resultColor: 'var(--card-ratio-fault-accent)',
          iconBg: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
          iconIcon: 'fa-triangle-exclamation'
        };
        break;
      case 'hitCount':
        config = {
          title: 'What is a Hit?',
          desc: 'A page hit (or "hit") occurs when the page requested by the CPU is already loaded in one of the memory frames. Because the page is in memory, the CPU can access it immediately with no disk I/O — this is the ideal outcome of a page replacement algorithm.',
          formula: 'A page is a HIT when: page ∈ current memory frames',
          getResult: () => String(hits),
          getExample: () => total > 0 ? `In this run, ${hits} of ${total} references were hits.` : 'Run a simulation first to see counts from your own run.',
          getResultNote: () => total > 0 ? `(${(hits / total * 100).toFixed(0)}% of all references)` : '',
          resultColor: 'var(--card-hit-accent)',
          iconBg: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
          iconIcon: 'fa-check'
        };
        break;
      case 'faultCount':
        config = {
          title: 'What is a Page Fault?',
          desc: 'A page fault occurs when the page requested by the CPU is NOT in any memory frame. The OS must load it from disk, which is very expensive (milliseconds vs. nanoseconds for memory access). Fewer faults = better algorithm performance.',
          formula: 'A page is a FAULT when: page ∉ current memory frames',
          getResult: () => String(faults),
          getExample: () => total > 0 ? `In this run, ${faults} of ${total} references were faults.` : 'Run a simulation first to see counts from your own run.',
          getResultNote: () => total > 0 ? `(${(faults / total * 100).toFixed(0)}% of all references)` : '',
          resultColor: 'var(--card-fault-accent)',
          iconBg: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
          iconIcon: 'fa-xmark'
        };
        break;
      case 'frames':
        config = {
          title: 'What is the Number of Frames?',
          desc: 'The number of frames is the count of physical memory slots available to hold pages at the same time. The algorithm can keep at most this many pages resident. Increasing frames usually reduces page faults but costs more physical memory.',
          formula: 'Frames = max pages kept in memory simultaneously',
          getResult: () => String(frameCount),
          getExample: () => frameCount > 0 ? `You configured ${frameCount} frame${frameCount === 1 ? '' : 's'} for this run.` : 'Run a simulation first to see your configured frame count.',
          getResultNote: () => 'memory slot(s)',
          resultColor: 'var(--new-cell-text)',
          iconBg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          iconIcon: 'fa-layer-group'
        };
        break;
      case 'refString':
        config = {
          title: 'What is the Reference String Length?',
          desc: 'The reference string length is the total number of page references the CPU makes in this simulation. Each entry in your reference string counts as one reference; together they describe the exact sequence of memory accesses being simulated.',
          formula: 'Length = count of comma/space-separated values entered',
          getResult: () => String(total),
          getExample: () => total > 0 ? `Your reference string has ${total} page${total === 1 ? '' : 's'}.` : 'Run a simulation first to see your reference string length.',
          getResultNote: () => 'reference(s)',
          resultColor: 'var(--new-cell-text)',
          iconBg: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
          iconIcon: 'fa-list-ol'
        };
        break;
    }

    if (!config) return;

    // Update modal content
    els.title.textContent = config.title;
    els.desc.textContent = config.desc;
    els.formula.textContent = config.formula;
    els.example.textContent = config.getExample();
    els.result.textContent = config.getResult();
    els.result.style.color = config.resultColor;
    els.resultNote.textContent = config.getResultNote();
    els.icon.style.background = config.iconBg;
    els.icon.innerHTML = `<i class="fas ${config.iconIcon}"></i>`;

    // Show modal
    els.modal.style.display = 'flex';
    document.body.classList.add('modal-open');
  }

  // Backward-compatible alias
  function openRatioModal(type) {
    openInfoModal(type);
  }

  function closeRatioModal() {
    const modal = document.getElementById('ratioModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }

  // Event listeners
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeRatioModal();
  });

  // Expose to window
  window.openInfoModal = openInfoModal;
  window.openRatioModal = openRatioModal;
  window.closeRatioModal = closeRatioModal;
  window.selectAlgorithm = selectAlgorithm;
  window.showError = showError;
  window.showSuccess = showSuccess;
  window.resetSimulation = resetSimulation;
  window.ALGORITHM_EXPLANATIONS = ALGORITHM_EXPLANATIONS;
})();
