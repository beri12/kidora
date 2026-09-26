'use client';

import dynamic from 'next/dynamic';
import { Component, useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';

import { gamesApi, type AttemptResult, type LevelSummary, type SessionStart } from '@/lib/api/games';
import { apiErrorMessage } from '@/lib/api-error';
import { gameReducer, initialMachine } from '@/lib/games/game-machine';
import { markTutorialSeen, tutorialSeen, useGameSettings } from '@/lib/games/settings';
import { playSfx } from '@/lib/games/audio';
import { WORLDS } from '@/lib/games/worlds';
import { celebrate } from '@/lib/motion';
import { useAuthStore } from '@/stores/auth.store';
import type { WalkInput } from '@/three/GameWorld';
import { ChallengePanel } from './ChallengePanel';
import { ErrorScreen, GameHUD, LevelComplete, LoadingScreen, PauseMenu, Tutorial, WalkPad } from './GameScreens';

// three.js only runs in the browser, and only loads when a game starts.
const GameWorld = dynamic(() => import('@/three/GameWorld').then((m) => m.GameWorld), { ssr: false });

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Catches a crash inside the 3D scene so the child never sees a blank canvas. */
class CanvasBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/**
 * One play session of one level. Owns the state machine; the 3D world, the
 * challenge panel and the screens are views of it. Nothing here decides
 * right or wrong, or how much XP is earned — the API does.
 */
export function GameShell({ slug, level }: { slug: string; level: number }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [settings, updateSettings] = useGameSettings();
  const queryClient = useQueryClient();

  const [m, send] = useReducer(gameReducer, initialMachine);
  const [session, setSession] = useState<SessionStart | null>(null);
  const [error, setError] = useState('');
  const [attemptKey, setAttemptKey] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [gate, setGate] = useState(0);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loadPct, setLoadPct] = useState(10);
  const [simple, setSimple] = useState(false);
  const [summary, setSummary] = useState<LevelSummary | null>(null);
  const input = useRef<WalkInput>({ forward: false, back: false });

  const theme = WORLDS[session?.game.world ?? 'MATH_ISLAND'];
  const gameHref = `/games/${slug}`;

  // Moving to another level on the same page starts over from LOADING.
  const firstLevel = useRef(level);
  useEffect(() => {
    if (level !== firstLevel.current) { firstLevel.current = level; send({ type: 'RETRY' }); }
  }, [level]);

  // Load (and reload on "Try again" / "Restart").
  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.replace(`/login?next=${encodeURIComponent(`/games/${slug}/play?level=${level}`)}`); return; }
    let alive = true;
    setLoadPct(30);
    gamesApi.start(slug, level)
      .then((s) => {
        if (!alive) return;
        setSession(s); setCleared(0); setGate(0); setXp(0); setStreak(0); setSummary(null);
        setLoadPct(100);
        if (!simple && !webglAvailable()) setSimple(true);
        send({ type: 'LOADED', firstTime: !tutorialSeen(slug) });
      })
      .catch((e) => { if (alive) { setError(apiErrorMessage(e, 'Please try again.')); send({ type: 'FAILED' }); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?.id, slug, level, attemptKey]);

  // In READY there is nothing to wait for: go.
  useEffect(() => { if (m.state === 'READY') send({ type: 'START' }); }, [m.state]);

  // In simple mode (no 3D) each gate is "reached" straight away.
  useEffect(() => {
    if (simple && m.state === 'PLAYING' && session) {
      if (cleared < session.challenges.length) { setGate(cleared); send({ type: 'REACHED_GATE' }); }
      else send({ type: 'ALL_CLEARED' });
    }
  }, [simple, m.state, cleared, session]);

  // Keyboard: walk, pause.
  useEffect(() => {
    const walkKeys: Record<string, 'forward' | 'back'> = { ArrowUp: 'forward', w: 'forward', W: 'forward', ArrowDown: 'back', s: 'back', S: 'back' };
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (m.state === 'PLAYING' || m.state === 'CHALLENGE')) { send({ type: 'PAUSE' }); return; }
      const k = walkKeys[e.key];
      if (k && m.state === 'PLAYING') { input.current[k] = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => { const k = walkKeys[e.key]; if (k) input.current[k] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [m.state]);

  // Stop walking whenever play is interrupted, so the child never drifts.
  useEffect(() => { if (m.state !== 'PLAYING') input.current = { forward: false, back: false }; }, [m.state]);

  const onReachGate = useCallback((i: number) => { setGate(i); send({ type: 'REACHED_GATE' }); playSfx('tap', settings.sound); }, [settings.sound]);

  const finish = useCallback(async () => {
    if (!session) return;
    playSfx('complete', settings.sound);
    try {
      const s = await gamesApi.complete(session.sessionId);
      setSummary(s);
      // Levels, progress, XP and recommendations all changed.
      void queryClient.invalidateQueries({ queryKey: ['games'] });
      if (!settings.reducedMotion) void celebrate(0);
      send({ type: 'SHOW_RESULTS' });
    } catch (e) {
      setError(apiErrorMessage(e, 'We could not save your level.'));
      send({ type: 'FAILED' });
    }
  }, [session, settings.sound, settings.reducedMotion, queryClient]);

  const onReachChest = useCallback(() => { send({ type: 'ALL_CLEARED' }); }, []);
  useEffect(() => { if (m.state === 'COMPLETED') void finish(); }, [m.state, finish]);

  function onChallengeDone(r: AttemptResult) {
    if (!session) return;
    setStreak(r.streak);
    if (r.correct) setXp((x) => x + session.level.xpPerCorrect);
    playSfx('open', settings.sound);
    setCleared((c) => c + 1);
    send({ type: 'GATE_CLEARED' });
  }

  const restart = () => { setAttemptKey((k) => k + 1); send({ type: 'RETRY' }); };

  const shellClass = `relative h-[100dvh] w-full overflow-hidden ${settings.largeText ? 'text-[118%]' : ''} ${settings.highContrast ? 'contrast-125' : ''}`;

  return (
    <MotionConfig reducedMotion={settings.reducedMotion ? 'always' : 'user'}>
      <div className={shellClass} style={{ background: `linear-gradient(${theme.sky[0]}, ${theme.sky[1]})` }}>
        {session && !simple && m.state !== 'ERROR' && (
          <div className="absolute inset-0">
            <CanvasBoundary onError={() => { setError('Your device could not draw the 3D world.'); send({ type: 'FAILED' }); }}>
              <GameWorld
                key={session.sessionId}
                theme={theme}
                gates={session.challenges.length}
                cleared={cleared}
                frozen={m.state !== 'PLAYING'}
                input={input}
                quality={settings.quality}
                reducedMotion={settings.reducedMotion}
                avatarColor={user?.avatarColor ?? '#8B5CF6'}
                onReachGate={onReachGate}
                onReachChest={onReachChest}
                onProgress={setProgress}
              />
            </CanvasBoundary>
          </div>
        )}

        {session && simple && m.state !== 'ERROR' && (
          <div className="absolute inset-x-0 top-24 text-center font-display text-lg font-extrabold text-slate-700" aria-hidden>{theme.emoji} {session.level.name}</div>
        )}

        {session && (m.state === 'PLAYING' || m.state === 'CHALLENGE' || m.state === 'PAUSED' || m.state === 'COMPLETED') && (
          <GameHUD
            name={user?.name?.split(' ')[0] ?? 'Explorer'}
            level={`${theme.emoji} ${session.level.name}`}
            xp={xp}
            streak={streak}
            solved={cleared}
            total={session.challenges.length}
            progress={simple ? cleared / session.challenges.length : progress}
            onPause={() => send({ type: 'PAUSE' })}
          />
        )}

        {session && !simple && m.state === 'PLAYING' && (
          <>
            <WalkPad disabled={false} onChange={(d, on) => { input.current[d] = on; }} />
            <p className="pointer-events-none absolute bottom-6 left-4 z-20 max-w-[55%] rounded-2xl bg-white/85 px-3 py-2 font-body text-sm font-extrabold text-slate-700 shadow" role="status">
              {cleared < session.challenges.length ? `Walk to gate ${cleared + 1} 🔒` : 'All gates open — find the treasure chest! 💰'}
            </p>
          </>
        )}

        <AnimatePresence>
          {session && m.state === 'CHALLENGE' && (
            <div className="absolute inset-x-0 bottom-0 z-30 max-h-[82dvh] overflow-y-auto p-3 sm:p-6">
              <ChallengePanel
                key={session.challenges[gate].id}
                sessionId={session.sessionId}
                challenge={session.challenges[gate]}
                index={gate}
                total={session.challenges.length}
                sound={settings.sound}
                onDone={onChallengeDone}
              />
            </div>
          )}
        </AnimatePresence>

        {m.state === 'LOADING' && <LoadingScreen theme={theme} progress={loadPct} />}
        {m.state === 'TUTORIAL' && <Tutorial theme={theme} onDone={() => { markTutorialSeen(slug); send({ type: 'TUTORIAL_DONE' }); }} />}
        {m.state === 'PAUSED' && (
          <PauseMenu settings={settings} onChange={updateSettings} onResume={() => send({ type: 'RESUME' })} onRestart={restart} exitHref={gameHref} />
        )}
        {m.state === 'COMPLETED' && (
          <div className="absolute inset-0 z-30 grid place-items-center" role="status">
            <p className="rounded-full bg-white/90 px-6 py-3 font-display text-2xl font-extrabold text-amber-600 shadow-xl">💰 Opening the treasure…</p>
          </div>
        )}
        {m.state === 'RESULTS' && summary && session && (
          <LevelComplete
            summary={summary}
            gameHref={gameHref}
            onReplay={() => { setAttemptKey((k) => k + 1); send({ type: 'RETRY' }); }}
            onNext={summary.nextLevel ? () => router.push(`/games/${slug}/play?level=${summary.nextLevel}`) : () => router.push(gameHref)}
          />
        )}
        {m.state === 'ERROR' && (
          <ErrorScreen
            message={error}
            backHref="/games"
            onRetry={() => { setError(''); setAttemptKey((k) => k + 1); send({ type: 'RETRY' }); }}
            onSimple={!simple ? () => { setSimple(true); setError(''); setAttemptKey((k) => k + 1); send({ type: 'RETRY' }); } : undefined}
          />
        )}
      </div>
    </MotionConfig>
  );
}
