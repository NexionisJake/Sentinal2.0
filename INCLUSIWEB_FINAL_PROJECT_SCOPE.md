# InclusiWeb: Final Project Scope & Deliverables
## What You're Actually Building (For Hackathon Judges)

---

## CRITICAL REFRAMING

**NOT Building:** An emergency app (SOS buttons, flood alerts, distress chat)

**BUILDING:** A **Strategic Proactive Planning Platform** for SDMAs to answer three hard questions:
1. Which areas are permanently unlivable? (Red Zones)
2. Who needs to move first, and in what priority order?
3. Where can we safely relocate them without running out of water/land/roads?

**For Judges:** You need to deliver **four concrete, interactive, demo-able artifacts** that prove you've solved the problem end-to-end.

---

## THE THREE CORE PILLARS

### Pillar 1: Dynamic Multi-Hazard Red Zone Delineation

**What it does:**
Combines multiple hazard datasets into a single risk score that identifies areas unsafe for permanent habitation.

**Input Data:**
- DEM (Digital Elevation Model) → extract slope
- Flow accumulation raster → identify drainage/flood-prone paths
- Historical rainfall data → seasonal intensity patterns
- Fault/seismic lines → tectonic hazards
- Historical disaster points → where did past events occur?

**Processing:**
```
For each 30m × 30m pixel:
  Hazard_Score = (w₁ × slope) 
               + (w₂ × flow_accumulation) 
               + (w₃ × rainfall_intensity) 
               + (w₄ × proximity_to_fault)
               + (w₅ × historical_disaster_density)

If Hazard_Score > 70:     → RED ZONE (unfit for habitation)
If Hazard_Score 50-70:    → ORANGE ZONE (high risk, conditional)
If Hazard_Score 30-50:    → YELLOW ZONE (moderate risk)
If Hazard_Score < 30:     → GREEN ZONE (safe)
```

**Why "Dynamic"?**
You build sliders into the UI:
- *Rainfall Slider:* "What if monsoon is 200mm/3hrs instead of normal?"
  → Red Zones expand in high-altitude drainage paths
- *Slope Cutoff Slider:* "What if we lower habitability threshold from 20° to 15°?"
  → More area marked red
- *Historical Weight Slider:* "Trust past events more/less"
  → Areas with past disaster points become redder/greener

**Output for Judges:**
Interactive map showing Red/Orange/Yellow/Green polygons. Move sliders in real-time, zones update live. This proves it's **dynamic, data-driven, and responsive to planners' concerns**.

---

### Pillar 2: Habitation Prioritization & Phased Triage

**What it does:**
For every village/hamlet inside or touching a Red/Orange zone, calculate a **Vulnerability Score** that determines relocation urgency.

**Vulnerability Factors:**
```
For each habitation (village/hamlet):
  Vulnerability_Score = (w₁ × population_in_red_zone) 
                      + (w₂ × kutcha_house_ratio) 
                      + (w₃ × elderly_ratio) 
                      + (w₄ × distance_to_hospital) 
                      + (w₅ × distance_to_road)
                      + (w₆ × household_income_avg)

Final_Priority = Hazard_Score × Vulnerability_Score

→ Classify into three tiers:
  Tier 1 (Immediate):     Score > 80  (move within 3 months)
  Tier 2 (Short-term):    Score 50-80 (move within 6-12 months)
  Tier 3 (Medium-term):   Score < 50  (move within 1-2 years)
```

**Real Example (Wayanad, Kerala):**

| Village | Pop. | Houses (Kutcha) | Elderly | Hazard | Vulnerability | Final Score | Tier |
|---------|------|-----------------|---------|--------|----------------|-------------|------|
| Meppadi | 1,250 | 78% | 18% | 85 | 0.92 | 78 | Immediate |
| Chethali | 840 | 65% | 12% | 72 | 0.81 | 58 | Short-term |
| Ambukutty | 320 | 40% | 8% | 68 | 0.65 | 44 | Medium-term |

**Output for Judges:**
A downloadable triage table showing every at-risk village ranked by priority. Color-coded: Red (Immediate), Orange (Short-term), Yellow (Medium-term). This proves you've **solved the "who moves first" problem objectively**.

---

### Pillar 3: Safe Site Carrying Capacity Assessment

**What it does:**
For each candidate relocation site (government land identified as safe), calculate the maximum number of families it can sustainably hold.

**Site Evaluation Criteria:**

```
For each candidate relocation site:

1. USABLE LAND AREA
   - Total area from satellite
   - Subtract slopes > 20° (landslide risk)
   - Subtract slopes > 5° for road access
   - Subtract 30% for civic infrastructure (roads, schools, health, water)
   - Result: Available_Land (in hectares)

2. POTABLE WATER SUPPLY
   - Check proximity to water source (bore well, river, pipeline)
   - Standard norm: 135 liters/capita/day
   - If no water within 5km → bottleneck constraint
   - Max_Families_by_Water = (Available_Water_Liters / 135) / 5_people_per_family

3. ROAD ACCESS
   - Can emergency vehicles (ambulances, fire trucks) access?
   - Min road width 3.5m, not steeper than 1:8 slope
   - If inaccessible → bottleneck

4. SOIL STABILITY
   - From geological maps: Can you build houses here?
   - If on landslide-susceptible soil → exclude or limit

5. FINAL CARRYING CAPACITY
   Carrying_Capacity = min(
       Available_Land / 150_sqm_per_plot,
       Water_Limited_Capacity,
       Road_Access_Limited_Capacity,
       Soil_Stability_Limited_Capacity
   )
```

**Real Example (Wayanad Relocation Site A):**

| Factor | Calculation | Result |
|--------|-------------|--------|
| Total area identified | 45 hectares | - |
| After excluding slopes >20° | 45 - 12 = 33 hectares | 33 ha |
| Subtract 30% civic infra | 33 × 0.7 = 23 hectares | 23 ha |
| Land-based capacity (150 sqm/plot) | 23 × 10,000 / 150 = 1,533 families | 1,533 families |
| Water availability | 2 boring wells, 500 liters/min → 720,000 L/day | 1,067 families max |
| Road access | Only 1 road, 2m wide, not emergency-worthy | 400 families max |
| **Bottleneck Constraint** | **Road access is limiting factor** | **400 families max** |

**Output for Judges:**
A visual **Capacity Matcher** card showing:
```
┌─────────────────────────────────────────────┐
│ RELOCATION SITE A (Government Land, 45 ha)  │
├─────────────────────────────────────────────┤
│ Can safely hold: 400 families                │
│ Bottleneck constraint: Road access           │
│                                              │
│ Recommended allocation:                      │
│ - Meppadi (Immediate, 1,250 people)         │
│   → Capacity used: 250/400 families (62%)   │
│   → Remaining: 150 families                 │
│                                              │
│ Status: ✓ Match feasible within 3 months   │
└─────────────────────────────────────────────┘
```

This proves you've **eliminated "paper relocations"** by actually checking if the site can handle it.

---

## THE FOUR CONCRETE DELIVERABLES (What Jury Sees)

### Deliverable 1: Interactive GIS Decision Map

**What Judges See:**
A live, zoomable map of your case study area (Wayanad, Kerala) showing:

- **Red/Orange/Yellow/Green polygons** for hazard zones (Pillar 1)
- **Vulnerable village markers** (color-coded by priority tier) (Pillar 2)
- **Safe relocation site polygons** with capacity labels (Pillar 3)
- **Toggle layers:** Turn hazard layers on/off (flood, landslide, terrain)
- **Click to explore:** Click a village → see detailed profile (population, triage tier, nearest safe site)

**Tech Stack:**
- Frontend: Streamlit (fast prototype) or Leaflet.js/Mapbox (polished)
- Backend: Python (GeoPandas) + PostGIS
- Real data: KSDMA, SRTM DEM, Census 2021

**Why Judges Care:**
Proves this is a **real GIS tool**, not a spreadsheet. Proves you understand spatial data and can visualize it professionally.

---

### Deliverable 2: "What-If" Scenario Simulator

**What Judges See:**
Three sliders on the left side of the map:

```
┌──────────────────────────────┐
│   SCENARIO SIMULATOR          │
├──────────────────────────────┤
│ 🌧️  Rainfall Intensity        │
│     Normal ●─────○─ Extreme   │
│     (100mm) → (250mm in 3hrs) │
│                               │
│ ⛰️  Slope Hazard Threshold     │
│     Steep ●────○─ Flat        │
│     (25°) → (15°)             │
│                               │
│ 📊 Trust Historical Data      │
│     Low ─●─────○─ High        │
│     (20%) → (100%)            │
│                               │
│ [SIMULATE] [RESET]            │
└──────────────────────────────┘

>>> Map updates in real-time as sliders move
>>> Red zones expand/contract
>>> Triage counts update dynamically
```

**How It Works:**
1. User moves "Rainfall Intensity" slider to "Extreme"
2. Backend recalculates Hazard_Score with new rainfall weight
3. Zone boundary updates instantly on map
4. Villages shift between tiers (some jump from Yellow → Orange → Red)
5. Carrying capacity matcher recalculates affected villages

**Example Output:**
```
NORMAL SCENARIO:
- Red Zone area: 450 km²
- Vulnerable population: 12,450
- Tier 1 (Immediate): 3,200 people

EXTREME RAINFALL SCENARIO:
- Red Zone area: 680 km² (+51%)
- Vulnerable population: 18,750 (+50%)
- Tier 1 (Immediate): 8,400 people (+162%)
```

**Why Judges Care:**
This directly fulfills "dynamically identify and update Red Zones." It proves the platform adapts to changing conditions (worsening climate) and guides **proactive planning** (plan for worst-case, not just normal case).

---

### Deliverable 3: Allocation & Carrying Capacity Matcher

**What Judges See:**
A clean UI showing the match between vulnerable habitations and safe sites:

**Layout:**
```
┌────────────────────────────────────────────────────┐
│          PHASED RELOCATION ALLOCATION              │
├────────────────────────────────────────────────────┤
│
│ PHASE 1: IMMEDIATE RELOCATION (0-3 months)
│ ─────────────────────────────────────────────
│
│ Meppadi (1,250 people, Kutcha: 78%, Elderly: 18%)
│   → Safe Site A: 400 families (remaining: 0)
│   → Safe Site B: 250 families (remaining: 100)
│   → Safe Site C: TBD, assess capacity
│   Status: ✓ Can accommodate 650/1,250 in Phase 1
│
│ Chethali (840 people)
│   → Safe Site D: 280 families
│   Status: ✓ Full accommodation possible
│
│ Ambukutty (320 people)
│   → In-situ mitigation (not relocated, low hazard)
│   Status: ✓ Retaining wall construction plan
│
├────────────────────────────────────────────────────┤
│ PHASE 2: SHORT-TERM RELOCATION (3-12 months)
│ ─────────────────────────────────────────────
│ [Similar breakdown for 8 more villages]
│
├────────────────────────────────────────────────────┤
│ PHASE 3: MEDIUM-TERM / IN-SITU (12-24 months)
│ ─────────────────────────────────────────────
│ [Similar breakdown for 5 villages]
│
├────────────────────────────────────────────────────┤
│ SUMMARY STATISTICS
│ ─────────────────
│ Total vulnerable population: 42,180
│ Phase 1 relocation: 12,450 people (3 months)
│ Phase 2 relocation: 18,730 people (6 months)
│ Phase 3 relocation/in-situ: 11,000 people (12 months)
│
│ Relocation sites identified: 7
│ Total capacity: 45,200 families (+7% buffer)
│ Bottleneck constraint: Water in Phase 2
│ Recommendation: Fast-track water pipeline to Site D
└────────────────────────────────────────────────────┘
```

**Interactive Elements:**
- Click a village → see detailed triage card
- Click a site → see capacity breakdown (land vs. water vs. road)
- Hover over "Bottleneck constraint" → tooltip explaining why

**Why Judges Care:**
This is the **"so what?" answer**. It proves you didn't just identify Red Zones, you solved the **actual relocation puzzle**: matching people to places in phases that are logistically feasible.

---

### Deliverable 4: Downloadable Official Relocation Action Plan (PDF/GeoJSON)

**What Judges See:**
A single red button: **[DOWNLOAD RELOCATION PLAN]**

Clicking it generates a **professional government-ready report**:

**PDF Report Contents:**

```
═══════════════════════════════════════════════════════════════════
                   OFFICIAL RELOCATION ACTION PLAN
                  WAYANAD DISTRICT, KERALA STATE
                    Prepared by: InclusiWeb Platform
                    Date: [Today's Date]
═══════════════════════════════════════════════════════════════════

EXECUTIVE SUMMARY
─────────────────
45,180 people in Wayanad live in multi-hazard Red Zones. Proposed
phased relocation over 24 months leveraging 7 government sites will
prevent estimated ₹1,200 Cr in disaster losses and save 100+ lives
annually.

PHASE 1: IMMEDIATE RELOCATION (0-3 months)
─────────────────────────────────────────
Affected villages: Meppadi, Chethali, Kannur
Population: 12,450
Safe sites identified: Site A, B
Status: Ready for implementation
Estimated cost: ₹250 Cr (₹2 lakh per family)

[Detailed village-by-village table]
[GIS map showing Phase 1 allocations]
[Bottleneck analysis for Phase 1]

PHASE 2: SHORT-TERM RELOCATION (3-12 months)
─────────────────────────────────────────────
Affected villages: [8 villages listed]
Population: 18,730
Safe sites identified: Site C, D, E
Status: Water pipeline construction required
Estimated cost: ₹450 Cr
Timeline: Monsoon window considerations noted

[Detailed tables, maps, bottleneck analysis]

PHASE 3: MEDIUM-TERM & IN-SITU STABILIZATION (12-24 months)
──────────────────────────────────────────────────────────
In-situ mitigation: [5 villages with retaining wall plans]
Population: 11,000
Safe sites identified: Site F, G
Estimated cost: ₹380 Cr

[Detailed mitigation plans, structural reinforcement specs]

SAFE SITE CARRYING CAPACITY AUDIT
──────────────────────────────────

Site A: 400 families
├─ Total area: 45 hectares
├─ Land available: 23 hectares (after slopes & infrastructure)
├─ Capacity by land: 1,533 families
├─ Capacity by water: 1,067 families
├─ Capacity by road access: 400 families
└─ Limiting factor: Road access (needs widening)

[Similar breakdown for Sites B through G]

RISK ASSESSMENT & RECOMMENDATIONS
──────────────────────────────────
Highest priority: Meppadi (78% kutcha houses, 18% elderly)
Bottleneck constraint: Water availability in Phases 2-3
Recommendation: Expedite pipeline to Site D by April 2026

EXPECTED OUTCOMES (if implemented)
──────────────────────────────────
✓ 45,000+ people relocated to safe zones
✓ Estimated 100-150 lives saved annually (prevent disaster deaths)
✓ ₹1,200 Cr in avoided disaster recovery costs
✓ ₹1.08 Cr in relocation expenditure (save ₹110 Cr)
✓ Climate resilience improved (adapts to worsening monsoons)

═══════════════════════════════════════════════════════════════════
```

**Also Exports:**
- **GeoJSON files:** Red zones, village locations, safe sites (for import into QGIS/ArcGIS)
- **CSV triage list:** For SDMA admin teams to implement
- **Shapefile package:** For integration into state disaster databases

**Why Judges Care:**
This proves the tool **produces actionable government output**. It's not just a research project; it's something an SDMA officer can literally hand to their superiors and say, "Here's the relocation plan. Here's how much it costs. Here are the phases."

---

## YOUR FINAL TECH STACK

To deliver these four artifacts:

| Component | Tool | Why |
|-----------|------|-----|
| Hazard scoring (Pillar 1) | Python + GeoPandas + NumPy | GIS data processing |
| Triage calculation (Pillar 2) | Python + Pandas | Multi-factor scoring |
| Capacity assessment (Pillar 3) | Python + custom logic | Resource constraint solving |
| Interactive map | Streamlit (fast) or Leaflet.js (polished) | Real-time visualization |
| Scenario simulator sliders | Streamlit widgets | Easy What-If logic |
| PDF export | Python `reportlab` | Professional documents |
| GeoJSON export | Python `geojson` library | GIS integration |
| Spatial database | PostgreSQL + PostGIS | Store/query large datasets |
| Data source | KSDMA, SRTM DEM, Census 2021 | Real, public, citable |

---

## ONE-SENTENCE PITCH (For your 10-min presentation)

> "InclusiWeb is an AI-GIS platform that **automatically identifies who in India's disaster-prone zones needs to move first, and proves those moves are feasible by checking water/land/road capacity before planning even starts** — shifting relocation from reactive rescue to proactive strategy."

---

## WHAT YOU WILL NOT BUILD (Common Mistakes)

❌ An emergency SOS app or disaster notification system
❌ A citizen-facing mobile app (this is for government planners)
❌ Deep learning/neural networks (AHP weighting is sufficient)
❌ Real-time weather data ingestion (static hazard maps + scenario simulator is enough)
❌ A full housing database with individual property deeds (village-level data is fine)
❌ A supply-chain logistics system (just prove relocation is theoretically feasible)

---

## YOUR WINNING CRITERIA (Judge's Perspective)

When judges evaluate your prototype, they will check:

✅ **Technical Rigor:** Do you use real data? Is the math defensible?
✅ **Problem Solved:** Did you actually answer all three questions (Red Zones, Prioritization, Feasibility)?
✅ **Concrete Deliverables:** Can judges touch/click/download something tangible?
✅ **Scalability:** Could this work for any disaster-prone state?
✅ **Implementability:** Would an SDMA actually use this?
✅ **Innovation:** Is the carrying capacity + scenario simulator genuinely new?
✅ **Polish:** Does the UI look like a real government tool, not a school project?

---

## TIMELINE (4-6 weeks to hackathon submission)

**Week 1-2:** Data collection + Pillar 1 (Red Zone mapping) ✓
**Week 2-3:** Pillar 2 (Triage scoring) + Pillar 3 (Capacity calculation) ✓
**Week 3-4:** Interactive map + Scenario simulator UI ✓
**Week 4-5:** Allocation matcher + PDF export ✓
**Week 5-6:** Polish, test, prepare pitch ✓

---

## SUCCESS LOOKS LIKE

**End of Week 6, you sit judges down:**

1. **Map appears.** Judges see Wayanad with Red/Orange/Yellow/Green zones.
2. **You move the rainfall slider.** Red zones expand. Judges see it's dynamic.
3. **You click a village.** Up pops its triage tier and assigned relocation site.
4. **You show the allocation table.** It's organized by phase, with bottleneck analysis.
5. **You click [DOWNLOAD].** A professional PDF appears on screen.
6. **Judges say:** "This is actually useful. Could we use this for Himachal Pradesh?"
7. **You say:** "Yes, same methodology, just swap in your data."

**That's a win.**

---

**Ready to start building?**
