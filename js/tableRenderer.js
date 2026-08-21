(function() {
  // Centralized cell styles for consistency
  const CELL_STYLES = {
    empty: 'background: var(--frame-empty-bg); border-color: var(--frame-empty-border); color: var(--frame-empty-text);',
    filled: 'background: var(--frame-filled-bg); border-color: var(--frame-filled-border); color: var(--frame-filled-text);',
    hit: 'background: var(--hit-cell-bg); border-color: var(--hit-cell-border); color: var(--hit-cell-text);',
    fault: 'background: var(--fault-cell-bg); border-color: var(--fault-cell-border); color: var(--fault-cell-text);',
    queueHit: 'background: var(--queue-hit-bg); border-color: var(--queue-hit-border); color: var(--queue-hit-text); font-weight: 700;',
    refCell: 'background: var(--ref-cell-bg); border-color: var(--ref-cell-border); color: var(--text-primary);'
  };

  // Helper: Create a cell with an inner div for styling/animation
  function createTableCell(innerDivClasses, animationDelay, innerDivStyle, content) {
    const cell = document.createElement('td');
    cell.className = 'sim-cell text-center px-2 py-2 min-w-[52px]';
    
    const innerDiv = document.createElement('div');
    innerDiv.className = innerDivClasses;
    if (animationDelay) innerDiv.style.animationDelay = animationDelay;
    if (innerDivStyle) innerDiv.style.cssText = innerDivStyle;
    innerDiv.textContent = content;
    
    cell.appendChild(innerDiv);
    return cell;
  }

  // Helper: Create table header cell
  function createTableHeader(text, additionalClass = '') {
    const th = document.createElement('th');
    th.className = `text-left text-xs font-semibold uppercase tracking-wider px-3 py-3 w-28 flex-shrink-0 ${additionalClass}`;
    th.style.color = 'var(--table-header-text)';
    th.textContent = text;
    return th;
  }

  function buildTable(steps, frameCount, algorithm, currentStep = steps.length) {
    const container = document.getElementById('simulationTableContainer');
    // Clear existing content
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const table = document.createElement('table');
    table.className = 'w-full border-collapse';

    // --- Row 1: Reference String ---
    const refRow = document.createElement('tr');
    const refHeader = createTableHeader('Reference');
    refHeader.style.borderBottom = '2px solid var(--border-color)';
    refRow.appendChild(refHeader);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const cell = document.createElement('td');
      cell.className = 'sim-cell text-center px-2 py-3 min-w-[52px]';
      cell.style.borderBottom = '2px solid var(--border-color)';

      const innerDiv = document.createElement('div');
      innerDiv.className = `w-10 h-10 mx-auto rounded-xl border flex items-center justify-center font-bold text-lg ${i < currentStep ? 'cell-enter' : 'opacity-30'}`;
      if (i < currentStep) {
        innerDiv.style.animationDelay = `${i * 0.03}s`;
      }
      innerDiv.style.cssText = CELL_STYLES.refCell;
      innerDiv.textContent = step.page;

      cell.appendChild(innerDiv);
      refRow.appendChild(cell);
    }
    table.appendChild(refRow);

    // --- Rows 2 to (frameCount+1): Frames ---
    for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
      const frameRow = document.createElement('tr');
      const frameHeader = createTableHeader(`Frame ${frameIdx + 1}`);
      frameRow.appendChild(frameHeader);

      for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
        const step = steps[stepIdx];
        const value = frameIdx < step.memory.length ? step.memory[frameIdx] : '';
        let bgClass = '';
        let cellStyle = CELL_STYLES.empty;
        let content = stepIdx < currentStep ? (value || '\u2014') : '';

        if (stepIdx < currentStep && value) {
          const isNewCell = step.memory[frameIdx] === step.page;
          if (isNewCell) {
            if (step.isHit) {
              bgClass = 'animate-pulse-glow font-bold';
              cellStyle = CELL_STYLES.hit;
            } else {
              bgClass = 'animate-pulse-glow-red font-bold';
              cellStyle = CELL_STYLES.fault;
            }
          } else {
            cellStyle = CELL_STYLES.filled;
          }
        }

        const cell = createTableCell(
          `w-10 h-10 mx-auto rounded-xl border flex items-center justify-center text-sm ${bgClass} ${stepIdx < currentStep ? 'cell-enter' : 'opacity-0'}`,
          stepIdx < currentStep ? `${(stepIdx * 0.03) + (frameIdx * 0.05)}s` : '',
          cellStyle,
          content
        );

        frameRow.appendChild(cell);
      }
      table.appendChild(frameRow);
    }

    // --- Last Row: Hit/Fault ---
    const resultRow = document.createElement('tr');
    const resultHeader = createTableHeader('Result');
    resultRow.appendChild(resultHeader);

    for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
      const step = steps[stepIdx];
      const isHit = step.isHit;
      const extraClass = (stepIdx < currentStep && !isHit) ? 'animate-pulse-glow-red' : '';
      const cellStyle = stepIdx < currentStep 
        ? (isHit ? CELL_STYLES.hit : CELL_STYLES.fault)
        : CELL_STYLES.empty;

      const cell = createTableCell(
        `w-10 h-10 mx-auto rounded-xl border flex items-center justify-center text-[10px] font-bold ${extraClass} ${stepIdx < currentStep ? 'cell-enter' : 'opacity-0'}`,
        stepIdx < currentStep ? `${(stepIdx * 0.03) + (frameCount * 0.05)}s` : '',
        cellStyle,
        stepIdx < currentStep ? (isHit ? 'HIT' : 'FAULT') : ''
      );

      resultRow.appendChild(cell);
    }
    table.appendChild(resultRow);

    container.appendChild(table);
  }

  function buildQueueTracker(steps, algorithm, frameCount, currentStep = steps.length) {
    const container = document.getElementById('queueTrackerContainer');
    // Clear existing content
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const n = steps.length;
    const labelWidthClass = n > 19 ? 'w-44' : 'w-32';

    const table = document.createElement('table');
    table.className = 'w-full border-collapse';

    // --- Row 1: Reference (with highlight) ---
    const refRow = document.createElement('tr');
    const refHeader = document.createElement('th');
    refHeader.className = `text-left text-xs font-semibold uppercase tracking-wider px-3 py-2 ${labelWidthClass} flex-shrink-0`;
    refHeader.style.color = 'var(--table-header-text)';
    refHeader.style.borderBottom = '2px solid var(--border-color)';
    refHeader.textContent = 'Reference';
    refRow.appendChild(refHeader);

    for (let i = 0; i < n; i++) {
      const step = steps[i];
      const style = i < currentStep && step.isHit ? CELL_STYLES.queueHit : CELL_STYLES.refCell;

      const cell = document.createElement('td');
      cell.className = 'sim-cell text-center px-2 py-2 min-w-[52px]';
      cell.style.borderBottom = '2px solid var(--border-color)';

      const innerDiv = document.createElement('div');
      innerDiv.className = `w-10 h-10 mx-auto rounded-xl border flex items-center justify-center font-bold text-lg ${i < currentStep ? 'cell-enter' : 'opacity-30'}`;
      innerDiv.style.cssText = style;
      innerDiv.textContent = step.page;

      cell.appendChild(innerDiv);
      refRow.appendChild(cell);
    }
    table.appendChild(refRow);

    // --- Queue Position Rows ---
    for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
      const frameRow = document.createElement('tr');
      const frameHeader = document.createElement('th');
      frameHeader.className = `text-left text-xs font-semibold uppercase tracking-wider px-3 py-2 ${labelWidthClass} flex-shrink-0 whitespace-nowrap`;
      frameHeader.style.color = 'var(--table-header-text)';
      frameHeader.textContent = `Frame ${frameIdx + 1}`;
      frameRow.appendChild(frameHeader);

      for (let stepIdx = 0; stepIdx < n; stepIdx++) {
        const step = steps[stepIdx];
        const queue = step.queue;
        const queueLen = queue.length;
        const qPos = queueLen - 1 - frameIdx;

        let cellContent = stepIdx < currentStep ? '\u2014' : '';
        let cellStyle = CELL_STYLES.empty;
        let innerClass = 'w-10 h-10 mx-auto rounded-xl border flex items-center justify-center text-sm';

        if (stepIdx < currentStep && qPos >= 0 && qPos < queueLen) {
          const pageVal = queue[qPos];
          const isHitCell = step.isHit && pageVal === step.page;
          cellStyle = isHitCell ? CELL_STYLES.queueHit : CELL_STYLES.filled;
          cellContent = pageVal;
          innerClass = `cell-enter ${innerClass} font-semibold`;
        } else if (stepIdx >= currentStep) {
          innerClass += ' opacity-0';
        }

        const cell = document.createElement('td');
        cell.className = 'sim-cell text-center px-2 py-2 min-w-[52px]';
        
        const innerDiv = document.createElement('div');
        innerDiv.className = innerClass;
        if (stepIdx < currentStep && qPos >= 0 && qPos < queueLen) {
          innerDiv.style.animationDelay = `${stepIdx * 0.02}s`;
        }
        innerDiv.style.cssText = cellStyle;
        innerDiv.textContent = cellContent;
        
        cell.appendChild(innerDiv);
        frameRow.appendChild(cell);
      }
      table.appendChild(frameRow);
    }

    // --- Note Row ---
    const noteRow = document.createElement('tr');
    const noteCell = document.createElement('td');
    noteCell.colSpan = n + 1;
    noteCell.className = 'px-3 py-2 text-xs';
    noteCell.style.color = 'var(--helper-text)';

    const noteIcon = document.createElement('i');
    noteIcon.className = 'fas fa-info-circle mr-1';
    noteCell.appendChild(noteIcon);

    let noteText = algorithm === 'FIFO' 
      ? 'Frame 1 = Newest page. Frame N = Oldest page (next to evict). On hit, the queue is unchanged. On miss, Frame N is evicted and the new page is added to Frame 1. Columns highlighted in ' 
      : 'Frame 1 = Most Recently Used. Frame N = Least Recently Used (next to evict). On hit, the accessed page is moved to Frame 1 to mark it as MRU. On miss, Frame N is evicted and the new page is added to Frame 1. Columns highlighted in ';
    noteCell.appendChild(document.createTextNode(noteText));

    const highlightText = document.createElement('span');
    highlightText.style.color = '#fde047';
    highlightText.style.fontWeight = '700';
    highlightText.textContent = 'yellow';
    noteCell.appendChild(highlightText);

    noteCell.appendChild(document.createTextNode(' are hits.'));
    noteRow.appendChild(noteCell);
    table.appendChild(noteRow);

    container.appendChild(table);
  }

  // Expose to window
  window.buildTable = buildTable;
  window.buildQueueTracker = buildQueueTracker;
})();
