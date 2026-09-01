(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STORAGE_KEY = 'fnnl-state-v2';
  const LEGACY_STORAGE_KEY = 'funnel-flow-chart-builder-state-v1';
  const MIN_STAGES = 2;
  const MAX_STAGES = 10;
  const MIN_VARIABLES = 1;
  const MAX_VARIABLES = 10;
  const FONT_STACK = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';

  const CHART = {
    width: 1280,
    height: 720,
    left: 40,
    right: 1240,
    top: 150
  };

  const THEMES = {
    midnight: {
      chartBg: '#393862',
      text: '#ffffff',
      muted: '#aaa7d8',
      percent: '#a7a2d8',
      accent: '#23ffba',
      guide: '#9aa3ff',
      guideOpacity: 0.74,
      bandOpacity: 0.98,
      bandStroke: 'rgba(255,255,255,0.08)',
      empty: '#aaa7d8'
    },
    white: {
      chartBg: '#ffffff',
      text: '#172033',
      muted: '#667085',
      percent: '#667085',
      accent: '#0d9488',
      guide: '#bac3df',
      guideOpacity: 0.88,
      bandOpacity: 0.88,
      bandStroke: 'rgba(23,32,51,0.08)',
      empty: '#667085'
    }
  };

  const DEFAULT_NAMES = [
    'Direct', 'Social Media', 'Ads', 'Email', 'Referral', 'Organic', 'Paid Search', 'Affiliate', 'Display', 'Video',
    'Events', 'Partners', 'Influencer', 'Podcast', 'Webinar', 'Community', 'Retargeting', 'Marketplace', 'Print', 'Other'
  ];

  const DEFAULT_COLORS = [
    '#ff4ea3', '#b38cff', '#84eff8', '#ffb06d', '#63df9b', '#6e9cff', '#ffd166', '#e978ff', '#4cc9f0', '#ff7b7b',
    '#9dffb0', '#f2a65a', '#7bdff2', '#c77dff', '#80ed99', '#f72585', '#4361ee', '#fca311', '#52b788', '#adb5bd'
  ];

  const PRESET_GRADIENTS = {
    midnight: [
      ['#ffb06d', '#ff3fa8'],
      ['#9ba8ff', '#c18bff'],
      ['#8ff7ef', '#82b8ff'],
      ['#ffd18f', '#ff7a75'],
      ['#9dffce', '#34d399'],
      ['#9dc2ff', '#647bff'],
      ['#ffe391', '#f59e0b'],
      ['#ffb3ff', '#d946ef'],
      ['#85eaff', '#38bdf8'],
      ['#ffb0b0', '#ef4444']
    ],
    white: [
      ['#ff9acb', '#ff3f9b'],
      ['#c7b4ff', '#8b5cf6'],
      ['#9df4f8', '#4f9dff'],
      ['#ffc58e', '#ff6b57'],
      ['#9df4c3', '#22c55e'],
      ['#9bc2ff', '#4968ff'],
      ['#ffe08a', '#f59e0b'],
      ['#f0abfc', '#c026d3'],
      ['#8ddcff', '#0284c7'],
      ['#ffa8a8', '#dc2626']
    ]
  };

  let state = loadState() || sampleState();
  normalizeState();

  const els = {};
  let statusTimer = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    els.chartTitle = document.getElementById('chartTitle');
    els.stageCount = document.getElementById('stageCount');
    els.variableCount = document.getElementById('variableCount');
    els.variableCountText = document.getElementById('variableCountText');
    els.addVariableBtn = document.getElementById('addVariableBtn');
    els.removeVariableBtn = document.getElementById('removeVariableBtn');
    els.themeSelect = document.getElementById('themeSelect');
    els.percentBasis = document.getElementById('percentBasis');
    els.showGeneratedAt = document.getElementById('showGeneratedAt');
    els.smoothing = document.getElementById('smoothing');
    els.stageFields = document.getElementById('stageFields');
    els.dataTable = document.getElementById('dataTable');
    els.chartSvg = document.getElementById('chartSvg');
    els.summaryText = document.getElementById('summaryText');
    els.statusText = document.getElementById('statusText');
    els.sampleBtn = document.getElementById('sampleBtn');
    els.clearValuesBtn = document.getElementById('clearValuesBtn');
    els.exportPngBtn = document.getElementById('exportPngBtn');
    els.exportScale = document.getElementById('exportScale');
    els.csvInput = document.getElementById('csvInput');
    els.importCsvBtn = document.getElementById('importCsvBtn');
    els.copyCsvBtn = document.getElementById('copyCsvBtn');
    els.downloadCsvBtn = document.getElementById('downloadCsvBtn');

    bindEvents();
    hydrateControls();
    applyTheme();
    buildStageFields();
    buildDataTable();
    renderChartAndPersist(false);
  }

  function bindEvents() {
    els.chartTitle.addEventListener('input', () => {
      state.title = String(els.chartTitle.value || '').slice(0, 90);
      renderChartAndPersist();
    });

    els.stageCount.addEventListener('change', () => {
      state.stageCount = clampInt(els.stageCount.value, MIN_STAGES, MAX_STAGES);
      normalizeState();
      hydrateControls();
      buildStageFields();
      buildDataTable();
      renderChartAndPersist();
      showStatus(`Stage count set to ${state.stageCount}.`);
    });

    els.variableCount.addEventListener('change', () => {
      state.variableCount = clampInt(els.variableCount.value, MIN_VARIABLES, MAX_VARIABLES);
      normalizeState();
      hydrateControls();
      buildDataTable();
      renderChartAndPersist();
      showStatus(`Variable count set to ${state.variableCount}.`);
    });

    els.addVariableBtn.addEventListener('click', addVariable);
    els.removeVariableBtn.addEventListener('click', () => removeVariable(state.variableCount - 1));

    els.themeSelect.addEventListener('change', () => {
      state.theme = THEMES[els.themeSelect.value] ? els.themeSelect.value : 'midnight';
      applyTheme();
      renderChartAndPersist();
    });

    els.percentBasis.addEventListener('change', () => {
      state.percentBasis = ['first', 'previous', 'none'].includes(els.percentBasis.value) ? els.percentBasis.value : 'first';
      renderChartAndPersist();
    });

    els.showGeneratedAt.addEventListener('change', () => {
      state.showGeneratedAt = Boolean(els.showGeneratedAt.checked);
      renderChartAndPersist();
      showStatus(state.showGeneratedAt ? 'Generated date/time stamp enabled.' : 'Generated date/time stamp hidden.');
    });

    els.smoothing.addEventListener('input', () => {
      state.smoothing = clampNumber(els.smoothing.value, 0, 0.65);
      renderChartAndPersist();
    });

    els.stageFields.addEventListener('input', (event) => {
      const input = event.target.closest('[data-stage-index]');
      if (!input) return;
      const stageIndex = Number(input.dataset.stageIndex);
      if (!Number.isInteger(stageIndex) || !state.stages[stageIndex]) return;
      state.stages[stageIndex].label = input.value;
      buildDataTable();
      renderChartAndPersist();
    });

    els.dataTable.addEventListener('input', (event) => {
      const input = event.target;
      const rowIndex = Number(input.dataset.varIndex);
      if (!Number.isInteger(rowIndex) || !state.variables[rowIndex]) return;

      if (input.dataset.field === 'name') {
        state.variables[rowIndex].name = input.value;
      }

      if (input.dataset.field === 'color') {
        state.variables[rowIndex].color = normalizeHex(input.value, DEFAULT_COLORS[rowIndex % DEFAULT_COLORS.length]);
      }

      if (input.dataset.field === 'value') {
        const stageIndex = Number(input.dataset.stageIndex);
        if (Number.isInteger(stageIndex)) {
          state.variables[rowIndex].values[stageIndex] = parseNumber(input.value);
        }
      }

      renderChartAndPersist();
    });

    els.dataTable.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="remove-variable"]');
      if (!button) return;
      const rowIndex = Number(button.dataset.varIndex);
      if (!Number.isInteger(rowIndex)) return;
      removeVariable(rowIndex);
    });

    els.sampleBtn.addEventListener('click', () => {
      state = sampleState();
      normalizeState();
      hydrateControls();
      applyTheme();
      buildStageFields();
      buildDataTable();
      renderChartAndPersist();
      showStatus('Loaded the screenshot-style sample data.');
    });

    els.clearValuesBtn.addEventListener('click', () => {
      state.variables.forEach((variable) => {
        variable.values = Array.from({ length: state.stageCount }, () => 0);
      });
      buildDataTable();
      renderChartAndPersist();
      showStatus('All values cleared.');
    });

    els.exportPngBtn.addEventListener('click', exportPng);
    els.importCsvBtn.addEventListener('click', importCsv);
    els.copyCsvBtn.addEventListener('click', copyCurrentCsv);
    els.downloadCsvBtn.addEventListener('click', downloadCsv);
  }

  function sampleState() {
    return {
      title: '',
      theme: 'midnight',
      showGeneratedAt: false,
      stageCount: 3,
      variableCount: 3,
      percentBasis: 'first',
      smoothing: 0.45,
      stages: [
        { label: 'Impressions' },
        { label: 'Add To Cart' },
        { label: 'Buy' }
      ],
      variables: [
        { name: 'Direct', color: '#ff4ea3', values: [3500, 2500, 650] },
        { name: 'Social Media', color: '#b38cff', values: [2500, 1200, 120] },
        { name: 'Ads', color: '#84eff8', values: [6500, 2000, 160] }
      ]
    };
  }

  function normalizeState() {
    state.title = String(state.title ?? '').slice(0, 90);
    state.theme = THEMES[state.theme] ? state.theme : 'midnight';
    state.showGeneratedAt = state.showGeneratedAt === true || state.showGeneratedAt === 'true' || state.showGeneratedAt === 'on';
    state.stageCount = clampInt(state.stageCount, MIN_STAGES, MAX_STAGES);
    state.variableCount = clampInt(
      state.variableCount ?? (Array.isArray(state.variables) ? state.variables.length : MIN_VARIABLES),
      MIN_VARIABLES,
      MAX_VARIABLES
    );
    state.percentBasis = ['first', 'previous', 'none'].includes(state.percentBasis) ? state.percentBasis : 'first';
    state.smoothing = clampNumber(state.smoothing, 0, 0.65);

    if (!Array.isArray(state.stages)) state.stages = [];
    while (state.stages.length < state.stageCount) {
      state.stages.push({ label: `Stage ${state.stages.length + 1}` });
    }
    state.stages = state.stages.slice(0, state.stageCount).map((stage, index) => ({
      label: String(stage && stage.label ? stage.label : `Stage ${index + 1}`)
    }));

    if (!Array.isArray(state.variables)) state.variables = [];
    while (state.variables.length < state.variableCount) {
      state.variables.push(createDefaultVariable(state.variables.length));
    }
    state.variables = state.variables.slice(0, state.variableCount).map((variable, index) => {
      const values = Array.isArray(variable.values) ? variable.values.slice(0, state.stageCount) : [];
      while (values.length < state.stageCount) values.push(0);
      return {
        name: String(variable.name || DEFAULT_NAMES[index] || `Variable ${index + 1}`),
        color: normalizeHex(variable.color, DEFAULT_COLORS[index % DEFAULT_COLORS.length]),
        values: values.map(parseNumber)
      };
    });
    state.variableCount = state.variables.length;
  }

  function hydrateControls() {
    els.chartTitle.value = state.title;
    els.stageCount.value = state.stageCount;
    els.variableCount.value = state.variableCount;
    els.themeSelect.value = state.theme;
    els.percentBasis.value = state.percentBasis;
    els.showGeneratedAt.checked = Boolean(state.showGeneratedAt);
    els.smoothing.value = state.smoothing;
    updateVariableControls();
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
  }

  function buildStageFields() {
    const fragment = document.createDocumentFragment();
    state.stages.forEach((stage, index) => {
      const label = document.createElement('label');
      const span = document.createElement('span');
      span.textContent = `Stage ${index + 1}`;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = stage.label;
      input.dataset.stageIndex = String(index);
      input.maxLength = 36;
      input.setAttribute('aria-label', `Stage ${index + 1} label`);
      label.append(span, input);
      fragment.appendChild(label);
    });
    els.stageFields.replaceChildren(fragment);
  }

  function buildDataTable() {
    const table = els.dataTable;
    table.replaceChildren();

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Variable', 'Color', ...state.stages.map((stage) => stage.label || 'Untitled'), 'Remove'].forEach((labelText) => {
      const th = document.createElement('th');
      th.textContent = labelText;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const tbody = document.createElement('tbody');
    state.variables.forEach((variable, rowIndex) => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'var-name-input';
      nameInput.value = variable.name;
      nameInput.maxLength = 40;
      nameInput.dataset.varIndex = String(rowIndex);
      nameInput.dataset.field = 'name';
      nameInput.setAttribute('aria-label', `Variable ${rowIndex + 1} name`);
      nameCell.appendChild(nameInput);
      row.appendChild(nameCell);

      const colorCell = document.createElement('td');
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'color-input';
      colorInput.value = variable.color;
      colorInput.dataset.varIndex = String(rowIndex);
      colorInput.dataset.field = 'color';
      colorInput.setAttribute('aria-label', `${variable.name || `Variable ${rowIndex + 1}`} color`);
      colorCell.appendChild(colorInput);
      row.appendChild(colorCell);

      state.stages.forEach((stage, stageIndex) => {
        const valueCell = document.createElement('td');
        const valueInput = document.createElement('input');
        valueInput.type = 'number';
        valueInput.min = '0';
        valueInput.step = 'any';
        valueInput.inputMode = 'decimal';
        valueInput.className = 'value-input';
        valueInput.value = variable.values[stageIndex] || 0;
        valueInput.dataset.varIndex = String(rowIndex);
        valueInput.dataset.stageIndex = String(stageIndex);
        valueInput.dataset.field = 'value';
        valueInput.setAttribute('aria-label', `${variable.name || `Variable ${rowIndex + 1}`} value for ${stage.label || `Stage ${stageIndex + 1}`}`);
        valueCell.appendChild(valueInput);
        row.appendChild(valueCell);
      });

      const actionCell = document.createElement('td');
      actionCell.className = 'action-cell';
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'button ghost compact-button row-remove-button';
      removeButton.textContent = 'Remove';
      removeButton.dataset.action = 'remove-variable';
      removeButton.dataset.varIndex = String(rowIndex);
      removeButton.disabled = state.variableCount <= MIN_VARIABLES;
      removeButton.setAttribute('aria-label', `Remove ${variable.name || `Variable ${rowIndex + 1}`}`);
      actionCell.appendChild(removeButton);
      row.appendChild(actionCell);

      tbody.appendChild(row);
    });

    table.append(thead, tbody);
    updateVariableControls();
  }

  function addVariable() {
    normalizeState();
    if (state.variableCount >= MAX_VARIABLES) {
      showStatus(`Maximum of ${MAX_VARIABLES} variables reached.`);
      updateVariableControls();
      return;
    }

    const variable = createDefaultVariable(state.variables.length);
    state.variables.push(variable);
    state.variableCount = state.variables.length;
    normalizeState();
    hydrateControls();
    buildDataTable();
    renderChartAndPersist();
    showStatus(`Added ${variable.name}.`);
  }

  function removeVariable(index) {
    normalizeState();
    if (state.variableCount <= MIN_VARIABLES) {
      showStatus(`At least ${MIN_VARIABLES} variable is required.`);
      updateVariableControls();
      return;
    }

    const rowIndex = clampInt(index, 0, state.variableCount - 1);
    const removed = state.variables.splice(rowIndex, 1)[0];
    state.variableCount = state.variables.length;
    normalizeState();
    hydrateControls();
    buildDataTable();
    renderChartAndPersist();
    showStatus(`Removed ${removed && removed.name ? removed.name : 'variable'}.`);
  }

  function createDefaultVariable(index) {
    return {
      name: getNextVariableName(),
      color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      values: Array.from({ length: state.stageCount }, () => 0)
    };
  }

  function getNextVariableName() {
    const usedNames = new Set((state.variables || []).map((variable) => String(variable.name || '').trim().toLowerCase()).filter(Boolean));
    const defaultName = DEFAULT_NAMES.find((name) => !usedNames.has(name.toLowerCase()));
    if (defaultName) return defaultName;

    for (let index = 1; index <= MAX_VARIABLES; index += 1) {
      const candidate = `Variable ${index}`;
      if (!usedNames.has(candidate.toLowerCase())) return candidate;
    }

    return `Variable ${Math.min(MAX_VARIABLES, state.variableCount + 1)}`;
  }

  function updateVariableControls() {
    if (els.variableCountText) {
      els.variableCountText.textContent = `${state.variableCount} / ${MAX_VARIABLES} variables`;
    }
    if (els.addVariableBtn) {
      els.addVariableBtn.disabled = state.variableCount >= MAX_VARIABLES;
    }
    if (els.removeVariableBtn) {
      els.removeVariableBtn.disabled = state.variableCount <= MIN_VARIABLES;
    }
  }

  function renderChartAndPersist(shouldPersist = true) {
    renderChart();
    if (shouldPersist) persistState();
  }

  function renderChart() {
    const svg = els.chartSvg;
    const cfg = THEMES[state.theme];
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${CHART.width} ${CHART.height}`);
    svg.setAttribute('width', CHART.width);
    svg.setAttribute('height', CHART.height);
    svg.setAttribute('font-family', FONT_STACK);

    const svgTitle = svgNode('title');
    svgTitle.textContent = getChartTitle() || 'FNNL funnel chart';
    svg.appendChild(svgTitle);

    const background = svgNode('rect', {
      x: 0,
      y: 0,
      width: CHART.width,
      height: CHART.height,
      fill: cfg.chartBg
    });
    svg.appendChild(background);

    const activeVariables = getActiveVariables();
    const totals = calculateTotals(activeVariables);
    updateSummary(totals);
    svg.setAttribute('aria-label', makeAriaLabel(totals));

    const defs = svgNode('defs');
    activeVariables.forEach((variable, index) => {
      const gradient = svgNode('linearGradient', {
        id: gradientId(index),
        x1: '0%',
        x2: '100%',
        y1: '0%',
        y2: '0%'
      });
      const [start, end] = getGradientStops(variable.color, index);
      gradient.appendChild(svgNode('stop', { offset: '0%', 'stop-color': start }));
      gradient.appendChild(svgNode('stop', { offset: '100%', 'stop-color': end }));
      defs.appendChild(gradient);
    });
    svg.appendChild(defs);

    const legendRows = buildLegendRows(activeVariables);
    const layout = getChartLayout(legendRows, activeVariables);
    const chartBottom = layout.chartBottom;
    const chartHeight = Math.max(260, chartBottom - layout.chartTop);
    const centerY = layout.chartTop + chartHeight / 2;
    const maxTotal = Math.max(...totals, 0);
    const gap = (CHART.right - CHART.left) / state.stageCount;
    const stageX = state.stages.map((_, index) => CHART.left + index * gap);
    const pathX = [...stageX, CHART.right];

    if (maxTotal > 0) {
      const { tops, bottoms } = calculateRibbons(activeVariables, totals, maxTotal, chartHeight, centerY);

      activeVariables.forEach((variable, index) => {
        if (variable.values.every((value) => value <= 0)) return;
        const d = makeRibbonPath(pathX, tops[index], bottoms[index], state.smoothing);
        if (!d) return;
        const path = svgNode('path', {
          d,
          fill: `url(#${gradientId(index)})`,
          opacity: cfg.bandOpacity,
          stroke: cfg.bandStroke,
          'stroke-width': 1
        });
        const title = svgNode('title');
        title.textContent = makeVariableTitle(variable);
        path.appendChild(title);
        svg.appendChild(path);
      });
    } else {
      drawEmptyMessage(svg, cfg, centerY);
    }

    drawGuides(svg, cfg, stageX, chartBottom, layout);
    drawStageLabels(svg, cfg, totals, stageX, gap, layout);
    drawLegend(svg, cfg, activeVariables, legendRows, layout);
    drawChartTitle(svg, cfg, layout);
    drawGeneratedAt(svg, cfg);
  }

  function getActiveVariables() {
    return state.variables.slice(0, state.variableCount).map((variable, index) => ({
      name: variable.name || DEFAULT_NAMES[index] || `Variable ${index + 1}`,
      color: normalizeHex(variable.color, DEFAULT_COLORS[index % DEFAULT_COLORS.length]),
      values: variable.values.slice(0, state.stageCount).map(parseNumber)
    }));
  }

  function calculateTotals(variables) {
    return state.stages.map((_, stageIndex) => variables.reduce((sum, variable) => sum + parseNumber(variable.values[stageIndex]), 0));
  }

  function getChartTitle() {
    return String(state.title || '').trim();
  }

  function getChartLayout(legendRows, variables) {
    const hasTitle = Boolean(getChartTitle());
    const legendRowHeight = variables && variables.length > 10 ? 22 : 26;
    const generatedAtOffset = state.showGeneratedAt ? 24 : 0;
    const titleOffset = hasTitle ? 48 : 0;

    return {
      hasTitle,
      titleY: 40,
      titleMaxLength: state.stageCount > 6 ? 56 : 72,
      titleOffset,
      chartTop: CHART.top + titleOffset,
      guideTop: hasTitle ? 76 : 28,
      generatedAtOffset,
      chartBottom: CHART.height - 92 - generatedAtOffset - Math.max(0, (legendRows || []).length - 1) * legendRowHeight
    };
  }

  function calculateRibbons(variables, totals, maxTotal, chartHeight, centerY) {
    const tops = variables.map(() => []);
    const bottoms = variables.map(() => []);

    state.stages.forEach((_, stageIndex) => {
      const totalHeight = (totals[stageIndex] / maxTotal) * chartHeight;
      let cursorY = centerY - totalHeight / 2;

      variables.forEach((variable, variableIndex) => {
        const bandHeight = (parseNumber(variable.values[stageIndex]) / maxTotal) * chartHeight;
        tops[variableIndex].push(cursorY);
        bottoms[variableIndex].push(cursorY + bandHeight);
        cursorY += bandHeight;
      });
    });

    variables.forEach((_, variableIndex) => {
      tops[variableIndex].push(tops[variableIndex][tops[variableIndex].length - 1]);
      bottoms[variableIndex].push(bottoms[variableIndex][bottoms[variableIndex].length - 1]);
    });

    return { tops, bottoms };
  }

  function makeRibbonPath(xPoints, topPoints, bottomPoints, smoothing) {
    if (xPoints.length < 2 || topPoints.length !== xPoints.length || bottomPoints.length !== xPoints.length) return '';

    let d = `M ${round(xPoints[0])} ${round(topPoints[0])}`;
    for (let index = 0; index < xPoints.length - 1; index += 1) {
      const x0 = xPoints[index];
      const x1 = xPoints[index + 1];
      const y0 = topPoints[index];
      const y1 = topPoints[index + 1];
      const dx = (x1 - x0) * smoothing;
      d += ` C ${round(x0 + dx)} ${round(y0)}, ${round(x1 - dx)} ${round(y1)}, ${round(x1)} ${round(y1)}`;
    }

    d += ` L ${round(xPoints[xPoints.length - 1])} ${round(bottomPoints[bottomPoints.length - 1])}`;

    for (let index = xPoints.length - 1; index > 0; index -= 1) {
      const x0 = xPoints[index];
      const x1 = xPoints[index - 1];
      const y0 = bottomPoints[index];
      const y1 = bottomPoints[index - 1];
      const dx = (x0 - x1) * smoothing;
      d += ` C ${round(x0 - dx)} ${round(y0)}, ${round(x1 + dx)} ${round(y1)}, ${round(x1)} ${round(y1)}`;
    }

    d += ' Z';
    return d;
  }

  function drawGuides(svg, cfg, stageX, chartBottom, layout) {
    const guideTop = layout && Number.isFinite(layout.guideTop) ? layout.guideTop : 28;
    stageX.slice(1).forEach((x) => {
      svg.appendChild(svgNode('line', {
        x1: round(x),
        y1: guideTop,
        x2: round(x),
        y2: round(chartBottom + 24),
        stroke: cfg.guide,
        'stroke-width': 1.3,
        opacity: cfg.guideOpacity
      }));
    });
  }

  function drawStageLabels(svg, cfg, totals, stageX, gap, layout) {
    const titleOffset = layout && Number.isFinite(layout.titleOffset) ? layout.titleOffset : 0;
    const compact = state.stageCount > 5;
    const tight = state.stageCount > 7;
    const anchor = compact ? 'middle' : 'start';
    const numberSize = tight ? 17 : compact ? 21 : 38;
    const labelSize = tight ? 10.5 : compact ? 12 : 18;
    const percentSize = tight ? 11 : compact ? 12 : 22;
    const numberY = (tight ? 42 : compact ? 43 : 55) + titleOffset;
    const labelY = (tight ? 65 : compact ? 69 : 82) + titleOffset;
    const percentY = (tight ? 85 : compact ? 90 : 113) + titleOffset;

    state.stages.forEach((stage, index) => {
      const labelX = compact ? stageX[index] + gap / 2 : stageX[index] + 36;
      const maxLabel = tight ? 10 : compact ? 13 : 24;
      const label = truncate(stage.label || `Stage ${index + 1}`, maxLabel);
      const totalText = formatNumber(totals[index]);

      const number = svgNode('text', {
        x: round(labelX),
        y: numberY,
        fill: cfg.text,
        'font-size': numberSize,
        'font-weight': 800,
        'letter-spacing': compact ? '-0.02em' : '-0.04em',
        'text-anchor': anchor
      }, totalText);
      svg.appendChild(number);

      const stageLabel = svgNode('text', {
        x: round(labelX),
        y: labelY,
        fill: cfg.accent,
        'font-size': labelSize,
        'font-weight': 850,
        'text-anchor': anchor
      }, label);
      if (label !== (stage.label || '')) {
        const title = svgNode('title');
        title.textContent = stage.label || `Stage ${index + 1}`;
        stageLabel.appendChild(title);
      }
      svg.appendChild(stageLabel);

      const percent = getPercentText(totals, index);
      if (percent) {
        svg.appendChild(svgNode('text', {
          x: round(labelX),
          y: percentY,
          fill: cfg.percent,
          'font-size': percentSize,
          'font-weight': 800,
          'text-anchor': anchor
        }, percent));
      }
    });
  }

  function drawLegend(svg, cfg, variables, legendRows, layout) {
    if (!variables.length) return;
    const rowHeight = variables.length > 10 ? 22 : 26;
    const fontSize = variables.length > 10 ? 13.5 : 18;
    const dotRadius = variables.length > 10 ? 6.5 : 9;
    const generatedAtOffset = layout && Number.isFinite(layout.generatedAtOffset) ? layout.generatedAtOffset : 0;
    const startY = CHART.height - 44 - generatedAtOffset - Math.max(0, legendRows.length - 1) * rowHeight;

    legendRows.forEach((row, rowIndex) => {
      const rowWidth = row.reduce((sum, item) => sum + item.width, 0);
      let x = (CHART.width - rowWidth) / 2;
      const y = startY + rowIndex * rowHeight;

      row.forEach((item) => {
        const dotX = x + dotRadius;
        svg.appendChild(svgNode('circle', {
          cx: round(dotX),
          cy: round(y),
          r: dotRadius,
          fill: `url(#${gradientId(item.index)})`,
          stroke: cfg.bandStroke,
          'stroke-width': 1
        }));
        svg.appendChild(svgNode('text', {
          x: round(x + dotRadius * 2 + 12),
          y: round(y + fontSize * 0.35),
          fill: cfg.text,
          'font-size': fontSize,
          'font-weight': 700
        }, truncate(item.name, 24)));
        x += item.width;
      });
    });
  }

  function drawChartTitle(svg, cfg, layout) {
    const title = getChartTitle();
    if (!title) return;

    const shortened = truncate(title, layout && layout.titleMaxLength ? layout.titleMaxLength : 72);
    const titleText = svgNode('text', {
      x: CHART.width / 2,
      y: layout && Number.isFinite(layout.titleY) ? layout.titleY : 40,
      fill: cfg.text,
      'font-size': state.stageCount > 6 ? 18 : 24,
      'font-weight': 850,
      'letter-spacing': '-0.025em',
      'text-anchor': 'middle'
    }, shortened);

    if (shortened !== title) {
      const fullTitle = svgNode('title');
      fullTitle.textContent = title;
      titleText.appendChild(fullTitle);
    }

    svg.appendChild(titleText);
  }

  function drawGeneratedAt(svg, cfg) {
    if (!state.showGeneratedAt) return;

    svg.appendChild(svgNode('text', {
      x: CHART.right,
      y: CHART.height - 20,
      fill: cfg.muted,
      'font-size': 12.5,
      'font-weight': 700,
      'text-anchor': 'end',
      opacity: 0.86
    }, `Generated ${formatGeneratedAt(new Date())}`));
  }

  function drawEmptyMessage(svg, cfg, centerY) {
    svg.appendChild(svgNode('text', {
      x: CHART.width / 2,
      y: round(centerY),
      fill: cfg.empty,
      'font-size': 24,
      'font-weight': 750,
      'text-anchor': 'middle'
    }, 'Enter values to see your funnel.'));
  }

  function buildLegendRows(variables) {
    const maxWidth = variables.length > 10 ? 1030 : 820;
    const rows = [];
    let current = [];
    let currentWidth = 0;

    variables.forEach((variable, index) => {
      const itemWidth = Math.min(238, Math.max(92, 42 + (variable.name || '').length * (variables.length > 10 ? 7 : 9.5)));
      if (current.length && currentWidth + itemWidth > maxWidth) {
        rows.push(current);
        current = [];
        currentWidth = 0;
      }
      current.push({ index, name: variable.name || `Variable ${index + 1}`, width: itemWidth });
      currentWidth += itemWidth;
    });

    if (current.length) rows.push(current);
    return rows;
  }

  function makeVariableTitle(variable) {
    const lines = [variable.name || 'Variable'];
    state.stages.forEach((stage, index) => {
      lines.push(`${stage.label || `Stage ${index + 1}`}: ${formatNumber(variable.values[index])}`);
    });
    return lines.join('\n');
  }

  function makeAriaLabel(totals) {
    const first = totals[0] || 0;
    const last = totals[totals.length - 1] || 0;
    const conversion = first > 0 ? (last / first) * 100 : 0;
    const titlePrefix = getChartTitle() ? `${getChartTitle()}. ` : '';
    return `${titlePrefix}Funnel chart with ${state.stageCount} stages and ${state.variableCount} variables. First stage total ${formatNumber(first)}. Final stage total ${formatNumber(last)}. Final is ${formatPercent(conversion)} of the first stage.`;
  }

  function updateSummary(totals) {
    const first = totals[0] || 0;
    const last = totals[totals.length - 1] || 0;
    const conversion = first > 0 ? (last / first) * 100 : 0;
    els.summaryText.textContent = `${state.stageCount} stages and ${state.variableCount} variables. ${formatNumber(first)} starts the funnel; ${formatNumber(last)} remains at the final stage (${formatPercent(conversion)} of the first stage).`;
  }

  function getPercentText(totals, index) {
    if (index === 0 || state.percentBasis === 'none') return '';
    const denominator = state.percentBasis === 'previous' ? totals[index - 1] : totals[0];
    if (!denominator) return '–';
    return formatPercent((totals[index] / denominator) * 100);
  }

  function getGradientStops(color, index) {
    const presets = PRESET_GRADIENTS[state.theme] || [];
    const fallback = DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    const base = normalizeHex(color, fallback);
    const isDefaultColor = base === normalizeHex(fallback, '#888888');

    if (isDefaultColor && presets[index]) return presets[index];

    return state.theme === 'midnight'
      ? [mixHex(base, '#ffffff', 0.26), mixHex(base, '#111133', 0.05)]
      : [mixHex(base, '#ffffff', 0.22), mixHex(base, '#000000', 0.04)];
  }

  function gradientId(index) {
    return `band-gradient-${state.theme}-${index}`;
  }

  function exportPng() {
    renderChart();
    const scale = clampInt(els.exportScale.value, 1, 3);
    const svgClone = els.chartSvg.cloneNode(true);
    svgClone.setAttribute('xmlns', SVG_NS);
    svgClone.setAttribute('width', CHART.width);
    svgClone.setAttribute('height', CHART.height);

    const serialized = new XMLSerializer().serializeToString(svgClone);
    const image = new Image();
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = CHART.width * scale;
      canvas.height = CHART.height * scale;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          showStatus('PNG export failed. Try again in a different browser.');
          return;
        }
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${makeFilenameBase(getChartTitle() || 'fnnl-chart')}-${timestamp()}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 400);
        showStatus(`Exported ${CHART.width * scale} × ${CHART.height * scale} PNG.`);
      }, 'image/png');
    };

    image.onerror = () => showStatus('PNG export failed while rendering the SVG.');
    image.src = url;
  }

  function importCsv() {
    const raw = els.csvInput.value.trim();
    if (!raw) {
      showStatus('Paste CSV data first.');
      return;
    }

    try {
      const rows = parseCsv(raw).filter((row) => row.some((cell) => String(cell).trim() !== ''));
      if (rows.length < 2) throw new Error('CSV needs a header row and at least one variable row.');

      const header = rows[0].map((cell) => String(cell).trim());
      const hasColorColumn = header[1] && header[1].toLowerCase() === 'color';
      const valueStartIndex = hasColorColumn ? 2 : 1;
      const stageLabels = header.slice(valueStartIndex).map((label, index) => label || `Stage ${index + 1}`).slice(0, MAX_STAGES);
      if (stageLabels.length < MIN_STAGES) throw new Error(`CSV needs at least ${MIN_STAGES} stage columns.`);

      const variables = rows.slice(1, 1 + MAX_VARIABLES).map((row, index) => {
        const name = String(row[0] || DEFAULT_NAMES[index] || `Variable ${index + 1}`).trim();
        const color = hasColorColumn
          ? normalizeHex(row[1], DEFAULT_COLORS[index % DEFAULT_COLORS.length])
          : DEFAULT_COLORS[index % DEFAULT_COLORS.length];
        const values = stageLabels.map((_, stageIndex) => parseNumber(row[valueStartIndex + stageIndex]));
        return { name, color, values };
      }).filter((variable) => variable.name || variable.values.some((value) => value > 0));

      if (!variables.length) throw new Error('CSV needs at least one variable row.');

      state.stageCount = stageLabels.length;
      state.variableCount = variables.length;
      state.stages = stageLabels.map((label) => ({ label }));
      state.variables = variables;
      normalizeState();
      hydrateControls();
      applyTheme();
      buildStageFields();
      buildDataTable();
      renderChartAndPersist();
      showStatus(`Imported ${state.variableCount} variables across ${state.stageCount} stages.`);
    } catch (error) {
      showStatus(error.message || 'Could not import that CSV.');
    }
  }

  async function copyCurrentCsv() {
    const csv = makeCsv();
    els.csvInput.value = csv;
    try {
      await navigator.clipboard.writeText(csv);
      showStatus('Current CSV copied to the clipboard.');
    } catch (_error) {
      els.csvInput.focus();
      els.csvInput.select();
      const copied = document.execCommand && document.execCommand('copy');
      showStatus(copied ? 'Current CSV copied to the clipboard.' : 'CSV placed in the text area for copying.');
    }
  }

  function downloadCsv() {
    const csv = makeCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fnnl-data-${timestamp()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 400);
    showStatus('Downloaded current CSV data.');
  }

  function makeCsv() {
    const header = ['Variable', 'Color', ...state.stages.map((stage) => stage.label || '')];
    const rows = state.variables.slice(0, state.variableCount).map((variable) => [
      variable.name,
      variable.color,
      ...state.stages.map((_, stageIndex) => variable.values[stageIndex] || 0)
    ]);
    return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        row.push(cell);
        cell = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') index += 1;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        continue;
      }

      cell += char;
    }

    row.push(cell);
    rows.push(row);
    return rows;
  }

  function csvEscape(value) {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_error) {
      // Local file storage can be unavailable in some locked-down browsers.
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_error) {
      return null;
    }
  }

  function showStatus(message) {
    els.statusText.textContent = message;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      els.statusText.textContent = '';
    }, 4200);
  }

  function svgNode(tagName, attrs = {}, text = null) {
    const node = document.createElementNS(SVG_NS, tagName);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== null && value !== undefined) node.setAttribute(key, String(value));
    });
    if (text !== null && text !== undefined) node.textContent = String(text);
    return node;
  }

  function parseNumber(value) {
    const numeric = Number(String(value ?? '').replace(/,/g, '').trim());
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }

  function clampInt(value, min, max) {
    const numeric = Math.round(Number(value));
    if (!Number.isFinite(numeric)) return min;
    return Math.min(max, Math.max(min, numeric));
  }

  function clampNumber(value, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return min;
    return Math.min(max, Math.max(min, numeric));
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  function formatNumber(value) {
    const numeric = Number(value) || 0;
    const fractionDigits = Math.abs(numeric) >= 100 ? 0 : 2;
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: fractionDigits
    }).format(numeric);
  }

  function formatPercent(value) {
    const numeric = Number(value) || 0;
    const fractionDigits = Math.abs(numeric) >= 10 ? 1 : 1;
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: fractionDigits }).format(numeric)}%`;
  }

  function truncate(value, maxLength) {
    const text = String(value ?? '');
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
  }

  function normalizeHex(value, fallback) {
    const input = String(value || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(input)) return input.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(input)) {
      const r = input[1];
      const g = input[2];
      const b = input[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return fallback || '#888888';
  }

  function hexToRgb(hex) {
    const normalized = normalizeHex(hex, '#888888').replace('#', '');
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16)
    };
  }

  function rgbToHex(rgb) {
    const toHex = (channel) => clampInt(channel, 0, 255).toString(16).padStart(2, '0');
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  function mixHex(hexA, hexB, amount) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    const t = clampNumber(amount, 0, 1);
    return rgbToHex({
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t
    });
  }

  function formatGeneratedAt(date) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }).format(date);
    } catch (_error) {
      return date.toLocaleString();
    }
  }

  function makeFilenameBase(value) {
    const base = String(value || 'fnnl-chart')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base || 'fnnl-chart';
  }

  function timestamp() {
    const date = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
      '-',
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds())
    ].join('');
  }
})();
