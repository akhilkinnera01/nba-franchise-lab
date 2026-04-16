'use client';

import Image from 'next/image';
import Link from 'next/link';
import { startTransition, useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { ScenarioEnvelopeCard } from '@/components/scenario-envelope-card';
import { ScenarioRouteFrame } from '@/components/scenario-route-frame';
import {
  addScenarioComment,
  getMe,
  getScenario,
  getScenarioFeedback,
  listSavedScenarios,
  saveScenario,
  setScenarioReaction,
  unsaveScenario,
  updateMe,
} from '@/lib/api/client';
import type {
  ProfileResponse,
  SavedScenarioSummary,
  ScenarioEnvelope,
  ScenarioFeedbackResponse,
} from '@/lib/api/types';
import { formatDateTime } from '@/lib/formatters';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load workspace.';
}

function buildCompareUrl(scenarioId: string): string {
  return `/compare?left=${encodeURIComponent(scenarioId)}`;
}

export function SavedScenariosWorkspace() {
  const { accessToken, displayName, avatarUrl, session, signInWithOtp, signOut } =
    useAuth();
  const [email, setEmail] = useState(session?.user.email ?? '');
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenarioSummary[]>(
    [],
  );
  const [accountStatus, setAccountStatus] = useState<LoadStatus>('idle');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    displayName: '',
    avatarUrl: '',
  });
  const [profileSaveStatus, setProfileSaveStatus] = useState<LoadStatus>(
    'idle',
  );
  const [saveById, setSaveById] = useState('');
  const [saveByIdStatus, setSaveByIdStatus] = useState<LoadStatus>('idle');
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [scenarioStatus, setScenarioStatus] = useState<LoadStatus>('idle');
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioEnvelope | null>(
    null,
  );
  const [scenarioFeedback, setScenarioFeedback] =
    useState<ScenarioFeedbackResponse | null>(null);
  const [reactionStatus, setReactionStatus] = useState<LoadStatus>('idle');
  const [commentBody, setCommentBody] = useState('');
  const [commentStatus, setCommentStatus] = useState<LoadStatus>('idle');
  const [signinStatus, setSigninStatus] = useState<LoadStatus>('idle');
  const [signinMessage, setSigninMessage] = useState<string | null>(null);

  useEffect(() => {
    setEmail(session?.user.email ?? '');
  }, [session?.user.email]);

  useEffect(() => {
    const authToken = accessToken ?? '';
    if (!authToken) {
      setProfile(null);
      setSavedScenarios([]);
      setSelectionId(null);
      setSelectedScenario(null);
      setScenarioFeedback(null);
      setAccountStatus('idle');
      setAccountError(null);
      setProfileDraft({ displayName: '', avatarUrl: '' });
      return;
    }

    let cancelled = false;

    async function loadAccountData() {
      setAccountStatus('loading');
      setAccountError(null);

      const [profileResult, savedResult] = await Promise.allSettled([
        getMe(authToken),
        listSavedScenarios(authToken),
      ]);

      if (cancelled) {
        return;
      }

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
        setProfileDraft({
          displayName: profileResult.value.display_name ?? '',
          avatarUrl: profileResult.value.avatar_url ?? '',
        });
      } else {
        setProfile(null);
      }

      if (savedResult.status === 'fulfilled') {
        setSavedScenarios(savedResult.value.items);
        setSelectionId((current) => {
          if (current && savedResult.value.items.some((item) => item.scenario_id === current)) {
            return current;
          }
          return savedResult.value.items[0]?.scenario_id ?? null;
        });
      } else {
        setSavedScenarios([]);
      }

      if (
        profileResult.status === 'rejected' ||
        savedResult.status === 'rejected'
      ) {
        const rejectedError =
          profileResult.status === 'rejected'
            ? profileResult.reason
            : savedResult.status === 'rejected'
              ? savedResult.reason
              : null;
        setAccountStatus('error');
        setAccountError(formatError(rejectedError));
      } else {
        setAccountStatus('ready');
      }
    }

    void loadAccountData();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    const authToken = accessToken ?? '';
    if (!selectionId || !authToken) {
      setSelectedScenario(null);
      setScenarioFeedback(null);
      setScenarioStatus('idle');
      setScenarioError(null);
      return;
    }

    let cancelled = false;
    const currentSelectionId = selectionId as string;

    async function loadScenarioDetail() {
      setScenarioStatus('loading');
      setScenarioError(null);

      const [scenarioResult, feedbackResult] = await Promise.allSettled([
        getScenario(currentSelectionId),
        getScenarioFeedback(currentSelectionId, authToken),
      ]);

      if (cancelled) {
        return;
      }

      if (scenarioResult.status === 'fulfilled') {
        setSelectedScenario(scenarioResult.value);
      } else {
        setSelectedScenario(null);
      }

      if (feedbackResult.status === 'fulfilled') {
        setScenarioFeedback(feedbackResult.value);
      } else {
        setScenarioFeedback(null);
      }

      if (
        scenarioResult.status === 'rejected' ||
        feedbackResult.status === 'rejected'
      ) {
        const rejectedError =
          scenarioResult.status === 'rejected'
            ? scenarioResult.reason
            : feedbackResult.status === 'rejected'
              ? feedbackResult.reason
              : null;
        setScenarioStatus('error');
        setScenarioError(formatError(rejectedError));
      } else {
        setScenarioStatus('ready');
      }
    }

    void loadScenarioDetail();

    return () => {
      cancelled = true;
    };
  }, [accessToken, selectionId]);

  async function handleSignIn() {
    setSigninStatus('loading');
    setSigninMessage(null);

    try {
      const trimmed = email.trim();
      if (!trimmed) {
        throw new Error('Enter an email address to receive a sign-in link.');
      }

      await signInWithOtp(trimmed);
      setSigninStatus('ready');
      setSigninMessage('Magic link sent. Check your inbox.');
    } catch (error) {
      setSigninStatus('error');
      setSigninMessage(formatError(error));
    }
  }

  async function handleProfileSave() {
    if (!accessToken) {
      return;
    }

    setProfileSaveStatus('loading');

    try {
      const nextProfile = await updateMe(accessToken, {
        display_name: profileDraft.displayName.trim() || null,
        avatar_url: profileDraft.avatarUrl.trim() || null,
      });
      setProfile(nextProfile);
      setProfileSaveStatus('ready');
    } catch (error) {
      setProfileSaveStatus('error');
      setAccountError(formatError(error));
    }
  }

  async function handleSaveScenarioById() {
    if (!accessToken) {
      setSaveByIdStatus('error');
      return;
    }

    if (!saveById.trim()) {
      setSaveByIdStatus('error');
      return;
    }

    setSaveByIdStatus('loading');

    try {
      await saveScenario(accessToken, saveById.trim());
      setSaveByIdStatus('ready');
      setSaveById('');

      const refreshed = await listSavedScenarios(accessToken);
      setSavedScenarios(refreshed.items);
    } catch (error) {
      setSaveByIdStatus('error');
      setAccountError(formatError(error));
    }
  }

  async function handleRemoveSavedScenario(scenarioId: string) {
    if (!accessToken) {
      return;
    }

    setSaveByIdStatus('loading');

    try {
      await unsaveScenario(accessToken, scenarioId);
      const refreshed = await listSavedScenarios(accessToken);
      setSavedScenarios(refreshed.items);
      if (selectionId === scenarioId) {
        setSelectionId(refreshed.items[0]?.scenario_id ?? null);
      }
      setSaveByIdStatus('ready');
    } catch (error) {
      setSaveByIdStatus('error');
      setAccountError(formatError(error));
    }
  }

  async function handleReaction(value: -1 | 1) {
    if (!accessToken || !selectionId) {
      return;
    }

    setReactionStatus('loading');

    try {
      const nextFeedback = await setScenarioReaction(accessToken, selectionId, {
        value,
      });
      setScenarioFeedback((current) =>
        current
          ? {
              ...current,
              viewer_reaction: nextFeedback.value,
            }
          : current,
      );
      setReactionStatus('ready');
    } catch (error) {
      setReactionStatus('error');
      setAccountError(formatError(error));
    }
  }

  async function handleCommentSubmit() {
    if (!accessToken || !selectionId || !commentBody.trim()) {
      return;
    }

    setCommentStatus('loading');

    try {
      const response = await addScenarioComment(accessToken, selectionId, {
        body: commentBody.trim(),
      });
      setCommentBody('');
      setCommentStatus('ready');
      setScenarioFeedback((current) =>
        current
          ? {
              ...current,
              comments: [...current.comments, response],
            }
          : current,
      );
    } catch (error) {
      setCommentStatus('error');
      setAccountError(formatError(error));
    }
  }

  function selectScenario(scenarioId: string) {
    startTransition(() => {
      setSelectionId(scenarioId);
    });
  }

  return (
    <ScenarioRouteFrame
      eyebrow="Saved workspace"
      title="A scenario library with profile controls, reactions, and reopen paths."
      description="Sign in with Supabase, manage your profile, keep scenario snapshots in one library, and inspect the stored scenario envelope without leaving the premium shell."
      introSlot={
        !accessToken ? (
          <div className="grid gap-4 rounded-[1.8rem] border border-line/70 bg-bg px-5 py-5 md:grid-cols-[1fr_auto] md:items-end">
            <label className="block">
              <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                Email for magic link
              </span>
              <input
                className="mt-2 w-full rounded-2xl border border-line/70 bg-surface px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="akhil@example.com"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                void handleSignIn();
              }}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px]"
            >
              {signinStatus === 'loading' ? 'Sending link...' : 'Send sign-in link'}
            </button>
            {signinMessage ? (
              <div className="md:col-span-2 text-sm text-muted">{signinMessage}</div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 rounded-[1.8rem] border border-line/70 bg-bg px-5 py-5 md:grid-cols-[auto_1fr]">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-line/70 bg-surface text-lg font-semibold text-text">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName ?? 'Profile avatar'}
                  width={64}
                  height={64}
                  unoptimized
                  className="h-full w-full rounded-[1.5rem] object-cover"
                />
              ) : (
                (displayName ?? profile?.email ?? 'U').slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                  Authenticated as
                </div>
                <div className="mt-2 text-xl font-semibold tracking-tight text-text">
                  {displayName ?? profile?.email ?? 'Account ready'}
                </div>
                <div className="mt-1 text-sm text-muted">
                  {profile?.email ?? session?.user.email ?? 'Signed in'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  void signOut();
                }}
                className="rounded-2xl border border-line/70 px-4 py-3 text-sm font-semibold text-text transition hover:border-accent-cool/50"
              >
                Sign out
              </button>
            </div>
          </div>
        )
      }
      rail={
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="surface-eyebrow">Library status</div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-text">
                {profile?.saved_scenario_count ?? savedScenarios.length} saved scenarios
              </div>
            </div>
            <div className="rounded-full border border-line/70 px-3 py-1 font-mono text-[0.72rem] text-muted">
              {accountStatus === 'loading' ? 'Syncing' : accountStatus}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                Display name
              </span>
              <input
                className="mt-2 w-full rounded-2xl border border-line/70 bg-surface px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                value={profileDraft.displayName}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                placeholder="Akhil"
              />
            </label>
            <label className="block">
              <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                Avatar URL
              </span>
              <input
                className="mt-2 w-full rounded-2xl border border-line/70 bg-surface px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                value={profileDraft.avatarUrl}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    avatarUrl: event.target.value,
                  }))
                }
                placeholder="https://..."
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              void handleProfileSave();
            }}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px]"
          >
            {profileSaveStatus === 'loading' ? 'Saving profile...' : 'Save profile'}
          </button>
          {accountError ? (
            <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
              {accountError}
            </div>
          ) : null}
        </div>
      }
    >

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-line/70 bg-surface px-6 py-6 shadow-panel">
            <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
              Save by ID
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
              Add an existing scenario to your account
            </h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                className="min-w-0 flex-1 rounded-2xl border border-line/70 bg-bg px-4 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                value={saveById}
                onChange={(event) => setSaveById(event.target.value)}
                placeholder="scn_123..."
              />
              <button
                type="button"
                onClick={() => {
                  void handleSaveScenarioById();
                }}
                className="rounded-2xl border border-line/70 bg-bg px-4 py-3 text-sm font-semibold text-text transition hover:border-accent-cool/50"
              >
                {saveByIdStatus === 'loading' ? 'Saving...' : 'Save scenario'}
              </button>
            </div>
            <p className="mt-3 text-sm leading-7 text-muted">
              This uses the authenticated save endpoint against a stored scenario
              ID, so the same scenario can move from browser preview to your
              library without duplicating payloads.
            </p>
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-line/70 bg-surface shadow-panel">
            <div className="border-b border-line/70 px-6 py-5">
              <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
                Saved scenarios
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
                Library entries and quick compare entry points
              </h2>
            </div>
            <div className="space-y-3 p-4">
              {savedScenarios.length > 0 ? (
                savedScenarios.map((item) => (
                  <article
                    key={item.scenario_id}
                    className={`rounded-[1.5rem] border px-4 py-4 transition ${
                      item.scenario_id === selectionId
                        ? 'border-accent-cool/50 bg-bg'
                        : 'border-line/70 bg-bg/70 hover:border-accent-cool/35'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => selectScenario(item.scenario_id)}
                      >
                        <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                          {item.scenario_type}
                        </div>
                        <div className="mt-2 text-lg font-semibold tracking-tight text-text">
                          {item.title ?? 'Untitled scenario'}
                        </div>
                        <div className="mt-1 text-sm text-muted">
                          Saved {formatDateTime(item.saved_at)}
                        </div>
                      </button>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={buildCompareUrl(item.scenario_id)}
                          className="rounded-xl border border-line/70 px-3 py-2 text-xs font-semibold text-text transition hover:border-accent-cool/50"
                        >
                          Compare
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            void handleRemoveSavedScenario(item.scenario_id);
                          }}
                          className="rounded-xl border border-line/70 px-3 py-2 text-xs font-semibold text-text transition hover:border-accent-cool/50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-line/70 px-3 py-1 font-mono text-[0.68rem] text-muted">
                        {item.scenario_id}
                      </span>
                      <a
                        href={item.share_url}
                        className="rounded-full border border-line/70 px-3 py-1 font-mono text-[0.68rem] text-muted transition hover:border-accent-cool/50"
                      >
                        Share link
                      </a>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-line/70 bg-bg px-4 py-6 text-sm leading-7 text-muted">
                  No saved scenarios yet. Store one from the scenario workspace or
                  paste an existing scenario ID above.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {scenarioStatus === 'ready' && selectedScenario ? (
            <ScenarioEnvelopeCard
              scenario={selectedScenario}
              title="Selected scenario"
              footer={
                <div className="grid gap-4 border-t border-line/70 pt-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-line/70 bg-bg px-4 py-4">
                      <div className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                        Upvotes
                      </div>
                      <div className="mt-2 font-mono text-2xl font-semibold text-text">
                        {scenarioFeedback?.upvotes ?? 0}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-line/70 bg-bg px-4 py-4">
                      <div className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                        Downvotes
                      </div>
                      <div className="mt-2 font-mono text-2xl font-semibold text-text">
                        {scenarioFeedback?.downvotes ?? 0}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-line/70 bg-bg px-4 py-4">
                      <div className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                        Viewer reaction
                      </div>
                      <div className="mt-2 font-mono text-2xl font-semibold text-text">
                        {scenarioFeedback?.viewer_reaction ?? 0}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        void handleReaction(1);
                      }}
                      disabled={reactionStatus === 'loading'}
                      className="rounded-2xl border border-line/70 px-4 py-3 text-sm font-semibold text-text transition hover:border-accent-cool/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {reactionStatus === 'loading' ? 'Saving...' : 'Upvote'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleReaction(-1);
                      }}
                      disabled={reactionStatus === 'loading'}
                      className="rounded-2xl border border-line/70 px-4 py-3 text-sm font-semibold text-text transition hover:border-accent-cool/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {reactionStatus === 'loading' ? 'Saving...' : 'Downvote'}
                    </button>
                    <Link
                      href={buildCompareUrl(selectedScenario.scenario_id)}
                      className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px]"
                    >
                      Compare this scenario
                    </Link>
                  </div>

                  <div className="space-y-3">
                    <div className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                      Comments
                    </div>
                    <textarea
                      className="min-h-28 w-full rounded-2xl border border-line/70 bg-surface px-4 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
                      value={commentBody}
                      onChange={(event) => setCommentBody(event.target.value)}
                      placeholder="Leave a note for future you..."
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          void handleCommentSubmit();
                        }}
                        className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:translate-y-[-1px]"
                      >
                        {commentStatus === 'loading'
                          ? 'Saving comment...'
                          : 'Add comment'}
                      </button>
                      <div className="text-sm text-muted">
                        {scenarioFeedback?.comments.length ?? 0} comments on this
                        scenario
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {scenarioFeedback?.comments.length ? (
                      scenarioFeedback.comments.map((comment) => (
                        <article
                          key={comment.comment_id}
                          className="rounded-2xl border border-line/70 bg-bg px-4 py-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold text-text">
                                {comment.author_display_name ?? comment.author_user_id}
                              </div>
                              <div className="mt-1 text-xs uppercase tracking-[0.24em] text-muted">
                                {formatDateTime(comment.created_at)}
                              </div>
                            </div>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-muted">
                            {comment.body}
                          </p>
                        </article>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-line/70 bg-bg px-4 py-4 text-sm leading-7 text-muted">
                        No comments yet.
                      </div>
                    )}
                  </div>
                </div>
              }
            />
          ) : (
            <section className="rounded-[2rem] border border-line/70 bg-surface px-6 py-8 shadow-panel">
              <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
                Scenario inspector
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
                Select a saved scenario to inspect its envelope and feedback
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
                The detail pane will show the stored request/result payloads, the
                public feedback summary, and comparison entry points once a
                scenario is selected.
              </p>
              {scenarioError ? (
                <div className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">
                  {scenarioError}
                </div>
              ) : null}
              {scenarioStatus === 'loading' ? (
                <div className="mt-4 rounded-2xl border border-line/70 bg-bg px-4 py-4 text-sm text-muted">
                  Loading scenario details...
                </div>
              ) : null}
            </section>
          )}
        </div>
      </section>
    </ScenarioRouteFrame>
  );
}
