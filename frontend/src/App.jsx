import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Cpu,
  Database,
  HardDrive,
  Bell,
  Clock,
  LogOut,
  User as UserIcon,
  ArrowDown,
  ArrowUp,
  Settings,
  Trash2,
  Lock,
  Loader,
  RefreshCw,
  TrendingUp,
  FileText,
  Activity
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   CUSTOM ROUTER HOOK
   ───────────────────────────────────────────────────────────── */
function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  
  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  const navigate = (newPath) => {
    window.history.pushState(null, '', newPath);
    setPath(newPath);
  };
  
  return [path, navigate];
}

/* ─────────────────────────────────────────────────────────────
   TOAST NOTIFICATION HELPER
   ───────────────────────────────────────────────────────────── */
const ToastContainer = ({ toasts, removeToast }) => (
  <div id="toast-container">
    {toasts.map(t => (
      <div key={t.id} className={`toast ${t.severity === 'info' ? 'warning' : t.severity}`}>
        <span className="toast-icon">
          {t.severity === 'critical' ? '🔴' : '⚠️'}
        </span>
        <div className="toast-body">
          <div className="toast-title">{t.title}</div>
          <div className="toast-msg">{t.message}</div>
        </div>
      </div>
    ))}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   SVG GAUGE COMPONENT
   ───────────────────────────────────────────────────────────── */
const Gauge = ({ value, colorClass, strokeColor }) => {
  const arc = 188.5; // Half circumference for r=60
  const filled = (Math.min(value, 100) / 100) * arc;
  
  return (
    <div className="gauge-wrap" style={{ position: 'relative', width: '120px', height: '70px', margin: '0 auto' }}>
      <svg viewBox="0 0 120 70" style={{ width: '100%', height: '100%' }}>
        <path 
          d="M10,70 A60,60 0 0,1 110,70" 
          fill="none" 
          stroke="#e2e8f0" 
          strokeWidth="10" 
          strokeLinecap="round"
        />
        <path 
          d="M10,70 A60,60 0 0,1 110,70" 
          fill="none" 
          stroke={strokeColor} 
          strokeWidth="10" 
          strokeLinecap="round"
          strokeDasharray={`${filled} ${arc}`}
        />
      </svg>
      <div style={{
        position: 'absolute',
        bottom: '-6px',
        left: '0',
        right: '0',
        textAlign: 'center',
        lineHeight: '1'
      }}>
        <span style={{ fontSize: '20px', fontWeight: '800' }}>{value.toFixed(1)}</span>
        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '2px' }}>%</span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   LOGIN COMPONENT
   ───────────────────────────────────────────────────────────── */
function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        onLoginSuccess({ username: data.username, role: data.role });
      } else {
        setError(data.message || 'Invalid username or password.');
      }
    } catch (err) {
      setError('Connection to server failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-body">
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>
      
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">☁</div>
          <h1 className="login-title">CloudMon</h1>
          <p className="login-subtitle">Smart Cloud Resource Monitoring</p>
        </div>

        {error && (
          <div className="flash-container">
            <div className="flash-message danger">
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-wrap">
              <span className="input-icon-left">👤</span>
              <input
                type="text"
                className="form-input-full"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrap">
              <span className="input-icon-left">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input-full"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn-toggle-pw"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-login-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px', borderTopColor: '#fff' }}></span>
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="login-hint">
          Default credentials: <code>admin / admin123</code>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SIDEBAR COMPONENT
   ───────────────────────────────────────────────────────────── */
function Sidebar({ currentPath, navigate, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">☁</span>
        <span className="logo-text">CloudMon</span>
      </div>

      <nav className="sidebar-nav">
        <button
          onClick={() => navigate('/')}
          className={`nav-link ${currentPath === '/' ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <span className="nav-icon"><Activity size={18} /></span>
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => navigate('/alerts')}
          className={`nav-link ${currentPath === '/alerts' ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <span className="nav-icon"><Bell size={18} /></span>
          <span>Alerts</span>
        </button>
        <button
          onClick={() => navigate('/history')}
          className={`nav-link ${currentPath === '/history' ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <span className="nav-icon"><TrendingUp size={18} /></span>
          <span>History</span>
        </button>
        <button
          onClick={() => navigate('/report')}
          className={`nav-link ${currentPath === '/report' ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <span className="nav-icon"><FileText size={18} /></span>
          <span>Reports</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user.username[0].toUpperCase()}</div>
          <div>
            <div className="user-name">{user.username}</div>
            <div className="user-role">{user.role}</div>
          </div>
        </div>
        <button className="btn-logout" onClick={onLogout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────
   TOPBAR COMPONENT
   ───────────────────────────────────────────────────────────── */
function Topbar({ title, isConnected }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="topbar-right">
        <div 
          className={`status-dot ${isConnected ? '' : 'disconnected'}`} 
          title={isConnected ? 'Connected' : 'Disconnected'}
        ></div>
        <span className="live-clock">{time}</span>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: DASHBOARD
   ───────────────────────────────────────────────────────────── */
function DashboardPage({ setConnected, addToast }) {
  const [metrics, setMetrics] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    net_in: 0,
    net_out: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const sseRef = useRef(null);

  // Load initial snapshot and historical data for charts
  useEffect(() => {
    let active = true;

    async function loadInitial() {
      try {
        const snapRes = await fetch('/api/metrics');
        const snap = await snapRes.json();
        
        const alertRes = await fetch('/api/alerts');
        const alerts = await alertRes.json();

        const histRes = await fetch('/api/history?hours=1');
        const hist = await histRes.json();

        if (active) {
          setMetrics(snap);
          setRecentAlerts(alerts.slice(0, 5));
          
          // Re-format historical data for chart.js/recharts
          const points = [];
          if (hist.labels) {
            for (let i = 0; i < hist.labels.length; i++) {
              points.push({
                time: hist.labels[i],
                cpu: hist.cpu[i],
                memory: hist.memory[i],
                disk: hist.disk[i],
                net_in: hist.net_in[i],
                net_out: hist.net_out[i],
              });
            }
          }
          setChartData(points);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load initial snapshot data', err);
        if (active) setLoading(false);
      }
    }

    loadInitial();

    // Setup SSE connection
    function connect() {
      if (sseRef.current) sseRef.current.close();
      const sse = new EventSource('/api/stream');
      sseRef.current = sse;

      sse.onopen = () => {
        setConnected(true);
      };

      sse.onmessage = (e) => {
        let payload;
        try { payload = JSON.parse(e.data); } catch { return; }
        if (payload.heartbeat) return;

        const ts = payload.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        setMetrics({
          cpu: payload.cpu,
          memory: payload.memory,
          disk: payload.disk,
          net_in: payload.net_in,
          net_out: payload.net_out
        });

        // Add to charts
        setChartData((prev) => {
          const next = [...prev, {
            time: ts,
            cpu: payload.cpu,
            memory: payload.memory,
            disk: payload.disk,
            net_in: payload.net_in,
            net_out: payload.net_out
          }];
          if (next.length > 30) next.shift();
          return next;
        });

        // Trigger toast alerts
        if (payload.alerts && payload.alerts.length > 0) {
          payload.alerts.forEach(a => {
            addToast(a.resource.toUpperCase() + ' Alert', a.message, a.severity);
          });
          // Update recent alerts list
          setRecentAlerts((prev) => {
            const next = [...payload.alerts, ...prev];
            return next.slice(0, 5);
          });
        }
      };

      sse.onerror = () => {
        setConnected(false);
        sse.close();
        setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      active = false;
      if (sseRef.current) sseRef.current.close();
    };
  }, [setConnected, addToast]);

  if (loading) {
    return (
      <div className="loader-overlay">
        <div className="spinner"></div>
        <span>Loading Real-Time metrics...</span>
      </div>
    );
  }

  // Helpers to check threshold levels
  const getStatusBadge = (val, warn, crit) => {
    if (val >= crit) return <span className="metric-status-badge critical">CRITICAL</span>;
    if (val >= warn) return <span className="metric-status-badge warning">WARNING</span>;
    return <span className="metric-status-badge ok">OK</span>;
  };

  const getStatusBorder = (val, warn, crit) => {
    if (val >= crit) return { borderTop: '4px solid var(--danger)' };
    if (val >= warn) return { borderTop: '4px solid var(--warning)' };
    return {};
  };

  return (
    <div>
      {/* Server status bar */}
      <div className="status-bar mb-2">
        <div className="status-item">
          <span className="status-indicator green"></span>
          <span>Server Online</span>
        </div>
        <div className="status-item">
          <span>🖥</span>
          <span>Local Cloud Host</span>
        </div>
        <div className="status-item">
          <span>🔄</span>
          <span>Auto-refresh: <strong>5s</strong></span>
        </div>
        <div className="status-item">
          <span>📡</span>
          <span>Active SSE Stream</span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid-4 mb-2">
        {/* CPU */}
        <div className="card metric-card" style={getStatusBorder(metrics.cpu, 70, 90)}>
          <div className="metric-header">
            <div className="metric-icon-wrap cpu-light"><Cpu size={20} /></div>
            <div className="metric-info">
              <div className="metric-name">CPU Usage</div>
              <div className="metric-sub">Processing load</div>
            </div>
            {getStatusBadge(metrics.cpu, 70, 90)}
          </div>
          <Gauge value={metrics.cpu} strokeColor="var(--cpu-color)" />
          <div className="progress-bar-wrap">
            <div className="progress-bar cpu-bg" style={{ width: `${metrics.cpu}%` }}></div>
          </div>
        </div>

        {/* Memory */}
        <div className="card metric-card" style={getStatusBorder(metrics.memory, 70, 85)}>
          <div className="metric-header">
            <div className="metric-icon-wrap mem-light"><Database size={20} /></div>
            <div className="metric-info">
              <div className="metric-name">Memory</div>
              <div className="metric-sub">RAM utilization</div>
            </div>
            {getStatusBadge(metrics.memory, 70, 85)}
          </div>
          <Gauge value={metrics.memory} strokeColor="var(--mem-color)" />
          <div className="progress-bar-wrap">
            <div className="progress-bar mem-bg" style={{ width: `${metrics.memory}%` }}></div>
          </div>
        </div>

        {/* Disk */}
        <div className="card metric-card" style={getStatusBorder(metrics.disk, 80, 95)}>
          <div className="metric-header">
            <div className="metric-icon-wrap disk-light"><HardDrive size={20} /></div>
            <div className="metric-info">
              <div className="metric-name">Disk Usage</div>
              <div className="metric-sub">Storage consumed</div>
            </div>
            {getStatusBadge(metrics.disk, 80, 95)}
          </div>
          <Gauge value={metrics.disk} strokeColor="var(--disk-color)" />
          <div className="progress-bar-wrap">
            <div className="progress-bar disk-bg" style={{ width: `${metrics.disk}%` }}></div>
          </div>
        </div>

        {/* Network */}
        <div className="card metric-card">
          <div className="metric-header">
            <div className="metric-icon-wrap net-light"><Activity size={20} /></div>
            <div className="metric-info">
              <div className="metric-name">Network I/O</div>
              <div className="metric-sub">Data transfer rate</div>
            </div>
            <span className="metric-status-badge ok">OK</span>
          </div>
          <div className="network-rows" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="network-row-item">
              <span className="network-label"><ArrowDown size={14} color="var(--net-in-color)" /> Inbound</span>
              <span className="network-value">{metrics.net_in.toFixed(2)} MB/s</span>
            </div>
            <div className="progress-bar-wrap mb-1" style={{ height: '4px' }}>
              <div className="progress-bar net-bg" style={{ width: `${Math.min(metrics.net_in * 5, 100)}%` }}></div>
            </div>
            <div className="network-row-item">
              <span className="network-label"><ArrowUp size={14} color="var(--net-out-color)" /> Outbound</span>
              <span className="network-value">{metrics.net_out.toFixed(2)} MB/s</span>
            </div>
            <div className="progress-bar-wrap" style={{ height: '4px' }}>
              <div className="progress-bar" style={{ backgroundColor: 'var(--net-out-color)', width: `${Math.min(metrics.net_out * 5, 100)}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Charts */}
      <div className="grid-2 mb-2">
        <div className="card chart-card">
          <div className="chart-header">
            <span className="chart-title">CPU Utilization</span>
            <span className="chart-badge live">Live</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--cpu-color)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--cpu-color)" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="cpu" stroke="var(--cpu-color)" fillOpacity={1} fill="url(#cpuGrad)" strokeWidth={2} name="CPU %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <div className="chart-header">
            <span className="chart-title">Memory Allocation</span>
            <span className="chart-badge live">Live</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--mem-color)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--mem-color)" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="memory" stroke="var(--mem-color)" fillOpacity={1} fill="url(#memGrad)" strokeWidth={2} name="Memory %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-2">
        <div className="card chart-card">
          <div className="chart-header">
            <span className="chart-title">Disk Storage</span>
            <span className="chart-badge live">Live</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="diskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--disk-color)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--disk-color)" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="disk" stroke="var(--disk-color)" fillOpacity={1} fill="url(#diskGrad)" strokeWidth={2} name="Disk %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <div className="chart-header">
            <span className="chart-title">Network Traffic</span>
            <span className="chart-badge live">Live</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="netInGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--net-in-color)" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="var(--net-in-color)" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="netOutGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--net-out-color)" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="var(--net-out-color)" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="net_in" stroke="var(--net-in-color)" fillOpacity={1} fill="url(#netInGrad)" strokeWidth={2} name="Net In (MB/s)" />
                <Area type="monotone" dataKey="net_out" stroke="var(--net-out-color)" fillOpacity={1} fill="url(#netOutGrad)" strokeWidth={2} name="Net Out (MB/s)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="card">
        <div className="section-header-row">
          <h2 className="section-title-text">🚨 Recent Alerts</h2>
        </div>
        {recentAlerts.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Resource</th>
                  <th>Severity</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.map(a => (
                  <tr key={a.id || a.timestamp + a.resource} className={`row-${a.severity}`}>
                    <td className="td-time">{a.timestamp}</td>
                    <td><span className="badge warning" style={{ backgroundColor: a.severity === 'critical' ? 'var(--danger-light)' : 'var(--warning-light)', color: a.severity === 'critical' ? 'var(--danger)' : 'var(--warning)' }}>{a.resource.toUpperCase()}</span></td>
                    <td><span className="badge" style={{ backgroundColor: a.severity === 'critical' ? 'var(--danger-light)' : 'var(--warning-light)', color: a.severity === 'critical' ? 'var(--danger)' : 'var(--warning)' }}>{a.severity.toUpperCase()}</span></td>
                    <td>{a.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data">✅ No alerts triggered — all systems normal</div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: ALERTS
   ───────────────────────────────────────────────────────────── */
function AlertsPage({ addToast }) {
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlertData = async () => {
    try {
      // Re-fetch database stats for alerts
      const rulesRes = await fetch('/alerts'); // This yields HTML. Wait, we can fetch from a JSON endpoint!
      // Wait, is there a rules json endpoint?
      // Looking at app.py: we don't have a direct rule json api, but alerts route handles updates.
      // Wait! In app.py line 313:
      // rules = conn.execute("SELECT * FROM alert_rules ORDER BY resource").fetchall()
      // Let's add an API endpoint for alerts, or fetch rules from alerts HTML...
      // Actually, we can easily add a `/api/alert-rules` in app.py!
      // But wait! Can we fetch /alerts? Let's check:
      // If we update app.py to return JSON for /alerts if request accepts JSON, that would be amazing!
      // Yes! Let's check /alerts route:
      const res = await fetch('/alerts', { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      setRules(data.rules || []);
      setHistory(data.history || []);
    } catch (err) {
      console.error('Failed to load alert rules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertData();
  }, []);

  const handleRuleSubmit = async (e, resource, threshold, severity, enabled) => {
    e.preventDefault();
    try {
      const formData = new URLSearchParams();
      formData.append('action', 'update_rule');
      formData.append('resource', resource);
      formData.append('threshold', threshold);
      formData.append('severity', severity);
      if (enabled) formData.append('enabled', 'on');

      const res = await fetch('/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      if (res.ok) {
        addToast('Rule Updated', `Successfully updated rule thresholds for ${resource.toUpperCase()}`, 'info');
        fetchAlertData();
      }
    } catch (err) {
      console.error('Failed to update rule', err);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all alert history?')) return;
    try {
      const formData = new URLSearchParams();
      formData.append('action', 'clear_history');

      const res = await fetch('/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      if (res.ok) {
        addToast('History Cleared', 'Alert history cleared successfully.', 'info');
        fetchAlertData();
      }
    } catch (err) {
      console.error('Failed to clear alert history', err);
    }
  };

  if (loading) {
    return (
      <div className="loader-overlay">
        <div className="spinner"></div>
        <span>Loading Alert Configuration...</span>
      </div>
    );
  }

  const criticalCount = history.filter(h => h.severity === 'critical').length;
  const warningCount = history.filter(h => h.severity === 'warning').length;

  return (
    <div>
      <div className="grid-halves mb-2">
        {/* Rules Config */}
        <div className="card">
          <div className="section-header-row">
            <h2 className="section-title-text">⚙️ Configure Thresholds</h2>
          </div>
          <div className="rules-list">
            {rules.map(rule => (
              <RuleItem 
                key={rule.id} 
                rule={rule} 
                onSubmit={(e, t, s, en) => handleRuleSubmit(e, rule.resource, t, s, en)} 
              />
            ))}
          </div>
        </div>

        {/* Overview */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="section-header-row">
              <h2 className="section-title-text">📊 Alert Overview</h2>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', margin: '20px 0' }}>
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--danger-light)', borderRadius: '12px', minWidth: '100px' }}>
                <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--danger)' }}>{criticalCount}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Critical Alerts</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--warning-light)', borderRadius: '12px', minWidth: '100px' }}>
                <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--warning)' }}>{warningCount}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Warnings</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', minWidth: '100px' }}>
                <div style={{ fontSize: '32px', fontWeight: '800' }}>{history.length}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Total Logged</div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-secondary)' }}>RESOURCE BREAKDOWN</h3>
            {['cpu', 'memory', 'disk', 'net_in', 'net_out'].map(res => {
              const count = history.filter(h => h.resource === res).length;
              if (count === 0) return null;
              const pct = history.length > 0 ? (count / history.length) * 100 : 0;
              return (
                <div key={res} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', width: '70px' }}>{res.replace('_', ' ').toUpperCase()}</span>
                  <div className="progress-bar-wrap" style={{ flex: 1, height: '8px' }}>
                    <div className="progress-bar" style={{ width: `${pct}%`, backgroundColor: 'var(--primary)' }}></div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* History Log Table */}
      <div className="card">
        <div className="section-header-row">
          <h2 className="section-title-text">📜 Alert History Log</h2>
          {history.length > 0 && (
            <button className="btn-danger" onClick={handleClearHistory} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trash2 size={14} /> Clear All
            </button>
          )}
        </div>
        {history.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Resource</th>
                  <th>Severity</th>
                  <th>Value</th>
                  <th>Threshold</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => (
                  <tr key={item.id} className={`row-${item.severity}`}>
                    <td className="td-time">{item.timestamp}</td>
                    <td><span className="badge warning" style={{ backgroundColor: item.severity === 'critical' ? 'var(--danger-light)' : 'var(--warning-light)', color: item.severity === 'critical' ? 'var(--danger)' : 'var(--warning)' }}>{item.resource.replace('_', ' ').toUpperCase()}</span></td>
                    <td><span className="badge" style={{ backgroundColor: item.severity === 'critical' ? 'var(--danger-light)' : 'var(--warning-light)', color: item.severity === 'critical' ? 'var(--danger)' : 'var(--warning)' }}>{item.severity.toUpperCase()}</span></td>
                    <td style={{ fontFamily: 'monospace' }}>{item.value.toFixed(1)}{item.resource.includes('net') ? ' MB/s' : '%'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{item.threshold}{item.resource.includes('net') ? ' MB/s' : '%'}</td>
                    <td>{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data">✅ No alerts logged — resources are fully within safe thresholds</div>
        )}
      </div>
    </div>
  );
}

// Subcomponent for editing alert rules
function RuleItem({ rule, onSubmit }) {
  const [threshold, setThreshold] = useState(rule.threshold);
  const [severity, setSeverity] = useState(rule.severity);
  const [enabled, setEnabled] = useState(rule.enabled === 1);

  const icons = {
    cpu: '⚡',
    memory: '💾',
    disk: '💿',
    net_in: '↓',
    net_out: '↑'
  };

  return (
    <form onSubmit={(e) => onSubmit(e, threshold, severity, enabled)} className="rule-form">
      <div className="rule-row">
        <div className="rule-info">
          <span className="rule-icon">{icons[rule.resource] || '⚙️'}</span>
          <div>
            <div className="rule-name">{rule.resource.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
            <div className="rule-unit">{rule.resource.includes('net') ? 'MB/s' : '%'}</div>
          </div>
        </div>

        <div className="rule-controls">
          <div className="input-group">
            <span className="input-label">Threshold</span>
            <input 
              type="number" 
              className="input-field" 
              value={threshold} 
              step="0.5"
              onChange={(e) => setThreshold(parseFloat(e.target.value))} 
            />
          </div>
          <div className="input-group">
            <span className="input-label">Severity</span>
            <select 
              className="select-field" 
              value={severity} 
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="input-group">
            <span className="input-label">Status</span>
            <label className="toggle-container">
              <input 
                type="checkbox" 
                className="toggle-input" 
                checked={enabled} 
                onChange={(e) => setEnabled(e.target.checked)} 
              />
              <div className="toggle-track">
                <div className="toggle-thumb"></div>
              </div>
              <span className="toggle-label-text">{enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          <button type="submit" className="btn-primary">Save</button>
        </div>
      </div>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: HISTORY
   ───────────────────────────────────────────────────────────── */
function HistoryPage() {
  const [hours, setHours] = useState(1);
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState({
    cpu: { avg: 0, max: 0, min: 0 },
    memory: { avg: 0, max: 0, min: 0 },
    disk: { avg: 0, max: 0, min: 0 },
    net_in: { avg: 0, max: 0, min: 0 }
  });
  const [loading, setLoading] = useState(true);

  const loadHistory = async (hr) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/history?hours=${hr}`);
      const data = await res.json();
      
      const points = [];
      if (data.labels) {
        for (let i = 0; i < data.labels.length; i++) {
          points.push({
            time: data.labels[i],
            cpu: data.cpu[i],
            memory: data.memory[i],
            disk: data.disk[i],
            net_in: data.net_in[i],
            net_out: data.net_out[i]
          });
        }
      }
      setChartData(points);

      // Compute statistics summary
      const getStats = (arr) => {
        if (!arr || arr.length === 0) return { avg: 0, max: 0, min: 0 };
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        const max = Math.max(...arr);
        const min = Math.min(...arr);
        return { avg, max, min };
      };

      setSummary({
        cpu: getStats(data.cpu),
        memory: getStats(data.memory),
        disk: getStats(data.disk),
        net_in: getStats(data.net_in)
      });
    } catch (err) {
      console.error('Failed to load historical charts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(hours);
    const interval = setInterval(() => loadHistory(hours), 30000);
    return () => clearInterval(interval);
  }, [hours]);

  return (
    <div>
      {/* Range selector */}
      <div className="range-bar mb-2">
        <span className="range-label">📅 Time Range:</span>
        <div className="range-pills">
          {[
            { label: 'Last 1h', val: 1 },
            { label: 'Last 6h', val: 6 },
            { label: 'Last 24h', val: 24 },
            { label: 'Last 7 Days', val: 168 },
            { label: 'Last 30 Days', val: 720 },
          ].map(pill => (
            <button
              key={pill.val}
              className={`range-pill ${hours === pill.val ? 'active' : ''}`}
              onClick={() => setHours(pill.val)}
            >
              {pill.label}
            </button>
          ))}
        </div>
        <span className="range-count">{chartData.length} data points loaded</span>
      </div>

      {loading ? (
        <div className="loader-overlay">
          <div className="spinner"></div>
          <span>Loading historical data...</span>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid-4 mb-2">
            <StatSummaryCard title="CPU Usage" icon="⚡" stats={summary.cpu} unit="%" colorClass="cpu-light" />
            <StatSummaryCard title="Memory Allocation" icon="💾" stats={summary.memory} unit="%" colorClass="mem-light" />
            <StatSummaryCard title="Disk Storage" icon="💿" stats={summary.disk} unit="%" colorClass="disk-light" />
            <StatSummaryCard title="Network Inbound" icon="↓" stats={summary.net_in} unit=" MB/s" colorClass="net-light" />
          </div>

          {/* Historical charts */}
          <div className="grid-2 mb-2">
            <div className="card chart-card">
              <span className="chart-title">CPU Utilization History</span>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="histCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--cpu-color)" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="var(--cpu-color)" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="cpu" stroke="var(--cpu-color)" fillOpacity={1} fill="url(#histCpu)" strokeWidth={2} name="CPU %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card chart-card">
              <span className="chart-title">Memory Allocation History</span>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="histMem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--mem-color)" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="var(--mem-color)" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="memory" stroke="var(--mem-color)" fillOpacity={1} fill="url(#histMem)" strokeWidth={2} name="Memory %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid-2 mb-2">
            <div className="card chart-card">
              <span className="chart-title">Disk Storage History</span>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="histDisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--disk-color)" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="var(--disk-color)" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="disk" stroke="var(--disk-color)" fillOpacity={1} fill="url(#histDisk)" strokeWidth={2} name="Disk %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card chart-card">
              <span className="chart-title">Network Traffic History</span>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="histNetIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--net-in-color)" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="var(--net-in-color)" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="histNetOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--net-out-color)" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="var(--net-out-color)" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="net_in" stroke="var(--net-in-color)" fillOpacity={1} fill="url(#histNetIn)" strokeWidth={2} name="Net In (MB/s)" />
                    <Area type="monotone" dataKey="net_out" stroke="var(--net-out-color)" fillOpacity={1} fill="url(#histNetOut)" strokeWidth={2} name="Net Out (MB/s)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatSummaryCard({ title, icon, stats, unit, colorClass }) {
  return (
    <div className="card stat-card">
      <div className={`stat-icon ${colorClass}`}>{icon}</div>
      <div className="stat-details">
        <div className="stat-name" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>{title}</div>
        <div className="stat-num-grid">
          <div className="stat-block">
            <span className="stat-val">{stats.avg.toFixed(1)}{unit}</span>
            <span className="stat-key">Avg</span>
          </div>
          <div className="stat-block">
            <span className="stat-val">{stats.max.toFixed(1)}{unit}</span>
            <span className="stat-key">Max</span>
          </div>
          <div className="stat-block">
            <span className="stat-val">{stats.min.toFixed(1)}{unit}</span>
            <span className="stat-key">Min</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGE: REPORTS
   ───────────────────────────────────────────────────────────── */
function ReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch('/report', { headers: { 'Accept': 'application/json' } });
        const data = await res.json();
        setReport(data);
      } catch (err) {
        console.error('Failed to load report analytics', err);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, []);

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc',
        logging: false
      });
      
      const imgWidth = 595;
      const pageHeight = 842;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`Cloud-Resource-Report-${report?.generated_at?.replace(/[:\s]/g, '-') || 'summary'}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="loader-overlay">
        <div className="spinner"></div>
        <span>Generating Analytics Reports...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={downloadPDF}
          disabled={exporting}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: exporting ? 'not-allowed' : 'pointer' }}
        >
          {exporting ? (
            <>
              <Loader className="spinner" size={16} /> Exporting...
            </>
          ) : (
            <>
              <FileText size={16} /> Download PDF Report
            </>
          )}
        </button>
      </div>

      <div ref={reportRef} style={{ display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-lg)' }}>
        {/* Report Info Card */}
        <div className="card report-section">
          <div className="report-header">
            <h2 className="report-title">📊 Executive Resource Summary</h2>
            <p className="report-subtitle">Generated at: {report?.generated_at}</p>
          </div>

          <div className="report-meta-grid">
            <div className="report-meta-item">
              <div className="report-meta-val" style={{ color: 'var(--primary)' }}>{report?.hourly?.samples || 0}</div>
              <div className="report-meta-label">Hourly Samples</div>
            </div>
            <div className="report-meta-item">
              <div className="report-meta-val" style={{ color: 'var(--success)' }}>{report?.daily?.samples || 0}</div>
              <div className="report-meta-label">24h Samples</div>
            </div>
            <div className="report-meta-item">
              <div className="report-meta-val" style={{ color: 'var(--disk-color)' }}>{report?.weekly?.samples || 0}</div>
              <div className="report-meta-label">7d Samples</div>
            </div>
            <div className="report-meta-item">
              <div className="report-meta-val" style={{ color: 'var(--danger)' }}>
                {report?.alert_counts?.reduce((acc, curr) => acc + curr.cnt, 0) || 0}
              </div>
              <div className="report-meta-label">Total Alerts</div>
            </div>
          </div>
        </div>

        {/* Hourly / Daily Statistics */}
        <div className="grid-2">
          <ReportBlock title="🕒 Last 1 Hour Analysis" data={report?.hourly} />
          <ReportBlock title="📅 Last 24 Hours Analysis" data={report?.daily} />
        </div>

        {/* Alert Breakdown Bar */}
        <div className="card">
          <div className="section-header-row">
            <h2 className="section-title-text">🚨 Alerts Severity Breakdown</h2>
          </div>
          {report?.alert_counts && report.alert_counts.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Resource</th>
                    <th>Severity</th>
                    <th>Total Alerts Triggered</th>
                  </tr>
                </thead>
                <tbody>
                  {report.alert_counts.map(ac => (
                    <tr key={ac.resource + ac.severity} className={`row-${ac.severity}`}>
                      <td><span className="badge warning" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{ac.resource.toUpperCase()}</span></td>
                      <td><span className="badge" style={{ backgroundColor: ac.severity === 'critical' ? 'var(--danger-light)' : 'var(--warning-light)', color: ac.severity === 'critical' ? 'var(--danger)' : 'var(--warning)' }}>{ac.severity.toUpperCase()}</span></td>
                      <td style={{ fontWeight: '700' }}>{ac.cnt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data">✅ No warnings or alerts have been generated during the sample window</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportBlock({ title, data }) {
  if (!data) {
    return (
      <div className="card">
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>{title}</h3>
        <div className="no-data">No data points available for this timeline.</div>
      </div>
    );
  }

  const items = [
    { label: 'CPU Usage', key: 'cpu', unit: '%' },
    { label: 'Memory', key: 'memory', unit: '%' },
    { label: 'Disk Space', key: 'disk', unit: '%' },
    { label: 'Net Inbound', key: 'net_in', unit: ' MB/s' },
    { label: 'Net Outbound', key: 'net_out', unit: ' MB/s' }
  ];

  return (
    <div className="card">
      <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>{title}</h3>
      <table className="data-table" style={{ border: 'none' }}>
        <thead>
          <tr>
            <th style={{ background: 'none', paddingLeft: 0 }}>Metric</th>
            <th style={{ background: 'none' }}>Average</th>
            <th style={{ background: 'none' }}>Maximum</th>
            <th style={{ background: 'none', paddingRight: 0 }}>Minimum</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.key} style={{ borderBottom: '1px solid var(--bg-primary)' }}>
              <td style={{ paddingLeft: 0, fontWeight: '600' }}>{item.label}</td>
              <td style={{ fontFamily: 'monospace' }}>{data[item.key]?.avg.toFixed(1)}{item.unit}</td>
              <td style={{ fontFamily: 'monospace' }}>{data[item.key]?.max.toFixed(1)}{item.unit}</td>
              <td style={{ paddingRight: 0, fontFamily: 'monospace' }}>{data[item.key]?.min.toFixed(1)}{item.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN APPLICATION ROUTER
   ───────────────────────────────────────────────────────────── */
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setConnected] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [currentPath, navigate] = usePath();

  // Helper to add temporary Toast notifications
  const addToast = (title, message, severity) => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, title, message, severity }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Perform initial authentication check
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      if (data.authenticated) {
        setUser({ username: data.username, role: data.role });
      } else {
        setUser(null);
        // Force redirect to login path if unauth
        if (currentPath !== '/login') navigate('/login');
      }
    } catch (err) {
      console.error('Auth check connection error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    navigate('/');
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/logout', {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        setUser(null);
        navigate('/login');
        addToast('Goodbye', 'You have been successfully logged out.', 'info');
      }
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  if (loading) {
    return (
      <div className="login-body">
        <div className="spinner"></div>
      </div>
    );
  }

  // Route to the appropriate sub-page based on active route state
  const renderContent = () => {
    switch (currentPath) {
      case '/':
        return <DashboardPage setConnected={setConnected} addToast={addToast} />;
      case '/alerts':
        return <AlertsPage addToast={addToast} />;
      case '/history':
        return <HistoryPage />;
      case '/report':
        return <ReportsPage />;
      default:
        return <DashboardPage setConnected={setConnected} addToast={addToast} />;
    }
  };

  const getPageTitle = () => {
    switch (currentPath) {
      case '/': return 'Real-Time Resource Dashboard';
      case '/alerts': return 'Alert Rules Management';
      case '/history': return 'Historical Metrics Timeline';
      case '/report': return 'Executive Analytics Reports';
      default: return 'Monitoring Dashboard';
    }
  };

  // If unauthenticated, show the Login view
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <Sidebar 
        currentPath={currentPath} 
        navigate={navigate} 
        user={user} 
        onLogout={handleLogout} 
      />

      {/* Main app panel */}
      <div className="main-wrap">
        <Topbar 
          title={getPageTitle()} 
          isConnected={isConnected} 
        />
        <main className="content">
          {renderContent()}
        </main>
      </div>

      {/* Real-time alert notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
