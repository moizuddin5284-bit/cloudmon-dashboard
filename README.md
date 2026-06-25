<<<<<<< HEAD
# Smart Cloud Monitoring Dashboard

A modern, cloud-focused resource monitoring application designed to track server performance metrics (CPU, Memory, Disk, and Network IO) in real-time, generate alerts on resource thresholds, and compile executive reports with PDF export.

## 🚀 How to Run the Application (Without Docker)

Follow these step-by-step instructions to set up and run both the Flask backend and the React frontend locally on your Windows system.

### Prerequisites
Make sure you have the following installed:
1. **Python 3.9+**
2. **Node.js 18+** (with npm)

---

### Step 1: Set up the Python Backend
1. Open a terminal (PowerShell or Command Prompt) at the project root directory (`SmartCloudMonitoringDashboard`).
2. Activate the virtual environment:
   ```powershell
   .venv\Scripts\activate
   ```
3. Install the required Python packages:
   ```powershell
   pip install -r requirements.txt
   ```

---

### Step 2: Build the Frontend Assets
To allow the Flask server to serve the React Single Page Application (SPA), you must compile the frontend assets:
1. Navigate to the `frontend` folder:
   ```powershell
   cd frontend
   ```
2. Install the React packages:
   ```powershell
   npm install
   ```
3. Build the static production bundle:
   ```powershell
   npm run build
   ```
   *Note: This generates compiled React assets directly inside the Flask static folder (`../static/react-dist`).*

---

### Step 3: Run the Application
1. Return to the project root directory:
   ```powershell
   cd ..
   ```
2. Start the Flask server:
   ```powershell
   python app.py
   ```
3. The server will initialize the SQLite database (`database/monitor.db`) and start running on:
   - **URL**: [http://localhost:5000](http://localhost:5000)

---

### Step 4: Login and Credentials
- **Username**: `admin`
- **Password**: `admin123`

---

## 📈 Key Features & Functional Verification

### 1. Real-Time Resource Monitoring
Once logged in, you will see real-time charts updating every **5 seconds** via Server-Sent Events (SSE). The charts monitor:
- **CPU Allocation (%)**
- **Memory Allocation (%)**
- **Disk Space Utilization (%)**
- **Network Inbound & Outbound Speeds (MB/s)**

### 2. Alert Management
Navigate to the **Alert Rules** page to configure thresholds for metrics. If a server metric crosses the threshold, a warning/critical entry is added to the log, and a real-time toaster notification will pop up.

### 3. PDF Report Generation
Navigate to the **Executive Reports** tab:
1. View hourly, daily, and weekly statistics summaries (Average, Max, Min).
2. Click the **Download PDF Report** button to export a high-resolution, custom-styled PDF of the performance summary and alert logs.
=======
# cloudmon-dashboard
Real-time cloud resource monitoring dashboard built with Flask, React, Docker, Prometheus, Grafana, and Node Exporter.
>>>>>>> bcab90206fd10ec4b4415306e253c464dbc50db6
