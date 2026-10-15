'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AttemptResult, Challenge, ChoiceSetup, GridSetup, Hint, LaunchSetup } from '@/lib/api/games';
import { gamesApi } from '@/lib/api/games';
import { apiErrorMessage } from '@/lib/api-error';
import { playSfx } from '@/lib/games/audio';
import { CodeBlocks } from './CodeBlocks';
import { LaunchLab } from './LaunchLab';
import { CellDiagram, SavannaChain } from './SceneArt';

interface Props {
  sessionId: string;
  challenge: Challenge;
  index: number;
  total: number;
  sound: boolean;
  /** Called once the challenge is solved (or its worked example was shown). */
  onDone: (r: AttemptResult) => void;
}

/**
 * One challenge. The answer goes to the API, which judges it; this panel
 * only shows what came back. Wrong answers get Kai's help, not a penalty:
 * hint 1 → hint 2 → a worked example, and after three honest tries the
 * explanation is shown and the child moves on.
 */
export function ChallengePanel({ sessionId, challenge, index, total, sound, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<AttemptResult | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [hints, setHints] = useState<Hint[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setLast(null); setPicked(null); setWrongPicks([]); setHints([]); setError('');
  }, [challenge.id]);

  const finished = Boolean(last && (last.correct || last.revealed));

  async function submit(answer: unknown) {
    if (busy || finished) return;
    setBusy(true);
    setError('');
    try {
      const r = await gamesApi.attempt(sessionId, challenge.id, answer);
      setLast(r);
      playSfx(r.correct ? 'correct' : 'wrong', sound);
      if (!r.correct && typeof answer === 'number') setWrongPicks((w) => [...w, answer]);
      return r;
    } catch (e) {
      setError(apiErrorMessage(e, 'That did not send. Try again.'));
    } finally {
      setBusy(false);
    }
  }

  async function askKai() {
    try {
      const h = await gamesApi.hint(sessionId, challenge.id);
      setHints((prev) => [...prev, h]);
      playSfx('tap', sound);
    } catch (e) {
      setError(apiErrorMessage(e, 'Kai is thinking… try again.'));
    }
  }

  const setup = challenge.setup;
  const isChoice = challenge.kind === 'MULTIPLE_CHOICE';

  // Number keys pick an option, like a quiz show buzzer.
  useEffect(() => {
    if (!isChoice) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      const opts = (setup as ChoiceSetup).options;
      if (n >= 1 && n <= opts.length && !wrongPicks.includes(n - 1)) { setPicked(n - 1); void submit(n - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChoice, challenge.id, wrongPicks, busy, finished]);

  return (
    <motion.section
      role="dialog"
      aria-modal="false"
      aria-labelledby="challenge-prompt"
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 30, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-auto mx-auto w-full max-w-2xl rounded-[28px] border-4 border-white bg-white/95 p-5 shadow-2xl backdrop-blur sm:p-6"
    >
      <div className="mb-2 flex items-center justify-between font-body text-sm font-extrabold text-slate-500">
        <span>Challenge {index + 1} of {total}</span>
        {challenge.speaker && <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">🗣️ {challenge.speaker}</span>}
      </div>

      {challenge.speaker && <SpeakerArt name={challenge.speaker} />}

      <h2 id="challenge-prompt" className="whitespace-pre-wrap font-display text-xl font-extrabold leading-snug text-slate-900 sm:text-2xl">
        {challenge.prompt.includes('\n') ? <CodePrompt text={challenge.prompt} /> : challenge.prompt}
      </h2>

      {isChoice && (setup as ChoiceSetup).scene === 'cell' && <CellDiagram options={(setup as ChoiceSetup).options} onPick={(i) => { setPicked(i); void submit(i); }} disabled={busy || finished} />}
      {isChoice && (setup as ChoiceSetup).scene === 'savanna' && <SavannaChain />}

      {isChoice && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2" role="group" aria-label="Answer options">
          {(setup as ChoiceSetup).options.map((opt, i) => {
            const wasWrong = wrongPicks.includes(i);
            const isRight = finished && last?.correct && picked === i;
            return (
              <motion.button
                key={i}
                type="button"
                disabled={busy || finished || wasWrong}
                onClick={() => { setPicked(i); void submit(i); }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={
                  'flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-body text-lg font-bold outline-none focus-visible:ring-4 focus-visible:ring-brand-300 ' +
                  (isRight ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : wasWrong ? 'border-slate-200 bg-slate-100 text-slate-400 line-through'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-brand-400')
                }
                aria-label={`Option ${i + 1}: ${opt}${wasWrong ? ' (not this one)' : ''}${isRight ? ' (correct)' : ''}`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 font-display text-sm text-slate-600" aria-hidden>
                  {isRight ? '✓' : wasWrong ? '✗' : i + 1}
                </span>
                <span className="whitespace-pre-wrap">{opt}</span>
              </motion.button>
            );
          })}
        </div>
      )}

      {challenge.kind === 'CODE_PATH' && (
        <CodeBlocks setup={setup as GridSetup} busy={busy} solved={finished} result={last} onRun={(program) => submit(program)} />
      )}

      {challenge.kind === 'PHYSICS_LAUNCH' && (
        <LaunchLab setup={setup as LaunchSetup} busy={busy} solved={finished} result={last} onLaunch={(a) => submit(a)} />
      )}

      <AnimatePresence>
        {last && !last.correct && !last.revealed && (
          <motion.p key="try" role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 font-body font-bold text-amber-900">
            🌱 {last.result.reason ?? 'Almost! Let’s try that one more time.'}
          </motion.p>
        )}
      </AnimatePresence>

      {hints.length > 0 && (
        <div className="mt-4 space-y-2" aria-live="polite">
          {hints.map((h) => (
            <div key={h.step} className="flex gap-3 rounded-2xl bg-sky-50 p-3">
              <span className="text-2xl" aria-hidden>🤖</span>
              <p className="font-body font-bold text-sky-900">
                <span className="block text-xs uppercase tracking-wide text-sky-600">Kai · {h.workedExample ? 'worked example' : `hint ${h.step}`}</span>
                {h.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {finished && last && (
        <motion.div role="status" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`mt-4 rounded-2xl p-4 ${last.correct ? 'bg-emerald-50' : 'bg-sky-50'}`}>
          <p className="font-display text-xl font-extrabold text-slate-900">
            {last.correct ? `⭐ Great job!${last.streak >= 3 ? ` 🔥 Streak ×${last.streak}` : ''}` : '🤖 Let’s learn it together'}
          </p>
          {last.explanation && <p className="mt-1 font-body font-bold text-slate-700">{last.explanation}</p>}
          <button
            type="button"
            autoFocus
            onClick={() => onDone(last)}
            className="mt-3 min-h-12 w-full rounded-full bg-brand-700 font-display text-lg font-extrabold text-white outline-none focus-visible:ring-4 focus-visible:ring-brand-300"
          >
            Continue →
          </button>
        </motion.div>
      )}

      {!finished && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={askKai}
            disabled={hints.length > 0 && hints[hints.length - 1].workedExample}
            className="min-h-11 rounded-full bg-sky-100 px-4 font-display font-extrabold text-sky-800 disabled:opacity-50"
          >
            🤖 Ask Kai for a hint
          </button>
          {busy && <span className="font-body text-sm font-bold text-slate-400" role="status">Checking…</span>}
        </div>
      )}

      {error && <p role="alert" className="mt-3 font-body text-sm font-bold text-rose-600">{error}</p>}
    </motion.section>
  );
}

/** Prompts with code: blank lines separate the code from the question. */
function CodePrompt({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((part, i) =>
        /\?\s*$/.test(part) && !part.includes('\n') ? (
          <span key={i} className="mb-2 block">{part}</span>
        ) : (
          <pre key={i} className="mb-2 overflow-x-auto rounded-2xl bg-slate-900 p-4 font-mono text-base font-semibold leading-relaxed text-emerald-300">{part}</pre>
        ),
      )}
    </>
  );
}

const ANIMALS: Record<string, string> = { Elephant: '🐘', Giraffe: '🦒', Monkey: '🐒', Zebra: '🦓', Lion: '🦁', Bird: '🐦', Kai: '🤖' };

function SpeakerArt({ name }: { name: string }) {
  return (
    <motion.div aria-hidden className="mb-2 text-5xl" initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
      {ANIMALS[name] ?? '🙂'}
    </motion.div>
  );
}
