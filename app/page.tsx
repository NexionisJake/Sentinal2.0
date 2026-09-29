'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TacticalMap from '@/components/Map';
import { SlidersHorizontal, Activity, Map as MapIcon, Database, RefreshCw, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function Home() {
  const [rainfall, setRainfall] = useState<number>(100);
  const [slopeThreshold, setSlopeThreshold] = useState<number>(20);
  const [historyWeight, setHistoryWeight] = useState<number>(50); // percentage 20..100

  const [simulationData, setSimulationData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [habitations, setHabitations] = useState<any>(null);
  const [hazards, setHazards] = useState<any>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSimulation = useCallback((rain: number, slope: number, hist: number) => {
    setLoading(true);
    const histDec = hist / 100;
    fetch(`/api/simulate?rainfall=${rain}&slope_threshold=${slope}&history_weight=${histDec}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSimulationData(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Simulation fetch error:', err);
        setLoading(false);
      });
  }, []);

  // Debounced update on slider change
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchSimulation(rainfall, slopeThreshold, historyWeight);
    }, 130);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [rainfall, slopeThreshold, historyWeight, fetchSimulation]);

  // Initial load for baseline hazards & habitations
  useEffect(() => {
    fetch('/api/geo/hazards')
      .then((res) => res.json())
      .then((data) => setHazards(data))
      .catch((err) => console.error(err));

    fetch('/api/geo/habitations')
      .then((res) => res.json())
      .then((data) => setHabitations(data))
      .catch((err) => console.error(err));
  }, []);

  const handleReset = () => {
    setRainfall(100);
    setSlopeThreshold(20);
    setHistoryWeight(50);
  };

  const handleManualSimulate = () => {
    fetchSimulation(rainfall, slopeThreshold, historyWeight);
  };

  // Compute breakdown stats
  const redCount = simulationData?.cells?.filter((c: any) => c.tier === 'RED').length || 0;
  const orangeCount = simulationData?.cells?.filter((c: any) => c.tier === 'ORANGE').length || 0;
  const yellowCount = simulationData?.cells?.filter((c: any) => c.tier === 'YELLOW').length || 0;
  const greenCount = simulationData?.cells?.filter((c: any) => c.tier === 'GREEN').length || 0;

  return (
    <main className="flex h-screen w-full bg-tactical-bg overflow-hidden text-tactical-text font-sans">
      {/* Left Tactical Control HUD Sidebar */}
      <aside className="w-96 h-full bg-tactical-panel border-r border-tactical-border flex flex-col z-10 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-tactical-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-tactical-accent/10 border border-tactical-accent/40 rounded-sm">
              <Activity className="text-tactical-accent w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wider uppercase font-sans text-white">
                InclusiWeb
              </h1>
              <span className="text-[10px] font-mono text-tactical-muted uppercase tracking-widest block">
                Scenario Engine v2.0
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tactical-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tactical-accent"></span>
            </span>
            <span className="text-[11px] font-mono text-tactical-accent">LIVE</span>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-6">
          {/* Scenario Simulator Sliders */}
          <section className="bg-[#12151F] border border-tactical-border rounded-sm p-4 space-y-5">
            <div className="flex items-center justify-between border-b border-tactical-border pb-2">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="text-tactical-accent w-4 h-4" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-tactical-text">
                  Scenario Simulator
                </h2>
              </div>
              {loading && <RefreshCw className="w-3.5 h-3.5 text-tactical-accent animate-spin" />}
            </div>

            {/* Slider 1: Rainfall Intensity */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-tactical-muted">Rainfall Intensity</span>
                <span className="text-tactical-accent font-bold">{rainfall} mm/hr</span>
              </div>
              <input
                type="range"
                min={50}
                max={250}
                step={5}
                value={rainfall}
                onChange={(e) => setRainfall(Number(e.target.value))}
                className="w-full accent-tactical-accent cursor-pointer bg-tactical-panel h-1.5 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-tactical-muted">
                <span>50 mm/hr (Light)</span>
                <span>250 mm/hr (Extreme)</span>
              </div>
            </div>

            {/* Slider 2: Slope Cutoff */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-tactical-muted">Slope Hazard Cutoff</span>
                <span className="text-tactical-accent font-bold">{slopeThreshold}°</span>
              </div>
              <input
                type="range"
                min={10}
                max={30}
                step={1}
                value={slopeThreshold}
                onChange={(e) => setSlopeThreshold(Number(e.target.value))}
                className="w-full accent-tactical-accent cursor-pointer bg-tactical-panel h-1.5 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-tactical-muted">
                <span>10° (Gentle)</span>
                <span>30° (Steep)</span>
              </div>
            </div>

            {/* Slider 3: Historical Weight */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-tactical-muted">Historical Landslide Weight</span>
                <span className="text-tactical-accent font-bold">{historyWeight}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                step={5}
                value={historyWeight}
                onChange={(e) => setHistoryWeight(Number(e.target.value))}
                className="w-full accent-tactical-accent cursor-pointer bg-tactical-panel h-1.5 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-tactical-muted">
                <span>20% (Low)</span>
                <span>100% (Maximum)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 grid grid-cols-2 gap-3">
              <button
                onClick={handleManualSimulate}
                className="flex items-center justify-center space-x-2 py-2 px-3 bg-tactical-accent/20 border border-tactical-accent text-tactical-accent hover:bg-tactical-accent hover:text-black font-mono text-xs font-bold transition-all rounded-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>SIMULATE</span>
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center space-x-2 py-2 px-3 bg-tactical-panel border border-tactical-border text-tactical-muted hover:border-tactical-muted hover:text-white font-mono text-xs font-bold transition-all rounded-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>RESET</span>
              </button>
            </div>
          </section>

          {/* Telemetry Feedback Section */}
          <section className="bg-[#12151F] border border-tactical-border rounded-sm p-4 space-y-4">
            <div className="flex items-center space-x-2 border-b border-tactical-border pb-2">
              <Database className="text-tactical-accent w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-tactical-text">
                Dynamic Telemetry
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="bg-[#181B27] p-3 border border-[#2A2E3D] rounded-sm">
                <span className="text-[10px] text-tactical-muted block uppercase">Red Zone Area</span>
                <span className="text-lg font-bold text-red-500 block mt-1">
                  {simulationData?.summary?.redZoneAreaKm2 ?? '0.0'} <span className="text-xs text-tactical-muted font-normal">km²</span>
                </span>
              </div>
              <div className="bg-[#181B27] p-3 border border-[#2A2E3D] rounded-sm">
                <span className="text-[10px] text-tactical-muted block uppercase">At-Risk Population</span>
                <span className="text-lg font-bold text-amber-400 block mt-1">
                  {simulationData?.summary?.affectedPopulation?.toLocaleString() ?? '0'}
                </span>
              </div>
            </div>

            {/* Risk Distribution Breakdown */}
            <div className="space-y-2 font-mono text-xs">
              <span className="text-[10px] text-tactical-muted uppercase tracking-wider block">Risk Tier Distribution</span>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                    <span>RED (Uninhabitable ≥70)</span>
                  </span>
                  <span className="font-bold text-red-400">{redCount} cells</span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    <span>ORANGE (High Risk 50-69)</span>
                  </span>
                  <span className="font-bold text-amber-400">{orangeCount} cells</span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span>
                    <span>YELLOW (Moderate 30-49)</span>
                  </span>
                  <span className="font-bold text-yellow-400">{yellowCount} cells</span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span>GREEN (Safe &lt;30)</span>
                  </span>
                  <span className="font-bold text-emerald-400">{greenCount} cells</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-tactical-border text-xs text-tactical-muted font-mono flex items-center justify-between bg-[#0B0D14]">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-tactical-accent" />
            <span>CLICKHOUSE RASTER MATH</span>
          </div>
          <span className="text-tactical-accent font-bold">READY</span>
        </div>
      </aside>

      {/* Main 3D Map Viewport */}
      <section className="flex-1 relative h-full">
        {/* Top Header Badge */}
        <div className="absolute top-4 left-4 z-10 bg-tactical-panel/90 backdrop-blur-md border border-tactical-border p-3 rounded-sm flex items-center space-x-4 shadow-xl">
          <div className="flex items-center space-x-2">
            <MapIcon className="text-tactical-accent w-4 h-4" />
            <span className="text-xs font-mono text-white uppercase tracking-widest font-bold">
              Wayanad Sector (3D Simulation)
            </span>
          </div>
          <div className="h-4 w-px bg-tactical-border"></div>
          <div className="flex items-center space-x-2 text-xs font-mono text-tactical-muted">
            <span>Grid Resolution: <strong className="text-white">484 Cells</strong></span>
          </div>
          {rainfall > 140 && (
            <div className="flex items-center space-x-1 bg-red-950/80 border border-red-500/50 px-2 py-0.5 rounded text-[10px] font-mono text-red-400 animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              <span>FLASH FLOOD WARNING (&gt;140mm)</span>
            </div>
          )}
        </div>

        <TacticalMap
          gridCells={simulationData?.cells}
          rainfall={rainfall}
          habitations={habitations}
          hazards={hazards}
        />
      </section>
    </main>
  );
}
