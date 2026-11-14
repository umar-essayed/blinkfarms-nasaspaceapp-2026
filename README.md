<div align="center">

# 🌍 BlinkFarms (حقول بلينك)
### Autonomous Biophysical Crop Rotation & Flash Drought Intelligence Engine
**NASA Space Apps Challenge 2026 — Global Finalist Submission**  
*Challenge: Field Shift: Cultivating Climate-Resilient Agriculture*

[![Verification Suite](https://img.shields.io/badge/Biophysical%20Audit-7%2F7%20Pillars%20Passed%20(100%25)-2ea44f?style=for-the-badge&logo=nasa)](./blinkengine/tests/test_master_validation_suite.py)
[![Ground Truth Benchmark](https://img.shields.io/badge/AmeriFlux%20US--Ne1-R%C2%B2%20%3D%200.834-blue?style=for-the-badge)](./blinkengine/historical_validation.py)
[![Stack](https://img.shields.io/badge/Next.js%2014-FastAPI%20%7C%20NumPy-black?style=for-the-badge&logo=next.js)](./blinkui)
[![Bilingual](https://img.shields.io/badge/Language-English%20%7C%20%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9-darkgreen?style=for-the-badge)](#)

<br/>

**BlinkFarms bridges high-resolution NASA satellite telemetry with on-the-ground farming decisions.** It eliminates the catastrophic 14-day lag of traditional optical vegetation indices, predicts flash droughts before leaf wilting occurs, and generates 3-year Pareto-optimal crop succession blueprints tailored to hyper-arid and desert-reclaimed soils.

</div>

---

## 📸 System Screenshots & Visual Walkthrough

Here is a live walkthrough of the deployed platform across its three core operational screens:

### 1. Real-Time Field Telemetry & Satellite Radar Dashboard
> **Live Parcel Monitoring:** GPS parcel boundaries for hyper-arid reclamation projects (e.g., West Minya 1.5M Feddan Project / Toshka Basin), featuring real-time canopy temperature ($20.8^\circ\text{C}$ with early stomatal closure tracking), morning irrigation quota ($347.1 \text{ m}^3/\text{fed}$), safe spray hour windows, root-zone moisture profile ($65.6\%$), and a 14-day flash drought safety radar.

<div align="center">
  <img src="./screenshots/01_field_radar_dashboard.jpg" alt="BlinkFarms Real-Time Field Telemetry and Satellite Radar Dashboard" width="900" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" />
</div>

<br/>

### 2. 3-Year / 6-Season Crop Succession & Economic Feasibility Roadmap
> **Pareto-Optimal Agro-Ecological Rotations:** Dynamic TOPSIS recommendation engine selecting certified cultivars (e.g., Garlic winter succession in West Minya/Toshka), delivering $+120\text{k EGP/feddan}$ seasonal net margin, $+687\text{k EGP/feddan}$ cumulative 3-year farm return, $6\%$ net irrigation water savings ($781\text{ m}^3/\text{fed}$ conserved), and subsoil biodrilling hardpan remediation.

<div align="center">
  <img src="./screenshots/02_crop_succession_planner.png" alt="BlinkFarms 3-Year Crop Succession Roadmap" width="900" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" />
</div>

<br/>

### 3. BlinkAI Agronomic Voice & Text Field Advisory
> **Domain-Grounded Intelligence:** Bilingual (English & Egyptian Arabic) advisory engine coupled with the 16-dimensional `FieldMemoryStore`. Learns farm history across seasons, cross-references 5 years of historical NASA POWER weather patterns, and provides actionable sowing dates, fertilizer programs, and water quotas based on Egyptian Agricultural Research Center (ARC) certified varieties.

<div align="center">
  <img src="./screenshots/03_blinkai_field_chat.png" alt="BlinkAI Agronomic Field Chat and Voice Advisory" width="900" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" />
</div>

---

## 📌 Executive Summary & The Problem on the Ground

Hyper-arid reclaimed basins—such as the **Toshka Depression, East Oweinat, and West Minya in Egypt**—represent strategic national breadbaskets. However, farming in these extreme environments faces three critical biophysical vulnerabilities:

1. **The 14-Day Optical Remote Sensing Blind Spot:**  
   Standard satellite monitoring relies on NDVI or EVI greenness indices. By the time a satellite detects optical browning or canopy discoloration, the crop's stomatal conductance has already been collapsed for 10 to 14 days, causing irreversible vascular cavitation and severe yield loss.
2. **Repetitive Monoculture & Subsoil Degradation:**  
   Continuous planting of identical grain families (e.g., continuous wheat or continuous maize) depletes soil mineral nitrogen, fosters root-knot nematode blooms, and creates a dense compaction hardpan at 30–40 cm depth that restricts root penetration.
3. **The Farmer Economic Risk Barrier:**  
   Growers resist shifting to restorative cover crops or legumes because they lack transparent, bankable numbers that demonstrate farm-gate profitability under real Egyptian market conditions.

**BlinkFarms solves this** by coupling daily thermal canopy infrared radiometry (ECOSTRESS/MODIS), mass-conserved soil moisture downscaling (SMAP L4), dynamic multi-objective TOPSIS optimization, and rigorous Egyptian agricultural economics.

---

## 🔬 The 7 Biophysical & Algorithmic Pillars

All 7 core modules are mathematically derived, biophysically bounded, and verified against genuine ground-truth flux towers:

```
                  ┌────────────────────────────────────────────────────────┐
                  │              NASA SATELLITE TELEMETRY                  │
                  │   SMAP L4 (9km)  •  ECOSTRESS / MODIS  •  NASA POWER   │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │        PILLAR 1         │                     │        PILLAR 3         │
         │  KKT SMAP Downscaling   │                     │   Flash Drought Radar   │
         │   (9km ➔ 30m Grid)      │                     │   (ESI vs NDVI Lag)     │
         └────────────┬────────────┘                     └────────────┬────────────┘
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              ▼
                                 ┌─────────────────────────┐
                                 │        PILLAR 2         │
                                 │   16D FieldMemoryStore  │
                                 │   (5-Yr Analogue Kernel)│
                                 └────────────┬────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │        PILLAR 4         │                     │        PILLAR 5         │
         │  Dynamic TOPSIS Engine  │                     │   Stewart Yield Model   │
         │ (Water, Profit, Soil)   │                     │  & Pure Farm Economics  │
         └────────────┬────────────┘                     └────────────┬────────────┘
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              ▼
                                 ┌─────────────────────────┐
                                 │    PILLARS 6 & 7        │
                                 │   Dual Erosion Index    │
                                 │ & AmeriFlux Validation  │
                                 └─────────────────────────┘
```

### 1. SMAP L4 Mass-Conserved KKT Downscaling (9 km ➔ 30 m)
Satellite radiometers measure soil moisture at coarse scales (SMAP L4 at 9 km). Naive bilinear interpolation violates the fundamental law of water mass conservation. BlinkFarms implements an analytical Karush-Kuhn-Tucker (KKT) dual optimization that modulates coarse moisture via 30 m Sentinel-2 / Landsat topographic wetness indices and soil texture while strictly conserving water mass:

$$\min_{\boldsymbol{\theta}} \frac{1}{2} \sum_{i=1}^{N} w_i (\theta_i - \tilde{\theta}_i)^2 \quad \text{subject to} \quad \frac{1}{N} \sum_{i=1}^{N} \theta_i = \Theta_{\text{coarse}}, \quad \theta_{\text{res}} \le \theta_i \le \theta_{\text{sat}}$$

* **Verified Conservation Error:** $|\frac{1}{N}\sum \theta_i - \Theta_{\text{coarse}}| = 8.32 \times 10^{-14} \text{ m}^3/\text{m}^3$ across sand, loam, and alluvial clay.

### 2. 16-Dimensional `FieldMemoryStore` & Historical Analogs
Every farm parcel is continuously embedded into a 16-dimensional biophysical state vector:
$$\mathbf{v} = \big[ \text{EC}_e, \text{Sand}\%, \text{Clay}\%, \text{OM}\%, \text{pH}, \text{Hardpan}, \text{N}_{\text{min}}, \theta_{\text{surf}}, \theta_{\text{root}}, \text{NDVI}, \text{ESI}, \Delta T_{\text{canopy}}, \text{GDD}, \text{ET}_0, u_2, \text{Rain} \big]$$
When an acute climate anomaly occurs, the engine executes a centered cosine + RBF kernel search against 5 years of historical NASA POWER weather cycles to locate the nearest agro-ecological analog and retrieve proven mitigation tactics.

### 3. Flash Drought Thermal Early Warning (10–14 Days Lead Time)
Plants manage water stress through stomatal closure before chlorophyll breakdown occurs. As stomata close, evaporative cooling collapses, causing a "canopy fever":
$$\Delta T = T_{\text{canopy}} - T_{\text{air}}$$
$$\text{ESI} = \frac{\text{ET}_a}{\text{PET}}$$
BlinkFarms flags a **Flash Drought Warning** when $\text{ESI} < 0.62$ and $\Delta T \ge +3.0^\circ\text{C}$ for two consecutive days. In field simulations and drought benchmarks, this triggers an actionable irrigation intervention **10 to 14 days ahead of optical NDVI decline**, preventing permanent wilting point damage.

### 4. Dynamic Multi-Objective TOPSIS Crop Succession Engine
Crop succession is solved via Technique for Order Preference by Similarity to Ideal Solution (TOPSIS) across a 48-crop catalog. The objective weights adapt in real time to farm priorities (Water Resilience, Net Profit, Soil Regeneration) while enforcing deterministic agronomic constraints:
* **Botanical Family Isolation:** Forbids consecutive plantings of the same family (e.g., Poaceae $\to$ Poaceae or Fabaceae $\to$ Fabaceae) to shatter pest and nematode life cycles.
* **Osmotic Salinity Gating:** Restricts crop choices if current soil electrical conductivity ($\text{EC}_e$) exceeds the Maas-Hoffman salinity threshold.
* **Bio-Drilling Taproot Synergy:** Injects deep-rooted remediation crops (e.g., Alfalfa, Sorghum) when subsoil hardpan density exceeds critical compaction thresholds ($> 0.35$).

### 5. Crop Yield & Field Economics ($S_{\text{econ}}$ v3.0)
Yield realization is computed using the FAO-33 Stewart water-deficit equation:
$$1 - \frac{Y_a}{Y_m} = K_y \left(1 - \frac{\text{ET}_a}{\text{ET}_c}\right)$$
Economic margins are grounded in authentic Egyptian Ministry of Agriculture procurement bulletin prices (e.g., Wheat at 13,333 EGP/ton, Maize at 13,570 EGP/ton, Faba Bean at 24,000 EGP/ton, Garlic at 25,000 EGP/ton):
$$\text{Net Profit} = (Y_a \times P_{\text{producer}}) - C_{\text{baseline}} + \Delta_{\text{Fertilizer Savings}} + \Delta_{\text{Pumping Savings}}$$
* **Zero Double-Counting:** Distinguishes cleanly between single-season margins and 3-year cumulative succession margins.

### 6. Dual Soil Erosion Vulnerability Index
Hyper-arid reclamation soils are vulnerable to active wind deflation and sporadic burst runoff:
* **Wind Detachment (WEQ Proxy):** Features a sharp physical kinetic threshold at wind speed $u_2 = 4.5 \text{ m/s}$. When $u_2 \le 4.5 \text{ m/s}$, instantaneous daily detachment is strictly $0.00 \text{ ton/ha}$. Above threshold, loss scales quadratically with vegetative residue cover ($C_{\text{cov}}$) damping.
* **Water Erosion (RUSLE):** $A = R \cdot K \cdot LS \cdot C \cdot P$. On arid zero-precipitation days, runoff detachment strictly evaluates to $0.00 \text{ ton/ha}$.

### 7. Ground-Truth Empirical Validation (AmeriFlux US-Ne1)
BlinkFarms was benchmarked against genuine published eddy covariance flux tower observations from the **AmeriFlux Mead Irrigated Maize/Soybean Tower (US-Ne1)**:
* **Correlation ($R^2$):** **$0.8336$**
* **Root Mean Square Error (RMSE):** **$1.790 \text{ mm/day}$**
* **Mean Absolute Error (MAE):** **$1.651 \text{ mm/day}$**
* **Synthetic Data:** **Zero synthetic fabrication**. All benchmarks execute on raw unadjusted empirical data.

---

## 💻 Tech Stack & Architecture

```
blinkfarms/
├── blinkengine/                   # Python Biophysical Scientific Microservice (Port 8000)
│   ├── api_server.py              # FastAPI microservice with REST endpoints
│   ├── crop_rotation_engine.py    # 6-Season succession optimizer (DSSAT/AquaCrop)
│   ├── economic_engine.py         # S_econ v3.0 farm-gate profitability ledger
│   ├── field_memory_store.py      # 16D state vector persistence & RBF analog search
│   ├── models.py                  # Analytical formulas (Penman-Monteith, Stewart, ESI)
│   ├── nasa_client.py             # Live NASA POWER, SMAP & Earthdata ingestion
│   └── tests/                     # 100% precision scientific verification suite
├── blinkui/                       # Modern Next.js 14 Web Application (Port 3000)
│   ├── src/app/                   # App Router (Bilingual Arabic/English)
│   ├── src/components/            # Interactive farm HUD & crop succession components
│   │   ├── AgronomicWizard.tsx    # Interactive field configuration & telemetry ingestion
│   │   ├── CropRotationPlanner.tsx# 3-Year succession roadmap & economic ledger
│   │   ├── FarmerMorningVitals.tsx# Daily morning briefing & 14-day drought radar
│   │   ├── NasaScienceLabModal.tsx# Transparent biophysical equation inspector
│   │   └── SplitFieldMap.tsx      # Multi-parcel satellite zone visualizer
│   └── src/lib/                   # Python bridge client & biophysical types
└── screenshots/                   # High-resolution platform demonstration images
```

---

## 🚀 Complete Installation, Configuration & Execution Guide

### Architecture & Port Allocation

| Component | Technology | Default Port | Internal URL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **BlinkEngine Backend** | Python 3.10+ / FastAPI / Uvicorn | `8000` | `http://127.0.0.1:8000` | NASA ingestion, biophysical models, TOPSIS optimizer |
| **BlinkUI Frontend** | Next.js 14 / TypeScript / Tailwind | `3000` | `http://localhost:3000` | Farmer cockpit, interactive map, bilingual voice/text advisor |

The frontend communicates seamlessly with the engine via the environment variable `NEXT_PUBLIC_PYTHON_ENGINE_URL=http://127.0.0.1:8000`.

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/umar-essayed/blinkfarms-nasaspaceapp-2026.git
cd blinkfarms-nasaspaceapp-2026
```

---

### Step 2: Set Up and Run the Python Engine (Port 8000)

1. **Navigate to the engine directory:**
   ```bash
   cd blinkengine
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # On Windows (PowerShell):
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # On Windows (CMD):
   python -m venv venv
   .\venv\Scripts\activate.bat

   # On Linux / macOS:
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Launch the FastAPI microservice on Port 8000:**
   ```bash
   python -m uvicorn api_server:app --host 127.0.0.1 --port 8000 --reload
   ```
   *Output confirmation:*
   ```text
   INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
   INFO:     Started reloader process
   INFO:     Application startup complete.
   ```

5. **Verify Engine Health & Endpoints:**
   * Health Check: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)
   * Interactive Swagger Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   * Redoc Documentation: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

### Step 3: Run the Verification & Benchmark Suite (Zero Synthetic Data)
In the same virtual environment, run the master scientific test suite:
```bash
python tests/test_master_validation_suite.py
```
*Expected Result:*
```text
================================================================================
🏆 ALL 7 PILLARS PASSED WITH 100% MATHEMATICAL & PHYSICAL PRECISION!
Total Execution Time: ~0.20 seconds | ZERO MOCK DATA | READY FOR NASA SUBMISSION
================================================================================
```

---

### Step 4: Set Up and Run the Next.js Frontend (Port 3000)

1. **Open a new terminal and navigate to the UI directory:**
   ```bash
   cd ../blinkui
   ```

2. **Install Node.js packages:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (Optional):**
   The application defaults to `http://127.0.0.1:8000`. To customize, create a `.env.local` file:
   ```env
   NEXT_PUBLIC_PYTHON_ENGINE_URL=http://127.0.0.1:8000
   ```

4. **Start the Next.js development server:**
   ```bash
   npm run dev
   ```
   *Output confirmation:*
   ```text
   - ready started server on 0.0.0.0:3000, url: http://localhost:3000
   ```

5. **Open the Application:**
   Navigate to **[http://localhost:3000](http://localhost:3000)** in your browser.

6. **Production Build & Execution (Optional):**
   ```bash
   npm run build
   npm run start
   ```

---

## 🛰️ NASA Earth Observation Datasets Used

| NASA Mission / Resource | Spatial / Temporal Resolution | Parameter Ingested | Agronomic Function in BlinkFarms |
| :--- | :--- | :--- | :--- |
| **SMAP L4 (SPL4SMGP)** | 9 km / 3-Hourly | Surface ($0-5\text{cm}$) & Root-Zone ($0-100\text{cm}$) Moisture | Mass-conserved soil water balance & irrigation triggers |
| **ECOSTRESS** | 70 m / 1–5 Days | Land Surface Temperature (LST) & Evaporative Stress | Detection of canopy fever ($\Delta T$) and early stomatal closure |
| **NASA POWER (MERRA-2)**| 0.5° × 0.625° / Daily | $T_{\text{max}}$, $T_{\text{min}}$, $RH$, $u_2$, Solar Radiation | FAO-56 Penman-Monteith reference evapotranspiration ($\text{ET}_0$) |
| **NASA POWER (CERES)** | 1.0° / Daily | All-Sky Surface Shortwave Downward Irradiance | Crop radiation use efficiency & biomass synthesis |
| **GPM IMERG** | 0.1° / Half-Hourly | Precipitation Depth & Intensity ($I_{30}$) | Net water balance & RUSLE water erosion risk |
| **MODIS (MOD16A2)** | 500 m / 8-Day | Potential Evapotranspiration (PET) | Evaporative Stress Index ($\text{ESI} = \text{ET}_a / \text{PET}$) calculation |
| **Landsat 8-9 (OLI/TIRS)**| 30 m / 16-Day | Red, NIR, Thermal Infrared Bands | High-resolution NDVI, SAVI, and 30 m downscaling covariates |
| **Sentinel-2 (ESA/NASA)** | 10–20 m / 5-Day | Multi-Spectral Surface Reflectance | Sub-parcel vegetative zoning and fractional cover ($f_c$) |

---

## 🏆 NASA Space Apps Challenge 2026

* **Category:** Field Shift: Cultivating Climate-Resilient Agriculture
* **Region of Interest:** Toshka Depression, East Oweinat, and West Minya Reclaimed Basins, Egypt
* **Open Source License:** MIT License — Developed for open humanitarian and scientific agricultural advancement.
