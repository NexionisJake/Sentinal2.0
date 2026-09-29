# 🏆 INCLUSIWEB: LIVE PITCH & JUDGING CHEATSHEET

> **Tactical Geospatial Command Center for Proactive Disaster Relocation & Triage Matching**

---

## ⚡ 30-Second Elevator Pitch
"Disaster management today is reactive. When extreme monsoons strike vulnerable terrain like Wayanad, authorities rely on static paper maps and manual shelter assignments. **InclusiWeb** transforms relocation from a post-disaster chaos into a sub-second, dynamic geospatial decision engine. Powered by ClickHouse spatial column indexing, 3D Deck.gl rendering, and a capacity-constrained greedy allocation algorithm, InclusiWeb calculates dynamic multi-hazard scores, triages affected habitations into priority phases, matches displaced populations to safe relocation sites without overloading roads or water supply, and compiles instant Government Relocation Action Plans in PDF and RFC 7946 GeoJSON formats."

---

## 🎯 3-Minute Live Demo Click-Path

### 1. Autopilot Mode (Zero-Click Demo)
- Click `[AUTOPILOT DEMO / JUDGE WALKTHROUGH]` in the top map bar (or press `[A]`).
- **Step 1 (0:00 - 0:25)**: Baseline Monsoon (100mm/hr) — Camera flies to Meppadi at 45° tilt.
- **Step 2 (0:25 - 0:50)**: Rainfall ramps to 250mm/hr cloudburst — 3D hexbins elevate & turn Crimson (`#EF4444`).
- **Step 3 (0:50 - 1:20)**: Triage Matrix opens — Live vulnerability counts increment dynamically.
- **Step 4 (1:20 - 2:00)**: Allocation ArcLayers & Ant-Paths render — Flashing Amber warning at narrow bridge choke point.
- **Step 5 (2:00 - 2:30)**: Action Terminal opens — Monospace system checks execute & PDF Action Plan compiles.

### 2. Interactive Control Shortcuts
| Shortcut | Action | Description |
| :--- | :--- | :--- |
| `[SPACE]` | **Trigger Simulation** | Re-calculates multi-hazard intersection score across grid |
| `[R]` | **Reset Sliders** | Resets parameters to baseline monsoon defaults (100mm, 20°, 50%) |
| `[A]` | **Autopilot Demo** | Toggles 5-step guided judge walkthrough state machine |
| `[G]` | **Action Terminal** | Slides out government brief terminal & PDF/GeoJSON exporter |
| `[ESC]` | **Dismiss Overlays** | Closes allocation matrix & action terminal |

---

## 🧮 Mathematical & Technical Defense for Judges

### 1. Dynamic Multi-Hazard Score Formula
For each 30m×30m spatial grid cell $c$:
$$\text{Hazard Score}(c) = \text{clamp}\Big(0, 100, \text{SlopeFactor} + \text{FlowAccumulation} \times 25 + \frac{\text{Rainfall}}{250} \times 25 + w_{\text{hist}} \cdot \text{HistoryDensity} \times 25\Big)$$
where:
- $\text{SlopeFactor} = (\text{Slope} / 45^\circ) \times 35$ if $\text{Slope} \ge \text{Threshold}$, else $(\text{Slope} / 45^\circ) \times 15$

### 2. Habitation Vulnerability Scoring & Triage
For each habitation $v$:
$$\text{Vulnerability Score}(v) = \frac{\text{Pop}}{1000} \times 2.5 + \text{KutchaRatio} \times 35 + \text{ElderlyRatio} \times 25$$
$$\text{Final Priority}(v) = \text{NearestHazardScore} \times \text{VulnerabilityScore}$$
- **Tier 1 (Immediate <3 mos)**: $\text{Final Priority} \ge 450$ or $\text{Hazard Score} \ge 70$
- **Tier 2 (Short-term 3-12 mos)**: $\text{Final Priority} \ge 250$ or $\text{Hazard Score} \ge 50$
- **Tier 3 (Medium-term 12-24 mos)**: Baseline priority

### 3. Capacity-Constrained Greedy Matching Algorithm
- Habitations are sorted in descending order by $\text{Final Priority}$.
- Safe sites $S$ are sorted by Euclidean distance to the target village.
- Allocation enforces multi-resource limits:
$$\text{Used}_{\text{Land}} + \text{Pop} \le \text{Max}_{\text{Land}}, \quad \text{Used}_{\text{Water}} + \text{Pop} \le \text{Max}_{\text{Water}}, \quad \text{Used}_{\text{Road}} + \text{Pop} \le \text{Max}_{\text{Road}}$$
- If $\text{Used}_{\text{Road}}$ breaches threshold, an **Amber Capacity Warning** flashes on the choke point.

### 4. Dual-Mode Network Failsafe System
- Real-time API query latency is monitored. If ClickHouse latency $> 250\text{ms}$ or connection drops, the system transparently switches to pre-calculated static JSON fixtures (`lib/fixtures/simulate_*.json`).
- Status LED displays: `DB: ONLINE [12ms]` or `DB: LOCAL CACHE [STANDBY]`.

---

## 🛠 Tech Stack Summary
- **Frontend**: Next.js 14, React 19, Deck.gl v9 (ColumnLayer, ArcLayer, PathLayer, ScatterplotLayer), MapLibre GL, Tailwind CSS v4, Lucide Icons
- **Backend / Database**: ClickHouse Columnar DB (Spatial 30m×30m grid, R-Tree H3 index), Next.js API Routes, PDFKit
- **Telemetry**: Real-time query latency tracker, WebGL instanced draw call counter, active GPU pixels counter
