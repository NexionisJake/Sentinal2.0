import { NextResponse } from 'next/server';
import { createClient } from '@clickhouse/client';

const client = createClient({
  host: 'http://localhost:8123',
  database: 'inclusiweb_geo',
  username: 'default',
  password: 'admin',
});

export async function GET() {
  try {
    const resultSet = await client.query({
      query: 'SELECT * FROM habitations',
      format: 'JSON',
    });
    const dataset = await resultSet.json();
    const rows = (dataset as any).data;

    // Convert to GeoJSON
    const geoJson = {
      type: 'FeatureCollection',
      features: rows.map((row: any) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [row.lon, row.lat],
        },
        properties: {
          id: row.id,
          village_name: row.village_name,
          population: row.population,
        },
      })),
    };

    return NextResponse.json(geoJson);
  } catch (error) {
    console.error('Error fetching habitations:', error);
    return NextResponse.json({ error: 'Failed to fetch habitations' }, { status: 500 });
  }
}
