export interface ErrorDetail {
  type: string;
  location: string[];
  message: string;
}

export interface ProblemDetailResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  request_id: string;
  errors: ErrorDetail[];
}

export interface ProfileResponse {
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  saved_scenario_count: number;
}

export interface ProfileUpdateRequest {
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface SavedScenarioSummary {
  scenario_id: string;
  scenario_type: ScenarioType;
  title: string | null;
  notes: string | null;
  created_at: string;
  saved_at: string;
  share_url: string;
}

export interface SavedScenariosResponse {
  items: SavedScenarioSummary[];
}

export interface DailyChallengeSubmissionRequest {
  challenge_key: string;
  scenario_id: string;
  note?: string | null;
}

export interface DailyChallengeSubmissionSummary {
  submission_id: number;
  challenge_key: string;
  scenario_id: string;
  scenario_type: ScenarioType;
  title: string | null;
  author_user_id: string;
  author_display_name: string | null;
  note: string | null;
  created_at: string;
  upvotes: number;
  downvotes: number;
  share_url: string;
}

export interface DailyChallengeResponse {
  challenge_key: string;
  challenge_date: string;
  template_id: string;
  title: string;
  summary: string;
  prompt: string;
  scenario_type: ScenarioType;
  launch_url: string;
  tags: string[];
  submissions: DailyChallengeSubmissionSummary[];
}

export interface FeaturedScenarioResponse {
  feature_key: string;
  title: string;
  eyebrow: string;
  summary: string;
  launch_url: string;
  tags: string[];
}

export interface ReactionRequest {
  value: -1 | 1;
}

export interface ReactionResponse {
  scenario_id: string;
  value: number;
}

export interface CommentCreateRequest {
  body: string;
}

export interface CommentResponse {
  comment_id: number;
  scenario_id: string;
  author_user_id: string;
  author_display_name: string | null;
  body: string;
  created_at: string;
}

export interface ScenarioFeedbackResponse {
  scenario_id: string;
  upvotes: number;
  downvotes: number;
  viewer_reaction: number | null;
  comments: CommentResponse[];
}

export interface HealthResponse {
  status: string;
  service: string;
  environment: string;
  version: string;
}

export interface TeamIdentity {
  team_id: number;
  abbreviation: string;
  full_name: string;
  conference: string | null;
  division: string | null;
}

export interface TeamHealthSummary {
  team_id: number;
  abbreviation: string;
  full_name: string;
  conference: string | null;
  division: string | null;
  season: string;
  wins: number | null;
  losses: number | null;
  net_rating: number | null;
  offensive_rating: number | null;
  defensive_rating: number | null;
  pace: number | null;
  roster_count: number;
  standard_contract_count: number;
  committed_salary_cents: number;
  cap_room_cents: number | null;
  tax_room_cents: number | null;
  first_apron_room_cents: number | null;
  second_apron_room_cents: number | null;
}

export interface TeamListMeta {
  as_of: string | null;
  source_status: 'complete' | 'partial' | 'degraded';
  missing_fields: string[];
}

export interface TeamListResponse {
  season: string;
  meta: TeamListMeta;
  teams: TeamHealthSummary[];
}

export interface PlayerContractSummary {
  current_salary_cents: number | null;
  contract_type: string | null;
  contract_start_year: number;
  contract_end_year: number;
  annual_salary_cents: Record<string, number>;
}

export interface TeamRosterPlayer {
  player_id: string;
  display_name: string;
  position: string | null;
  jersey_number: string | null;
  roster_status: string | null;
  birth_date: string | null;
  minutes_per_game: number | null;
  points_per_game: number | null;
  rebounds_per_game: number | null;
  assists_per_game: number | null;
  steals_per_game: number | null;
  blocks_per_game: number | null;
  turnovers_per_game: number | null;
  contract: PlayerContractSummary | null;
}

export interface TeamRosterResponse {
  team: TeamIdentity;
  season: string;
  roster_count: number;
  players: TeamRosterPlayer[];
}

export interface TeamCapProjectionSeason {
  season: string;
  committed_salary_cents: number;
  cap_hold_cents: number;
  total_team_salary_cents: number;
  salary_cap_cents: number | null;
  luxury_tax_cents: number | null;
  first_apron_cents: number | null;
  second_apron_cents: number | null;
  cap_room_cents: number | null;
  tax_room_cents: number | null;
  first_apron_room_cents: number | null;
  second_apron_room_cents: number | null;
  standard_contract_count: number;
  expiring_player_ids: string[];
  expiring_salary_cents: number;
}

export interface TeamCapResponse {
  team: TeamIdentity;
  season: string;
  current: TeamCapProjectionSeason;
  projection: TeamCapProjectionSeason[];
}

export interface TradeValidationContractSummary {
  player_id: string;
  player_name: string;
  salary_cents: number;
}

export interface TradeValidationTeamRequest {
  team_id: number;
  outgoing_player_ids: string[];
  outgoing_pick_notes?: string[];
  sends_cash?: boolean;
}

export interface TradeValidationRequest {
  season?: string;
  teams: TradeValidationTeamRequest[];
}

export interface TradeValidationTeamResult {
  team_id: number;
  team_name: string;
  apron_status:
    | 'below_first_apron'
    | 'first_apron_or_above'
    | 'second_apron_or_above'
    | 'taxpaying_or_above';
  outgoing_salary_cents: number;
  incoming_salary_cents: number;
  maximum_incoming_salary_cents: number;
  post_trade_standard_contract_count: number;
  valid: boolean;
  matched_rule_description: string | null;
  violations: string[];
  outgoing_players: TradeValidationContractSummary[];
  incoming_players: TradeValidationContractSummary[];
  outgoing_pick_notes: string[];
  incoming_pick_notes: string[];
}

export interface TradeValidationResponse {
  season: string;
  valid: boolean;
  validation_scope_note: string;
  violations: string[];
  team_results: TradeValidationTeamResult[];
}

export interface ComparableTradePlayerAsset {
  player_id: string;
  player_name: string;
  salary_cents: number;
  age: number;
  projected_box_plus_minus: number;
}

export interface ComparableTradePickAsset {
  season: number;
  round: number;
  pick_range_start: number;
  pick_range_end: number;
}

export interface ComparableTradeRequest {
  season: string;
  teams_involved_count: number;
  outgoing_players: ComparableTradePlayerAsset[];
  incoming_players: ComparableTradePlayerAsset[];
  draft_picks: ComparableTradePickAsset[];
  limit?: number;
}

export interface ComparableTradeMatch {
  trade_id: string;
  description: string;
  season: string;
  similarity_score: number;
}

export interface ComparableTradeResponse {
  matches: ComparableTradeMatch[];
}

export interface ScenarioPreviewOutcomeSnapshot {
  expected_wins: number;
  win_standard_deviation: number;
  playoff_probability: number;
  championship_probability: number;
  average_seed: number;
  seed_probabilities: Record<number, number>;
  current_cap_room_cents: number | null;
  current_tax_room_cents: number | null;
  cap_room_cents_by_season: Record<string, number | null>;
  tax_room_cents_by_season: Record<string, number | null>;
}

export interface ScenarioPreviewDeltaSummary {
  wins_delta: number;
  playoff_probability_delta: number;
  championship_probability_delta: number;
  net_rating_delta: number;
  current_cap_room_delta_cents: number | null;
  current_tax_room_delta_cents: number | null;
  cap_room_delta_cents_by_season: Record<string, number | null>;
  tax_room_delta_cents_by_season: Record<string, number | null>;
}

export type TradePreviewOutcomeSnapshot = ScenarioPreviewOutcomeSnapshot;

export interface TradePreviewDeltaSummary extends ScenarioPreviewDeltaSummary {
  trade_valid: boolean;
}

export interface TradePreviewTeamResult {
  team_id: number;
  team_name: string;
  baseline: TradePreviewOutcomeSnapshot;
  scenario: TradePreviewOutcomeSnapshot;
  delta: TradePreviewDeltaSummary;
}

export interface TradePreviewResponse {
  season: string;
  simulation_scope_note: string;
  validation: TradeValidationResponse;
  team_results: TradePreviewTeamResult[];
  comparable_trades: ComparableTradeMatch[];
}

export interface FreeAgentPreviewRequest {
  season?: string;
  team_id: number;
  player_name: string;
  projected_box_plus_minus: number;
  projected_minutes_share: number;
  annual_salary_cents: number;
  contract_years: number;
  annual_raise_rate: number;
  exception_code:
    | 'room_mid_level'
    | 'non_taxpayer_mid_level'
    | 'taxpayer_mid_level'
    | 'bi_annual_exception'
    | 'veteran_minimum';
}

export interface FreeAgentPreviewResponse {
  season: string;
  simulation_scope_note: string;
  team_id: number;
  team_name: string;
  player_name: string;
  exception_code: string;
  exception_available: boolean;
  exception_amount_cents: number | null;
  exception_reason: string;
  baseline: ScenarioPreviewOutcomeSnapshot;
  scenario: ScenarioPreviewOutcomeSnapshot;
  delta: ScenarioPreviewDeltaSummary;
}

export interface InjuryPreviewRequest {
  season?: string;
  team_id: number;
  player_id: string;
  projected_games_missed: number;
}

export interface InjuryPreviewResponse {
  season: string;
  simulation_scope_note: string;
  team_id: number;
  team_name: string;
  player_id: string;
  player_name: string;
  projected_games_missed: number;
  baseline: ScenarioPreviewOutcomeSnapshot;
  scenario: ScenarioPreviewOutcomeSnapshot;
  delta: ScenarioPreviewDeltaSummary;
}

export interface LineupPreviewRequest {
  season?: string;
  team_id: number;
  change_label: string;
  net_rating_adjustment: number;
}

export interface LineupPreviewResponse {
  season: string;
  simulation_scope_note: string;
  team_id: number;
  team_name: string;
  change_label: string;
  baseline: ScenarioPreviewOutcomeSnapshot;
  scenario: ScenarioPreviewOutcomeSnapshot;
  delta: ScenarioPreviewDeltaSummary;
}

export type ScenarioType = 'trade' | 'free-agent' | 'injury' | 'lineup';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonRecord = { [key: string]: JsonValue };

export interface ScenarioCreatePayload {
  title?: string;
  notes?: string;
  request: JsonRecord;
}

export interface ScenarioEnvelope {
  scenario_id: string;
  scenario_type: ScenarioType;
  title: string | null;
  notes: string | null;
  created_at: string;
  engine_version: string;
  data_version: string;
  share_url: string;
  request: JsonRecord;
  result: JsonRecord;
}
