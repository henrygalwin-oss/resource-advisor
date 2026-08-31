# ResourceAdvisor

ResourceAdvisor is an AI-powered enterprise facility resource monitoring and telemetry platform that tracks multi-building electricity (kWh), water flow (L), and solid waste (kg) streams in real time. Built with an industrial, Pachama-inspired design system, ResourceAdvisor provides facilities managers and building operators with sub-second rolling average anomaly detection, automated prescriptive conservation directives, 30-day predictive run-rate forecasts, and a conversational AI telemetry assistant.

---

## 🔐 Demo Credentials

Use these credentials to sign in and explore the full platform:

* **Email:** `demo.resourceadvisor.app@gmail.com`
* **Password:** `Demo1234!`
* **Access Level:** System Administrator (Full multi-building access across Block A, Block B, and Block C, pre-loaded with sample telemetry readings, baseline rolling averages, and threshold budgets).

* **Email:** `demo.manager@resourceadvisor.app`
* **Password:** `DemoManager1234!`
* **Access Level:** Department Manager (Scoped access limited to Block A only — both in the UI and enforced at the API level, demonstrating the platform's role-based multi-user access control).

---

## 📂 Sample CSV for Bulk Import

A sample telemetry CSV file is included in this repository for testing the **Bulk CSV Import** feature on the Records page.

**File:** [`sample-data.csv`](./sample-data.csv)

| Column | Values | Description |
| :--- | :--- | :--- |
| `department` | `Block A`, `Block B`, `Block C` | Building block identifier |
| `type` | `electricity`, `water`, `waste` | Resource category |
| `amount` | Numeric | Consumption quantity (kWh / L / kg) |
| `date` | `YYYY-MM-DD` | Measurement date |

**The file includes deliberate anomaly spikes** (Block A electricity ×4 on Aug 8–10, Block B water ×4 on Aug 22–24) so the anomaly detection dashboard has visible alerts after import.

**How to test:**
1. Sign in with the demo admin credentials
2. Navigate to **Records → Bulk CSV Import**
3. Upload `sample-data.csv`
4. Check the **Dashboard** — anomaly spike indicators will appear on the charts

---

## 🌐 Live Demo

* **Live Application:** [https://resource-advisor.netlify.app](https://resource-advisor.netlify.app)

---

## ✨ Core Features

* **⚡ Tri-Resource Telemetry Monitoring:** Tracks electricity consumption ($kWh$), water flow ($L$), and solid waste generation ($kg$) across multiple physical building blocks (Block A, Block B, Block C).
* **📊 7-Day Rolling Average & Anomaly Flagging:** Automatically computes continuous 7-day baseline rolling averages and flags statistical variance spikes ($>20\%$ threshold) with visual indicator diamonds.
* **🧠 Gemini AI Operational Intelligence:** Automated evaluation engine that analyzes telemetry trends to produce concise executive summaries and ranked prescriptive conservation directives with estimated percentage savings.
* **🔮 Predictive 30-Day Run-Rate Forecasts:** Machine-learning run-rate modeling that projects month-end consumption, identifies trend velocity (rising/falling/stable), and forecasts exact dates of projected budget breaches.
* **💬 Natural-Language Telemetry AI Assistant:** Floating conversational assistant with automatic building-scope detection (e.g. *"what is the water usage in Block A?"* vs. facility-wide queries) grounded in actual meter datasets.
* **📋 High-Density Records Console:** Tabular view for desktop ($20$ rows/page, pagination, search, category filter, date-range picker) paired with native touch cards on mobile, complete with inline edits and CSV bulk import/export.
* **📈 Multi-Period Facility Analytics:** Grouped comparative bar charts, donut allocation distributions, multi-period line overlays, building efficiency scorecards, and CSV telemetry exports.
* **🎯 Configurable Thresholds & Compliance Rating:** Building-specific monthly budgets with automated breach detection and compliance scoring.
* **🎨 Industrial Dual-Theme Design System:** Pachama-inspired typography (Archivo Bold Condensed Grotesk), hairline wireframe cards, and a dual-palette architecture (Warm Paper `#F4F2EA` Light Mode & Deep Ink `#15201A` Dark Mode) with keyboard shortcuts (`⌘1`–`⌘4` navigation, `⌘D` theme toggle).
* **📱 Responsive Viewports:** Custom mobile navigation drawer, single-column stat card reflow, and adaptive chart scaling tested across 375px mobile, 768px tablet, and 4K displays.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite 8, React Router v7 | High-performance Single Page Application |
| **Styling** | Tailwind CSS v4, Custom CSS Variables | Dual-theme design tokens & variable typography |
| **Charts** | Recharts | Interactive responsive time-series & breakdown charts |
| **Backend** | Node.js, Express 5 | RESTful API server with JWT & RBAC protection |
| **Database** | Supabase (PostgreSQL) | Relational telemetry store with Row-Level Security |
| **AI / LLM** | Google Gemini 2.5 Flash | Fast multimodal inference via `@google/generative-ai` |

---

## 🚀 Setup & Local Installation

### Prerequisites
* **Node.js** (v18.0.0 or later)
* **npm** or **pnpm**
* A **Supabase** account & project (PostgreSQL)
* A **Google Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))

---

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/resource-advisor.git
cd resource-advisor
```

---

### 2. Backend Setup

1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Create your `.env` configuration file:
   ```bash
   cp .env.example .env
   ```

3. Configure the required backend environment variables in `backend/.env`:

   | Variable | Description |
   | :--- | :--- |
   | `PORT` | Local server port (e.g. `5001`) |
   | `CLIENT_ORIGIN` | Allowed CORS frontend origin (e.g. `http://localhost:5173`) |
   | `JWT_SECRET` | Secret key used to sign and verify JSON Web Tokens |
   | `SUPABASE_URL` | Supabase project REST URL (`https://<project-id>.supabase.co`) |
   | `SUPABASE_KEY` | Supabase anon / public API key |
   | `SUPABASE_SERVICE_KEY` | Supabase service role secret key |
   | `GEMINI_API_KEY` | Google Gemini API key for telemetry intelligence |

4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *Health check endpoint:* `http://localhost:5001/api/health`

---

### 3. Database Migration (Supabase SQL Editor)

To create the required database tables and baseline data:

1. Open your **Supabase Dashboard** $\rightarrow$ **SQL Editor**.
2. Open [`supabase_settings_migration.sql`](./supabase_settings_migration.sql) from the project root.
3. Paste the SQL script into the editor and click **Run**.
4. *(Optional)* Seed initial records by importing [`sample-data.csv`](./sample-data.csv) via the Records page UI (`/records` $\rightarrow$ **Import CSV**).

---

### 4. Frontend Setup

1. Open a new terminal tab, navigate to the frontend directory, and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Create your frontend `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Configure the frontend environment variables in `frontend/.env`:

   | Variable | Description |
   | :--- | :--- |
   | `VITE_SUPABASE_URL` | Supabase project URL (`https://<project-id>.supabase.co`) |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon / public API key |
   | `VITE_API_URL` | Backend API base URL (e.g. `http://localhost:5001`) |

4. Start the Vite development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to **`http://localhost:5173`**.

---

## 📸 Screenshots

### 1. Operations Telemetry Dashboard
*Pachama-inspired telemetry header, 4-column metric hero numerals, interactive 7-day rolling average chart with anomaly detection diamonds, and Gemini AI insight panels.*
```
[ Screenshot Placeholder: Operations Dashboard — Light & Dark Mode ]
```

### 2. Telemetry Records & Mobile Cards
*High-density table with sticky headers on desktop and native touch cards on mobile.*
```
[ Screenshot Placeholder: Records Console & CSV Import Modal ]
```

### 3. Multi-Period Analytics & Efficiency Scores
*Grouped multi-building comparisons, resource distribution donuts, and building scorecards.*
```
[ Screenshot Placeholder: Analytics Charts & Compliance Breakdown ]
```

### 4. Facility Thresholds Configuration
*Granular per-building monthly utility budgets with real-time budget breach calculations.*
```
[ Screenshot Placeholder: Threshold Settings & Mobile Form Cards ]
```

---

## 📄 License
MIT License © 2026 ResourceAdvisor.
