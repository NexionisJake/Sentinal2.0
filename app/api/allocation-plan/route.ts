import { NextResponse } from 'next/server';
import { createClient } from '@clickhouse/client';

const client = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || 'admin',
  database: process.env.CLICKHOUSE_DATABASE || 'inclusiweb_geo',
});

interface SafeSite {
  site_id: string;
  site_name: string;
  lat: number;
  lon: number;
  max_land_capacity: number;
  max_water_capacity: number;
  max_road_capacity: number;
  used_land: number;
  used_water: number;
  used_road: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rainfall = Math.min(250, Math.max(50, parseFloat(searchParams.get('rainfall') || '100')));
    const slopeThreshold = Math.min(30, Math.max(10, parseFloat(searchParams.get('slope_threshold') || '20')));
    const historyWeight = Math.min(1.0, Math.max(0.2, parseFloat(searchParams.get('history_weight') || '0.5')));

    // 1. Query Safe Sites
    const sitesRes = await client.query({
      query: `SELECT * FROM inclusiweb_geo.safe_sites`,
      format: 'JSONEachRow',
    });
    const rawSites: any[] = await sitesRes.json();
    const sites: SafeSite[] = rawSites.map((s) => ({
      ...s,
      used_land: 0,
      used_water: 0,
      used_road: 0,
    }));

    // 2. Query Habitations
    const habsRes = await client.query({
      query: `SELECT * FROM inclusiweb_geo.habitations`,
      format: 'JSONEachRow',
    });
    const habitations: any[] = await habsRes.json();

    // 3. Query Road Networks
    const roadsRes = await client.query({
      query: `SELECT * FROM inclusiweb_geo.road_networks`,
      format: 'JSONEachRow',
    });
    const roadNetworks: any[] = await roadsRes.json();

    // 4. Query Hazard Cells to calculate Hazard Score for each village
    const gridRes = await client.query({
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
    const gridCells: any[] = await gridRes.json();

    // Attach Hazard_Score and Calculate Final_Priority
    const evaluatedVillages = habitations.map((v) => {
      // Find nearest grid cell score
      let minDistance = Infinity;
      let nearestHazardScore = 40;
      for (const cell of gridCells) {
        const d = Math.sqrt(Math.pow(v.lat - cell.lat, 2) + Math.pow(v.lon - cell.lon, 2));
        if (d < minDistance) {
          minDistance = d;
          nearestHazardScore = cell.hazard_score;
        }
      }

      const vulScore =
        (v.population / 1000.0) * 2.5 +
        (v.kutcha_ratio || 0.5) * 35.0 +
        (v.elderly_ratio || 0.2) * 25.0;

      const finalPriority = Math.round(nearestHazardScore * vulScore * 10) / 10;

      let tier = 'TIER_3';
      let tierName = 'Phase 3 (Medium-term, 12-24 mos)';
      let color = '#EAB308'; // Gold

      if (finalPriority >= 450 || nearestHazardScore >= 70) {
        tier = 'TIER_1';
        tierName = 'Phase 1 (Immediate, < 3 mos)';
        color = '#EF4444'; // Crimson
      } else if (finalPriority >= 250 || nearestHazardScore >= 50) {
        tier = 'TIER_2';
        tierName = 'Phase 2 (Short-term, 3-12 mos)';
        color = '#F59E0B'; // Amber
      }

      return {
        ...v,
        hazard_score: Math.round(nearestHazardScore * 10) / 10,
        vulnerability_score: Math.round(vulScore * 10) / 10,
        final_priority: finalPriority,
        tier,
        tier_name: tierName,
        color,
      };
    });

    // Sort by Final_Priority Descending for Capacity Allocation
    evaluatedVillages.sort((a, b) => b.final_priority - a.final_priority);

    const allocations: any[] = [];

    // 5. Constrained Capacity Matching
    evaluatedVillages.forEach((village) => {
      // Sort safe sites by proximity to village
      const sortedSites = [...sites].sort((a, b) => {
        const dA = Math.hypot(a.lat - village.lat, a.lon - village.lon);
        const dB = Math.hypot(b.lat - village.lat, b.lon - village.lon);
        return dA - dB;
      });

      let matchedSite = sortedSites[0];
      const pop = village.population;

      // Check bottleneck constraint
      const remLand = matchedSite.max_land_capacity - matchedSite.used_land;
      const remWater = matchedSite.max_water_capacity - matchedSite.used_water;
      const remRoad = matchedSite.max_road_capacity - matchedSite.used_road;

      let bottleneckType = 'ROAD_WIDTH';
      const minRem = Math.min(remLand, remWater, remRoad);

      if (minRem === remRoad) bottleneckType = 'ROAD_WIDTH';
      else if (minRem === remWater) bottleneckType = 'WATER_LIMIT';
      else bottleneckType = 'LAND_LIMIT';

      // Update used capacity
      matchedSite.used_land += pop;
      matchedSite.used_water += pop;
      matchedSite.used_road += pop;

      // Find road route matching if available
      const road = roadNetworks.find(
        (r) => r.from_village_id === village.habitation_id && r.to_site_id === matchedSite.site_id
      ) || {
        choke_point_lat: (village.lat + matchedSite.lat) / 2,
        choke_point_lon: (village.lon + matchedSite.lon) / 2,
        bottleneck_type: bottleneckType,
      };

      allocations.push({
        village_id: village.habitation_id,
        village_name: village.village_name,
        population: village.population,
        hazard_score: village.hazard_score,
        vulnerability_score: village.vulnerability_score,
        final_priority: village.final_priority,
        tier: village.tier,
        tier_name: village.tier_name,
        color: village.color,
        site_id: matchedSite.site_id,
        site_name: matchedSite.site_name,
        source_coords: [village.lon, village.lat],
        target_coords: [matchedSite.lon, matchedSite.lat],
        bottleneck_type: road.bottleneck_type || bottleneckType,
        choke_coords: [road.choke_point_lon, road.choke_point_lat],
        route_geometry: [
          [village.lon, village.lat],
          [road.choke_point_lon, road.choke_point_lat],
          [matchedSite.lon, matchedSite.lat],
        ],
      });
    });

    // Group into Triage Tiers
    const triageTiers = {
      tier1: allocations.filter((a) => a.tier === 'TIER_1'),
      tier2: allocations.filter((a) => a.tier === 'TIER_2'),
      tier3: allocations.filter((a) => a.tier === 'TIER_3'),
    };

    // Calculate site utilization percentages
    const siteStatus = sites.map((s) => {
      const landPct = Math.round((s.used_land / s.max_land_capacity) * 100);
      const waterPct = Math.round((s.used_water / s.max_water_capacity) * 100);
      const roadPct = Math.round((s.used_road / s.max_road_capacity) * 100);
      const maxPct = Math.max(landPct, waterPct, roadPct);

      let warning = null;
      if (roadPct >= 100) warning = 'CAPACITY WARNING: ROAD BOTTLENECK';
      else if (waterPct >= 100) warning = 'CAPACITY WARNING: WATER LIMIT EXCEEDED';
      else if (landPct >= 100) warning = 'CAPACITY WARNING: LAND CAPACITY FULL';

      return {
        ...s,
        landPct,
        waterPct,
        roadPct,
        maxPct,
        warning,
      };
    });

    return NextResponse.json({
      success: true,
      parameters: { rainfall, slopeThreshold, historyWeight },
      triageTiers,
      allocations,
      siteStatus,
    });
  } catch (error: any) {
    console.error('Error in /api/allocation-plan:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
