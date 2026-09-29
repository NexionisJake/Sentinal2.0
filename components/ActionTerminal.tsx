'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Download, FileJson, X, CheckCircle2, AlertTriangle, Loader2, Zap } from 'lucide-react';

interface TerminalLine {
  tag: string;
  text: string;
  status?: string;
  type: 'info' | 'warn' | 'ok' | 'ready' | 'system';
  delay: number;
}

interface ActionTerminalProps {
  rainfall: number;
  slopeThreshold: number;
  historyWeight: number;
  onClose: () => void;
}

const TERMINAL_SEQUENCE: Omit<TerminalLine, 'delay'>[] = [
  { tag: 'INIT', text: 'Connecting to ClickHouse spatial cluster...', status: 'OK', type: 'ok' },
  { tag: 'AUTH', text: 'Authenticating with inclusiweb_geo schema...', status: 'OK', type: 'ok' },
  { tag: 'CALC', text: 'Running multi-hazard raster math on 484 grid cells...', status: 'DONE', type: 'ok' },
  { tag: 'CALC', text: 'Intersecting slope vectors with drainage paths...', status: 'DONE', type: 'ok' },
  { tag: 'CALC', text: 'Computing Final_Priority scores for 8 habitations...', status: 'DONE', type: 'ok' },
  { tag: 'WARN', text: 'Kalpetta Relief Hub Alpha exceeds road capacity threshold!', type: 'warn' },
  { tag: 'WARN', text: 'Vythiri Ridge Shelter Beta road limit at 356% utilization!', type: 'warn' },
  { tag: 'PLAN', text: 'Compiling phased habitation triage matrix...', status: 'OK', type: 'ok' },
  { tag: 'PLAN', text: 'Assigning relocation vectors to 4 safe sites...', status: 'OK', type: 'ok' },
  { tag: 'PACK', text: 'Serializing GeoJSON layers (484 polygons + 12 points)...', status: 'DONE', type: 'ok' },
  { tag: 'PACK', text: 'Compiling official PDF brief document...', status: 'DONE', type: 'ok' },
  { tag: 'SYS', text: 'Export bundle ready. All systems nominal.', status: 'READY', type: 'ready' },
];

export default function ActionTerminal({ rainfall, slopeThreshold, historyWeight, onClose }: ActionTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineTimersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Clear existing timers
    lineTimersRef.current.forEach(clearTimeout);
    lineTimersRef.current = [];
    setLines([]);
    setIsComplete(false);

    // Stagger-feed terminal lines
    let cumDelay = 200;
    TERMINAL_SEQUENCE.forEach((line, i) => {
      const jitter = Math.random() * 120;
      const delay = cumDelay + jitter;
      cumDelay += 280 + jitter;

      const t = setTimeout(() => {
        setLines((prev) => [...prev, { ...line, delay }]);
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, delay);
      lineTimersRef.current.push(t);
    });

    // Mark complete after all lines
    const completeTimer = setTimeout(() => {
      setIsComplete(true);
    }, cumDelay + 300);
    lineTimersRef.current.push(completeTimer);

    return () => lineTimersRef.current.forEach(clearTimeout);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const downloadFile = async (type: 'pdf' | 'geojson') => {
    setDownloading(type);
    const histDec = historyWeight / 100;
    const url = type === 'pdf'
      ? `/api/export-pdf?rainfall=${rainfall}&slope_threshold=${slopeThreshold}&history_weight=${histDec}`
      : `/api/export-geojson?rainfall=${rainfall}&slope_threshold=${slopeThreshold}&history_weight=${histDec}`;

    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = type === 'pdf'
        ? `InclusiWeb_ActionPlan_${new Date().toISOString().slice(0, 10)}.pdf`
        : `InclusiWeb_Wayanad_${new Date().toISOString().slice(0, 10)}.geojson`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setDownloading(null);
    }
  };

  const tagColors: Record<string, string> = {
    INIT: 'text-cyan-400',
    AUTH: 'text-cyan-400',
    CALC: 'text-blue-400',
    WARN: 'text-amber-400',
    PLAN: 'text-purple-400',
    PACK: 'text-emerald-400',
    SYS: 'text-white',
  };

  const statusColors: Record<string, string> = {
    OK: 'text-emerald-400',
    DONE: 'text-emerald-400',
    READY: 'text-tactical-accent',
  };

  return (
    <div className="fixed top-0 right-0 h-full w-[520px] bg-[#040608]/98 backdrop-blur-xl border-l border-[#1a1f2e] z-50 flex flex-col font-mono shadow-2xl shadow-black/80 animate-in slide-in-from-right duration-300">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#090c14] border-b border-[#1a1f2e]">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="w-3 h-3 rounded-full bg-amber-400"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
          </div>
          <Terminal className="w-4 h-4 text-tactical-accent" />
          <span className="text-xs text-white font-bold uppercase tracking-widest">
            InclusiWeb Action Terminal
          </span>
        </div>
        <button onClick={onClose} className="text-tactical-muted hover:text-white transition-colors p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Terminal prompt + params */}
      <div className="px-4 py-2 border-b border-[#0f1420] bg-[#060911]">
        <p className="text-[11px] text-tactical-muted">
          <span className="text-emerald-400">incl@wayanad:~$</span>{' '}
          <span className="text-white">./generate-action-plan</span>{' '}
          <span className="text-blue-400">--rain={rainfall}</span>{' '}
          <span className="text-blue-400">--slope={slopeThreshold}</span>{' '}
          <span className="text-blue-400">--hist-weight={historyWeight}%</span>
        </p>
      </div>

      {/* Terminal log feed */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-0.5 text-[11px] leading-relaxed"
        style={{ scrollBehavior: 'smooth' }}
      >
        {lines.map((line, i) => (
          <div key={i} className="flex items-start space-x-2.5 py-0.5">
            <span className={`${tagColors[line.tag] || 'text-tactical-muted'} flex-shrink-0 w-12 text-right font-bold`}>
              [{line.tag}]
            </span>
            <span className={`flex-1 ${line.type === 'warn' ? 'text-amber-300' : line.type === 'ready' ? 'text-tactical-accent font-bold' : 'text-[#99a0b0]'}`}>
              {line.text}
            </span>
            {line.status && (
              <span className={`flex-shrink-0 font-bold ${statusColors[line.status] || 'text-white'}`}>
                [{line.status}]
              </span>
            )}
            {line.type === 'warn' && <AlertTriangle className="flex-shrink-0 w-3.5 h-3.5 text-amber-400 mt-0.5" />}
            {line.type === 'ready' && <CheckCircle2 className="flex-shrink-0 w-3.5 h-3.5 text-tactical-accent mt-0.5" />}
          </div>
        ))}

        {/* Cursor blink */}
        {!isComplete && (
          <div className="flex items-center space-x-1 py-1">
            <span className="text-tactical-accent font-bold">›</span>
            <span className="w-2 h-4 bg-tactical-accent animate-pulse inline-block"></span>
          </div>
        )}
      </div>

      {/* Download Actions (appear after terminal completes) */}
      {isComplete && (
        <div className="p-4 border-t border-[#1a1f2e] bg-[#060911] space-y-3 animate-in fade-in duration-500">
          <div className="text-center">
            <p className="text-[10px] text-tactical-muted uppercase tracking-widest mb-3">
              Export Bundle Ready — Select Format
            </p>
          </div>

          <button
            onClick={() => downloadFile('pdf')}
            disabled={downloading !== null}
            className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-red-950/50 border border-red-500/60 hover:bg-red-500/20 hover:border-red-400 text-white font-bold text-xs uppercase tracking-widest transition-all rounded-sm disabled:opacity-50 group"
          >
            {downloading === 'pdf' ? (
              <Loader2 className="w-4 h-4 animate-spin text-red-400" />
            ) : (
              <Download className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
            )}
            <span>{downloading === 'pdf' ? 'Compiling PDF...' : 'Download Official PDF Brief'}</span>
          </button>

          <button
            onClick={() => downloadFile('geojson')}
            disabled={downloading !== null}
            className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-emerald-950/50 border border-emerald-500/60 hover:bg-emerald-500/20 hover:border-emerald-400 text-white font-bold text-xs uppercase tracking-widest transition-all rounded-sm disabled:opacity-50 group"
          >
            {downloading === 'geojson' ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <FileJson className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            )}
            <span>{downloading === 'geojson' ? 'Packaging GeoJSON...' : 'Export Spatial GeoJSON (QGIS/ArcGIS)'}</span>
          </button>

          <p className="text-center text-[9px] text-tactical-muted mt-1">
            RFC 7946 compliant · WGS84 (EPSG:4326) · Compatible with QGIS 3.x & ArcGIS Pro
          </p>
        </div>
      )}
    </div>
  );
}
