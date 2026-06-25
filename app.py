"""
Smart Cloud Resource Monitoring Dashboard
Flask backend — complete implementation
"""

import os
import json
import time
import sqlite3
import threading
from datetime import datetime, timedelta
from queue import Queue, Empty
from prometheus_client import (
    generate_latest,
    CONTENT_TYPE_LATEST,
    Gauge
)

import psutil
from flask import (Flask, render_template, request, redirect,
                   url_for, session, flash, Response, jsonify, g)
from flask_login import (LoginManager, UserMixin, login_user,
                         logout_user, login_required, current_user)
from werkzeug.security import generate_password_hash, check_password_hash
from apscheduler.schedulers.background import BackgroundScheduler

# ─────────────────────────────────────────────
# Prometheus Metrics
# ─────────────────────────────────────────────
cpu_gauge = Gauge(
    'cloudmon_cpu_percent',
    'Current CPU usage percentage'
)

memory_gauge = Gauge(
    'cloudmon_memory_percent',
    'Current memory usage percentage'
)

disk_gauge = Gauge(
    'cloudmon_disk_percent',
    'Current disk usage percentage'
)

netin_gauge = Gauge(
    'cloudmon_network_in_mbps',
    'Current inbound network traffic MB/s'
)

netout_gauge = Gauge(
    'cloudmon_network_out_mbps',
    'Current outbound network traffic MB/s'
)
# ─────────────────────────────────────────────
# App Setup
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, 'database', 'monitor.db')

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'cloudmon-secret-2024-xK9#mP')

login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access the dashboard.'
login_manager.login_message_category = 'info'

# SSE subscriber queues
_sse_clients: list[Queue] = []
_sse_lock = threading.Lock()

# Network baseline for delta calculation
_net_baseline = {'bytes_recv': 0, 'bytes_sent': 0, 'time': time.time()}

# ─────────────────────────────────────────────
# Database Helpers
# ─────────────────────────────────────────────
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exc):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def query_db(sql, args=(), one=False):
    cur = get_db().execute(sql, args)
    rv = cur.fetchall()
    return (rv[0] if rv else None) if one else rv

def execute_db(sql, args=()):
    db = get_db()
    db.execute(sql, args)
    db.commit()

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP)''')

    conn.execute('''CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cpu REAL NOT NULL,
        memory REAL NOT NULL,
        disk REAL NOT NULL,
        net_in REAL NOT NULL DEFAULT 0,
        net_out REAL NOT NULL DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')

    conn.execute('''CREATE TABLE IF NOT EXISTS alert_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource TEXT NOT NULL UNIQUE,
        threshold REAL NOT NULL,
        severity TEXT NOT NULL DEFAULT 'warning',
        enabled INTEGER NOT NULL DEFAULT 1)''')

    conn.execute('''CREATE TABLE IF NOT EXISTS alert_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource TEXT NOT NULL,
        value REAL NOT NULL,
        threshold REAL NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')

    # Seed admin user
    existing = conn.execute("SELECT id FROM users WHERE username='admin'").fetchone()
    if not existing:
        hashed = generate_password_hash('admin123')
        conn.execute("INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')",
                     ('admin', hashed))

    # Seed default alert rules
    defaults = [
        ('cpu',    90.0, 'critical'),
        ('memory', 85.0, 'warning'),
        ('disk',   95.0, 'critical'),
        ('net_in', 100.0,'warning'),
        ('net_out',100.0,'warning'),
    ]
    for res, thr, sev in defaults:
        conn.execute(
            "INSERT OR IGNORE INTO alert_rules (resource, threshold, severity) VALUES (?,?,?)",
            (res, thr, sev))

    conn.commit()
    conn.close()

# ─────────────────────────────────────────────
# User Model
# ─────────────────────────────────────────────
class User(UserMixin):
    def __init__(self, id_, username, role):
        self.id       = id_
        self.username = username
        self.role     = role

@login_manager.user_loader
def load_user(user_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    conn.close()
    if row:
        return User(row['id'], row['username'], row['role'])
    return None

# ─────────────────────────────────────────────
# Metric Collection
# ─────────────────────────────────────────────
def collect_metrics():
    print("COLLECT_METRICS RUNNING")

    global _net_baseline

    try:
        cpu = psutil.cpu_percent(interval=1)
        mem    = psutil.virtual_memory().percent
        disk   = psutil.disk_usage('/').percent

        # Network delta (MB/s)
        net    = psutil.net_io_counters()
        now    = time.time()
        elapsed = max(now - _net_baseline['time'], 0.001)
        net_in  = (net.bytes_recv - _net_baseline['bytes_recv']) / elapsed / 1024 / 1024
        net_out = (net.bytes_sent - _net_baseline['bytes_sent']) / elapsed / 1024 / 1024
        net_in  = max(0, round(net_in, 2))
        net_out = max(0, round(net_out, 2))

        # Export metrics to Prometheus
        cpu_gauge.set(cpu)
        memory_gauge.set(mem)
        disk_gauge.set(disk)
        netin_gauge.set(net_in)
        netout_gauge.set(net_out)

        _net_baseline = {
            'bytes_recv': net.bytes_recv,
            'bytes_sent': net.bytes_sent,
            'time': now
        }

        # Store snapshot
        conn = sqlite3.connect(DB_PATH)
        conn.execute(
            "INSERT INTO metrics (cpu, memory, disk, net_in, net_out) VALUES (?,?,?,?,?)",
            (cpu, mem, disk, net_in, net_out))

        # Check alert rules
        rules = conn.execute(
            "SELECT * FROM alert_rules WHERE enabled=1").fetchall()
        values = {'cpu': cpu, 'memory': mem, 'disk': disk,
                  'net_in': net_in, 'net_out': net_out}
        labels = {'cpu': 'CPU Usage', 'memory': 'Memory Usage',
                  'disk': 'Disk Usage', 'net_in': 'Network In',
                  'net_out': 'Network Out'}

        triggered_alerts = []
        for rule in rules:
            res  = rule[1]
            thr  = rule[2]
            sev  = rule[3]
            val  = values.get(res, 0)
            if val >= thr:
                unit = 'MB/s' if 'net' in res else '%'
                msg  = f"{labels[res]} is {val:.1f}{unit}, exceeds threshold of {thr}{unit}"
                conn.execute(
                    "INSERT INTO alert_history (resource, value, threshold, severity, message) VALUES (?,?,?,?,?)",
                    (res, val, thr, sev, msg))
                triggered_alerts.append({'resource': res, 'value': val,
                                         'severity': sev, 'message': msg})

        conn.commit()
        conn.close()

        # Prune old metrics (keep last 7 days)
        cutoff = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d %H:%M:%S')
        conn2 = sqlite3.connect(DB_PATH)
        conn2.execute("DELETE FROM metrics WHERE timestamp < ?", (cutoff,))
        conn2.commit()
        conn2.close()

        # Broadcast to SSE clients
        payload = {
            'cpu': cpu, 'memory': mem, 'disk': disk,
            'net_in': net_in, 'net_out': net_out,
            'timestamp': datetime.now().strftime('%H:%M:%S'),
            'alerts': triggered_alerts
        }
        broadcast_sse(payload)

    except Exception as e:
        print(f"[metric collector error] {e}")

def broadcast_sse(data: dict):
    msg = f"data: {json.dumps(data)}\n\n"
    with _sse_lock:
        dead = []
        for q in _sse_clients:
            try:
                q.put_nowait(msg)
            except Exception:
                dead.append(q)
        for q in dead:
            _sse_clients.remove(q)

# ─────────────────────────────────────────────
# SPA Helper
# ─────────────────────────────────────────────
def serve_spa():
    react_index = os.path.join(app.static_folder, 'react-dist', 'index.html')
    if os.path.exists(react_index):
        return app.send_static_file('react-dist/index.html')
    return "React build not found. Run 'npm run build' inside frontend directory.", 404

# ─────────────────────────────────────────────
# Scheduler
# ─────────────────────────────────────────────
scheduler = BackgroundScheduler(daemon=True)
scheduler.add_job(collect_metrics, 'interval', seconds=5, id='metric_collector')

# Track which PID started the scheduler to avoid double-start on gunicorn fork
_scheduler_pid = None

# ─────────────────────────────────────────────
# Auth Routes
# ─────────────────────────────────────────────
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        if request.headers.get('Accept') == 'application/json' or request.is_json:
            return jsonify({'success': True, 'username': current_user.username, 'role': current_user.role})
        return redirect('/')
    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            username = data.get('username', '').strip()
            password = data.get('password', '')
        else:
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '')
            
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
        conn.close()
        
        is_json = request.is_json or request.headers.get('Accept') == 'application/json'
        
        if row and check_password_hash(row['password'], password):
            user = User(row['id'], row['username'], row['role'])
            login_user(user, remember=True)
            if is_json:
                return jsonify({'success': True, 'username': username, 'role': row['role']})
            flash(f'Welcome back, {username}!', 'success')
            return redirect(request.args.get('next') or '/')
            
        if is_json:
            return jsonify({'success': False, 'message': 'Invalid username or password.'}), 401
        flash('Invalid username or password.', 'danger')
    return serve_spa()

@app.route('/logout')
def logout():
    logout_user()
    if request.headers.get('Accept') == 'application/json' or request.is_json:
        return jsonify({'success': True})
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

@app.route('/api/auth')
def api_auth():
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'username': current_user.username,
            'role': current_user.role
        })
    return jsonify({'authenticated': False})

# ─────────────────────────────────────────────
# JSON/SPA Page Routes
# ─────────────────────────────────────────────
@app.route('/alerts', methods=['GET', 'POST'])
@login_required
def alerts():
    if request.method == 'POST':
        action = request.form.get('action')
        
        # Support JSON data parsing
        if request.is_json:
            data = request.get_json()
            action = data.get('action', action)
            resource = data.get('resource')
            threshold = float(data.get('threshold', 90))
            severity = data.get('severity', 'warning')
            enabled = 1 if data.get('enabled') else 0
        else:
            resource  = request.form.get('resource')
            threshold = float(request.form.get('threshold', 90))
            severity  = request.form.get('severity', 'warning')
            enabled   = 1 if request.form.get('enabled') or request.form.get('enabled') == 'on' else 0
            
        if action == 'update_rule':
            conn = sqlite3.connect(DB_PATH)
            conn.execute(
                "UPDATE alert_rules SET threshold=?, severity=?, enabled=? WHERE resource=?",
                (threshold, severity, enabled, resource))
            conn.commit()
            conn.close()
            if request.headers.get('Accept') == 'application/json' or request.is_json:
                return jsonify({'success': True, 'message': f'Alert rule for {resource.upper()} updated.'})
            flash(f'Alert rule for {resource.upper()} updated.', 'success')
        elif action == 'clear_history':
            conn = sqlite3.connect(DB_PATH)
            conn.execute("DELETE FROM alert_history")
            conn.commit()
            conn.close()
            if request.headers.get('Accept') == 'application/json' or request.is_json:
                return jsonify({'success': True, 'message': 'Alert history cleared.'})
            flash('Alert history cleared.', 'info')
        return redirect(url_for('alerts'))

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rules   = conn.execute("SELECT * FROM alert_rules ORDER BY resource").fetchall()
    history = conn.execute(
        "SELECT * FROM alert_history ORDER BY timestamp DESC LIMIT 100").fetchall()
    conn.close()
    
    if request.headers.get('Accept') == 'application/json':
        return jsonify({
            'rules': [dict(r) for r in rules],
            'history': [dict(h) for h in history]
        })
    return serve_spa()

@app.route('/report')
@login_required
def report():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    def stats(hours):
        since = (datetime.now() - timedelta(hours=hours)).strftime('%Y-%m-%d %H:%M:%S')
        rows = conn.execute(
            "SELECT cpu, memory, disk, net_in, net_out FROM metrics WHERE timestamp >= ?",
            (since,)).fetchall()
        if not rows:
            return None
        def col(key):
            vals = [r[key] for r in rows]
            return {'avg': round(sum(vals)/len(vals), 1),
                    'max': round(max(vals), 1),
                    'min': round(min(vals), 1)}
        return {
            'cpu': col('cpu'), 'memory': col('memory'),
            'disk': col('disk'), 'net_in': col('net_in'),
            'net_out': col('net_out'), 'samples': len(rows)
        }

    alert_counts = conn.execute(
        """SELECT resource, severity, COUNT(*) as cnt
           FROM alert_history
           GROUP BY resource, severity
           ORDER BY cnt DESC""").fetchall()

    hourly  = stats(1)
    daily   = stats(24)
    weekly  = stats(168)
    conn.close()

    if request.headers.get('Accept') == 'application/json':
        return jsonify({
            'hourly': hourly,
            'daily': daily,
            'weekly': weekly,
            'alert_counts': [dict(ac) for ac in alert_counts],
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })

    return serve_spa()


# ─────────────────────────────────────────────
# API Routes
# ─────────────────────────────────────────────


@app.route('/api/stream')
@login_required
def api_stream():
    q = Queue(maxsize=30)

    with _sse_lock:
        _sse_clients.append(q)

    def generate():
        yield 'data: {"heartbeat": true}\n\n'

        try:
            while True:
                try:
                    msg = q.get(timeout=10)
                    yield msg  # msg is already "data: {...}\n\n"

                except Empty:
                    yield ": keepalive\n\n"

        except GeneratorExit:
            pass

        finally:
            with _sse_lock:
                if q in _sse_clients:
                    _sse_clients.remove(q)

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )

@app.route('/api/metrics')
@login_required
def api_metrics():
    """Returns the latest single metric snapshot."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT * FROM metrics ORDER BY timestamp DESC LIMIT 1").fetchone()
    conn.close()
    if not row:
        return jsonify({'cpu': 0, 'memory': 0, 'disk': 0, 'net_in': 0, 'net_out': 0})
    return jsonify(dict(row))

@app.route('/api/history')
@login_required
def api_history():
    """Returns time-series data for charts. Query param: hours (default 1)."""
    hours = int(request.args.get('hours', 1))
    since = (datetime.now() - timedelta(hours=hours)).strftime('%Y-%m-%d %H:%M:%S')

    # Limit points returned based on range for performance
    limit = {1: 720, 6: 500, 24: 500, 168: 500, 720: 500}.get(hours, 500)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """SELECT cpu, memory, disk, net_in, net_out,
                  strftime('%H:%M', timestamp) as ts
           FROM metrics
           WHERE timestamp >= ?
           ORDER BY timestamp ASC
           LIMIT ?""",
        (since, limit)).fetchall()
    conn.close()

    result = {
        'labels':   [r['ts']      for r in rows],
        'cpu':      [r['cpu']     for r in rows],
        'memory':   [r['memory']  for r in rows],
        'disk':     [r['disk']    for r in rows],
        'net_in':   [r['net_in']  for r in rows],
        'net_out':  [r['net_out'] for r in rows],
    }
    return jsonify(result)

@app.route('/api/alerts')
@login_required
def api_alerts():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM alert_history ORDER BY timestamp DESC LIMIT 50").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])
# ─────────────────────────────────────────────
# Prometheus Metrics Endpoint
# ─────────────────────────────────────────────
@app.route('/metrics')
def prometheus_metrics():
    return Response(
        generate_latest(),
        mimetype=CONTENT_TYPE_LATEST
    )
# ─────────────────────────────────────────────
# SPA React Frontend Catch-all Route
# ─────────────────────────────────────────────
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path.startswith('api/') or path.startswith('api-'):
        return jsonify({'error': 'Not found'}), 404
    if '.' in path.split('/')[-1]:
        return 'Not Found', 404
    return serve_spa()

# ─────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────
def start_background_services():
    """Start scheduler + initial metric collection.
    Called once per process — safe under gunicorn single-worker.
    """
    global _scheduler_pid, _net_baseline
    if _scheduler_pid == os.getpid():
        return  # Already started in this PID
    _scheduler_pid = os.getpid()

    init_db()

    net = psutil.net_io_counters()
    _net_baseline = {
        'bytes_recv': net.bytes_recv,
        'bytes_sent': net.bytes_sent,
        'time': time.time()
    }

    if not scheduler.running:
        scheduler.start()
    collect_metrics()


start_background_services()
if __name__ == '__main__':
    print("=" * 55)
    print("  Smart Cloud Monitoring Dashboard")
    print("  URL:      http://localhost:5000")
    print("  Login:    admin / admin123")
    print("=" * 55)
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
