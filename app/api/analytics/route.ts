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

    // Query hazard grid aggregates
    const gridRes = await client.query({
      query: `
        SELECT
          countIf(score >= 70) AS red_cells,
          countIf(score >= 50 AND score < 70) AS orange_cells,
          countIf(score >= 30 AND score < 50) AS yellow_cells,
          countIf(score < 30) AS green_cells,
          round(sumIf(area_km2, score >= 70), 1) AS red_zone_km2,
          round(sumIf(area_km2, score >= 50), 1) AS high_risk_zone_km2,
          round(avg(score), 1) AS avg_hazard_score,
          max(score) AS max_hazard_score
        FROM (
          SELECT
            area_km2,
            least(100.0, greatest(0.0,
              (if(slope >= ${slopeThreshold}, (slope / 45.0) * 35.0, (slope / 45.0) * 15.0) +
              (flow_accum * 25.0) +
              ((${rainfall} / 250.0) * 25.0) +
              (${historyWeight} * history_density * 25.0))
            )) AS score
          FROM inclusiweb_geo.grid_cells
        )
      `,
      format: 'JSONEachRow',
    });
    const [gridAgg] = await gridRes.json() as any[];

    // Query habitation analytics
    const habRes = await client.query({
      query: `SELECT habitation_id, village_name, population, kutcha_ratio, elderly_ratio FROM inclusiweb_geo.habitations`,
      format: 'JSONEachRow',
    });
    const habitations: any[] = await habRes.json();

    // Query grid cells for village hazard score lookup
    const cellsRes = await client.query({
      query: `
        SELECT lat, lon,
          least(100.0, greatest(0.0,
            (if(slope >= ${slopeThreshold}, (slope / 45.0) * 35.0, (slope / 45.0) * 15.0) +
            (flow_accum * 25.0) +
            ((${rainfall} / 250.0) * 25.0) +
            (${historyWeight} * history_density * 25.0))
          )) AS hazard_score
        FROM inclusiweb_geo.grid_cells
      `,
      format: 'JSONEachRow',
    });
    const cells: any[] = await cellsRes.json();

    // Compute village-level analytics
    let tier1Pop = 0, tier2Pop = 0, tier3Pop = 0;
    const villageStats: any[] = [];

    habitations.forEach((v) => {
      let minDist = Infinity;
      let nearestScore = 40;
      for (const cell of cells) {
        const d = Math.hypot(v.lat - cell.lat, v.lon - cell.lon);
        if (d < minDist) { minDist = d; nearestScore = cell.hazard_score; }
      }

      const vulScore = (v.population / 1000.0) * 2.5 + (v.kutcha_ratio || 0.5) * 35.0 + (v.elderly_ratio || 0.2) * 25.0;
      const finalPriority = Math.round(nearestScore * vulScore * 10) / 10;

      let tier = 'TIER_3';
      if (finalPriority >= 450 || nearestScore >= 70) { tier = 'TIER_1'; tier1Pop += v.population; }
      else if (finalPriority >= 250 || nearestScore >= 50) { tier = 'TIER_2'; tier2Pop += v.population; }
      else { tier3Pop += v.population; }

      villageStats.push({ name: v.village_name, tier, hazard_score: Math.round(nearestScore * 10) / 10, priority: finalPriority });
    });

    const totalDisplaced = tier1Pop + tier2Pop;
    const inSituCost = tier3Pop * 50000;
    const budgetEstimate = (tier1Pop * 200000) + (tier2Pop * 150000) + inSituCost;

    // Query safe site status for bottleneck summary
    const sitesRes = await client.query({
      query: `SELECT site_id, site_name, max_land_capacity, max_water_capacity, max_road_capacity FROM inclusiweb_geo.safe_sites`,
      format: 'JSONEachRow',
    });
    const sites: any[] = await sitesRes.json();

    const bottleneckSummaries = sites.map((s) => {
      const constraintType = s.max_road_capacity <= s.max_water_capacity && s.max_road_capacity <= s.max_land_capacity
        ? 'ROAD_WIDTH' : s.max_water_capacity <= s.max_land_capacity ? 'WATER_LIMIT' : 'LAND_LIMIT';
      return { site: s.site_name, constraint: constraintType, capacity: Math.min(s.max_land_capacity, s.max_water_capacity, s.max_road_capacity) };
    });

    return NextResponse.json({
      success: true,
      parameters: { rainfall, slopeThreshold, historyWeight },
      gridAggregates: gridAgg,
      villageStats,
      summary: {
        tier1Population: tier1Pop,
        tier2Population: tier2Pop,
        tier3Population: tier3Pop,
        totalDisplaced,
        budgetEstimateINR: budgetEstimate,
        budgetEstimateCrore: Math.round(budgetEstimate / 10000000 * 10) / 10,
        inSituMitigationCost: inSituCost,
      },
      bottleneckSummaries,
    });
  } catch (error: any) {
    console.error('Error in /api/analytics:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
