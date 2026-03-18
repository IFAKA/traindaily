'use client';

import { useState, useRef, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Info, X, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import type { Exercise } from '@traindaily/core';
import { cn } from '../lib/utils';
import { ExerciseDemo } from './ExerciseDemo';
import { QuitConfirmDialog } from './QuitConfirmDialog';
import { NumberWheel } from './NumberWheel';

interface ExerciseScreenProps {
  exercise: Exercise;
  exerciseIndex: number;
  totalExercises: number;
  currentSet: number;
  setsPerExercise: number;
  currentTarget: number;
  previousRep: number | null;
  flashColor: 'green' | 'red' | null;
  onLogSet: (value: number) => void;
  onQuit: () => void;
  restoredFromDraft?: boolean;
}

export function ExerciseScreen({
  exercise,
  exerciseIndex,
  totalExercises,
  currentSet,
  setsPerExercise,
  currentTarget,
  previousRep,
  flashColor,
  onLogSet,
  onQuit,
  restoredFromDraft,
}: ExerciseScreenProps) {
  const [showInstruction, setShowInstruction] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showRestoredBanner, setShowRestoredBanner] = useState(!!restoredFromDraft);
  const [setAnnouncement, setSetAnnouncement] = useState('');
  const prevSet = useRef(currentSet);
  const showInstructionRef = useRef(false);

  useEffect(() => {
    if (!restoredFromDraft) return;
    const t = setTimeout(() => setShowRestoredBanner(false), 3000);
    return () => clearTimeout(t);
  }, [restoredFromDraft]);

  useEffect(() => {
    if (currentSet > 0 && currentSet > prevSet.current) {
      setSetAnnouncement(`Set ${currentSet} of ${setsPerExercise} complete`);
    }
    prevSet.current = currentSet;
  }, [currentSet, setsPerExercise]);
  const progressPercent = (exerciseIndex / totalExercises) * 100;

  // Keep ref in sync
  useEffect(() => {
    showInstructionRef.current = showInstruction;
  }, [showInstruction]);

  useEffect(() => {
    setShowInstruction(false); // eslint-disable-line react-hooks/set-state-in-effect
    setShowQuitConfirm(false);
  }, [exerciseIndex, currentSet]);

  // Back button: close how-to if open, otherwise show quit confirm
  // Push state once on mount, re-push after each back press to keep trapping
  useEffect(() => {
    const handlePopState = () => {
      if (showInstructionRef.current) {
        setShowInstruction(false);
      } else {
        setShowQuitConfirm(true);
      }
      // Re-push so the next back press is also caught
      window.history.pushState({ exercise: true }, '');
    };
    window.history.pushState({ exercise: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <div
      className={cn(
        'flex flex-col h-[100dvh] bg-background transition-colors duration-500 overflow-hidden',
        flashColor === 'green' && 'bg-green-950/30',
        flashColor === 'red' && 'bg-red-950/30'
      )}
    >
      {/* Fullscreen how-to overlay */}
      {showInstruction && (
        <div className="fixed inset-0 z-40 bg-background flex flex-col">
          <button
            type="button"
            onClick={() => setShowInstruction(false)}
            className="flex items-center gap-3 p-4 text-left active:scale-95"
            aria-label="Close how to"
          >
            <ChevronLeft className="w-7 h-7 text-muted-foreground shrink-0" />
            <h2 className="text-2xl font-bold flex-1">{exercise.name}</h2>
          </button>
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 pb-8 overflow-y-auto min-h-0">
            {exercise.youtubeId && (
              <div className="w-full max-w-sm">
                <ExerciseDemo youtubeId={exercise.youtubeId} title={exercise.name} />
              </div>
            )}
            <p className="text-base text-muted-foreground text-center max-w-sm leading-relaxed font-medium">
              {exercise.instruction}
            </p>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-8"
              onClick={() => setShowInstruction(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}

      {/* Screen reader announcements */}
      <span className="sr-only" aria-live="assertive" aria-atomic="true">{setAnnouncement}</span>

      {/* Session restored banner */}
      {showRestoredBanner && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-muted/90 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-2 duration-300">
          Session restored
        </div>
      )}

      {/* Top bar - fixed so keyboard can't push it away */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-background flex items-center gap-3 p-4 pb-3">
        <button
          type="button"
          onClick={() => setShowQuitConfirm(true)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0 active:scale-95"
          aria-label="Quit workout"
        >
          <X className="w-6 h-6" />
        </button>
        <Progress value={progressPercent} className="flex-1 h-2" />
        <span className="text-sm text-muted-foreground font-mono font-semibold">
          {exerciseIndex + 1}/{totalExercises}
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 overflow-y-auto min-h-0 px-4 py-2 pt-16">
        {/* Exercise name + how to */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-center">
            {exercise.name}
          </h1>
          <button
            type="button"
            onClick={() => setShowInstruction(true)}
            className="flex items-center gap-2 text-sm transition-colors border rounded-full px-4 py-2 text-muted-foreground/80 hover:text-foreground border-muted-foreground/30 active:scale-95 font-medium"
          >
            <Info className="w-5 h-5" />
            <span>How to</span>
          </button>
        </div>

        {/* Set dots + last set badge */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="flex gap-3">
            {Array.from({ length: setsPerExercise }).map((_, i) => (
              <div
                key={i === currentSet - 1 ? `dot-${i}-${currentSet}` : i}
                className={cn(
                  'w-4 h-4 rounded-full transition-colors',
                  i < currentSet
                    ? 'bg-foreground'
                    : i === currentSet
                      ? 'border-2 border-foreground'
                      : 'border border-muted-foreground/40'
                )}
                style={
                  i === currentSet - 1 && currentSet > 0
                    ? { animation: 'dot-pop 280ms ease-out' }
                    : undefined
                }
              />
            ))}
          </div>
          {currentSet === setsPerExercise - 1 && (
            <span className="text-xs uppercase tracking-widest text-muted-foreground/60 font-semibold">
              Last set
            </span>
          )}
        </div>

        {/* Number wheel */}
        <NumberWheel
          key={`${exerciseIndex}-${currentSet}`}
          defaultValue={currentTarget}
          max={exercise.unit === 'seconds' ? 120 : 40}
          label={exercise.unit === 'seconds' ? 'Seconds held' : 'Reps done'}
          onConfirm={onLogSet}
        />

        {/* Previous performance */}
        {previousRep !== null && (
          <div className="flex items-center gap-2 text-muted-foreground shrink-0 text-xl">
            {flashColor === 'green' ? (
              <TrendingUp className="w-6 h-6 text-green-500" />
            ) : flashColor === 'red' ? (
              <TrendingDown className="w-6 h-6 text-red-500" />
            ) : (
              <Minus className="w-6 h-6" />
            )}
            <span className="text-2xl font-mono font-bold">{previousRep}</span>
          </div>
        )}
      </div>

      {/* Flash feedback icons */}
      {flashColor && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          {flashColor === 'green' ? (
            <TrendingUp
              className="w-24 h-24 text-green-500"
              style={{ animation: 'feedback-pop 400ms ease-out forwards' }}
            />
          ) : (
            <TrendingDown
              className="w-24 h-24 text-red-500"
              style={{ animation: 'feedback-pop 400ms ease-out forwards' }}
            />
          )}
        </div>
      )}

      <QuitConfirmDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        onConfirm={onQuit}
      />
    </div>
  );
}
