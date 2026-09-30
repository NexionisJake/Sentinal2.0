'use client';

import React, { useEffect, useState, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, ColumnLayer, PathLayer, ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const INITIAL_VIEW_STATE = {
  longitude: 76.08,
  latitude: 11.58,
  zoom: 11.2,
  pitch: 52,
  bearing: -15,
};

function hexToRgba(hex: string, alpha: number = 200): [number, number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, alpha];
}

interface MapProps {
  gridCells?: any[];
  rainfall?: number;
  habitations?: any;
  hazards?: any;
  allocationPlan?: any;
  showAllocationVectors?: boolean;
  externalViewState?: any;
}

export default function TacticalMap({
  gridCells = [],
  rainfall = 100,
  habitations,
  hazards,
  allocationPlan,
  showAllocationVectors = true,
  externalViewState,
}: MapProps) {
  const [dashOffset, setDashOffset] = useState<number>(0);
  const animRef = useRef<number | null>(null);

  const viewStateToUse = externalViewState || undefined;

  // Smooth ant-path dash animation loop
  useEffect(() => {
    let lastTime = performance.now();
    const animate = (now: number) => {
      const delta = now - lastTime;
      if (delta > 30) {
        setDashOffset((prev) => (prev + 1.2) % 40);
        lastTime = now;
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const layers: any[] = [];

  // 1. Reactive 3D Hazard Grid Pillars Layer
  if (gridCells && gridCells.length > 0) {
    layers.push(
      new ColumnLayer({
        id: 'hazard-grid-columns',
        data: gridCells,
        diskResolution: 6,
        radius: 420,
        extruded: true,
        pickable: true,
        elevationScale: 40,
        getPosition: (d: any) => [d.lon, d.lat],
        getElevation: (d: any) => Math.pow(d.score, 1.25),
        getFillColor: (d: any) => hexToRgba(d.color, d.score >= 70 ? 220 : d.score >= 50 ? 180 : 130),
        getLineColor: [10, 15, 25, 140],
        lineWidthMinPixels: 1,
        transitions: {
          getElevation: { duration: 400 },
          getFillColor: { duration: 350 },
        },
      })
    );
  }

  // 2. Safe Site Pins Layer
  if (allocationPlan?.siteStatus) {
    layers.push(
      new ScatterplotLayer({
        id: 'safe-sites-pins',
        data: allocationPlan.siteStatus,
        pickable: true,
        opacity: 0.9,
        stroked: true,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 10,
        radiusMaxPixels: 24,
        lineWidthMinPixels: 3,
        getPosition: (d: any) => [d.lon, d.lat],
        getFillColor: [16, 185, 129, 230], // Emerald safe color
        getLineColor: [255, 255, 255, 255],
      })
    );
  }

  // 3. Relocation 3D Arc Vectors Layer
  if (showAllocationVectors && allocationPlan?.allocations) {
    layers.push(
      new ArcLayer({
        id: 'relocation-arcs-layer',
        data: allocationPlan.allocations,
        pickable: true,
        getWidth: 4,
        getSourcePosition: (d: any) => d.source_coords,
        getTargetPosition: (d: any) => d.target_coords,
        getSourceColor: (d: any) => hexToRgba(d.color, 240),
        getTargetColor: (d: any) => [16, 185, 129, 240],
        getHeight: 0.45,
        greatCircle: true,
      })
    );

    // 4. Road Network Animated Ant-Paths Layer
    layers.push(
      new PathLayer({
        id: 'road-network-ant-paths',
        data: allocationPlan.allocations,
        pickable: true,
        widthScale: 8,
        widthMinPixels: 3,
        getPath: (d: any) => d.route_geometry,
        getColor: (d: any) =>
          d.bottleneck_type === 'ROAD_WIDTH' ? [239, 68, 68, 220] : [245, 158, 11, 220],
        getDashArray: [12, 8],
        dashJustified: true,
        dashOffset: dashOffset,
      })
    );

    // 5. Choke Point Flashing Bottleneck Markers Layer
    layers.push(
      new ScatterplotLayer({
        id: 'choke-points-flashing',
        data: allocationPlan.allocations,
        pickable: true,
        opacity: 0.95,
        stroked: true,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 6,
        radiusMaxPixels: 12,
        lineWidthMinPixels: 2,
        getPosition: (d: any) => d.choke_coords,
        getFillColor: (d: any) =>
          d.bottleneck_type === 'ROAD_WIDTH' ? [239, 68, 68, 255] : [245, 158, 11, 255],
        getLineColor: [255, 255, 255, 255],
      })
    );
  }

  // 6. Habitations Overlay Layer
  if (habitations && !habitations.error) {
    layers.push(
      new GeoJsonLayer({
        id: 'habitations-layer',
        data: habitations,
        pickable: true,
        stroked: true,
        filled: true,
        extruded: false,
        pointType: 'circle+text',
        lineWidthMinPixels: 2,
        getFillColor: [0, 240, 255, 220],
        getLineColor: [10, 15, 25, 250],
        getPointRadius: 280,
        getText: (f: any) => f.properties.village_name,
        getTextSize: 13,
        getTextColor: [255, 255, 255],
        getTextPixelOffset: [0, -22],
        getTextOutlineWidth: 3,
        getTextOutlineColor: [9, 10, 15, 240],
      })
    );
  }

  return (
    <div className="relative w-full h-full bg-tactical-bg">
      <DeckGL
        {...(viewStateToUse ? { viewState: viewStateToUse } : { initialViewState: INITIAL_VIEW_STATE })}
        controller={true}
        layers={layers}
        getTooltip={({ object }) => {
          if (!object) return null;
          if (object.village_id) {
            return {
              html: `
                <div style="font-family: monospace; padding: 6px 10px; background: rgba(9, 10, 15, 0.95); border: 1px solid ${object.color}; border-radius: 4px; color: #fff;">
                  <div style="font-weight: bold; color: ${object.color};">${object.village_name} &rarr; ${object.site_name}</div>
                  <div>Triage: ${object.tier_name}</div>
                  <div>Pop Relocated: ${object.population}</div>
                  <div>Priority Score: ${object.final_priority}</div>
                  <div style="color: #ef4444; font-weight: bold; margin-top: 2px;">Choke Point: ${object.bottleneck_type}</div>
                </div>
              `,
            };
          }
          if (object.site_id) {
            return {
              html: `
                <div style="font-family: monospace; padding: 6px 10px; background: rgba(9, 10, 15, 0.95); border: 1px solid #10b981; border-radius: 4px; color: #fff;">
                  <div style="font-weight: bold; color: #10b981;">SAFE SITE: ${object.site_name}</div>
                  <div>Land Cap: ${object.used_land}/${object.max_land_capacity} (${object.landPct}%)</div>
                  <div>Water Cap: ${object.used_water}/${object.max_water_capacity} (${object.waterPct}%)</div>
                  <div>Road Cap: ${object.used_road}/${object.max_road_capacity} (${object.roadPct}%)</div>
                  ${object.warning ? `<div style="color: #ef4444; font-weight: bold;">${object.warning}</div>` : ''}
                </div>
              `,
            };
          }
          if (object.cell_id) {
            return {
              html: `
                <div style="font-family: monospace; padding: 6px 10px; background: rgba(9, 10, 15, 0.92); border: 1px solid rgba(0, 240, 255, 0.4); border-radius: 4px; color: #fff;">
                  <div style="font-weight: bold; color: ${object.color};">${object.tier} ZONE (${object.score}/100)</div>
                  <div>Lat/Lon: ${object.lat}, ${object.lon}</div>
                  <div>Slope: ${object.slope}°</div>
                  <div>Est Pop: ${object.base_population}</div>
                </div>
              `,
            };
          }
          return null;
        }}
      >
        <Map mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" />
      </DeckGL>
    </div>
  );
}
