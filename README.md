# 🛡️ CyberGuard — Brute-Force-Attack-Detector
AI-Based Brute Force Attack Detection &amp; Prevention System using FastAPI, React, Isolation Forest, and Rule-Based Detection.

---

## 📌 Project Objective

Demonstrate how an AI-powered system can:
1. **Simulate** a brute force login attack
2. **Detect** abnormal login patterns intelligently
3. **Prevent** the attack using automated countermeasures
4. **Explain** why an attempt was flagged (explainability)
5. **Visualise** everything in a real-time security dashboard

---

## ⚠️ Threat Demonstrated

**Brute Force Attack** — an attacker systematically tries many username/password combinations in rapid succession using an automated tool. Characteristics:
- High frequency of login attempts in a short window
- Near-zero time gap between attempts (sub-second)
- Very high failure-to-success ratio
- Same IP / session repeatedly targeting one account

---

## 🧠 Detection Logic

### Hybrid Detection Engine (`backend/services/detection.py`)

| Layer | Method | Weight |
|-------|--------|--------|
| Primary | Rule-based thresholds | 70% |
| Secondary | Isolation Forest (anomaly detection) | 30% |

### Features Used
| Feature | Normal Range | Attack Range |
|---------|-------------|-------------|
| `failed_count_window` | 0–2 in 60s | 8–15+ in 60s |
| `attempt_count_window` | 1–3 in 60s | 10–20+ in 60s |
| `avg_gap_seconds` | 15–120s | < 1.5s |
| `failed_ratio` | 0–0.4 | > 0.85 |

### Thresholds
```
≥ 3 failures  → CAPTCHA required
≥ 5 failures  → Suspicious flag
≥ 8 failures  → Attack detected + Account lockout (60s)
≥ 15 failures → Hard block
avg gap < 1.5s with 5+ attempts → Bot/automated detection
```

### Isolation Forest
- Trained on **400 simulated normal login sessions** + 50 edge-case samples
- Contamination rate: 10% (to handle borderline cases)
- Returns an anomaly score that is blended with rule-based score
- Model is auto-trained on first run and saved to `backend/data/iso_forest.pkl`

### Final Risk Score
```
risk_score = 0.70 × rule_score + 0.30 × ml_score  (capped 0–100)
```

---

## 🔒 Prevention Mechanisms

| Mechanism | Trigger |
|-----------|---------|
| **CAPTCHA Challenge** | ≥ 3 failures — human verification required |
| **Account Lockout (60s)** | ≥ 8 failures or attack detected |
| **Hard Block** | ≥ 15 failures — session/IP blocked |
| **Admin Dashboard Alert** | Real-time status update shown on dashboard |

The CAPTCHA in this demo is a simple math question (`3 + 4 = ?`). In production this would be replaced by reCAPTCHA or hCaptcha.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn

### 1. Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server
python main.py
```

Backend runs at: **http://localhost:8000**
API docs at: **http://localhost:8000/docs**

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend runs at: **http://localhost:5173**

### 3. Open the App

Open your browser to **http://localhost:5173**

---

## 🔑 Demo Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin`  | `admin123` | Administrator |
| `alice`  | `alice@pass` | Normal user |
| `bob`    | `bob@secure` | Normal user |
| `student`| `pass1234` | Demo user |

---

## 🎬 How to Demo / Present

### Case 1: Normal User Login
1. Go to **http://localhost:5173/login**
2. Enter: `alice` / `alice@pass`
3. Click **Authenticate**
4. ✅ Login succeeds — status shows **NORMAL**, risk score near 0

Or intentionally type the wrong password once, then use the correct one.

### Case 2: Brute Force Attack

**Manual way:**
1. Enter `admin` as username
2. Type wrong passwords repeatedly and fast: `abc`, `123`, `test`, `pass`...
3. After 3 failures → CAPTCHA appears
4. After 8 failures → **ATTACK DETECTED** + account locked for 60s

**Automated demo way (for presentation):**
1. Go to **http://localhost:5173/dashboard**
2. Click **"Simulate Brute Force"** button
3. Watch the dashboard update with 12 rapid failed attempts
4. See the status escalate: normal → suspicious → attack → blocked
5. Risk score climbs to 85–100/100

### Case 3: Reset
1. Click **"Reset Demo"** on the dashboard
2. All data is cleared for a fresh demonstration

---

## 📊 Dashboard Features

- **Summary Cards** — Total / Success / Failed / Suspicious / Blocked / Normal counts
- **Activity Timeline** — Bar chart of login attempts per minute (auto-refreshes every 5s)
- **Threat Breakdown** — Visual breakdown of status distribution
- **Detection Logic Reference** — Threshold reference card
- **Attempts Table** — Live table with username, IP, time, result, status, risk score, action, reason

---

## 📁 Project Structure

```
brute-force-detector/
├── backend/
│   ├── main.py                  # FastAPI application entry point
│   ├── requirements.txt
│   ├── db/
│   │   └── database.py          # SQLite init and connection
│   ├── models/
│   │   └── schemas.py           # Pydantic request/response models
│   ├── routes/
│   │   ├── auth.py              # POST /api/auth/login
│   │   ├── dashboard.py         # GET /api/dashboard/*
│   │   └── demo.py              # POST /api/demo/* (simulation)
│   └── services/
│       ├── detection.py         # ⭐ Core detection engine (rules + ML)
│       └── storage.py           # Database read/write helpers
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── App.jsx              # Router
│   │   ├── main.jsx             # Entry point
│   │   ├── index.css            # Global cyber styles
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx    # Login UI with detection feedback
│   │   │   └── DashboardPage.jsx# Security monitoring dashboard
│   │   ├── components/
│   │   │   ├── ParticleBackground.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── RiskGauge.jsx
│   │   └── utils/
│   │       └── api.js           # Axios API helpers
│   └── public/
│       └── favicon.svg
│
└── README.md
```

---

## 🤖 What Is AI-Based in This Project?

| Component | AI/ML Technique |
|-----------|----------------|
| **Isolation Forest** | Unsupervised anomaly detection — identifies login patterns far from the "normal" training distribution |
| **Behavioural Features** | ML features extracted from login history (velocity, ratio, timing) |
| **Hybrid Scoring** | Weighted blend of rule engine + anomaly score for robust, explainable decisions |
| **Auto-training** | Model trains on simulated normal data if no saved model exists |

The Isolation Forest is particularly suited here because:
- It does **not** require labelled attack data (unsupervised)
- It is **fast** and works well on small feature sets
- It is **explainable** — the anomaly score directly reflects distance from normal behaviour

---

## 🎤 How to Present in Viva / Review

1. **Explain the threat** — "Brute force attacks try many passwords rapidly; our system detects and stops this."
2. **Show the login page** — explain the cyber UI and security monitoring stance
3. **Demo normal login** — show the green NORMAL badge and near-zero risk score
4. **Demo brute force** — click "Simulate Brute Force" on dashboard, walk through the escalation
5. **Explain the detection** — point to the thresholds table in the dashboard sidebar
6. **Explain the ML** — "Isolation Forest gives an anomaly score; we blend it 30/70 with rules for robustness"
7. **Explain prevention** — CAPTCHA after 3 failures, lockout after 8
8. **Show explainability** — each attempt shows the exact reason it was flagged

---

## 🛠️ API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with brute force detection |
| GET | `/api/auth/captcha` | Get CAPTCHA challenge |
| GET | `/api/dashboard/attempts` | All login attempts |
| GET | `/api/dashboard/stats` | Summary statistics |
| GET | `/api/dashboard/timeline` | Per-minute activity data |
| POST | `/api/demo/simulate-normal` | Simulate normal login |
| POST | `/api/demo/simulate-attack` | Simulate brute force attack |
| POST | `/api/demo/reset` | Clear all data |

Interactive docs: **http://localhost:8000/docs**
