'use client';

import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

const ITEM_H = 90;
const VISIBLE = 5;
const CENTER = Math.floor(VISIBLE / 2); // 2

// ── Tick sound ────────────────────────────────────────────────────────────────
// Short triangle-wave chirp, 900→350 Hz in 25ms — mimics native picker tick

let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_audioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try { _audioCtx = new Ctor(); } catch { return null; }
  }
  return _audioCtx;
}

function playTick() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(350, t + 0.025);
    gain.gain.setValueAtTime(0.10, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.030);
    osc.start(t);
    osc.stop(t + 0.030);
  } catch { /* silently ignore if audio not available */ }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface NumberWheelProps {
  defaultValue: number;
  min?: number;
  max: number;
  label: string;
  ariaLabel?: string;
  onConfirm: (value: number) => void;
}

export function NumberWheel({ defaultValue, min = 0, max, label, ariaLabel, onConfirm }: NumberWheelProps) {
  const init = Math.min(Math.max(defaultValue, min), max);

  // floatRef is the single source of truth for position.
  // It ALWAYS equals the current visual position — no CSS transition lag.
  const [float, setFloat] = useState(init);
  const floatRef = useRef(init);
  const lastTickInt = useRef(init);

  // Drag
  const dragging = useRef(false);
  const hasMoved = useRef(false);
  const startY = useRef(0);
  const startFloat = useRef(0);
  const velY = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const raf = useRef<number>(0);

  // Edit (tap-to-type)
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const editStartVal = useRef(init);
  const editDone = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  function applyFloat(fv: number) {
    floatRef.current = fv;
    setFloat(fv);
    // Fire tick on integer boundary crossing
    const intNow = Math.round(fv);
    if (intNow !== lastTickInt.current) {
      lastTickInt.current = intNow;
      playTick();
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(2);
    }
  }

  // JS-based ease-to-target — floatRef tracks real position at all times
  function easeToInt(from: number, target: number) {
    const dist = Math.abs(target - from);
    if (dist < 0.001) { applyFloat(target); return; }
    const duration = Math.min(380, Math.max(80, dist * 55)); // scale with distance
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      applyFloat(from + (target - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }

  // ── Drag ──────────────────────────────────────────────────────────────────

  function onPointerDown(e: React.PointerEvent) {
    if (editing) return;
    cancelAnimationFrame(raf.current); // kill any in-progress ease
    dragging.current = true;
    hasMoved.current = false;
    startY.current = e.clientY;
    startFloat.current = floatRef.current; // always the real visual position
    lastY.current = e.clientY;
    lastT.current = Date.now();
    velY.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dy = e.clientY - startY.current;
    if (Math.abs(dy) > 4) hasMoved.current = true;
    applyFloat(clamp(startFloat.current - dy / ITEM_H));
    const now = Date.now();
    const dt = now - lastT.current;
    if (dt > 0) velY.current = (e.clientY - lastY.current) / dt;
    lastY.current = e.clientY;
    lastT.current = now;
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragging.current) return;
    dragging.current = false;

    // Tap on center → open keyboard input
    if (!hasMoved.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      if (y >= CENTER * ITEM_H && y < (CENTER + 1) * ITEM_H) {
        const cur = clamp(Math.round(floatRef.current));
        editDone.current = false;
        editStartVal.current = cur;
        setEditText(String(cur));
        setEditing(true);
        return;
      }
    }

    const vel = velY.current;

    if (Math.abs(vel) < 0.06) {
      // No real momentum — just snap to nearest
      easeToInt(floatRef.current, clamp(Math.round(floatRef.current)));
      return;
    }

    // Momentum decay via RAF — floatRef always = visual position
    let v = vel;
    const decay = () => {
      v *= 0.88;
      const next = clamp(floatRef.current - v * 16 / ITEM_H);
      applyFloat(next);
      if (Math.abs(v) > 0.06) {
        raf.current = requestAnimationFrame(decay);
      } else {
        // Smoothly ease into the nearest integer
        easeToInt(floatRef.current, clamp(Math.round(floatRef.current)));
      }
    };
    raf.current = requestAnimationFrame(decay);
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function finishEdit(text: string) {
    if (editDone.current) return;
    editDone.current = true;
    const n = parseInt(text, 10);
    const target = !isNaN(n) && text.trim() !== '' ? clamp(n) : editStartVal.current;
    lastTickInt.current = target;
    floatRef.current = target;
    setFloat(target);
    setEditing(false);
  }

  function cancelEdit() {
    if (editDone.current) return;
    editDone.current = true;
    const v = editStartVal.current;
    lastTickInt.current = v;
    floatRef.current = v;
    setFloat(v);
    setEditing(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const translateY = CENTER * ITEM_H - (float - min) * ITEM_H;
  const centerInt = clamp(Math.round(float));
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="flex flex-col items-center gap-6">
      <span className="text-base uppercase tracking-widest text-muted-foreground font-semibold">{label}</span>

      <div
        ref={containerRef}
        role="spinbutton"
        tabIndex={0}
        aria-valuenow={centerInt}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={ariaLabel ?? label}
        className="relative overflow-hidden select-none touch-none cursor-ns-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        style={{ height: VISIBLE * ITEM_H, width: 160 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => {
          if (editing) return;
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            const next = clamp(Math.round(floatRef.current) - 1);
            cancelAnimationFrame(raf.current);
            easeToInt(floatRef.current, next);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = clamp(Math.round(floatRef.current) + 1);
            cancelAnimationFrame(raf.current);
            easeToInt(floatRef.current, next);
          }
        }}
      >
        {/* Selection band */}
        <div
          className="absolute inset-x-0 z-10 pointer-events-none border-t border-b border-foreground/25"
          style={{ top: CENTER * ITEM_H, height: ITEM_H }}
        />

        {/* Scrolling column — no CSS transition, JS drives everything */}
        <div
          className="absolute w-full will-change-transform"
          style={{ transform: `translateY(${translateY}px)` }}
        >
          {numbers.map((n) => {
            const dist = Math.abs(n - float);    // continuous float → smooth opacity
            const distInt = Math.abs(n - centerInt); // integer → size steps
            const isCenter = distInt === 0;
            return (
              <div
                key={n}
                className="flex items-center justify-center font-mono font-bold"
                style={{
                  height: ITEM_H,
                  fontSize: isCenter ? 60 : distInt === 1 ? 40 : 28,
                  // Hide center number when input is overlaid — same slot, same size
                  opacity: editing && isCenter ? 0 : Math.max(0.04, 1 - dist * 0.55),
                }}
              >
                {n}
              </div>
            );
          })}
        </div>

        {/* Fade gradients */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent pointer-events-none z-20" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />

        {/* Tap-to-type input — exact same size as center number (42px) */}
        {editing && (
          <div
            className="absolute inset-x-0 z-30 flex items-center justify-center"
            style={{ top: CENTER * ITEM_H, height: ITEM_H }}
          >
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => cancelEdit()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); finishEdit(editText); }
                if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
              }}
              className="w-full text-center font-mono font-bold bg-transparent border-none outline-none text-foreground caret-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{ fontSize: 60 }}
            />
          </div>
        )}
      </div>

      {/* Confirm — onMouseDown prevents blurring the input while editing */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (editing) finishEdit(editText);
          else onConfirm(clamp(Math.round(floatRef.current)));
        }}
        className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center active:scale-95 transition-transform shadow-md hover:bg-foreground/90"
      >
        <Check className="w-8 h-8" />
      </button>
    </div>
  );
}
