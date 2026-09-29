import json
import random
import math
import os

min_lat, max_lat = 11.42, 11.72
min_lon, max_lon = 75.88, 76.28
steps = 22 # 22 x 22 grid = ~484 spatial cells

cells = []
cell_idx = 1

hotspots = [
    {"lat": 11.53, "lon": 76.14, "radius": 0.08, "slope_boost": 25, "flow_boost": 0.45, "hist_boost": 0.50}, # Mundakkai
    {"lat": 11.54, "lon": 76.16, "radius": 0.07, "slope_boost": 20, "flow_boost": 0.50, "hist_boost": 0.45}, # Chooralmala
    {"lat": 11.55, "lon": 76.04, "radius": 0.09, "slope_boost": 22, "flow_boost": 0.35, "hist_boost": 0.30}, # Vythiri
    {"lat": 11.61, "lon": 76.08, "radius": 0.06, "slope_boost": 10, "flow_boost": 0.20, "hist_boost": 0.15}, # Kalpetta
    {"lat": 11.65, "lon": 75.98, "radius": 0.10, "slope_boost": 18, "flow_boost": 0.30, "hist_boost": 0.25}, # Banasura hills
]

for i in range(steps):
    lat = min_lat + (max_lat - min_lat) * (i / (steps - 1))
    for j in range(steps):
        lon = min_lon + (max_lon - min_lon) * (j / (steps - 1))
        
        slope = round(random.uniform(5.0, 18.0), 2)
        flow_accum = round(random.uniform(0.1, 0.4), 2)
        hist_density = round(random.uniform(0.05, 0.3), 2)
        base_pop = random.randint(50, 450)
        area_km2 = 0.85
        
        for h in hotspots:
            dist = math.sqrt((lat - h["lat"])**2 + (lon - h["lon"])**2)
            if dist < h["radius"]:
                factor = 1.0 - (dist / h["radius"])
                slope += h["slope_boost"] * factor
                flow_accum += h["flow_boost"] * factor
                hist_density += h["hist_boost"] * factor
                base_pop += int(600 * factor)
        
        slope = min(45.0, round(slope, 2))
        flow_accum = min(1.0, round(flow_accum, 2))
        hist_density = min(1.0, round(hist_density, 2))
        
        cell_id = f"CELL_{cell_idx:04d}"
        cell_idx += 1
        cells.append((cell_id, round(lat, 6), round(lon, 6), slope, flow_accum, hist_density, base_pop, area_km2))

sql_lines = []
sql_lines.append("CREATE TABLE IF NOT EXISTS inclusiweb_geo.grid_cells (cell_id String, lat Float64, lon Float64, slope Float64, flow_accum Float64, history_density Float64, base_population UInt32, area_km2 Float64) ENGINE = MergeTree() ORDER BY cell_id;")
sql_lines.append("TRUNCATE TABLE inclusiweb_geo.grid_cells;")

values_str = ", ".join([f"('{c[0]}', {c[1]}, {c[2]}, {c[3]}, {c[4]}, {c[5]}, {c[6]}, {c[7]})" for c in cells])
sql_lines.append(f"INSERT INTO inclusiweb_geo.grid_cells VALUES {values_str};")

os.makedirs("/tmp/inclusiweb", exist_ok=True)
with open("/tmp/inclusiweb/seed_grid.sql", "w") as f:
    f.write("\n".join(sql_lines))

print(f"Generated {len(cells)} grid cells.")
