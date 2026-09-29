'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface DemoStep {
  id: number;
  title: string;
  duration: number; // in seconds
  description: string;
  badge: string;
  setup: (actions: DemoActions) => void;
  tick?: (stepProgressSec: number, actions: DemoActions) => void;
}

export interface DemoActions {
  setRainfall: (v: number) => void;
  setSlopeThreshold: (v: number) => void;
  setHistoryWeight: (v: number) => void;
  setIsAllocationOpen: (open: boolean) => void;
  setIsTerminalOpen: (open: boolean) => void;
  setShowAllocationVectors: (show: boolean) => void;
  setMapViewState: (vs: any) => void;
  triggerTerminalRun?: () => void;
}

interface AutopilotDemoProps {
  isActive: boolean;
  onClose: () => void;
  actions: DemoActions;
}

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 1,
    title: '1. The Baseline (Monsoon Standard)',
    duration: 25,
    badge: '0:00 - 0:25',
    description: 'Loads Wayanad baseline monsoon data (100mm/hr), highlights safe vs. risky zones, camera flies to Meppadi at 45° tilt.',
    setup: (actions) => {
      actions.setRainfall(100);
      actions.setSlopeThreshold(20);
      actions.setHistoryWeight(0.5);
      actions.setIsAllocationOpen(false);
      actions.setIsTerminalOpen(false);
      actions.setShowAllocationVectors(false);
      actions.setMapViewState({
        longitude: 76.12,
        latitude: 11.55,
        zoom: 12.8,
        pitch: 45,
        bearing: -20,
        transitionDuration: 2000,
      });
    },
  },
  {
    id: 2,
    title: '2. The Trigger (Extreme Cloudburst)',
    duration: 25,
    badge: '0:25 - 0:50',
    description: 'Ramps Rainfall Intensity to 250mm/hr; 3D hexbins elevate, turn Crimson (#EF4444), and drainage paths flash Cyan.',
    setup: (actions) => {
      actions.setSlopeThreshold(15);
      actions.setHistoryWeight(0.8);
      actions.setIsAllocationOpen(false);
      actions.setIsTerminalOpen(false);
      actions.setShowAllocationVectors(false);
      actions.setMapViewState({
        longitude: 76.08,
        latitude: 11.58,
        zoom: 12.2,
        pitch: 58,
        bearing: 10,
        transitionDuration: 1500,
      });
    },
    tick: (stepSec, actions) => {
      // Ramp rainfall smoothly from 100 to 250 over 15 seconds
      const progress = Math.min(1, stepSec / 15);
      const currentRainfall = Math.round(100 + progress * 150);
      actions.setRainfall(currentRainfall);
    },
  },
  {
    id: 3,
    title: '3. The Triage Shift (Vulnerability HUD)',
    duration: 30,
    badge: '0:50 - 1:20',
    description: 'Pulls up Triage HUD; numbers increment dynamically (+162% in Tier 1), showcasing live vulnerability scoring.',
    setup: (actions) => {
      actions.setRainfall(250);
      actions.setIsAllocationOpen(true);
      actions.setIsTerminalOpen(false);
      actions.setShowAllocationVectors(true);
    },
  },
  {
    id: 4,
    title: '4. The Feasibility Matcher (3D Vectors)',
    duration: 40,
    badge: '1:20 - 2:00',
    description: 'Activates Allocation vectors; draws 3D ArcLayers to Safe Sites A & B, animates road vectors, triggers Amber choke point warning.',
    setup: (actions) => {
      actions.setIsAllocationOpen(false);
      actions.setIsTerminalOpen(false);
      actions.setShowAllocationVectors(true);
      actions.setMapViewState({
        longitude: 76.10,
        latitude: 11.56,
        zoom: 13.0,
        pitch: 62,
        bearing: -35,
        transitionDuration: 2500,
      });
    },
  },
  {
    id: 5,
    title: '5. The Executive Brief (Government Action Plan)',
    duration: 30,
    badge: '2:00 - 2:30',
    description: 'Pops terminal drawer, runs system checks in monospace, displays compiled Government Action Plan PDF preview.',
    setup: (actions) => {
      actions.setIsAllocationOpen(false);
      actions.setIsTerminalOpen(true);
      actions.setShowAllocationVectors(true);
      if (actions.triggerTerminalRun) {
        actions.triggerTerminalRun();
      }
    },
  },
];

export const AutopilotDemoControl: React.FC<AutopilotDemoProps> = ({ isActive, onClose, actions }) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = DEMO_STEPS[currentStepIdx];
  const totalDuration = DEMO_STEPS.reduce((sum, s) => sum + s.duration, 0);

  // Calculate cumulative step start times
  const getStepStartSec = (idx: number) => {
    let sec = 0;
    for (let i = 0; i < idx; i++) sec += DEMO_STEPS[i].duration;
    return sec;
  };

  // Run initial step setup whenever step index changes
  useEffect(() => {
    if (!isActive) return;
    const step = DEMO_STEPS[currentStepIdx];
    if (step) {
      step.setup(actions);
    }
  }, [currentStepIdx, isActive]);

  // Main ticker loop
  useEffect(() => {
    if (!isActive || !isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 0.5;
        const currentStepStart = getStepStartSec(currentStepIdx);
        const currentStepSec = next - currentStepStart;

        // Check if tick callback exists for current step
        if (DEMO_STEPS[currentStepIdx]?.tick) {
          DEMO_STEPS[currentStepIdx].tick!(currentStepSec, actions);
        }

        // Check step transition
        if (currentStepSec >= DEMO_STEPS[currentStepIdx].duration) {
          if (currentStepIdx < DEMO_STEPS.length - 1) {
            setCurrentStepIdx(currentStepIdx + 1);
          } else {
            // Reached end of demo
            setIsPlaying(false);
          }
        }
        return next;
      });
    }, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPlaying, currentStepIdx]);

  if (!isActive) return null;

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const jumpToStep = (idx: number) => {
    setCurrentStepIdx(idx);
    setElapsedSec(getStepStartSec(idx));
    DEMO_STEPS[idx].setup(actions);
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl bg-[#090A0F]/95 backdrop-blur-md border-2 border-cyan-400/60 rounded-lg p-3 text-mono text-xs shadow-[0_0_25px_rgba(0,240,255,0.25)] animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2 mb-2">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-bold text-cyan-400 tracking-wider text-sm">AUTOPILOT DEMO / JUDGE WALKTHROUGH</span>
          <span className="bg-cyan-950 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 text-[10px] rounded font-semibold">
            STEP {currentStepIdx + 1}/5
          </span>
        </div>

        <div className="flex items-center space-x-3 text-slate-300">
          <span className="text-cyan-300 font-bold">
            {formatTime(elapsedSec)} / {formatTime(totalDuration)}
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-rose-400 font-bold text-sm px-1.5 py-0.5 rounded hover:bg-rose-950/40 transition-colors"
            title="Exit Demo Mode"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Active Step Details */}
      <div className="bg-[#0D0F17] p-2.5 rounded border border-cyan-500/20 mb-2">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-bold text-cyan-300 text-sm">{currentStep.title}</h4>
          <span className="text-slate-400 text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
            {currentStep.badge}
          </span>
        </div>
        <p className="text-slate-300 text-xs leading-relaxed">{currentStep.description}</p>
      </div>

      {/* Timeline Scrubbing Bar */}
      <div className="flex items-center space-x-1.5 mb-2.5">
        {DEMO_STEPS.map((step, idx) => {
          const isCurrent = idx === currentStepIdx;
          const isPassed = idx < currentStepIdx;
          return (
            <button
              key={step.id}
              onClick={() => jumpToStep(idx)}
              className={`flex-1 py-1 px-1 rounded text-[10px] font-semibold transition-all border ${
                isCurrent
                  ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                  : isPassed
                  ? 'bg-cyan-950/50 border-cyan-700 text-slate-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              Step {step.id}
            </button>
          );
        })}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded border border-slate-800">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => jumpToStep(Math.max(0, currentStepIdx - 1))}
            disabled={currentStepIdx === 0}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors font-bold"
          >
            ⏮ PREV
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-1 rounded font-bold transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/30'
            }`}
          >
            {isPlaying ? '⏸ PAUSE' : '▶ RESUME'}
          </button>

          <button
            onClick={() => jumpToStep(Math.min(DEMO_STEPS.length - 1, currentStepIdx + 1))}
            disabled={currentStepIdx === DEMO_STEPS.length - 1}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors font-bold"
          >
            NEXT ⏭
          </button>
        </div>

        <div className="text-[11px] text-slate-400">
          <span>JUDGE OVERRIDE: </span>
          <span className="text-cyan-400 font-semibold">INTERACT ANYTIME</span>
        </div>
      </div>
    </div>
  );
};
