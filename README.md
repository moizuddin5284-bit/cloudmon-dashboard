# ☁️ Smart Cloud Monitoring Dashboard

A modern cloud-focused resource monitoring application designed to track server performance metrics (CPU, Memory, Disk, and Network I/O) in real time, generate alerts based on configurable thresholds, and provide executive reports with PDF export capabilities.

## Features

* Real-Time CPU, Memory, Disk, and Network Monitoring
* Live Dashboard Updates using Server-Sent Events (SSE)
* Configurable Alert Rules
* Alert History & Notifications
* Historical Analytics
* Executive Reports
* PDF Report Export
* Dockerized Deployment
* Prometheus Integration
* Grafana Dashboards
* Node Exporter Monitoring

---

## Technology Stack

### Backend

* Flask
* Flask-Login
* APScheduler
* SQLite
* psutil

### Frontend

* React
* Vite
* Recharts
* Lucide React

### Monitoring & DevOps

* Docker
* Docker Compose
* Prometheus
* Grafana
* Node Exporter

---

# Running Without Docker

## Prerequisites

* Python 3.9+
* Node.js 18+

### 1. Activate Virtual Environment

```powershell
.venv\Scripts\activate
```

### 2. Install Python Dependencies

```powershell
pip install -r requirements.txt
```

### 3. Build Frontend

```powershell
cd frontend
npm install
npm run build
```

### 4. Run Application

```powershell
cd ..
python app.py
```

Application URL:

```text
http://localhost:5000
```

### Default Credentials

Username:

```text
admin
```

Password:

```text
admin123
```

---

# Running With Docker

## Prerequisites

* Docker Desktop
* Docker Compose

Verify installation:

```bash
docker --version
docker compose version
```

### Build and Start Containers

```bash
docker compose up --build
```

or

```bash
docker-compose up --build
```

### Run in Detached Mode

```bash
docker compose up -d
```

### Stop Containers

```bash
docker compose down
```

---

## Service URLs

| Service       | URL                   |
| ------------- | --------------------- |
| Dashboard     | http://localhost:5000 |
| Prometheus    | http://localhost:9090 |
| Grafana       | http://localhost:3000 |
| Node Exporter | http://localhost:9100 |

---

## Dashboard Features

### Real-Time Monitoring

* CPU Usage
* Memory Usage
* Disk Utilization
* Network Inbound/Outbound Traffic

Updates occur every 5 seconds using SSE.

### Alert Management

Configure warning and critical thresholds for monitored resources. Triggered alerts are stored and displayed in real time.

### Historical Analytics

Analyze system performance over selectable time ranges with summary statistics.

### Executive Reports

Generate performance reports and export them as PDF documents.

---

## Project Structure

```text
SmartCloudMonitoringDashboard/
│
├── frontend/
├── database/
├── prometheus/
├── grafana/
├── static/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── app.py
└── README.md
```

---

## License

MIT License
