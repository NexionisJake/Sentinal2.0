'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TacticalMap from '@/components/Map';
import {
  SlidersHorizontal,
  Activity,
  Map as MapIcon,
  Database,
  RefreshCw,
  Zap,
  AlertTriangle,
  ShieldCheck,
  Layers,
  ArrowRight,
  Truck,
  CheckCircle2,
  X,
  Eye,
} from 'lucide-react';

export default function Home() {
  const [rainfall, setRainfall] = useState<number>(100);
  const [slopeThreshold, setSlopeThreshold] = useState<number>(20);
  const [historyWeight, setHistoryWeight] = useState<number>(50);

  const [simulationData, setSimulationData] = useState<any>(null);
  const [allocationData, setAllocationData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [habitations, setHabitations] = useState<any>(null);
  const [hazards, setHazards] = useState<any>(null);

  const [showAllocationModal, setShowAllocationModal] = useState<boolean>(true);
  const [showAllocationVectors, setShowAllocationVectors] = useState<boolean>(true);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSimulation = useCallback((rain: number, slope: number, hist: number) => {
    setLoading(true);
    const histDec = hist / 100;

    // Fetch simulation grid
    fetch(`/api/simulate?rainfall=${rain}&slope_threshold=${slope}&history_weight=${histDec}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSimulationData(data);
      })
      .catch((err) => console.error(err));

    // Fetch allocation plan
    fetch(`/api/allocation-plan?rainfall=${rain}&slope_threshold=${slope}&history_weight=${histDec}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAllocationData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
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
                Command Center Phase 3
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

        <div className="flex-1 p-4 overflow-y-auto space-y-5">
          {/* Scenario Simulator Sliders */}
          <section className="bg-[#12151F] border border-tactical-border rounded-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-tactical-border pb-2">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="text-tactical-accent w-4 h-4" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-tactical-text">
                  Scenario Engine
                </h2>
              </div>
              {loading && <RefreshCw className="w-3.5 h-3.5 text-tactical-accent animate-spin" />}
            </div>

            {/* Slider 1: Rainfall */}
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
            </div>

            {/* Slider 2: Slope */}
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
            </div>

            {/* Slider 3: History Weight */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-tactical-muted">Historical Weight</span>
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
            </div>

            {/* Toggle Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setShowAllocationModal(!showAllocationModal)}
                className="flex items-center justify-center space-x-1.5 py-2 px-2 bg-tactical-accent/20 border border-tactical-accent text-tactical-accent hover:bg-tactical-accent hover:text-black font-mono text-[11px] font-bold transition-all rounded-sm"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{showAllocationModal ? 'HIDE MATRIX' : 'VIEW MATRIX'}</span>
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center space-x-1.5 py-2 px-2 bg-tactical-panel border border-tactical-border text-tactical-muted hover:border-tactical-muted hover:text-white font-mono text-[11px] font-bold transition-all rounded-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>RESET</span>
              </button>
            </div>
          </section>

          {/* Dynamic Telemetry Feedback */}
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
                <span className="text-[10px] text-tactical-muted block uppercase">At-Risk Pop</span>
                <span className="text-lg font-bold text-amber-400 block mt-1">
                  {simulationData?.summary?.affectedPopulation?.toLocaleString() ?? '0'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-tactical-muted">RED Cells (≥70):</span>
                <span className="font-bold text-red-400">{redCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tactical-muted">ORANGE Cells (50-69):</span>
                <span className="font-bold text-amber-400">{orangeCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tactical-muted">YELLOW Cells (30-49):</span>
                <span className="font-bold text-yellow-400">{yellowCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tactical-muted">GREEN Cells (&lt;30):</span>
                <span className="font-bold text-emerald-400">{greenCount}</span>
              </div>
            </div>
          </section>

          {/* Allocation Vector Toggle */}
          <section className="bg-[#12151F] border border-tactical-border rounded-sm p-3 flex items-center justify-between font-mono text-xs">
            <span className="text-tactical-muted">3D Relocation Vectors</span>
            <button
              onClick={() => setShowAllocationVectors(!showAllocationVectors)}
              className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                showAllocationVectors
                  ? 'bg-tactical-accent text-black'
                  : 'bg-tactical-panel border border-tactical-border text-tactical-muted'
              }`}
            >
              {showAllocationVectors ? 'ENABLED' : 'DISABLED'}
            </button>
          </section>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-tactical-border text-xs text-tactical-muted font-mono flex items-center justify-between bg-[#0B0D14]">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-tactical-accent" />
            <span>SAFE SITE MATCHER</span>
          </div>
          <span className="text-tactical-accent font-bold">READY</span>
        </div>
      </aside>

      {/* Main Map & Relocation Allocation Overlay Area */}
      <section className="flex-1 relative h-full">
        {/* Top Header Badge */}
        <div className="absolute top-4 left-4 z-10 bg-tactical-panel/90 backdrop-blur-md border border-tactical-border p-3 rounded-sm flex items-center space-x-4 shadow-xl">
          <div className="flex items-center space-x-2">
            <MapIcon className="text-tactical-accent w-4 h-4" />
            <span className="text-xs font-mono text-white uppercase tracking-widest font-bold">
              Wayanad Sector (Safe Site Relocation)
            </span>
          </div>
          <div className="h-4 w-px bg-tactical-border"></div>
          <button
            onClick={() => setShowAllocationModal(!showAllocationModal)}
            className="flex items-center space-x-1.5 text-xs font-mono text-tactical-accent hover:underline font-bold"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Relocation Allocation Matrix</span>
          </button>
        </div>

        {/* Relocation Allocation Plan Overlay Modal */}
        {showAllocationModal && allocationData && (
          <div className="absolute top-16 right-4 z-20 w-[640px] max-h-[85vh] bg-[#0E111B]/95 backdrop-blur-md border border-tactical-border rounded-sm shadow-2xl flex flex-col font-mono overflow-hidden animate-in fade-in slide-in-from-right-5 duration-200">
            {/* Modal Header */}
            <div className="p-3 bg-[#141824] border-b border-tactical-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="text-tactical-accent w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-white">
                  Phase Relocation Allocation Plan
                </h3>
              </div>
              <button
                onClick={() => setShowAllocationModal(false)}
                className="text-tactical-muted hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Safe Sites Capacity Utilization */}
              <div>
                <h4 className="text-[11px] font-bold text-tactical-muted uppercase tracking-widest mb-2.5">
                  Safe Site Capacity Status
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {allocationData.siteStatus?.map((site: any) => (
                    <div
                      key={site.site_id}
                      className="bg-[#161A26] border border-[#2A2E3D] p-2.5 rounded-sm space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-white truncate max-w-[170px]">
                          {site.site_name}
                        </span>
                        <span className="text-emerald-400 font-bold">{site.maxPct}%</span>
                      </div>

                      {/* Capacity Progress Bar */}
                      <div className="w-full bg-[#202536] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            site.maxPct >= 100
                              ? 'bg-red-500'
                              : site.maxPct >= 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, site.maxPct)}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-[10px] text-tactical-muted">
                        <span>Road: {site.used_road}/{site.max_road_capacity}</span>
                        <span>Water: {site.used_water}/{site.max_water_capacity}</span>
                      </div>

                      {site.warning && (
                        <div className="mt-1 bg-red-950/90 border border-red-500/60 p-1 rounded text-[9px] font-bold text-red-400 flex items-center space-x-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span>{site.warning}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Data-Dense Triage Matrix Table */}
              <div>
                <h4 className="text-[11px] font-bold text-tactical-muted uppercase tracking-widest mb-2.5">
                  Habitation Triage Matrix
                </h4>
                <div className="border border-[#2A2E3D] rounded-sm overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#161A26] text-tactical-muted border-b border-[#2A2E3D]">
                        <th className="p-2">Village</th>
                        <th className="p-2">Triage Tier</th>
                        <th className="p-2">Priority</th>
                        <th className="p-2">Allocated Site</th>
                        <th className="p-2">Choke Point</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2E3D] bg-[#10131E]">
                      {allocationData.allocations?.map((alloc: any) => (
                        <tr key={alloc.village_id} className="hover:bg-[#181D2D] transition-colors">
                          <td className="p-2 font-bold text-white flex items-center space-x-1.5">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: alloc.color }}
                            ></span>
                            <span>{alloc.village_name}</span>
                          </td>
                          <td className="p-2">
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                              style={{
                                backgroundColor: `${alloc.color}20`,
                                color: alloc.color,
                                border: `1px solid ${alloc.color}50`,
                              }}
                            >
                              {alloc.tier}
                            </span>
                          </td>
                          <td className="p-2 font-bold">{alloc.final_priority}</td>
                          <td className="p-2 text-emerald-400 font-bold flex items-center space-x-1">
                            <span>{alloc.site_name}</span>
                          </td>
                          <td className="p-2">
                            <span className="text-red-400 font-bold text-[10px]">
                              {alloc.bottleneck_type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        <TacticalMap
          gridCells={simulationData?.cells}
          rainfall={rainfall}
          habitations={habitations}
          hazards={hazards}
          allocationPlan={allocationData}
          showAllocationVectors={showAllocationVectors}
        />
      </section>
    </main>
  );
}
