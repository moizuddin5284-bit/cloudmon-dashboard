-- Smart Cloud Monitoring Dashboard — Database Schema

CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT    NOT NULL UNIQUE,
    password  TEXT    NOT NULL,
    role      TEXT    NOT NULL DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metrics (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    cpu        REAL    NOT NULL,
    memory     REAL    NOT NULL,
    disk       REAL    NOT NULL,
    net_in     REAL    NOT NULL DEFAULT 0,
    net_out    REAL    NOT NULL DEFAULT 0,
    timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alert_rules (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    resource   TEXT    NOT NULL UNIQUE,  -- cpu | memory | disk | net_in | net_out
    threshold  REAL    NOT NULL,
    severity   TEXT    NOT NULL DEFAULT 'warning',  -- warning | critical
    enabled    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS alert_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    resource   TEXT    NOT NULL,
    value      REAL    NOT NULL,
    threshold  REAL    NOT NULL,
    severity   TEXT    NOT NULL,
    message    TEXT    NOT NULL,
    timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default admin user (password: admin123)
INSERT OR IGNORE INTO users (username, password, role)
VALUES ('admin', 'pbkdf2:sha256:600000$salt$hashed', 'admin');

-- Default alert rules
INSERT OR IGNORE INTO alert_rules (resource, threshold, severity) VALUES ('cpu',    90.0, 'critical');
INSERT OR IGNORE INTO alert_rules (resource, threshold, severity) VALUES ('memory', 85.0, 'warning');
INSERT OR IGNORE INTO alert_rules (resource, threshold, severity) VALUES ('disk',   95.0, 'critical');
INSERT OR IGNORE INTO alert_rules (resource, threshold, severity) VALUES ('net_in', 100.0,'warning');
INSERT OR IGNORE INTO alert_rules (resource, threshold, severity) VALUES ('net_out',100.0,'warning');