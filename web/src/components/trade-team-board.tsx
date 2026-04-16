'use client';

import type {
  TeamCapResponse,
  TeamHealthSummary,
  TeamRosterPlayer,
  TeamRosterResponse,
  TradeValidationContractSummary,
} from '@/lib/api/types';
import { formatCurrencyShort, formatWinLoss } from '@/lib/formatters';

const PICK_TEMPLATES = [
  'Manual 1st-round pick',
  'Manual 2nd-round pick',
  'Swap rights',
] as const;

export type TradeDragPayload =
  | {
      kind: 'player';
      playerId: string;
      sourceTeamId: number;
    }
  | {
      kind: 'pick';
      label: string;
      sourceTeamId: number;
    };

interface TradeTeamBoardProps {
  slotLabel: string;
  summary: TeamHealthSummary;
  roster: TeamRosterResponse | null;
  cap: TeamCapResponse | null;
  loading: boolean;
  error: string | null;
  outgoingPlayerIds: readonly string[];
  outgoingPlayers: readonly TeamRosterPlayer[];
  incomingPlayers: readonly TradeValidationContractSummary[];
  outgoingPickNotes: readonly string[];
  incomingPickNotes: readonly string[];
  sendsCash: boolean;
  otherTeamName: string;
  disabledTeamIds: readonly number[];
  onTeamChange: (teamId: number) => void;
  onTogglePlayer: (playerId: string) => void;
  onToggleCash: () => void;
  onAddPick: (label: string) => void;
  onRemovePick: (label: string) => void;
  onDropPayload: (payload: TradeDragPayload) => void;
  teams: readonly TeamHealthSummary[];
}

function AssetChip({
  label,
  detail,
  removable,
  onRemove,
}: {
  label: string;
  detail: string;
  removable?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line/70 bg-bg px-3 py-2 text-sm text-text">
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{label}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">
          {detail}
        </div>
      </div>
      {removable ? (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full border border-line/70 px-2 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-muted transition hover:border-accent-cool/50 hover:text-text"
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}

export function TradeTeamBoard({
  slotLabel,
  summary,
  roster,
  cap,
  loading,
  error,
  outgoingPlayerIds,
  outgoingPlayers,
  incomingPlayers,
  outgoingPickNotes,
  incomingPickNotes,
  sendsCash,
  otherTeamName,
  disabledTeamIds,
  onTeamChange,
  onTogglePlayer,
  onToggleCash,
  onAddPick,
  onRemovePick,
  onDropPayload,
  teams,
}: TradeTeamBoardProps) {
  function handleDrop(rawPayload: string) {
    if (!rawPayload) {
      return;
    }

    const payload = JSON.parse(rawPayload) as TradeDragPayload;
    if (payload.sourceTeamId !== summary.team_id) {
      return;
    }
    onDropPayload(payload);
  }

  const currentCap = cap?.current;

  return (
    <section className="space-y-4 rounded-[2rem] border border-line/70 bg-surface px-5 py-5 shadow-panel">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[0.68rem] uppercase tracking-[0.32em] text-muted">
              {slotLabel}
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text">
              {summary.full_name}
            </h2>
            <div className="mt-2 text-sm text-muted">
              {formatWinLoss(summary.wins, summary.losses)} record
            </div>
          </div>
          <label className="block min-w-[180px]">
            <span className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
              Team
            </span>
            <select
              className="mt-2 w-full rounded-2xl border border-line/70 bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-accent-cool/50"
              value={summary.team_id}
              onChange={(event) => onTeamChange(Number(event.target.value))}
            >
              {teams.map((team) => (
                <option
                  key={team.team_id}
                  value={team.team_id}
                  disabled={disabledTeamIds.includes(team.team_id)}
                >
                  {team.full_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-line/70 bg-bg px-4 py-4">
            <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted">
              Team salary
            </div>
            <div className="mt-2 font-mono text-lg font-semibold text-text">
              {formatCurrencyShort(
                currentCap?.total_team_salary_cents ??
                  summary.committed_salary_cents,
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-line/70 bg-bg px-4 py-4">
            <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted">
              Cap room
            </div>
            <div className="mt-2 font-mono text-lg font-semibold text-text">
              {formatCurrencyShort(
                currentCap?.cap_room_cents ?? summary.cap_room_cents,
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-line/70 bg-bg px-4 py-4">
            <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted">
              1st apron room
            </div>
            <div className="mt-2 font-mono text-lg font-semibold text-text">
              {formatCurrencyShort(
                currentCap?.first_apron_room_cents ??
                  summary.first_apron_room_cents,
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div
            className="rounded-[1.75rem] border border-dashed border-line/80 bg-bg px-4 py-4"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(event.dataTransfer.getData('text/plain'));
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
                  Outgoing package
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Drag players or manual pick notes here to define what{' '}
                  {summary.abbreviation} sends out.
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleCash}
                className={`rounded-2xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition ${
                  sendsCash
                    ? 'border-accent bg-accent text-bg'
                    : 'border-line/70 bg-surface text-muted hover:border-accent-cool/50 hover:text-text'
                }`}
              >
                {sendsCash ? 'Cash included' : 'Add cash'}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {outgoingPlayers.length === 0 &&
              outgoingPickNotes.length === 0 ? (
                <div className="rounded-2xl border border-line/60 bg-surface px-4 py-4 text-sm text-muted">
                  No outgoing assets selected yet.
                </div>
              ) : null}
              {outgoingPlayers.map((player) => (
                <AssetChip
                  key={player.player_id}
                  label={player.display_name}
                  detail={formatCurrencyShort(
                    player.contract?.current_salary_cents ?? null,
                  )}
                  removable
                  onRemove={() => onTogglePlayer(player.player_id)}
                />
              ))}
              {outgoingPickNotes.map((pickNote) => (
                <AssetChip
                  key={pickNote}
                  label={pickNote}
                  detail="Manual pick note"
                  removable
                  onRemove={() => onRemovePick(pickNote)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4">
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
              Incoming preview
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              What {summary.abbreviation} would receive from {otherTeamName}.
            </p>
            <div className="mt-4 space-y-3">
              {incomingPlayers.length === 0 &&
              incomingPickNotes.length === 0 ? (
                <div className="rounded-2xl border border-line/60 bg-surface px-4 py-4 text-sm text-muted">
                  Nothing incoming yet.
                </div>
              ) : null}
              {incomingPlayers.map((player) => (
                <AssetChip
                  key={player.player_id}
                  label={player.player_name}
                  detail={formatCurrencyShort(player.salary_cents)}
                />
              ))}
              {incomingPickNotes.map((pickNote) => (
                <AssetChip
                  key={pickNote}
                  label={pickNote}
                  detail="Manual pick note"
                />
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4">
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
              Pick shelf
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              These notes are manual placeholders until pick ownership data
              ships.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PICK_TEMPLATES.map((label) => (
                <button
                  key={label}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData(
                      'text/plain',
                      JSON.stringify({
                        kind: 'pick',
                        label,
                        sourceTeamId: summary.team_id,
                      } satisfies TradeDragPayload),
                    );
                  }}
                  onClick={() => onAddPick(label)}
                  className="rounded-full border border-line/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted transition hover:border-accent-cool/50 hover:text-text"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-line/70 bg-bg px-4 py-4">
          <div className="text-[0.68rem] uppercase tracking-[0.28em] text-muted">
            Tradeable roster
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            Click or drag a player into the outgoing package. Players without a
            current salary snapshot stay read-only.
          </p>

          {loading ? (
            <div className="mt-4 rounded-2xl border border-line/60 bg-surface px-4 py-5 text-sm text-muted">
              Loading live roster and cap context...
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-5 text-sm text-danger">
              {error}
            </div>
          ) : null}

          {!loading && !error && roster ? (
            <div className="mt-4 space-y-3">
              {roster.players.map((player) => {
                const selected = outgoingPlayerIds.includes(player.player_id);
                const tradeable = player.contract?.current_salary_cents != null;

                return (
                  <div
                    key={player.player_id}
                    draggable={tradeable}
                    onDragStart={(event) => {
                      if (!tradeable) {
                        return;
                      }
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData(
                        'text/plain',
                        JSON.stringify({
                          kind: 'player',
                          playerId: player.player_id,
                          sourceTeamId: summary.team_id,
                        } satisfies TradeDragPayload),
                      );
                    }}
                    className={`rounded-2xl border px-4 py-4 transition ${
                      selected
                        ? 'border-accent-cool/60 bg-surface-strong'
                        : 'border-line/70 bg-surface'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-text">
                          {player.display_name}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.22em] text-muted">
                          {player.position ?? 'Position unavailable'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-semibold text-text">
                          {formatCurrencyShort(
                            player.contract?.current_salary_cents ?? null,
                          )}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.22em] text-muted">
                          {player.contract?.contract_type ?? 'No contract data'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-muted">
                        {player.minutes_per_game
                          ? `${player.minutes_per_game.toFixed(1)} mpg`
                          : 'No rotation data'}
                      </div>
                      <button
                        type="button"
                        disabled={!tradeable}
                        aria-pressed={selected}
                        onClick={() => onTogglePlayer(player.player_id)}
                        className={`rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                          !tradeable
                            ? 'cursor-not-allowed border border-line/50 bg-bg text-muted'
                            : selected
                              ? 'bg-accent text-bg'
                              : 'border border-line/70 bg-bg text-text hover:border-accent-cool/50'
                        }`}
                      >
                        {selected
                          ? `Remove ${player.display_name}`
                          : `Send ${player.display_name}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
