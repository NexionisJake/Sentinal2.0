'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TacticalMap from '@/components/Map';
import ActionTerminal from '@/components/ActionTerminal';
import { useCountUp } from '@/hooks/useCountUp';
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
  Truck,
  X,
  Eye,
  Terminal,
  Monitor,
  TrendingUp,
  IndianRupee,
} from 'lucide-react';

export default function Home() {
  // ── Simulation parameters ──────────────────────────────────────────────────
  const [rainfall, setRainfall] = useState<number>(100);
  const [slopeThreshold, setSlopeThreshold] = useState<number>(20);
  const [historyWeight, setHistoryWeight] = useState<number>(50);

  // ── Data state ─────────────────────────────────────────────────────────────
  const [simulationData, setSimulationData] = useState<any>(null);
  const [allocationData, setAllocationData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [habitations, setHabitations] = useState<any>(null);
  const [hazards, setHazards] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showAllocationModal, setShowAllocationModal] = useState<boolean>(true);
  const [showAllocationVectors, setShowAllocationVectors] = useState<boolean>(true);
  const [showActionTerminal, setShowActionTerminal] = useState<boolean>(false);
  const [crtEnabled, setCrtEnabled] = useState<boolean>(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Animated number rollers (using useCountUp) ──────────────────────────────
  const animTrigger = analyticsData;
  const tier1Pop = useCountUp(analyticsData?.summary?.tier1Population || 0, 700, animTrigger);
  const totalDisplaced = useCountUp(analyticsData?.summary?.totalDisplaced || 0, 700, animTrigger);
  const budgetCrore = useCountUp(analyticsData?.summary?.budgetEstimateCrore || 0, 900, animTrigger);
  const redZoneArea = useCountUp(
    simulationData?.summary?.redZoneAreaKm2 || 0, 600, simulationData
  );
  const redCount = useCountUp(simulationData?.cells?.filter((c: any) => c.tier === 'RED').length || 0, 400, simulationData);
  const orangeCount = useCountUp(simulationData?.cells?.filter((c: any) => c.tier === 'ORANGE').length || 0, 400, simulationData);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchAll = useCallback((rain: number, slope: number, hist: number) => {
    setLoading(true);
    const histDec = hist / 100;

    Promise.all([
      fetch(`/api/simulate?rainfall=${rain}&slope_threshold=${slope}&history_weight=${histDec}`).then((r) => r.json()),
      fetch(`/api/allocation-plan?rainfall=${rain}&slope_threshold=${slope}&history_weight=${histDec}`).then((r) => r.json()),
      fetch(`/api/analytics?rainfall=${rain}&slope_threshold=${slope}&history_weight=${histDec}`).then((r) => r.json()),
    ]).then(([sim, alloc, analytics]) => {
      if (sim.success) setSimulationData(sim);
      if (alloc.success) setAllocationData(alloc);
      if (analytics.success) setAnalyticsData(analytics);
      setLoading(false);
    }).catch((e) => { console.error(e); setLoading(false); });
  }, []);

  // Debounced refresh
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => fetchAll(rainfall, slopeThreshold, historyWeight), 130);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [rainfall, slopeThreshold, historyWeight, fetchAll]);

  // Initial habitations / hazards
  useEffect(() => {
    fetch('/api/geo/hazards').then((r) => r.json()).then(setHazards).catch(console.error);
    fetch('/api/geo/habitations').then((r) => r.json()).then(setHabitations).catch(console.error);
  }, []);

  // ── Keyboard Hotkeys ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); fetchAll(rainfall, slopeThreshold, historyWeight); }
      if (e.key === 'r' || e.key === 'R') { setRainfall(100); setSlopeThreshold(20); setHistoryWeight(50); }
      if (e.key === 'Escape') { setShowAllocationModal(false); setShowActionTerminal(false); }
      if (e.key === 'g' || e.key === 'G') setShowActionTerminal(true);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [rainfall, slopeThreshold, historyWeight, fetchAll]);

  const handleReset = () => { setRainfall(100); setSlopeThreshold(20); setHistoryWeight(50); };

  const isHighRisk = (simulationData?.summary?.redZoneAreaKm2 || 0) > 12;
  const yellowCount = simulationData?.cells?.filter((c: any) => c.tier === 'YELLOW').length || 0;
  const greenCount = simulationData?.cells?.filter((c: any) => c.tier === 'GREEN').length || 0;

  return (
    <div className={`flex h-screen w-full bg-tactical-bg overflow-hidden text-tactical-text font-sans relative ${crtEnabled ? 'crt-active' : ''}`}>
      {/* ─── LEFT TACTICAL HUD ─────────────────────────────────────────── */}
      <aside className="w-96 h-full bg-tactical-panel border-r border-tactical-border flex flex-col z-10 shadow-2xl flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-tactical-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-tactical-accent/10 border border-tactical-accent/40 rounded-sm">
              <Activity className={`text-tactical-accent w-5 h-5 ${isHighRisk ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wider uppercase font-sans text-white">InclusiWeb</h1>
              <span className="text-[10px] font-mono text-tactical-muted uppercase tracking-widest block">Command Center · Phase 4</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* CRT toggle */}
            <button
              onClick={() => setCrtEnabled(!crtEnabled)}
              title="Toggle CRT Scanlines"
              className={`p-1.5 rounded border text-[10px] font-mono transition-all ${crtEnabled ? 'bg-tactical-accent/20 border-tactical-accent text-tactical-accent' : 'border-tactical-border text-tactical-muted hover:border-tactical-muted'}`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center space-x-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tactical-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tactical-accent"></span>
              </span>
              <span className="text-[11px] font-mono text-tactical-accent">LIVE</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* ── Scenario Simulator ─────────────────────────────────── */}
          <section className="bg-[#12151F] border border-tactical-border rounded-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-tactical-border pb-2">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="text-tactical-accent w-4 h-4" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-tactical-text">Scenario Engine</h2>
              </div>
              {loading && <RefreshCw className="w-3.5 h-3.5 text-tactical-accent animate-spin" />}
            </div>

            {/* Slider: Rainfall */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-tactical-muted">Rainfall Intensity</span>
                <span className={`font-bold ${rainfall > 140 ? 'text-red-400' : 'text-tactical-accent'}`}>{rainfall} mm/hr</span>
              </div>
              <input type="range" min={50} max={250} step={5} value={rainfall} onChange={(e) => setRainfall(Number(e.target.value))} className="w-full accent-tactical-accent cursor-pointer h-1.5 rounded-lg" />
              <div className="flex justify-between text-[10px] font-mono text-tactical-muted">
                <span>50 mm/hr</span><span>250 mm/hr</span>
              </div>
            </div>

            {/* Slider: Slope */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-tactical-muted">Slope Hazard Cutoff</span>
                <span className="font-bold text-tactical-accent">{slopeThreshold}°</span>
              </div>
              <input type="range" min={10} max={30} step={1} value={slopeThreshold} onChange={(e) => setSlopeThreshold(Number(e.target.value))} className="w-full accent-tactical-accent cursor-pointer h-1.5 rounded-lg" />
              <div className="flex justify-between text-[10px] font-mono text-tactical-muted">
                <span>10°</span><span>30°</span>
              </div>
            </div>

            {/* Slider: History Weight */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-tactical-muted">Historical Weight</span>
                <span className="font-bold text-tactical-accent">{historyWeight}%</span>
              </div>
              <input type="range" min={20} max={100} step={5} value={historyWeight} onChange={(e) => setHistoryWeight(Number(e.target.value))} className="w-full accent-tactical-accent cursor-pointer h-1.5 rounded-lg" />
              <div className="flex justify-between text-[10px] font-mono text-tactical-muted">
                <span>20%</span><span>100%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => setShowAllocationModal(!showAllocationModal)} className="flex items-center justify-center space-x-1.5 py-2 px-2 bg-tactical-accent/20 border border-tactical-accent text-tactical-accent hover:bg-tactical-accent hover:text-black font-mono text-[11px] font-bold transition-all rounded-sm">
                <Layers className="w-3.5 h-3.5" /><span>MATRIX</span>
              </button>
              <button onClick={handleReset} className="flex items-center justify-center space-x-1.5 py-2 px-2 bg-tactical-panel border border-tactical-border text-tactical-muted hover:border-tactical-muted hover:text-white font-mono text-[11px] font-bold transition-all rounded-sm">
                <RefreshCw className="w-3.5 h-3.5" /><span>RESET [R]</span>
              </button>
            </div>
          </section>

          {/* ── Analytics Rollup (with countUp) ────────────────────── */}
          <section className="bg-[#12151F] border border-tactical-border rounded-sm p-4 space-y-3">
            <div className="flex items-center space-x-2 border-b border-tactical-border pb-2">
              <TrendingUp className="text-tactical-accent w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-tactical-text">Executive Analytics</h2>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className={`bg-[#181B27] p-3 border rounded-sm ${isHighRisk ? 'border-red-500/60 red-zone-active' : 'border-[#2A2E3D]'}`}>
                <span className="text-[10px] text-tactical-muted block uppercase">Total Displaced</span>
                <span className="text-xl font-bold text-red-400 block mt-1 tabular-nums">{totalDisplaced.toLocaleString()}</span>
              </div>
              <div className="bg-[#181B27] p-3 border border-[#2A2E3D] rounded-sm">
                <span className="text-[10px] text-tactical-muted block uppercase">Budget Est.</span>
                <span className="text-xl font-bold text-amber-400 block mt-1 tabular-nums">₹{budgetCrore} Cr</span>
              </div>
              <div className="bg-[#181B27] p-3 border border-[#2A2E3D] rounded-sm">
                <span className="text-[10px] text-tactical-muted block uppercase">Red Zone Area</span>
                <span className="text-xl font-bold text-red-500 block mt-1 tabular-nums">{redZoneArea} <span className="text-xs text-tactical-muted font-normal">km²</span></span>
              </div>
              <div className="bg-[#181B27] p-3 border border-[#2A2E3D] rounded-sm">
                <span className="text-[10px] text-tactical-muted block uppercase">Phase 1 Pop.</span>
                <span className="text-xl font-bold text-red-300 block mt-1 tabular-nums">{tier1Pop.toLocaleString()}</span>
              </div>
            </div>

            {/* Tier distribution */}
            <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
              {[
                { label: 'RED', count: redCount, color: 'text-red-400' },
                { label: 'ORANGE', count: orangeCount, color: 'text-amber-400' },
                { label: 'YELLOW', count: yellowCount, color: 'text-yellow-400' },
                { label: 'GREEN', count: greenCount, color: 'text-emerald-400' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex justify-between bg-[#181B27] px-2 py-1 rounded">
                  <span className="text-tactical-muted">{label}</span>
                  <span className={`font-bold ${color} tabular-nums`}>{count}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Controls ─────────────────────────────────────────────── */}
          <section className="bg-[#12151F] border border-tactical-border rounded-sm p-3 space-y-2">
            <button
              onClick={() => setShowAllocationVectors(!showAllocationVectors)}
              className="w-full flex justify-between items-center text-xs font-mono px-1"
            >
              <span className="text-tactical-muted">3D Relocation Vectors</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${showAllocationVectors ? 'bg-tactical-accent text-black' : 'bg-tactical-panel border border-tactical-border text-tactical-muted'}`}>
                {showAllocationVectors ? 'ON' : 'OFF'}
              </span>
            </button>

            <div className="text-[9px] font-mono text-tactical-muted border-t border-tactical-border pt-2 space-y-0.5">
              <div className="flex justify-between"><span>[SPACE]</span><span className="text-white/60">Simulate</span></div>
              <div className="flex justify-between"><span>[R]</span><span className="text-white/60">Reset</span></div>
              <div className="flex justify-between"><span>[G]</span><span className="text-white/60">Action Terminal</span></div>
              <div className="flex justify-between"><span>[ESC]</span><span className="text-white/60">Dismiss</span></div>
            </div>
          </section>
        </div>

        {/* ── Generate Action Plan CTA ──────────────────────────────── */}
        <div className="p-3 border-t border-tactical-border bg-[#0B0D14] space-y-2">
          <button
            onClick={() => setShowActionTerminal(true)}
            className="w-full flex items-center justify-center space-x-2 py-3 bg-red-950/70 border border-red-500 hover:bg-red-500/30 text-white font-mono text-[11px] font-bold uppercase tracking-widest transition-all rounded-sm group"
          >
            <Terminal className="w-4 h-4 text-red-400 group-hover:animate-pulse" />
            <span>Generate Relocation Action Plan</span>
          </button>
          <div className="flex items-center justify-between text-[10px] font-mono text-tactical-muted">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-tactical-accent" />
              <span>PDF + GeoJSON Export</span>
            </div>
            <span className="text-tactical-accent font-bold">READY</span>
          </div>
        </div>
      </aside>

      {/* ─── MAIN MAP VIEWPORT ─────────────────────────────────────────── */}
      <section className="flex-1 relative h-full min-w-0">
        {/* Top header */}
        <div className="absolute top-4 left-4 z-10 bg-tactical-panel/90 backdrop-blur-md border border-tactical-border p-3 rounded-sm flex items-center space-x-4 shadow-xl">
          <div className="flex items-center space-x-2">
            <MapIcon className="text-tactical-accent w-4 h-4" />
            <span className="text-xs font-mono text-white uppercase tracking-widest font-bold">Wayanad · Safe Site Relocation</span>
          </div>
          {rainfall > 140 && (
            <div className="flex items-center space-x-1 bg-red-950/80 border border-red-500/60 px-2 py-0.5 rounded text-[10px] font-mono text-red-400 animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              <span>FLASH FLOOD WARNING (&gt;140mm)</span>
            </div>
          )}
          <button onClick={() => setShowAllocationModal(!showAllocationModal)} className="flex items-center space-x-1.5 text-xs font-mono text-tactical-accent hover:underline font-bold">
            <Layers className="w-3.5 h-3.5" />
            <span>Allocation Matrix</span>
          </button>
        </div>

        {/* ── ALLOCATION PLAN MATRIX OVERLAY ─────────────────────────── */}
        {showAllocationModal && allocationData && (
          <div className="absolute top-16 right-4 z-20 w-[640px] max-h-[84vh] bg-[#0E111B]/96 backdrop-blur-md border border-tactical-border rounded-sm shadow-2xl flex flex-col font-mono overflow-hidden animate-in fade-in slide-in-from-right-5 duration-300">
            <div className="p-3 bg-[#141824] border-b border-tactical-border flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Truck className="text-tactical-accent w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-white">Phase Relocation Allocation Plan</h3>
              </div>
              <button onClick={() => setShowAllocationModal(false)} className="text-tactical-muted hover:text-white p-1"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Safe Site capacity cards */}
              <div>
                <h4 className="text-[11px] font-bold text-tactical-muted uppercase tracking-widest mb-2">Safe Site Capacity Status</h4>
                <div className="grid grid-cols-2 gap-2">
                  {allocationData.siteStatus?.map((site: any) => (
                    <div key={site.site_id} className="bg-[#161A26] border border-[#2A2E3D] p-2.5 rounded-sm space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-white truncate max-w-[150px]">{site.site_name}</span>
                        <span className={`font-bold ${site.maxPct >= 100 ? 'text-red-400' : 'text-emerald-400'}`}>{site.maxPct}%</span>
                      </div>
                      <div className="w-full bg-[#202536] h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${site.maxPct >= 100 ? 'bg-red-500' : site.maxPct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, site.maxPct)}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-tactical-muted">
                        <span>Road: {site.used_road}/{site.max_road_capacity}</span>
                        <span>Water: {site.used_water}/{site.max_water_capacity}</span>
                      </div>
                      {site.warning && (
                        <div className="bg-red-950/90 border border-red-500/60 p-1 rounded text-[9px] font-bold text-red-400 flex items-center space-x-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" /><span>{site.warning}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Triage table */}
              <div>
                <h4 className="text-[11px] font-bold text-tactical-muted uppercase tracking-widest mb-2">Habitation Triage Matrix</h4>
                <div className="border border-[#2A2E3D] rounded-sm overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#161A26] text-tactical-muted border-b border-[#2A2E3D]">
                        {['Village', 'Tier', 'Priority', 'Allocated Site', 'Pop.', 'Bottleneck'].map((h) => (
                          <th key={h} className="p-2">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2E3D] bg-[#10131E]">
                      {allocationData.allocations?.map((a: any, i: number) => (
                        <tr key={a.village_id} className={`hover:bg-[#181D2D] transition-colors ${i % 2 === 0 ? '' : 'bg-[#0c0f18]'}`}>
                          <td className="p-2 font-bold text-white flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                            <span>{a.village_name}</span>
                          </td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: `${a.color}22`, color: a.color, border: `1px solid ${a.color}55` }}>{a.tier}</span>
                          </td>
                          <td className="p-2 text-tactical-muted tabular-nums">{a.final_priority}</td>
                          <td className="p-2 text-emerald-400 font-bold text-[10px]">{a.site_name}</td>
                          <td className="p-2 text-tactical-muted tabular-nums">{a.population?.toLocaleString()}</td>
                          <td className="p-2 text-red-400 font-bold text-[10px]">{a.bottleneck_type}</td>
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

      {/* ─── ACTION TERMINAL OVERLAY ────────────────────────────────── */}
      {showActionTerminal && (
        <ActionTerminal
          rainfall={rainfall}
          slopeThreshold={slopeThreshold}
          historyWeight={historyWeight}
          onClose={() => setShowActionTerminal(false)}
        />
      )}
    </div>
  );
}
