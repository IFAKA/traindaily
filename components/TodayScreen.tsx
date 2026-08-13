'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dumbbell, Play, CheckCircle, Smartphone, Flame, ChartBar, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@traindaily/ui';
import {
  ExerciseScreen,
  RestTimer,
  ExerciseTransition,
  SessionComplete,
  RestDayScreen,
  Onboarding,
  WeeklySplit,
  HistoryScreen,
} from '@traindaily/ui';
import { useWorkout } from '@/hooks/useWorkout';
import { useSchedule } from '@/hooks/useSchedule';
import { useDevTools } from '@/lib/devtools';
import { useMobility } from '@/hooks/useMobility';
import { formatDisplayDate, getWeekNumber } from '@/lib/workout-utils';
import { getFirstSessionDate } from '@/lib/storage';
import { getWorkoutType, getTrainingStreak } from '@/lib/schedule';
import { PUSH_EXERCISES, PULL_EXERCISES, LEGS_EXERCISES } from '@/lib/constants';
import { syncWithDesktop, getStoredDesktopInfo, clearDesktopInfo } from '@/lib/sync-client';
import { playWentOffline, playBackOnline, isMuted, setMuted } from '@/lib/audio';
import { WorkoutErrorBoundary } from './WorkoutErrorBoundary';

const ONBOARDING_KEY = 'traindaily_onboarding_completed';

function useOfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false);
      playWentOffline();
    };
    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      playBackOnline();
      setTimeout(() => setShowBackOnline(false), 2000);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return { isOnline, showBackOnline };
}

export function TodayScreen() {
  const [mounted, setMounted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const devtools = useDevTools();
  const { isOnline, showBackOnline } = useOfflineIndicator();

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect

    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const today = useMemo(() => {
    if (!mounted) return null;
    return devtools?.dateOverride ?? new Date();
  }, [mounted, devtools?.dateOverride]);

  const handleCompleteOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const visible = !isOnline || showBackOnline;
  const offlineLine = (
    <div
      className="fixed top-0 left-0 right-0 h-[2px] z-50 transition-opacity duration-300"
      style={{
        backgroundColor: showBackOnline ? 'var(--system-green)' : 'var(--system-orange)',
        opacity: visible ? 1 : 0,
        animation: visible ? 'slide-down-in 300ms cubic-bezier(0.4, 0.0, 0.2, 1)' : undefined,
      }}
    />
  );

  if (showOnboarding) {
    return <>{offlineLine}<Onboarding onComplete={handleCompleteOnboarding} /></>;
  }

  if (!today) {
    return (
      <>
        {offlineLine}
        <div className="flex items-center justify-center h-[100dvh] bg-background">
          <Dumbbell className="w-8 h-8 animate-pulse" />
        </div>
      </>
    );
  }

  return <>{offlineLine}<WorkoutErrorBoundary><TodayContent date={today} /></WorkoutErrorBoundary></>;
}

function TodayContent({ date }: { date: Date }) {
  const schedule = useSchedule(date);
  const workout = useWorkout(date);
  const [pulsing, setPulsing] = useState(true);
  const [muted, setMutedState] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPulsing(false), 5000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    setMutedState(isMuted()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };
  const mobility = useMobility();
  const firstSession = getFirstSessionDate();
  const weekNumber = getWeekNumber(firstSession, date);
  const workoutType = getWorkoutType(date);
  const streak = getTrainingStreak(date, workout.data);
  const [showHistory, setShowHistory] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Check if desktop is paired
  const [isPaired, setIsPaired] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [showPairHint, setShowPairHint] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const desktopInfo = localStorage.getItem('traindaily_desktop_info');
      setIsPaired(!!desktopInfo); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, []);

  const handlePairButton = async () => {
    if (isPaired) {
      setSyncStatus('syncing');
      const result = await syncWithDesktop();
      setSyncStatus(result.success ? 'success' : 'error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } else {
      setShowPairHint(true);
      setTimeout(() => setShowPairHint(false), 4000);
    }
  };

  const handleUnpair = () => {
    clearDesktopInfo();
    setIsPaired(false);
    setSyncStatus('idle');
  };

  const handleCopyRoutine = async () => {
    const exercises = workoutType === 'push'
      ? PUSH_EXERCISES
      : workoutType === 'pull'
        ? PULL_EXERCISES
        : LEGS_EXERCISES;
    const routine = [
      `${workoutType.toUpperCase()} ROUTINE`,
      `${workout.setsPerExercise} sets per exercise`,
      '',
      ...exercises.map((exercise, index) => `${index + 1}. ${exercise.name}`),
    ].join('\n');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(routine);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = routine;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('Clipboard copy failed');
      }
      setCopyStatus('success');
    } catch {
      setCopyStatus('error');
    }
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  // History screen
  if (showHistory) {
    return (
      <HistoryScreen
        data={workout.data}
        currentDate={date}
        onBack={() => setShowHistory(false)}
      />
    );
  }

  // Rest day
  if (!schedule.isTraining) {
    return (
      <RestDayScreen
        nextTraining={schedule.nextTraining}
        weekCompleted={schedule.weekProgress.completed}
        weekTotal={schedule.weekProgress.total}
        mobility={mobility}
      />
    );
  }

  // Workout in progress
  if (workout.state === 'exercising') {
    return (
      <ExerciseScreen
        exercise={workout.currentExercise!}
        exerciseIndex={workout.exerciseIndex}
        totalExercises={workout.totalExercises}
        currentSet={workout.currentSet}
        setsPerExercise={workout.setsPerExercise}
        currentTarget={workout.currentTarget}
        previousRep={workout.previousRep}
        flashColor={workout.flashColor}
        onLogSet={workout.logSet}
        onQuit={workout.quitWorkout}
        restoredFromDraft={workout.restoredFromDraft}
      />
    );
  }

  if (workout.state === 'transitioning') {
    return (
      <ExerciseTransition
        exerciseName={workout.nextExerciseName}
        onComplete={workout.finishTransition}
      />
    );
  }

  if (workout.state === 'resting') {
    const restLabel = workout.currentSet + 1 < workout.setsPerExercise
      ? `Set ${workout.currentSet + 2} of ${workout.setsPerExercise}`
      : workout.nextExercise?.name ? `Next · ${workout.nextExercise.name}` : undefined;
    return (
      <RestTimer
        seconds={workout.timer}
        isPaused={workout.timerPaused}
        onPauseToggle={workout.togglePauseTimer}
        onSkip={workout.skipTimer}
        onQuit={workout.quitWorkout}
        onUndo={workout.undoLastSet}
        restLabel={restLabel}
      />
    );
  }

  if (workout.state === 'complete') {
    const onSync = getStoredDesktopInfo()
      ? () => syncWithDesktop()
      : undefined;
    return (
      <SessionComplete
        mode="workout"
        sessionReps={workout.sessionReps}
        data={workout.data}
        date={date}
        onDone={workout.quitWorkout}
        onSync={onSync}
        saveError={workout.saveError}
      />
    );
  }

  // Idle — ready to start (or already done today)
  const isDone = schedule.isDone;
  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      {/* Top content */}
      <div className="flex flex-col items-center flex-shrink-0 px-6 pt-12 pb-4 gap-5">
        <div className="flex flex-col items-center gap-3">
          {isDone ? (
            <CheckCircle
              className="w-10 h-10 text-green-500"
              style={{ animation: 'bounce-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) backwards' }}
            />
          ) : (
            <Dumbbell
              className="w-10 h-10"
              style={{ animation: 'bounce-in 600ms ease-out backwards' }}
            />
          )}
          <h1 className="text-2xl font-bold tracking-tight uppercase text-foreground">
            {workoutType === 'push' ? 'PUSH' : workoutType === 'pull' ? 'PULL' : 'LEGS'}
          </h1>
          <p className="text-sm text-muted-foreground">{formatDisplayDate(date)}</p>
        </div>

        <div
          className="flex items-center gap-3 text-sm text-muted-foreground"
          style={{ animation: 'stagger-in 400ms ease-out 200ms backwards' }}
        >
          <span className="font-mono">WEEK {weekNumber}</span>
          <span>·</span>
          <span className="font-mono">{workout.setsPerExercise} SETS</span>
          {streak > 0 && (
            <>
              <span>·</span>
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="font-mono text-orange-500">{streak}</span>
              </div>
            </>
          )}
        </div>

        {!isDone && (
          <Button
            size="lg"
            onClick={workout.startWorkout}
            className={`rounded-full w-20 h-20 active:scale-95 transition-transform ${pulsing ? 'animate-pulse' : ''}`}
          >
            <Play className="w-10 h-10" />
          </Button>
        )}
      </div>

      {/* Weekly Split — scrollable if needed */}
      <div className="flex-1 overflow-y-auto px-6 pb-2">
        <WeeklySplit
          currentDate={date}
          data={workout.data}
          onCopyRoutine={handleCopyRoutine}
          copyStatus={copyStatus}
        />
      </div>

      {/* Bottom actions */}
      <div className="flex-shrink-0 flex flex-col items-center gap-2 p-4 pb-6">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handlePairButton}
            disabled={syncStatus === 'syncing'}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 hover:bg-muted active:scale-95 transition-all disabled:opacity-50"
          >
            <Smartphone className="w-4 h-4" />
            <span className="text-sm">
              {syncStatus === 'syncing' ? 'Syncing...' :
               syncStatus === 'success' ? 'Synced!' :
               syncStatus === 'error' ? 'Sync failed' :
               isPaired ? 'Sync with Desktop' : 'Pair with Desktop'}
            </span>
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 hover:bg-muted active:scale-95 transition-all"
          >
            <ChartBar className="w-4 h-4" />
            <span className="text-sm">History</span>
          </button>
          <button
            onClick={toggleMute}
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/50 hover:bg-muted active:scale-95 transition-all"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Inline hint when not paired */}
        {showPairHint && (
          <p className="text-xs text-muted-foreground text-center animate-in fade-in">
            Open the desktop app → Pair Device → scan QR with your camera
          </p>
        )}

        {/* Unpair option when paired */}
        {isPaired && syncStatus === 'idle' && (
          <button
            onClick={handleUnpair}
            className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            Disconnect desktop
          </button>
        )}
      </div>
    </div>
  );
}
