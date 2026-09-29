'use client';

import React from 'react';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer, ColumnLayer, PathLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const INITIAL_VIEW_STATE = {
  longitude: 76.08,
  latitude: 11.58,
  zoom: 11.2,
  pitch: 50,
  bearing: -15,
};

const DRAINAGE_PATHS = [
  {
    name: 'Mundakkai-Chooralmala Flash Flow Vector',
    path: [
      [76.155, 11.515],
      [76.142, 11.532],
      [76.158, 11.545],
      [76.125, 11.552],
      [76.085, 11.572],
    ],
  },
  {
    name: 'Banasura-Kalpetta Basin Vector',
    path: [
      [75.955, 11.665],
      [76.002, 11.642],
      [76.051, 11.625],
      [76.080, 11.608],
      [76.148, 11.598],
    ],
  },
  {
    name: 'Vythiri Ridge Drainage Path',
    path: [
      [76.018, 11.528],
      [76.042, 11.551],
      [76.071, 11.582],
      [76.080, 11.608],
    ],
  },
];

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
}

export default function TacticalMap({
  gridCells = [],
  rainfall = 100,
  habitations,
  hazards,
}: MapProps) {
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
        getFillColor: (d: any) => hexToRgba(d.color, d.score >= 70 ? 230 : d.score >= 50 ? 190 : 140),
        getLineColor: [10, 15, 25, 150],
        lineWidthMinPixels: 1,
        transitions: {
          getElevation: {
            duration: 400,
            easing: (t: number) => t * (2 - t),
          },
          getFillColor: {
            duration: 350,
          },
        },
      })
    );
  }

  // 2. Animated Drainage Vector Overlay Layer
  const isHighRainfall = rainfall > 140;
  layers.push(
    new PathLayer({
      id: 'drainage-paths-layer',
      data: DRAINAGE_PATHS,
      pickable: true,
      widthScale: isHighRainfall ? 35 : 18,
      widthMinPixels: 3,
      getPath: (d: any) => d.path,
      getColor: isHighRainfall ? [239, 68, 68, 240] : [0, 240, 255, 180],
      getWidth: 12,
      jointRounded: true,
      capRounded: true,
      transitions: {
        getColor: { duration: 500 },
        getWidth: { duration: 400 },
      },
    })
  );

  // 3. Habitation Overlay Layer
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
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        getTooltip={({ object }) => {
          if (!object) return null;
          if (object.cell_id) {
            return {
              html: `
                <div style="font-family: monospace; padding: 6px 10px; background: rgba(9, 10, 15, 0.92); border: 1px solid rgba(0, 240, 255, 0.4); border-radius: 4px; color: #fff;">
                  <div style="font-weight: bold; color: ${object.color}; margin-bottom: 2px;">${object.tier} ZONE (${object.score}/100)</div>
                  <div>Lat/Lon: ${object.lat}, ${object.lon}</div>
                  <div>Slope: ${object.slope}°</div>
                  <div>Flow Accum: ${object.flow_accum}</div>
                  <div>Est Pop: ${object.base_population}</div>
                </div>
              `,
            };
          }
          if (object.properties?.village_name) {
            return {
              html: `
                <div style="font-family: monospace; padding: 6px 10px; background: rgba(9, 10, 15, 0.92); border: 1px solid #00f0ff; border-radius: 4px; color: #fff;">
                  <div style="font-weight: bold; color: #00f0ff;">${object.properties.village_name}</div>
                  <div>Pop: ${object.properties.population}</div>
                  <div>Risk: ${object.properties.vulnerability_score}/10</div>
                </div>
              `,
            };
          }
          if (object.name) {
            return {
              html: `<div style="font-family: monospace; padding: 4px 8px; background: #090A0F; color: #ef4444;">${object.name}</div>`,
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
