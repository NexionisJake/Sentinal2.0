'use client';

import React, { useState, useEffect } from 'react';

interface TelemetryHUDProps {
  dbStatus: string;
  latencyMs: number;
  drawCalls?: number;
  activePixels?: number;
  isCached?: boolean;
  bottleneckConstraint?: string;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({
  dbStatus = 'ONLINE',
  latencyMs = 14.2,
  drawCalls = 48,
  activePixels = 1420000,
  isCached = false,
  bottleneckConstraint = 'ROAD_WIDTH (3.5m min threshold breached)',
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [fps, setFps] = useState(60);

  // Monitor FPS live
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const calcFps = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.min(60, Math.round((frameCount * 1000) / (now - lastTime))));
        frameCount = 0;
        lastTime = now;
      }
      animationFrameId = requestAnimationFrame(calcFps);
    };

    animationFrameId = requestAnimationFrame(calcFps);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#090A0F]/95 backdrop-blur-md border-t border-cyan-500/20 text-xs font-mono select-none">
      {/* Top Toggle Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-1.5 flex items-center justify-between cursor-pointer bg-[#0D0F17] border-b border-cyan-500/10 hover:bg-cyan-950/30 transition-colors"
      >
        <div className="flex items-center space-x-4">
          <span className="text-cyan-400 font-bold tracking-wider flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>ENGINEERING TELEMETRY HUD</span>
          </span>

          {/* LED Status */}
          <div className="flex items-center space-x-2 bg-black/50 px-2 py-0.5 rounded border border-cyan-500/20">
            <span
              className={`w-2 h-2 rounded-full ${
                isCached || dbStatus.includes('CACHE')
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-emerald-400 shadow-[0_0_8px_#10B981]'
              }`}
            />
            <span className="text-slate-300">
              DB: <span className={isCached ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>{dbStatus}</span>
              <span className="text-slate-500 ml-1">[{latencyMs}ms]</span>
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-2 text-slate-400">
            <span>RENDER FPS:</span>
            <span className={fps >= 50 ? 'text-emerald-400' : 'text-amber-400'}>{fps} FPS</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-slate-400">
          <span className="text-[10px] text-cyan-500/60 uppercase tracking-widest">[CLICK TO {isOpen ? 'COLLAPSE' : 'EXPAND'}]</span>
          <span>{isOpen ? '▼' : '▲'}</span>
        </div>
      </div>

      {/* Expanded Metrics Grid */}
      {isOpen && (
        <div className="px-4 py-2.5 grid grid-cols-2 md:grid-cols-5 gap-4 text-[11px] animate-in slide-in-from-bottom-2 duration-200">
          <div>
            <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">QUERY ENGINE</div>
            <div className="text-cyan-300 font-medium truncate">ClickHouse Columnar</div>
            <div className="text-[10px] text-slate-500 truncate">Spatial Grid 30m×30m</div>
          </div>

          <div>
            <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">SPATIAL INTERSECTION LATENCY</div>
            <div className="text-emerald-400 font-bold text-sm flex items-center space-x-1">
              <span>{latencyMs}ms</span>
              <span className="text-[10px] text-slate-500 font-normal">(SUB-250MS GOAL)</span>
            </div>
            <div className="text-[10px] text-slate-500 truncate">Index: R-Tree H3_L9</div>
          </div>

          <div>
            <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">WEBGL DRAW CALLS</div>
            <div className="text-cyan-400 font-bold text-sm">{drawCalls} CALLS / FRAME</div>
            <div className="text-[10px] text-slate-500 truncate">Deck.gl Instanced Matrix</div>
          </div>

          <div>
            <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">ACTIVE PIXELS EVALUATED</div>
            <div className="text-purple-300 font-bold text-sm" suppressHydrationWarning>
              {activePixels.toLocaleString('en-US')} PTS
            </div>
            <div className="text-[10px] text-slate-500 truncate">GPU Shader Kernel</div>
          </div>

          <div className="col-span-2 md:col-span-1">
            <div className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">BOTTLENECK CONSTRAINT</div>
            <div className="text-rose-400 font-semibold truncate text-[11px]">{bottleneckConstraint}</div>
            <div className="text-[10px] text-slate-500 truncate">Feasibility Matcher Filter</div>
          </div>
        </div>
      )}
    </div>
  );
};
