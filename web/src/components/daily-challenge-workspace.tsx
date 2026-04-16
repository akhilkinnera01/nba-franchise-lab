'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { Phase5LabShell } from '@/components/phase5-lab-shell';
import {
  listSavedScenarios,
  submitDailyChallengeResponse,
} from '@/lib/api/client';
import type {
  DailyChallengeResponse,
  DailyChallengeSubmissionSummary,
  FeaturedScenarioResponse,
  SavedScenarioSummary,
} from '@/lib/api/types';
import { formatDateTime } from '@/lib/formatters';

const STREAK_KEY = 'nba-franchise-lab.daily-challenge.streak';
const COMPLETED_KEY = 'nba-franchise-lab.daily-challenge.completed';

interface DailyChallengeWorkspaceProps {
  challenge: DailyChallengeResponse;
  featuredScenario: FeaturedScenarioResponse;
}

function readNumberFromStorage(key: string): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  const value = window.localStorage.getItem(key);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function DailyChallengeWorkspace({
  challenge,
  featuredScenario,
}: DailyChallengeWorkspaceProps) {
  const { accessToken, status } = useAuth();
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenarioSummary[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [submissionNote, setSubmissionNote] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<
    DailyChallengeSubmissionSummary[]
  >(challenge.submissions);

  useEffect(() => {
    setStreak(readNumberFromStorage(STREAK_KEY));
    setCompleted(window.localStorage.getItem(COMPLETED_KEY) === challenge.challenge_key);
  }, [challenge.challenge_key]);

  useEffect(() => {
    setSubmissions(challenge.submissions);
  }, [challenge.submissions]);

  useEffect(() => {
    const authToken = accessToken ?? '';
    if (!authToken) {
      setSavedScenarios([]);
      setSelectedScenarioId('');
      return;
    }

    let cancelled = false;

    async function loadSavedScenarios() {
      try {
        const response = await listSavedScenarios(authToken);
        if (cancelled) {
          return;
        }

        setSavedScenarios(response.items);
        setSelectedScenarioId((current) => current || response.items[0]?.scenario_id || '');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSavedScenarios([]);
        setSelectedScenarioId('');
        setSubmissionStatus('error');
        setSubmissionMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load your saved scenarios.',
        );
      }
    }

    void loadSavedScenarios();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  function markCompleted() {
    const nextStreak = completed ? streak : streak + 1;
    window.localStorage.setItem(STREAK_KEY, String(nextStreak));
    window.localStorage.setItem(COMPLETED_KEY, challenge.challenge_key);
    setStreak(nextStreak);
    setCompleted(true);
  }

  function resetChallenge() {
    window.localStorage.removeItem(COMPLETED_KEY);
    setCompleted(false);
  }

  async function handleSubmit() {
    const authToken = accessToken ?? '';
    if (!authToken) {
      setSubmissionStatus('error');
      setSubmissionMessage('Sign in to submit a saved scenario to the challenge.');
      return;
    }

    if (!selectedScenarioId) {
      setSubmissionStatus('error');
      setSubmissionMessage('Choose one saved scenario before you submit.');
      return;
    }

    setSubmissionStatus('loading');
    setSubmissionMessage(null);

    try {
      const submission = await submitDailyChallengeResponse(authToken, {
        challenge_key: challenge.challenge_key,
        scenario_id: selectedScenarioId,
        note: submissionNote.trim() || null,
      });
      setSubmissions((current) => [
        submission,
        ...current.filter(
          (item) =>
            !(
              item.author_user_id === submission.author_user_id &&
              item.challenge_key === submission.challenge_key
            ),
        ),
      ]);
      setSubmissionStatus('ready');
      setSubmissionMessage('Challenge response submitted to the shared board.');
      if (!completed) {
        markCompleted();
      }
    } catch (error) {
      setSubmissionStatus('error');
      setSubmissionMessage(
        error instanceof Error ? error.message : 'Unable to submit challenge response.',
      );
    }
  }

  return (
    <Phase5LabShell
      eyebrow="Daily Challenge / Scenario of the Week"
      title="A fresh front-office prompt every day, plus one weekly anchor worth revisiting."
      description="The daily challenge now uses the Phase 5 featured-content APIs: one deterministic editorial prompt, one featured weekly scenario, and a lightweight community response board layered on top of stored scenarios."
      stats={[
        {
          label: 'Challenge',
          value: challenge.title,
          detail: challenge.summary,
        },
        {
          label: 'Weekly scenario',
          value: featuredScenario.eyebrow,
          detail: featuredScenario.title,
        },
        {
          label: 'Streak',
          value: `${streak} day${streak === 1 ? '' : 's'}`,
          detail: completed ? 'Completed today' : 'Not marked complete',
        },
      ]}
      left={
        <section className="space-y-4 rounded-[2rem] border border-line/70 bg-surface px-5 py-5 shadow-panel">
          <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
            Challenge board
          </div>
          <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4">
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
              Prompt
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-text">
              {challenge.prompt}
            </div>
            <p className="mt-3 text-sm leading-7 text-muted">
              {challenge.summary}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {challenge.tags.map((tag) => (
                <div
                  key={tag}
                  className="rounded-full border border-line/70 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted"
                >
                  {tag}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link
                href={challenge.launch_url}
                className="inline-flex rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px]"
              >
                Open challenge workspace
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={markCompleted}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px]"
            >
              {completed ? 'Completed today' : 'Mark challenge complete'}
            </button>
            <button
              type="button"
              onClick={resetChallenge}
              className="rounded-2xl border border-line/70 bg-surface-strong px-4 py-3 text-sm font-semibold text-text transition hover:border-accent-cool/50"
            >
              Reset today
            </button>
          </div>

          <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4 text-sm leading-7 text-muted">
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
              Submit a response
            </div>
            {status === 'signed-in' ? (
              <div className="mt-3 space-y-4">
                <label className="block">
                  <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                    Saved scenario
                  </span>
                  <select
                    className="mt-2 w-full rounded-2xl border border-line/70 bg-surface px-4 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                    value={selectedScenarioId}
                    onChange={(event) => setSelectedScenarioId(event.target.value)}
                    disabled={savedScenarios.length === 0}
                  >
                    {savedScenarios.length === 0 ? (
                      <option value="">No saved scenarios yet</option>
                    ) : null}
                    {savedScenarios.map((scenario) => (
                      <option key={scenario.scenario_id} value={scenario.scenario_id}>
                        {scenario.title ?? scenario.scenario_id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                    Submission note
                  </span>
                  <textarea
                    className="mt-2 min-h-28 w-full rounded-2xl border border-line/70 bg-surface px-4 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                    value={submissionNote}
                    onChange={(event) => setSubmissionNote(event.target.value)}
                    placeholder="What logic makes this response worth sharing?"
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submissionStatus === 'loading' || savedScenarios.length === 0}
                    className="rounded-2xl border border-line/70 bg-surface-strong px-4 py-3 text-sm font-semibold text-text transition hover:border-accent-cool/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submissionStatus === 'loading'
                      ? 'Submitting...'
                      : 'Submit saved scenario'}
                  </button>
                  <Link
                    href="/saved"
                    className="rounded-2xl border border-line/70 px-4 py-3 text-sm font-semibold text-muted transition hover:border-accent-cool/50 hover:text-text"
                  >
                    Open saved library
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-3">
                <p>
                  Sign in and save a scenario first, then submit it to the
                  shared challenge board.
                </p>
                <Link
                  href="/saved"
                  className="inline-flex rounded-2xl border border-line/70 px-4 py-3 text-sm font-semibold text-text transition hover:border-accent-cool/50"
                >
                  Sign in from the saved workspace
                </Link>
              </div>
            )}
            {submissionMessage ? (
              <div className="mt-4 rounded-2xl border border-line/70 bg-surface px-4 py-3 text-sm text-muted">
                {submissionMessage}
              </div>
            ) : null}
          </div>
        </section>
      }
      right={
        <section className="space-y-4 rounded-[2rem] border border-line/70 bg-surface px-5 py-5 shadow-panel">
          <div>
            <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
              Scenario of the week
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
              {featuredScenario.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
              {featuredScenario.summary}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {featuredScenario.tags.map((tag) => (
                <div
                  key={tag}
                  className="rounded-full border border-line/70 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted"
                >
                  {tag}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link
                href={featuredScenario.launch_url}
                className="inline-flex rounded-2xl border border-line/70 bg-bg px-4 py-3 text-sm font-semibold text-text transition hover:border-accent-cool/50"
              >
                Open weekly scenario
              </Link>
            </div>
          </div>

          <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
            Community responses
          </div>
          <div className="grid gap-3">
            {submissions.length > 0 ? (
              submissions.map((submission) => (
                <article
                  key={submission.submission_id}
                  className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                        {submission.author_display_name ?? submission.author_user_id}
                      </div>
                      <div className="mt-2 text-lg font-semibold tracking-tight text-text">
                        {submission.title ?? submission.scenario_id}
                      </div>
                    </div>
                    <div className="rounded-full border border-line/70 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-muted">
                      {submission.upvotes} up / {submission.downvotes} down
                    </div>
                  </div>
                  {submission.note ? (
                    <p className="mt-3 text-sm leading-7 text-muted">
                      {submission.note}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
                    <span>{formatDateTime(submission.created_at)}</span>
                    <Link
                      href={`/compare?left=${encodeURIComponent(submission.scenario_id)}`}
                      className="font-semibold text-text transition hover:text-accent"
                    >
                      Compare path
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <article className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4 text-sm leading-7 text-muted">
                No submissions yet. Save a scenario, submit it here, and this
                board becomes the public reasoning surface for the challenge.
              </article>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4 text-sm leading-7 text-muted">
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
              Front-office read
            </div>
            <p className="mt-2">
              A daily surface works best when it can be completed in one glance
              but still point back to a real stored scenario and visible
              community response.
            </p>
          </div>
        </section>
      }
    />
  );
}
