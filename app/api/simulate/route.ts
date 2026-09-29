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

    const query = `
      SELECT 
        cell_id,
        lat,
        lon,
        slope,
        flow_accum,
        history_density,
        base_population,
        area_km2,
        least(100.0, greatest(0.0, 
          (if(slope >= ${slopeThreshold}, (slope / 45.0) * 35.0, (slope / 45.0) * 15.0) +
          (flow_accum * 25.0) +
          ((${rainfall} / 250.0) * 25.0) +
          (${historyWeight} * history_density * 25.0))
        )) AS score,
        multiIf(
          score >= 70.0, 'RED',
          score >= 50.0, 'ORANGE',
          score >= 30.0, 'YELLOW',
          'GREEN'
        ) AS tier,
        multiIf(
          score >= 70.0, '#EF4444',
          score >= 50.0, '#F59E0B',
          score >= 30.0, '#EAB308',
          '#10B981'
        ) AS color
      FROM inclusiweb_geo.grid_cells
    `;

    const resultSet = await client.query({
      query,
      format: 'JSONEachRow',
    });

    const cells: any[] = await resultSet.json();

    let redZoneArea = 0;
    let affectedPopulation = 0;

    cells.forEach((cell) => {
      cell.score = Math.round(cell.score * 10) / 10;
      if (cell.score >= 70) {
        redZoneArea += cell.area_km2 || 0.85;
      }
      if (cell.score >= 50) {
        affectedPopulation += cell.base_population || 0;
      }
    });

    return NextResponse.json({
      success: true,
      parameters: {
        rainfall,
        slopeThreshold,
        historyWeight,
      },
      summary: {
        totalCells: cells.length,
        redZoneAreaKm2: Math.round(redZoneArea * 10) / 10,
        affectedPopulation,
      },
      cells,
    });
  } catch (error: any) {
    console.error('Error in /api/simulate:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
