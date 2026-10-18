import { useState, useEffect, useCallback, useRef } from "react";

// Shared Web-Audio click — one context, one running transport
let sharedAudioCtx = null;
let activeMetronomeStop = null;
function getSharedAudioCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AC();
  }
  return sharedAudioCtx;
}

function beatsInMeter(meter) {
  const map = { "2/4": 2, "3/4": 3, "4/4": 4, "5/4": 5, "6/8": 6 };
  return map[meter] || 4;
}

function useMetronome(bpm, meter) {
  const [active, setActive] = useState(false);
  const [beat, setBeat] = useState(false);
  const [beatIndex, setBeatIndex] = useState(0);
  const [accent, setAccent] = useState(false);
  const audibleRef = useRef(false);
  const runningRef = useRef(false);
  const timerRef = useRef(null);
  const nextNoteRef = useRef(0);
  const beatIdxRef = useRef(0);
  const bpmRef = useRef(bpm);
  const meterRef = useRef(meter || "4/4");
  bpmRef.current = bpm;
  meterRef.current = meter || "4/4";

  const pulse = useCallback(() => {
    setBeat(true);
    setTimeout(() => setBeat(false), 80);
  }, []);

  const playClick = useCallback((ctx, time, accented) => {
    try {
      const osc1 = ctx.createOscillator(), g1 = ctx.createGain();
      osc1.connect(g1); g1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(accented ? 2800 : 1800, time);
      g1.gain.setValueAtTime(0.0001, time);
      g1.gain.exponentialRampToValueAtTime(accented ? 1 : 0.55, time + 0.001);
      g1.gain.exponentialRampToValueAtTime(0.001, time + (accented ? 0.04 : 0.022));
      osc1.start(time); osc1.stop(time + 0.045);
      const osc2 = ctx.createOscillator(), g2 = ctx.createGain();
      osc2.connect(g2); g2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(accented ? 1400 : 700, time);
      g2.gain.setValueAtTime(0.0001, time);
      g2.gain.exponentialRampToValueAtTime(accented ? 0.7 : 0.35, time + 0.001);
      g2.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      osc2.start(time); osc2.stop(time + 0.055);
    } catch (_) {}
  }, []);

  const scheduler = useCallback(() => {
    const ctx = getSharedAudioCtx();
    if (!ctx || !runningRef.current) return;
    const bpmNow = Number(bpmRef.current) || 0;
    if (bpmNow <= 0) return;
    const step = 60 / bpmNow;
    const horizon = ctx.currentTime + 0.15;
    const perBar = beatsInMeter(meterRef.current);
    while (nextNoteRef.current < horizon) {
      const when = nextNoteRef.current;
      const idx = beatIdxRef.current % perBar;
      const isAccent = idx === 0 || (meterRef.current === "6/8" && idx === 3);
      if (audibleRef.current) {
        playClick(ctx, when, isAccent);
        const delay = Math.max(0, (when - ctx.currentTime) * 1000);
        const shown = idx + 1;
        const acc = isAccent;
        setTimeout(() => { pulse(); setBeatIndex(shown); setAccent(acc); }, delay);
      }
      beatIdxRef.current += 1;
      nextNoteRef.current += step;
    }
  }, [playClick, pulse]);

  const stopTransport = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    runningRef.current = false;
    audibleRef.current = false;
    setActive(false);
    setBeat(false);
    if (activeMetronomeStop) activeMetronomeStop = null;
  }, []);

  const startTransport = useCallback(async (withSound) => {
    const bpmNow = Number(bpmRef.current) || 0;
    if (bpmNow <= 0) return;
    if (activeMetronomeStop && activeMetronomeStop !== stopTransport) activeMetronomeStop();
    const ctx = getSharedAudioCtx();
    if (!ctx) return;
    try { if (ctx.state === "suspended") await ctx.resume(); } catch (_) {}
    runningRef.current = true;
    audibleRef.current = !!withSound;
    setActive(!!withSound);
    beatIdxRef.current = 0;
    setBeatIndex(0);
    setAccent(false);
    nextNoteRef.current = ctx.currentTime + 0.02;
    if (timerRef.current) clearInterval(timerRef.current);
    scheduler();
    timerRef.current = setInterval(scheduler, 25);
    activeMetronomeStop = stopTransport;
  }, [scheduler, stopTransport]);

  const start = useCallback(() => { startTransport(true); }, [startTransport]);
  const stop = useCallback(() => { stopTransport(); }, [stopTransport]);

  const toggle = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const ctx = getSharedAudioCtx();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    if (!runningRef.current) {
      startTransport(true);
      return;
    }
    audibleRef.current = !audibleRef.current;
    setActive(audibleRef.current);
  }, [startTransport]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return { active, beat, beatIndex, accent, toggle, start, stop };
}

export { getSharedAudioCtx, useMetronome };
