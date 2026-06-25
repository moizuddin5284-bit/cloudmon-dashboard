/**
 * Smart Cloud Monitoring Dashboard — JavaScript
 * Handles: SSE live stream, Chart.js charts, gauges, historical data
 */

/* ─────────────────────────────────────────────
   SHARED CHART UTILITIES
───────────────────────────────────────────── */
const CHART_COLORS = {
  cpu:     { line: '#f6ad55', fill: 'rgba(246,173,85,0.12)',  point: '#f6ad55' },
  memory:  { line: '#68d391', fill: 'rgba(104,211,145,0.12)', point: '#68d391' },
  disk:    { line: '#76e4f7', fill: 'rgba(118,228,247,0.12)', point: '#76e4f7' },
  net_in:  { line: '#b794f4', fill: 'rgba(183,148,244,0.12)', point: '#b794f4' },
  net_out: { line: '#f687b3', fill: 'rgba(246,135,179,0.12)', point: '#f687b3' },
};

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400, easing: 'easeInOutQuart' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15,22,41,0.95)',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      titleColor: '#f0f4ff',
      bodyColor: '#94a3b8',
      padding: 10,
      callbacks: {
        label: ctx => ` ${ctx.parsed.y.toFixed(1)}${ctx.dataset.unit || '%'}`
      }
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
      ticks: { color: '#64748b', font: { size: 10, family: 'Inter' }, maxTicksLimit: 8 },
    },
    y: {
      min: 0,
      grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
      ticks: { color: '#64748b', font: { size: 10, family: 'Inter' },
               callback: v => v + '%' },
    }
  }
};

function makeDataset(label, color, unit='%') {
  return {
    label,
    data: [],
    borderColor: color.line,
    backgroundColor: color.fill,
    pointBackgroundColor: color.point,
    pointRadius: 2,
    pointHoverRadius: 5,
    borderWidth: 2,
    fill: true,
    tension: 0.4,
    unit,
  };
}

function createChart(canvasId, label, colorKey, unit='%', yMax=100) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  const cfg = JSON.parse(JSON.stringify(CHART_DEFAULTS));
  cfg.scales.y.max = yMax || undefined;
  if (unit !== '%') {
    cfg.scales.y.ticks.callback = v => v.toFixed(1) + unit;
  }
  return new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [makeDataset(label, CHART_COLORS[colorKey], unit)] },
    options: cfg
  });
}

const MAX_LIVE_POINTS = 30;

function pushLivePoint(chart, label, value) {
  if (!chart) return;
  const labels = chart.data.labels;
  const data   = chart.data.datasets[0].data;
  labels.push(label);
  data.push(value);
  if (labels.length > MAX_LIVE_POINTS) { labels.shift(); data.shift(); }
  chart.update('none');
}

/* ─────────────────────────────────────────────
   GAUGE ANIMATION
───────────────────────────────────────────── */
const GAUGE_ARC = 188.5; // half-circumference of r=60 arc

function setGauge(id, pct) {
  const el = document.getElementById(id);
  if (!el) return;
  const filled = (Math.min(pct, 100) / 100) * GAUGE_ARC;
  el.setAttribute('stroke-dasharray', `${filled} ${GAUGE_ARC}`);
}

/* ─────────────────────────────────────────────
   STATUS BADGES
───────────────────────────────────────────── */
function updateStatusBadge(badgeId, cardId, value, warnThr, critThr) {
  const badge = document.getElementById(badgeId);
  const card  = document.getElementById(cardId);
  if (!badge) return;
  if (value >= critThr) {
    badge.textContent = 'CRITICAL';
    badge.className = 'metric-status crit';
    card && card.style.setProperty('--card-glow', 'rgba(252,129,129,0.15)');
  } else if (value >= warnThr) {
    badge.textContent = 'WARNING';
    badge.className = 'metric-status warn';
  } else {
    badge.textContent = 'OK';
    badge.className = 'metric-status';
  }
}

/* ─────────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────────── */
function showToast(title, msg, severity) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${severity}`;
  t.innerHTML = `<span class="toast-icon">${severity === 'critical' ? '🔴' : '⚠️'}</span>
    <div class="toast-body"><strong>${title}</strong>${msg}</div>`;
  container.appendChild(t);
  setTimeout(() => t.style.opacity = '0', 4500);
  setTimeout(() => t.remove(), 5000);
}

/* ─────────────────────────────────────────────
   DASHBOARD — Live Mode
───────────────────────────────────────────── */
function initDashboard(cfg) {
  // Create live charts
  const charts = {
    cpu:     createChart('chart-cpu',     'CPU',    'cpu'),
    memory:  createChart('chart-memory',  'Memory', 'memory'),
    disk:    createChart('chart-disk',    'Disk',   'disk'),
    net:     createChart('chart-network', 'Net In', 'net_in', 'MB/s', null),
  };

  // Pre-populate with initial values
  const now = new Date().toLocaleTimeString();
  ['cpu','memory','disk'].forEach(k => {
    pushLivePoint(charts[k], now, cfg['initial' + k.charAt(0).toUpperCase() + k.slice(1)]);
    setGauge('gauge-' + k, cfg['initial' + k.charAt(0).toUpperCase() + k.slice(1)]);
  });
  if (charts.net) {
    pushLivePoint(charts.net, now, cfg.initialNetIn);
  }

  // Set network dataset unit
  if (charts.net) {
    charts.net.data.datasets[0].unit = 'MB/s';
    // Add net_out dataset
    charts.net.data.datasets.push({
      ...makeDataset('Net Out', CHART_COLORS['net_out'], 'MB/s'),
      data: [cfg.initialNetOut],
    });
    charts.net.update('none');
  }

  // ── SSE Connection ──
  let eventSource;
  let reconnectTimer;

  function connectSSE() {
    if (eventSource) eventSource.close();
    eventSource = new EventSource(cfg.streamUrl);

    eventSource.onopen = () => {
      console.log('[SSE] Connected');
      const dot = document.getElementById('status-dot');
      if (dot) { dot.style.background = '#48bb78'; dot.style.boxShadow = '0 0 8px #48bb78'; }
      const srvDot = document.getElementById('srv-status-dot');
      if (srvDot) srvDot.className = 'status-indicator green';
    };

    eventSource.onmessage = (e) => {
      let data;
      try { data = JSON.parse(e.data); } catch { return; }
      if (data.heartbeat) return;

      const ts  = data.timestamp || new Date().toLocaleTimeString();
      const cpu = data.cpu    || 0;
      const mem = data.memory || 0;
      const dsk = data.disk   || 0;
      const ni  = data.net_in  || 0;
      const no_ = data.net_out || 0;

      // Update value displays
      setVal('val-cpu',     cpu.toFixed(1));
      setVal('val-memory',  mem.toFixed(1));
      setVal('val-disk',    dsk.toFixed(1));
      setVal('val-net-in',  ni.toFixed(2));
      setVal('val-net-out', no_.toFixed(2));

      // Update gauges
      setGauge('gauge-cpu',    cpu);
      setGauge('gauge-memory', mem);
      setGauge('gauge-disk',   dsk);

      // Update progress bars
      setWidth('bar-cpu',    cpu);
      setWidth('bar-memory', mem);
      setWidth('bar-disk',   dsk);
      setWidth('bar-net-in',  Math.min(ni * 5, 100));
      setWidth('bar-net-out', Math.min(no_ * 5, 100));

      // Update status badges
      updateStatusBadge('cpu-status-badge',  'card-cpu',    cpu, 70, 90);
      updateStatusBadge('mem-status-badge',  'card-memory', mem, 70, 85);
      updateStatusBadge('disk-status-badge', 'card-disk',   dsk, 80, 95);

      // Push to charts
      pushLivePoint(charts.cpu,    ts, cpu);
      pushLivePoint(charts.memory, ts, mem);
      pushLivePoint(charts.disk,   ts, dsk);
      if (charts.net) {
        const netLabels = charts.net.data.labels;
        netLabels.push(ts);
        charts.net.data.datasets[0].data.push(ni);
        charts.net.data.datasets[1].data.push(no_);
        if (netLabels.length > MAX_LIVE_POINTS) {
          netLabels.shift();
          charts.net.data.datasets[0].data.shift();
          charts.net.data.datasets[1].data.shift();
        }
        charts.net.update('none');
      }

      // Update last update time
      const lu = document.getElementById('last-update');
      if (lu) lu.textContent = 'Updated: ' + ts;

      // Show alert toasts
      if (data.alerts && data.alerts.length > 0) {
        data.alerts.forEach(a => {
          showToast(a.resource.toUpperCase() + ' Alert', ' ' + a.message, a.severity);
        });
        const badge = document.getElementById('alert-badge');
        if (badge) badge.style.display = 'flex';
      }
    };

    eventSource.onerror = () => {
      console.warn('[SSE] Connection lost, reconnecting...');
      const dot = document.getElementById('status-dot');
      if (dot) { dot.style.background = '#fc8181'; dot.style.boxShadow = '0 0 8px #fc8181'; }
      eventSource.close();
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connectSSE, 3000);
    };
  }

  connectSSE();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (eventSource) eventSource.close();
    clearTimeout(reconnectTimer);
  });
}

/* ─────────────────────────────────────────────
   HISTORY PAGE — Historical Mode
───────────────────────────────────────────── */
function initHistory(cfg) {
  let charts = {};
  let currentHours = 1;

  function createHistCharts() {
    charts.cpu    = createChart('hist-chart-cpu',     'CPU',    'cpu');
    charts.memory = createChart('hist-chart-memory',  'Memory', 'memory');
    charts.disk   = createChart('hist-chart-disk',    'Disk',   'disk');
    charts.net    = createChart('hist-chart-network', 'Net In', 'net_in', 'MB/s', null);

    if (charts.net) {
      charts.net.data.datasets.push(
        makeDataset('Net Out', CHART_COLORS['net_out'], 'MB/s'));
    }
  }

  function loadData(hours) {
    const loading = document.getElementById('chart-loading');
    if (loading) loading.classList.add('show');

    fetch(`${cfg.apiUrl}?hours=${hours}`)
      .then(r => r.json())
      .then(data => {
        const labels  = data.labels  || [];
        const cpuArr  = data.cpu     || [];
        const memArr  = data.memory  || [];
        const dskArr  = data.disk    || [];
        const niArr   = data.net_in  || [];
        const noArr   = data.net_out || [];

        // Update charts
        updateHistChart(charts.cpu,    labels, cpuArr);
        updateHistChart(charts.memory, labels, memArr);
        updateHistChart(charts.disk,   labels, dskArr);
        if (charts.net) {
          charts.net.data.labels = labels;
          charts.net.data.datasets[0].data = niArr;
          charts.net.data.datasets[1].data = noArr;
          charts.net.update();
        }

        // Update stat cards
        updateStats('cpu',          cpuArr, '%');
        updateStats('memory',       memArr, '%');
        updateStats('disk',         dskArr, '%');
        updateStats('network_in',   niArr,  ' MB/s');

        const cnt = document.getElementById('range-count');
        if (cnt) cnt.textContent = `${labels.length} data points`;

        if (loading) loading.classList.remove('show');
      })
      .catch(err => {
        console.error('[History] Load error:', err);
        if (loading) loading.classList.remove('show');
      });
  }

  function updateHistChart(chart, labels, values) {
    if (!chart) return;
    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update();
  }

  function updateStats(key, values, unit) {
    if (!values || values.length === 0) {
      ['avg','max','min'].forEach(s => setVal(`stat-${key}-${s}`, '--'));
      return;
    }
    const avg = values.reduce((a,b) => a+b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    setVal(`stat-${key}-avg`, avg.toFixed(1) + unit);
    setVal(`stat-${key}-max`, max.toFixed(1) + unit);
    setVal(`stat-${key}-min`, min.toFixed(1) + unit);
  }

  // Range pill event listeners
  document.querySelectorAll('.range-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.range-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentHours = parseInt(pill.dataset.hours);
      loadData(currentHours);
    });
  });

  // Initialize
  createHistCharts();
  loadData(currentHours);

  // Auto-refresh every 30s
  setInterval(() => loadData(currentHours), 30000);
}

/* ─────────────────────────────────────────────
   DOM HELPERS
───────────────────────────────────────────── */
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = Math.min(Math.max(pct, 0), 100) + '%';
}
