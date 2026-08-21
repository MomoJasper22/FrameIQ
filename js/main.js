(function() {
  // DOM elements cached for efficiency
  const elements = {};
  // Simulation state for playback
  let simulationState = {
    steps: [],
    frameCount: 0,
    algorithm: '',
    pages: [],
    currentStep: 0, // 0 = no steps, 1 = first step
    isPlaying: false,
    playInterval: null,
    playSpeed: 1000 // ms per step
  };
  // Scroll sync state
  let scrollLocked = true;
  let isScrolling = false;
  let scrollTimeout = null;
  // Drag-to-scroll state
  const dragState = {
    simulation: { isDragging: false, startX: 0, scrollLeft: 0 },
    queue: { isDragging: false, startX: 0, scrollLeft: 0 }
  };

  function initializeCache() {
    elements.frameCountInput = document.getElementById('frameCount');
    elements.frameDecrement = document.getElementById('frameDecrement');
    elements.frameIncrement = document.getElementById('frameIncrement');
    elements.referenceInput = document.getElementById('referenceString');
    elements.algorithmInput = document.getElementById('algorithm');
    elements.loadingIndicator = document.getElementById('loadingIndicator');
    elements.resultsSection = document.getElementById('resultsSection');
    elements.hitCount = document.getElementById('hitCount');
    elements.faultCount = document.getElementById('faultCount');
    elements.hitRatio = document.getElementById('hitRatio');
    elements.faultRatio = document.getElementById('faultRatio');
    elements.summaryFrameCount = document.getElementById('summaryFrameCount');
    elements.summaryRefString = document.getElementById('summaryRefString');
    elements.algoTitle = document.getElementById('algoTitle');
    elements.algoExplanation = document.getElementById('algoExplanation');
    // Playback controls
    elements.prevBtn = document.getElementById('prevBtn');
    elements.nextBtn = document.getElementById('nextBtn');
    elements.playPauseBtn = document.getElementById('playPauseBtn');
    elements.playPauseIcon = document.getElementById('playPauseIcon');
    elements.playPauseText = document.getElementById('playPauseText');
    elements.stepInput = document.getElementById('stepInput');
    elements.stepTotal = document.getElementById('stepTotal');
    // Scroll lock controls
    elements.scrollLockBtn = document.getElementById('scrollLockBtn');
    elements.scrollLockIcon = document.getElementById('scrollLockIcon');
    elements.scrollLockText = document.getElementById('scrollLockText');
    // Table containers
    elements.simulationTableContainer = document.getElementById('simulationTableContainer');
    elements.queueTrackerContainer = document.getElementById('queueTrackerContainer');
  }

  // Frame count controls
  function incrementFrameCount() {
    let current = parseInt(elements.frameCountInput.value);
    if (isNaN(current) || current < 1) current = 1;
    if (current < 100) {
      elements.frameCountInput.value = current + 1;
    }
  }

  function decrementFrameCount() {
    let current = parseInt(elements.frameCountInput.value);
    if (isNaN(current) || current < 1) current = 1;
    if (current > 1) {
      elements.frameCountInput.value = current - 1;
    }
  }

  function formatRatio(ratio) {
    return ratio.toFixed(2);
  }

  // Scroll sync toggle
  function toggleScrollLock() {
    scrollLocked = !scrollLocked;
    if (scrollLocked) {
      elements.scrollLockIcon.className = 'fas fa-lock';
      elements.scrollLockText.textContent = 'Scroll Locked';
      if (elements.simulationTableContainer && elements.queueTrackerContainer) {
        elements.queueTrackerContainer.scrollLeft = elements.simulationTableContainer.scrollLeft;
      }
    } else {
      elements.scrollLockIcon.className = 'fas fa-lock-open';
      elements.scrollLockText.textContent = 'Scroll Unlocked';
    }
  }

  // Scroll sync handler with infinite loop prevention
  function syncScroll(sourceContainer, targetContainer) {
    if (!scrollLocked || isScrolling) return;
    isScrolling = true;
    targetContainer.scrollLeft = sourceContainer.scrollLeft;
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isScrolling = false;
    }, 60);
  }

  // Drag-to-scroll: mousedown handler
  function handleDragStart(e, containerKey) {
    const container = containerKey === 'simulation'
      ? elements.simulationTableContainer
      : elements.queueTrackerContainer;
    if (!container) return;
    e.preventDefault();
    dragState[containerKey].isDragging = true;
    dragState[containerKey].startX = e.pageX - container.offsetLeft;
    dragState[containerKey].scrollLeft = container.scrollLeft;
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
  }

  // Drag-to-scroll: mousemove handler
  function handleDragMove(e, containerKey) {
    if (!dragState[containerKey].isDragging) return;
    const container = containerKey === 'simulation'
      ? elements.simulationTableContainer
      : elements.queueTrackerContainer;
    if (!container) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - dragState[containerKey].startX) * 1.5;
    container.scrollLeft = dragState[containerKey].scrollLeft - walk;
  }

  // Drag-to-scroll: mouseup/leave handler
  function handleDragEnd(containerKey) {
    dragState[containerKey].isDragging = false;
    const container = containerKey === 'simulation'
      ? elements.simulationTableContainer
      : elements.queueTrackerContainer;
    if (container) {
      container.style.cursor = 'grab';
      container.style.userSelect = '';
    }
  }

  // Attach drag-to-scroll and scroll-sync listeners to a container
  function attachContainerListeners(container, containerKey) {
    if (!container) return;

    container.style.cursor = 'grab';

    container.addEventListener('mousedown', (e) => handleDragStart(e, containerKey));
    container.addEventListener('mousemove', (e) => handleDragMove(e, containerKey));
    container.addEventListener('mouseleave', () => handleDragEnd(containerKey));
    container.addEventListener('mouseup', () => handleDragEnd(containerKey));

    const otherKey = containerKey === 'simulation' ? 'queue' : 'simulation';
    const otherContainer = otherKey === 'simulation'
      ? elements.simulationTableContainer
      : elements.queueTrackerContainer;
    container.addEventListener('scroll', () => {
      syncScroll(container, otherContainer);
    });
  }

  // Playback functions
  function prevStep() {
    if (simulationState.currentStep > 1) {
      simulationState.currentStep--;
      updatePlayback();
    }
  }

  function nextStep() {
    if (simulationState.currentStep < simulationState.steps.length) {
      simulationState.currentStep++;
      updatePlayback();
    }
  }

  function togglePlayPause() {
    simulationState.isPlaying = !simulationState.isPlaying;
    if (simulationState.isPlaying) {
      // If at end, reset to start
      if (simulationState.currentStep >= simulationState.steps.length) {
        simulationState.currentStep = 0;
      }
      startPlayback();
    } else {
      stopPlayback();
    }
    updatePlaybackUI();
  }

  function startPlayback() {
    stopPlayback();
    simulationState.playInterval = setInterval(() => {
      if (simulationState.currentStep < simulationState.steps.length) {
        nextStep();
      } else {
        stopPlayback();
        simulationState.isPlaying = false;
        updatePlaybackUI();
      }
    }, simulationState.playSpeed);
  }

  function stopPlayback() {
    if (simulationState.playInterval) {
      clearInterval(simulationState.playInterval);
      simulationState.playInterval = null;
    }
  }

  function updatePlayback() {
    updatePlaybackUI();
    updateStepInput();
    updateSummary();
    window.buildTable(simulationState.steps, simulationState.frameCount, simulationState.algorithm, simulationState.currentStep);
    window.buildQueueTracker(simulationState.steps, simulationState.algorithm, simulationState.frameCount, simulationState.currentStep);
  }

  function updatePlaybackUI() {
    // Update play/pause button
    if (simulationState.isPlaying) {
      elements.playPauseIcon.className = 'fas fa-pause';
      elements.playPauseText.textContent = 'Pause';
    } else {
      elements.playPauseIcon.className = 'fas fa-play';
      elements.playPauseText.textContent = 'Play';
    }
    // Update prev/next buttons
    elements.prevBtn.disabled = simulationState.currentStep <= 1;
    elements.nextBtn.disabled = simulationState.currentStep >= simulationState.steps.length;
  }

  function updateStepInput() {
    elements.stepInput.value = simulationState.currentStep;
    elements.stepTotal.textContent = `/ ${simulationState.steps.length}`;
  }

  function updateSummary() {
    // Calculate hits/faults up to current step
    let hits = 0;
    let faults = 0;
    for (let i = 0; i < simulationState.currentStep; i++) {
      if (simulationState.steps[i].isHit) {
        hits++;
      } else {
        faults++;
      }
    }
    const totalPages = simulationState.pages.length;
    const hitRatio = totalPages > 0 && simulationState.currentStep > 0 ? (hits / simulationState.currentStep) : 0;
    const faultRatio = totalPages > 0 && simulationState.currentStep > 0 ? (faults / simulationState.currentStep) : 0;
    elements.hitCount.textContent = hits;
    elements.faultCount.textContent = faults;
    elements.hitRatio.textContent = Math.round(hitRatio * 100) + '%';
    elements.faultRatio.textContent = Math.round(faultRatio * 100) + '%';
    elements.summaryFrameCount.textContent = simulationState.frameCount;
  }

  async function runSimulation() {
    // Stop any existing playback
    stopPlayback();
    simulationState.isPlaying = false;

    // Get inputs
    const frameCount = parseInt(elements.frameCountInput.value);
    const referenceString = elements.referenceInput.value.trim();
    const algorithm = elements.algorithmInput.value;

    // Validate inputs
    if (isNaN(frameCount) || frameCount < 1 || frameCount > 100) {
      window.showError('Please enter a valid number of frames (1-100)');
      window.shakeElement(elements.frameCountInput);
      elements.frameCountInput.focus();
      return;
    }

    if (!referenceString) {
      window.showError('Please enter a reference string');
      elements.referenceInput.focus();
      return;
    }

    const pages = window.parseReferenceString(referenceString);
    
    if (pages.length === 0) {
      window.showError('Please enter valid page values');
      elements.referenceInput.focus();
      return;
    }

    if (pages.length > 100) {
      window.showError('Reference string cannot exceed 100 values');
      window.shakeElement(elements.referenceInput);
      elements.referenceInput.focus();
      return;
    }

    // Validate: check mixing numeric and alphabetic
    const validation = window.isValidPageSet(pages);
    if (!validation.valid) {
      window.showError(validation.reason);
      window.shakeElement(elements.referenceInput);
      return;
    }

    // Save reference string to history
    window.saveHistory(referenceString);

    // Show loading
    elements.loadingIndicator.classList.remove('hidden');
    elements.resultsSection.classList.add('hidden-initial');
    elements.resultsSection.style.opacity = '0';

    try {
      // Call PHP API
      const response = await fetch('api/process.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frameCount,
          pages,
          algorithm
        })
      });

      if (!response.ok) {
        throw new Error('Server error');
      }

      const simulationResult = await response.json();

      if (simulationResult.error) {
        throw new Error(simulationResult.error);
      }

      displayResults(simulationResult, frameCount, algorithm, pages);
      
      elements.loadingIndicator.classList.add('hidden');
      elements.resultsSection.classList.remove('hidden-initial');
      elements.resultsSection.style.display = 'block';
      
      // Trigger reflow for transition
      void elements.resultsSection.offsetWidth;
      elements.resultsSection.style.opacity = '1';

      // Notify user
      window.showSuccess('Simulation Complete');
      elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      elements.loadingIndicator.classList.add('hidden');
      window.showError('Error running simulation: ' + error.message);
    }
  }

  function displayResults(result, frameCount, algorithm, pages) {
    // Save simulation state
    simulationState = {
      steps: result.steps,
      frameCount,
      algorithm,
      pages,
      currentStep: result.steps.length,
      isPlaying: false,
      playInterval: null,
      playSpeed: 1000
    };

    const totalPages = pages.length;
    const hitRatio = totalPages > 0 ? result.hits / totalPages : 0;
    const faultRatio = totalPages > 0 ? result.faults / totalPages : 0;

    // Update modal state
    if (window._ratioModalState) {
      window._ratioModalState.hits = result.hits;
      window._ratioModalState.faults = result.faults;
      window._ratioModalState.total = totalPages;
      window._ratioModalState.frameCount = frameCount;
    }

    // Update UI
    elements.hitCount.textContent = result.hits;
    elements.faultCount.textContent = result.faults;
    elements.hitRatio.textContent = Math.round(hitRatio * 100) + '%';
    elements.faultRatio.textContent = Math.round(faultRatio * 100) + '%';
    elements.summaryFrameCount.textContent = frameCount;
    elements.summaryRefString.textContent = pages.length;

    // Update algorithm explanation
    const explanation = window.ALGORITHM_EXPLANATIONS[algorithm];
    elements.algoTitle.textContent = explanation.title;
    elements.algoExplanation.textContent = explanation.text;

    // Build tables
    window.buildTable(result.steps, frameCount, algorithm);
    window.buildQueueTracker(result.steps, algorithm, frameCount);

    // Update playback UI
    updateStepInput();
    updatePlaybackUI();
  }

  // Event Listeners
  document.addEventListener('DOMContentLoaded', () => {
    initializeCache();
    window.initTheme();

    // Reference string input
    if (elements.referenceInput) {
      elements.referenceInput.addEventListener('input', () => window.validateInputType(elements.referenceInput));
      elements.referenceInput.addEventListener('keypress', e => e.key === 'Enter' && runSimulation());
    }

    // Frame count controls
    if (elements.frameIncrement) {
      elements.frameIncrement.addEventListener('click', incrementFrameCount);
    }
    if (elements.frameDecrement) {
      elements.frameDecrement.addEventListener('click', decrementFrameCount);
    }
    // Frame count input validation (ensure only numbers, 1-100)
    if (elements.frameCountInput) {
      elements.frameCountInput.addEventListener('keypress', e => e.key === 'Enter' && runSimulation());
      elements.frameCountInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value === '') {
          e.target.value = '';
        } else {
          let num = parseInt(value);
          if (num < 1) num = 1;
          if (num > 100) num = 100;
          e.target.value = num;
        }
      });
    }

    // Playback controls
    if (elements.prevBtn) {
      elements.prevBtn.addEventListener('click', prevStep);
    }
    if (elements.nextBtn) {
      elements.nextBtn.addEventListener('click', nextStep);
    }
    if (elements.playPauseBtn) {
      elements.playPauseBtn.addEventListener('click', togglePlayPause);
    }
    if (elements.stepInput) {
      elements.stepInput.addEventListener('change', (e) => {
        let newStep = parseInt(e.target.value);
        if (isNaN(newStep) || newStep < 1) newStep = 1;
        if (newStep > simulationState.steps.length) newStep = simulationState.steps.length;
        simulationState.currentStep = newStep;
        updatePlayback();
      });
    }

    // Scroll lock toggle
    if (elements.scrollLockBtn) {
      elements.scrollLockBtn.addEventListener('click', toggleScrollLock);
    }

    // Table containers: drag-to-scroll + scroll sync
    attachContainerListeners(elements.simulationTableContainer, 'simulation');
    attachContainerListeners(elements.queueTrackerContainer, 'queue');

    // Visual viewport resize
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        const modal = document.getElementById('ratioModal');
        if (modal && modal.style.display === 'flex') {
          modal.style.display = 'none';
          void modal.offsetWidth;
          modal.style.display = 'flex';
        }
        window.dispatchEvent(new Event('resize'));
      });
    }
  });

  // Expose functions
  window.runSimulation = runSimulation;
  window.displayResults = displayResults;
  window.stopPlayback = stopPlayback;
  window.formatRatio = formatRatio;
  window.toggleScrollLock = toggleScrollLock;
})();
