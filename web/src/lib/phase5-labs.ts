import type { TeamHealthSummary } from '@/lib/api/types';
import { formatSignedNumber, formatWinLoss } from '@/lib/formatters';

export interface Phase5LabCard {
  href: string;
  label: string;
  summary: string;
  signal: string;
  metric: string;
}

export interface LeagueSnapshot {
  totalTeams: number;
  averageNetRating: number | null;
  strongestTeam: TeamHealthSummary | null;
  mostCapFlexibleTeam: TeamHealthSummary | null;
  mostPressuredTeam: TeamHealthSummary | null;
}

export interface DraftProspectCard {
  label: string;
  archetype: string;
  fitScore: number;
  ceiling: string;
  floor: string;
  risk: string;
  rationale: string;
  timeline: string;
}

export interface DraftProspectLab {
  teamName: string;
  focusLabel: string;
  thesis: string;
  prospects: DraftProspectCard[];
  note: string;
}

export interface AlternateUniverseStep {
  title: string;
  subtitle: string;
  detail: string;
}

export interface AlternateUniverseLab {
  teamName: string;
  eraLabel: string;
  branchLabel: string;
  thesis: string;
  steps: AlternateUniverseStep[];
  note: string;
}

export interface StrategyPathStep {
  title: string;
  move: string;
  risk: string;
  payoff: string;
}

export interface StrategyPathLab {
  teamName: string;
  objectiveLabel: string;
  horizonLabel: string;
  thesis: string;
  steps: StrategyPathStep[];
  note: string;
}

export interface ShockEventStep {
  window: string;
  response: string;
  priority: string;
}

export interface ShockEventLab {
  teamName: string;
  eventLabel: string;
  severityLabel: string;
  thesis: string;
  steps: ShockEventStep[];
  note: string;
}

export interface RebuildPhase {
  title: string;
  move: string;
  guardrail: string;
}

export interface RebuildPlanLab {
  teamName: string;
  resetLabel: string;
  horizonLabel: string;
  thesis: string;
  phases: RebuildPhase[];
  note: string;
}

export interface DailyChallengeLab {
  challengeId: string;
  teamName: string;
  prompt: string;
  scenarioOfTheWeek: string;
  objective: string;
  quickFacts: string[];
}

const DRAFT_FOCUSES = [
  {
    label: 'Win-now',
    bias: 8,
    thesis:
      'Prioritize immediate playoff utility, defensive spacing, and usable minutes in year one.',
  },
  {
    label: 'Balanced',
    bias: 5,
    thesis:
      'Keep one eye on top-four upside and one eye on role certainty for the current roster.',
  },
  {
    label: 'Upside',
    bias: 2,
    thesis:
      'Take the prospect whose ceiling changes the franchise even if the floor is noisier.',
  },
] as const;

const PROSPECT_ARCHETYPES = [
  {
    label: 'Two-way wing',
    archetype: 'Defensive connector',
    ceiling: 'Top-20 starter',
    floor: '8th-man rotation wing',
    risk: 'Shot volume can lag if the handle stays secondary.',
    rationale: 'Fits almost every playoff build because the role is simple and the floor is stable.',
    timeline: 'Immediate contribution',
  },
  {
    label: 'Shot-making guard',
    archetype: 'Spacing initiator',
    ceiling: 'Lead guard with scoring gravity',
    floor: 'Bench shot creator',
    risk: 'Decision-making spikes and valleys show up early.',
    rationale: 'Useful when the current offense needs more on-ball juice and late-clock creation.',
    timeline: 'Fast development',
  },
  {
    label: 'Rim-running big',
    archetype: 'Paint pressure',
    ceiling: 'High-end starter',
    floor: 'Vertical spacer',
    risk: 'Offensive value can stay narrow unless touch work arrives.',
    rationale: 'Raises the ceiling of lineups that already create advantage off the dribble.',
    timeline: 'Rotation ready',
  },
  {
    label: 'Combo forward',
    archetype: 'Scheme glue',
    ceiling: 'Third-star support piece',
    floor: 'Upside role player',
    risk: 'Skill blend can be broad without one elite calling card.',
    rationale: 'A good fit when the roster needs one player who can bend multiple lineups.',
    timeline: 'Two-year arc',
  },
  {
    label: 'High-floor spacer',
    archetype: 'Plug-and-play floor raiser',
    ceiling: 'Trusted starter',
    floor: 'Reliable role player',
    risk: 'The upside case may be capped unless a secondary skill arrives.',
    rationale: 'The safest route when the roster already has stars and only needs coherence.',
    timeline: 'Day one usable',
  },
  {
    label: 'Upside bet',
    archetype: 'Projection swing',
    ceiling: 'Franchise-altering outcome',
    floor: 'Long-arc developmental piece',
    risk: 'The median outcome may look ordinary for a while.',
    rationale: 'Best used when the front office can afford volatility and wants a ceiling swing.',
    timeline: 'Long runway',
  },
] as const;

const ALTERNATE_ERA_OPTIONS = [
  '2011-12',
  '2015-16',
  '2019-20',
  '2023-24',
] as const;

const ALTERNATE_BRANCHES = [
  'Keep the pick',
  'Trade the veteran',
  'Double down on continuity',
  'Reset the timeline',
] as const;

const STRATEGY_OBJECTIVES = [
  'Maximize wins',
  'Protect flexibility',
  'Collect picks',
  'Create a second timeline',
] as const;

const SHOCK_EVENTS = [
  'Star injury',
  'Cap spike',
  'Rotation collapse',
  'Unexpected breakout',
] as const;

const RESET_STYLES = [
  'Soft reset',
  'Targeted reset',
  'Full teardown',
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function hashText(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickBySeed<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length];
}

function getIsoWeekNumber(isoDate: string): number {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const dayOfWeek = (date.getUTCDay() + 6) % 7;

  date.setUTCDate(date.getUTCDate() + 3 - dayOfWeek);

  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - firstThursdayDay);

  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / 604800000);
}

function getPrimaryTeam(teams: readonly TeamHealthSummary[]): TeamHealthSummary | null {
  return teams[0] ?? null;
}

function getMostCapFlexibleTeam(
  teams: readonly TeamHealthSummary[],
): TeamHealthSummary | null {
  return teams.reduce<TeamHealthSummary | null>((best, team) => {
    if (!best) {
      return team;
    }

    const bestRoom = best.second_apron_room_cents ?? -1;
    const nextRoom = team.second_apron_room_cents ?? -1;
    return nextRoom > bestRoom ? team : best;
  }, null);
}

function getMostPressuredTeam(
  teams: readonly TeamHealthSummary[],
): TeamHealthSummary | null {
  return teams.reduce<TeamHealthSummary | null>((worst, team) => {
    if (!worst) {
      return team;
    }

    const worstRoom = worst.first_apron_room_cents ?? Number.MAX_SAFE_INTEGER;
    const nextRoom = team.first_apron_room_cents ?? Number.MAX_SAFE_INTEGER;
    return nextRoom < worstRoom ? team : worst;
  }, null);
}

function getStrongestTeam(
  teams: readonly TeamHealthSummary[],
): TeamHealthSummary | null {
  return teams.reduce<TeamHealthSummary | null>((best, team) => {
    if (!best) {
      return team;
    }

    const bestNet = best.net_rating ?? Number.NEGATIVE_INFINITY;
    const nextNet = team.net_rating ?? Number.NEGATIVE_INFINITY;
    return nextNet > bestNet ? team : best;
  }, null);
}

export function buildLeagueSnapshot(
  teams: readonly TeamHealthSummary[],
): LeagueSnapshot {
  const totalNetRating = teams.reduce((sum, team) => sum + (team.net_rating ?? 0), 0);
  const countedTeams = teams.filter((team) => team.net_rating !== null).length;

  return {
    totalTeams: teams.length,
    averageNetRating: countedTeams > 0 ? totalNetRating / countedTeams : null,
    strongestTeam: getStrongestTeam(teams),
    mostCapFlexibleTeam: getMostCapFlexibleTeam(teams),
    mostPressuredTeam: getMostPressuredTeam(teams),
  };
}

export function buildPhase5LabCards(
  teams: readonly TeamHealthSummary[],
): Phase5LabCard[] {
  const snapshot = buildLeagueSnapshot(teams);
  const strongestTeam = snapshot.strongestTeam?.full_name ?? 'The top live roster';
  const mostCapFlexibleTeam =
    snapshot.mostCapFlexibleTeam?.full_name ?? 'The cleanest cap sheet';
  const mostPressuredTeam =
    snapshot.mostPressuredTeam?.full_name ?? 'The tightest cap sheet';

  return [
    {
      href: '/labs/draft-prospect',
      label: 'Draft Prospect Lab',
      summary: 'Rank archetypes against a live franchise before you turn the pick clock on.',
      signal: `Best for ${mostPressuredTeam} if the board needs a new ceiling path.`,
      metric: `Live teams: ${snapshot.totalTeams}`,
    },
    {
      href: '/labs/alternate-universe',
      label: 'Historical Alternate Universe',
      summary: 'Fork a season, preserve the logic, and inspect what the other branch would cost.',
      signal: `Use the strongest live team, currently ${strongestTeam}, as the counterfactual anchor.`,
      metric:
        snapshot.averageNetRating === null
          ? 'Average net rating: unavailable'
          : `Average net rating: ${formatSignedNumber(snapshot.averageNetRating, 1)}`,
    },
    {
      href: '/labs/strategy-path',
      label: 'Strategy Path Simulator',
      summary: 'Compose a multi-step route that respects cap pressure, picks, and the timeline.',
      signal: `Most flexible path belongs to ${mostCapFlexibleTeam}.`,
      metric: `${snapshot.totalTeams} franchise cases ready`,
    },
    {
      href: '/labs/shock-event',
      label: 'Shock Event Simulator',
      summary: 'See how injuries, cap shocks, or rotation breaks change the next 30 days.',
      signal: `Stress-test the roster that looks most fragile: ${mostPressuredTeam}.`,
      metric: 'Response windows: 72 hours / 30 days / season',
    },
    {
      href: '/labs/rebuild-planner',
      label: 'Rebuild Planner',
      summary: 'Set the reset pace, pick appetite, and runway length before you blow up a timeline.',
      signal: `Best paired with ${mostPressuredTeam} or any team stuck near the apron.`,
      metric: 'Three-phase plan ready',
    },
    {
      href: '/labs/daily-challenge',
      label: 'Daily Challenge',
      summary: 'Take the league prompt of the day and compare your answer with the scenario of the week.',
      signal: `A fresh prompt is generated from the current week and live league context.`,
      metric: 'Front-end only streak tracker',
    },
  ];
}

export function buildDraftProspectLab(
  team: TeamHealthSummary,
  focus: (typeof DRAFT_FOCUSES)[number]['label'],
  query: string,
): DraftProspectLab {
  const focusProfile =
    DRAFT_FOCUSES.find((item) => item.label === focus) ?? DRAFT_FOCUSES[1];
  const capRoom = team.cap_room_cents ?? 0;
  const pressure = team.first_apron_room_cents ?? 0;
  const teamBias =
    (team.net_rating ?? 0) * 1.8 +
    (capRoom / 100_000_000) * 0.8 -
    (pressure > 0 ? 0.4 : 0);
  const search = query.trim().toLowerCase();

  const prospects = PROSPECT_ARCHETYPES.map((archetype, index) => {
    const fitScore = clamp(
      Math.round(76 + teamBias + focusProfile.bias - index * 4),
      48,
      97,
    );

    return {
      label: archetype.label,
      archetype: archetype.archetype,
      fitScore,
      ceiling: archetype.ceiling,
      floor: archetype.floor,
      risk: archetype.risk,
      rationale: archetype.rationale,
      timeline: archetype.timeline,
    };
  })
    .filter((prospect) => {
      if (!search) {
        return true;
      }

      return [
        prospect.label,
        prospect.archetype,
        prospect.risk,
        prospect.rationale,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);
    })
    .sort((left, right) => right.fitScore - left.fitScore);

  return {
    teamName: team.full_name,
    focusLabel: focusProfile.label,
    thesis: focusProfile.thesis,
    prospects,
    note:
      'The board is intentionally archetype-driven. Use it to frame the conversation before you worry about a prospect name.',
  };
}

export function buildAlternateUniverseLab(
  team: TeamHealthSummary,
  eraLabel: string,
  branchLabel: string,
): AlternateUniverseLab {
  const era = ALTERNATE_ERA_OPTIONS.includes(eraLabel as (typeof ALTERNATE_ERA_OPTIONS)[number])
    ? eraLabel
    : ALTERNATE_ERA_OPTIONS[0];
  const branch = ALTERNATE_BRANCHES.includes(branchLabel as (typeof ALTERNATE_BRANCHES)[number])
    ? branchLabel
    : ALTERNATE_BRANCHES[0];

  const seed = hashText(`${team.team_id}-${era}-${branch}`);
  const steps: AlternateUniverseStep[] = [
    {
      title: 'Fork point',
      subtitle: era,
      detail: `The branch begins when ${team.full_name} chooses ${branch.toLowerCase()}.`,
    },
    {
      title: 'Front office reaction',
      subtitle: pickBySeed(['Cap relief', 'Pick leverage', 'Rotation clarity', 'Star alignment'] as const, seed),
      detail:
        'The alternate branch changes how quickly the roster can absorb a second move or protect flexibility.',
    },
    {
      title: 'Downstream effect',
      subtitle: pickBySeed(['Playoff odds', 'Asset quality', 'Cap pressure', 'Timeline clarity'] as const, seed + 1),
      detail:
        'The first-order result usually matters less than the second move the new path makes possible.',
    },
  ];

  return {
    teamName: team.full_name,
    eraLabel: era,
    branchLabel: branch,
    thesis:
      'Historical alternate universes are most useful when the branch point and the cap logic are explicit.',
    steps,
    note:
      'This lab is conceptual by design. It is meant to sharpen decision thinking, not overwrite actual franchise history.',
  };
}

export function buildStrategyPathLab(
  team: TeamHealthSummary,
  objectiveLabel: string,
  horizonLabel: string,
): StrategyPathLab {
  const objective =
    STRATEGY_OBJECTIVES.includes(objectiveLabel as (typeof STRATEGY_OBJECTIVES)[number])
      ? objectiveLabel
      : STRATEGY_OBJECTIVES[0];
  const horizon = clamp(Number(horizonLabel) || 2, 1, 4);
  const seed = hashText(`${team.team_id}-${objective}-${horizon}`);
  const riskCurve = clamp((team.net_rating ?? 0) + horizon * 0.8, -4, 8);

  return {
    teamName: team.full_name,
    objectiveLabel: objective,
    horizonLabel: `${horizon} seasons`,
    thesis:
      'The simulator is a route planner: three steps, one objective, and a visible trade-off for each branch.',
    steps: [
      {
        title: 'Stabilize',
        move: pickBySeed(['Protect the rotation', 'Trim dead salary', 'Lock the middle of the roster', 'Hold the pick'] as const, seed),
        risk: 'Low',
        payoff: 'Creates a clean starting point.',
      },
      {
        title: 'Leverage',
        move: pickBySeed(['Turn flexibility into a smaller upgrade', 'Package an extra asset', 'Clear a lane for minutes', 'Create optionality'] as const, seed + 1),
        risk: formatSignedNumber(riskCurve, 1),
        payoff: 'Sets the second move up.',
      },
      {
        title: 'Finish',
        move: pickBySeed(['Push into contention', 'Commit to the reset', 'Store the upside', 'Defend the asset base'] as const, seed + 2),
        risk: horizon >= 3 ? 'Moderate' : 'Managed',
        payoff: 'Exposes the final shape of the franchise.',
      },
    ],
    note:
      'Treat the route as a scenario tree. The best path is the one that keeps your second move alive.',
  };
}

export function buildShockEventLab(
  team: TeamHealthSummary,
  eventLabel: string,
  severityLabel: string,
): ShockEventLab {
  const event =
    SHOCK_EVENTS.includes(eventLabel as (typeof SHOCK_EVENTS)[number])
      ? eventLabel
      : SHOCK_EVENTS[0];
  const severity = clamp(Number(severityLabel) || 2, 1, 3);
  const seed = hashText(`${team.team_id}-${event}-${severity}`);

  return {
    teamName: team.full_name,
    eventLabel: event,
    severityLabel: ['Low', 'Medium', 'High'][severity - 1] ?? 'Medium',
    thesis:
      'A shock event is only useful if the response window is explicit and the cap consequences are visible.',
    steps: [
      {
        window: 'First 72 hours',
        response: pickBySeed(
          ['Re-slot the rotation', 'Validate the cap hit', 'Hold the assets', 'Draft the communication'] as const,
          seed,
        ),
        priority: 'Immediate',
      },
      {
        window: 'First 30 days',
        response: pickBySeed(
          ['Test an internal replacement', 'Scan the waiver wire', 'Watch the market for relief', 'Stabilize the minutes load'] as const,
          seed + 1,
        ),
        priority: 'Short-term',
      },
      {
        window: 'Season horizon',
        response: pickBySeed(
          ['Rebuild the timeline', 'Preserve optionality', 'Conserve picks', 'Push the best remaining window'] as const,
          seed + 2,
        ),
        priority: 'Structural',
      },
    ],
    note:
      'The faster the shock, the more valuable the existing decision tree becomes.',
  };
}

export function buildRebuildPlanLab(
  team: TeamHealthSummary,
  resetLabel: string,
  horizonLabel: string,
): RebuildPlanLab {
  const reset =
    RESET_STYLES.includes(resetLabel as (typeof RESET_STYLES)[number])
      ? resetLabel
      : RESET_STYLES[1];
  const horizon = clamp(Number(horizonLabel) || 3, 2, 5);
  const seed = hashText(`${team.team_id}-${reset}-${horizon}`);

  return {
    teamName: team.full_name,
    resetLabel: reset,
    horizonLabel: `${horizon} seasons`,
    thesis:
      'A rebuild is a sequence of asset decisions, not a slogan. The plan needs guardrails, milestones, and an end state.',
    phases: [
      {
        title: 'Phase 1',
        move: pickBySeed(['Protect the value contracts', 'Move the oldest salary', 'Clarify who is part of the next core', 'Preserve the clean picks'] as const, seed),
        guardrail: 'Do not trade future clarity for short-term noise.',
      },
      {
        title: 'Phase 2',
        move: pickBySeed(['Stock the draft pipeline', 'Target one development lane', 'Keep the cap sheet open', 'Let the young minutes breathe'] as const, seed + 1),
        guardrail: 'Do not stack overlapping bets that block the timeline.',
      },
      {
        title: 'Phase 3',
        move: pickBySeed(['Accelerate the next window', 'Use the best young piece', 'Reinvest the savings', 'Decide whether the reset worked'] as const, seed + 2),
        guardrail: 'Do not chase a finish line before the asset base is real.',
      },
    ],
    note:
      'The best rebuilds are boring at the start and obvious at the finish.',
  };
}

export function buildDailyChallengeLab(
  teams: readonly TeamHealthSummary[],
  isoDate: string,
): DailyChallengeLab {
  const snapshot = buildLeagueSnapshot(teams);
  const strongest = snapshot.strongestTeam ?? getPrimaryTeam(teams);
  const pressure = snapshot.mostPressuredTeam ?? strongest;
  const seed = hashText(`${isoDate}-${strongest?.team_id ?? 0}-${pressure?.team_id ?? 0}`);
  const fallbackTeams = teams.length > 0 ? teams : strongest ? [strongest] : [];
  const challengeTeam = fallbackTeams.length > 0 ? pickBySeed(fallbackTeams, seed) : strongest;
  const weekNumber = getIsoWeekNumber(isoDate);

  return {
    challengeId: `${isoDate}-${challengeTeam?.team_id ?? 'league'}`,
    teamName: challengeTeam?.full_name ?? 'The league',
    prompt:
      challengeTeam && pressure
        ? `Can you give ${challengeTeam.full_name} one move that raises the ceiling without breaking the cap logic?`
        : 'Can you reshape the league into one cleaner decision tree?',
    scenarioOfTheWeek:
      strongest && pressure
        ? `${strongest.full_name} vs. ${pressure.full_name}: decide whether to press the advantage or protect the future.`
        : 'This week is a league-wide cap and asset exercise.',
    objective:
      strongest
        ? `Beat the current baseline for ${formatWinLoss(strongest.wins, strongest.losses)} without losing flexibility.`
        : 'Beat the league baseline without losing flexibility.',
    quickFacts: [
      snapshot.strongestTeam
        ? `Strongest live team: ${snapshot.strongestTeam.full_name}`
        : 'Strongest live team: unavailable',
      snapshot.mostCapFlexibleTeam
        ? `Most cap-flexible: ${snapshot.mostCapFlexibleTeam.full_name}`
        : 'Most cap-flexible: unavailable',
      `Week index: ${weekNumber}`,
    ],
  };
}
