import { NextResponse } from 'next/server';
import { createClient } from '@clickhouse/client';

const client = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || 'admin',
  database: process.env.CLICKHOUSE_DATABASE || 'inclusiweb_geo',
  request_timeout: 250,
});

export async function GET() {
  const start = performance.now();
  try {
    const pingPromise = client.ping();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('ClickHouse ping timeout (>250ms)')), 250)
    );

    await Promise.race([pingPromise, timeoutPromise]);
    const latency = Math.round(performance.now() - start);

    return NextResponse.json({
      status: 'ONLINE',
      mode: 'LIVE_CLICKHOUSE',
      latency_ms: latency,
      engine: 'ClickHouse Columnar (Spatial Grid 30m×30m)',
      active_pixels: 484 * 850, // ~411,400 points
    });
  } catch (err: any) {
    const latency = Math.round(performance.now() - start);
    return NextResponse.json({
      status: 'LOCAL CACHE [STANDBY]',
      mode: 'OFFLINE_CACHE',
      latency_ms: latency,
      engine: 'ClickHouse Columnar (Static Fallback Fixtures)',
      active_pixels: 484 * 850,
      reason: err.message,
    });
  }
}
