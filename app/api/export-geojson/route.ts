import { NextResponse } from 'next/server';
import { createClient } from '@clickhouse/client';

const client = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || 'admin',
  database: process.env.CLICKHOUSE_DATABASE || 'inclusiweb_geo',
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rainfall = Math.min(250, Math.max(50, parseFloat(searchParams.get('rainfall') || '100')));
    const slopeThreshold = Math.min(30, Math.max(10, parseFloat(searchParams.get('slope_threshold') || '20')));
    const historyWeight = Math.min(1.0, Math.max(0.2, parseFloat(searchParams.get('history_weight') || '0.5')));

    // Fetch all data in parallel
    const [cellsRes, habRes, sitesRes] = await Promise.all([
      client.query({
        query: `
          SELECT cell_id, lat, lon, slope, flow_accum, history_density, base_population, area_km2,
            least(100.0, greatest(0.0,
              (if(slope >= ${slopeThreshold}, (slope / 45.0) * 35.0, (slope / 45.0) * 15.0) +
              (flow_accum * 25.0) + ((${rainfall} / 250.0) * 25.0) +
              (${historyWeight} * history_density * 25.0))
            )) AS hazard_score
          FROM inclusiweb_geo.grid_cells
          WHERE least(100.0, greatest(0.0,
            (if(slope >= ${slopeThreshold}, (slope / 45.0) * 35.0, (slope / 45.0) * 15.0) +
            (flow_accum * 25.0) + ((${rainfall} / 250.0) * 25.0) +
            (${historyWeight} * history_density * 25.0))
          )) >= 30
        `,
        format: 'JSONEachRow',
      }),
      client.query({ query: `SELECT * FROM inclusiweb_geo.habitations`, format: 'JSONEachRow' }),
      client.query({ query: `SELECT * FROM inclusiweb_geo.safe_sites`, format: 'JSONEachRow' }),
    ]);

    const cells: any[] = await cellsRes.json();
    const habitations: any[] = await habRes.json();
    const sites: any[] = await sitesRes.json();

    const HALF_CELL = 0.0095; // ~1 km cell half-width in degrees

    const features: any[] = [];

    // 1. Hazard Grid Cells as Polygon features (score >= 30 only)
    cells.forEach((cell) => {
      const tier = cell.hazard_score >= 70 ? 'RED' : cell.hazard_score >= 50 ? 'ORANGE' : 'YELLOW';
      const color = cell.hazard_score >= 70 ? '#EF4444' : cell.hazard_score >= 50 ? '#F59E0B' : '#EAB308';
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [cell.lon - HALF_CELL, cell.lat - HALF_CELL],
            [cell.lon + HALF_CELL, cell.lat - HALF_CELL],
            [cell.lon + HALF_CELL, cell.lat + HALF_CELL],
            [cell.lon - HALF_CELL, cell.lat + HALF_CELL],
            [cell.lon - HALF_CELL, cell.lat - HALF_CELL],
          ]],
        },
        properties: {
          cell_id: cell.cell_id,
          hazard_score: cell.hazard_score,
          tier,
          color,
          slope: cell.slope,
          flow_accumulation: cell.flow_accum,
          historical_density: cell.history_density,
          area_km2: cell.area_km2,
          data_source: 'InclusiWeb Raster Math Engine',
          layer_type: 'HAZARD_GRID',
        },
      });
    });

    // 2. Habitation Points
    habitations.forEach((h) => {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
        properties: {
          id: h.habitation_id,
          name: h.village_name,
          population: h.population,
          vulnerability_score: h.vulnerability_score,
          kutcha_ratio: h.kutcha_ratio,
          elderly_ratio: h.elderly_ratio,
          layer_type: 'HABITATION',
          data_source: 'InclusiWeb Habitation Registry',
        },
      });
    });

    // 3. Safe Site Points
    sites.forEach((s) => {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
        properties: {
          id: s.site_id,
          name: s.site_name,
          max_land_capacity: s.max_land_capacity,
          max_water_capacity: s.max_water_capacity,
          max_road_capacity: s.max_road_capacity,
          layer_type: 'SAFE_SITE',
          data_source: 'InclusiWeb Safe Site Registry',
        },
      });
    });

    const geojson = {
      type: 'FeatureCollection',
      name: 'InclusiWeb_WayanadDistrict_HazardAllocation',
      crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
      metadata: {
        generated_at: new Date().toISOString(),
        source: 'InclusiWeb Tactical Geospatial Command Center',
        district: 'Wayanad, Kerala, India',
        parameters: { rainfall_mm_hr: rainfall, slope_threshold_deg: slopeThreshold, history_weight: historyWeight },
        feature_count: features.length,
        coordinate_system: 'WGS84 (EPSG:4326)',
        compatible_with: 'QGIS 3.x, ArcGIS Pro 3.x, GDAL/OGR, Mapbox, deck.gl',
      },
      features,
    };

    const geojsonBuffer = Buffer.from(JSON.stringify(geojson, null, 2));

    return new Response(geojsonBuffer, {
      headers: {
        'Content-Type': 'application/geo+json',
        'Content-Disposition': `attachment; filename="InclusiWeb_Wayanad_HazardAllocation_${new Date().toISOString().slice(0, 10)}.geojson"`,
        'Content-Length': String(geojsonBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('GeoJSON export error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
