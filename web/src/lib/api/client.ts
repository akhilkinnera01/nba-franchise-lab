import type {
  CommentCreateRequest,
  CommentResponse,
  DailyChallengeResponse,
  DailyChallengeSubmissionRequest,
  DailyChallengeSubmissionSummary,
  FeaturedScenarioResponse,
  ProfileResponse,
  ProfileUpdateRequest,
  FreeAgentPreviewRequest,
  FreeAgentPreviewResponse,
  HealthResponse,
  JsonRecord,
  ComparableTradeRequest,
  ComparableTradeResponse,
  ReactionRequest,
  ReactionResponse,
  InjuryPreviewRequest,
  InjuryPreviewResponse,
  LineupPreviewRequest,
  LineupPreviewResponse,
  ProblemDetailResponse,
  SavedScenariosResponse,
  ScenarioFeedbackResponse,
  ScenarioCreatePayload,
  ScenarioEnvelope,
  ScenarioType,
  TradePreviewResponse,
  TeamCapResponse,
  TeamListResponse,
  TeamRosterResponse,
  TradeValidationRequest,
  TradeValidationResponse,
} from '@/lib/api/types';
import { getApiAuthToken } from '@/lib/api/auth';

const DEFAULT_API_URL = 'http://localhost:8000';

export class ApiClientError extends Error {
  readonly status: number | null;
  readonly url: string;
  readonly detail: string;
  readonly errors: ProblemDetailResponse['errors'];

  constructor(options: {
    message: string;
    status: number | null;
    url: string;
    detail?: string;
    errors?: ProblemDetailResponse['errors'];
  }) {
    super(options.message);
    this.name = 'ApiClientError';
    this.status = options.status;
    this.url = options.url;
    this.detail = options.detail ?? options.message;
    this.errors = options.errors ?? [];
  }
}

function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(
    /\/+$/,
    '',
  );
}

function buildApiUrl(
  path: string,
  query?: Record<string, string | number | undefined>,
): string {
  const url = new URL(path, `${getApiBaseUrl()}/`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function parseResponse<T>(response: Response, url: string): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | ProblemDetailResponse
      | null;
    const problem =
      payload &&
      typeof payload === 'object' &&
      'detail' in payload &&
      typeof payload.detail === 'string'
        ? (payload as ProblemDetailResponse)
        : null;

    throw new ApiClientError({
      message: `API request failed for ${url}`,
      status: response.status,
      url,
      detail: problem?.detail,
      errors: problem?.errors,
      });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as T | null;

  if (payload === null) {
    throw new ApiClientError({
      message: `API returned an empty payload for ${url}`,
      status: response.status,
      url,
    });
  }

  return payload as T;
}

async function request<T>(
  path: string,
  options?: {
    authToken?: string | null;
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    query?: Record<string, string | number | undefined>;
    body?:
      | JsonRecord
      | ProfileUpdateRequest
      | CommentCreateRequest
      | ReactionRequest
      | ScenarioCreatePayload
      | TradeValidationRequest
      | ComparableTradeRequest
      | FreeAgentPreviewRequest
      | InjuryPreviewRequest
      | LineupPreviewRequest
      | DailyChallengeSubmissionRequest;
  },
): Promise<T> {
  const url = buildApiUrl(path, options?.query);

  try {
    const authToken = options?.authToken ?? getApiAuthToken();
    const response = await fetch(url, {
      method: options?.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    });

    return parseResponse<T>(response, url);
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    throw new ApiClientError({
      message: `Unable to reach API at ${url}`,
      status: null,
      url,
      detail:
        error instanceof Error ? error.message : 'Unknown network failure',
    });
  }
}

export function getPublicApiBaseUrl(): string {
  return getApiBaseUrl();
}

export function getApiUrl(
  path: string,
  query?: Record<string, string | number | undefined>,
): string {
  return buildApiUrl(path, query);
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('health');
}

export async function getMe(authToken: string): Promise<ProfileResponse> {
  return request<ProfileResponse>('me', {
    authToken,
  });
}

export async function updateMe(
  authToken: string,
  payload: ProfileUpdateRequest,
): Promise<ProfileResponse> {
  return request<ProfileResponse>('me', {
    authToken,
    method: 'PATCH',
    body: payload,
  });
}

export async function listSavedScenarios(
  authToken: string,
): Promise<SavedScenariosResponse> {
  return request<SavedScenariosResponse>('me/saved-scenarios', {
    authToken,
  });
}

export async function getDailyChallenge(): Promise<DailyChallengeResponse> {
  return request<DailyChallengeResponse>('features/daily-challenge');
}

export async function submitDailyChallengeResponse(
  authToken: string,
  payload: DailyChallengeSubmissionRequest,
): Promise<DailyChallengeSubmissionSummary> {
  return request<DailyChallengeSubmissionSummary>(
    'features/daily-challenge/submissions',
    {
      authToken,
      method: 'POST',
      body: payload,
    },
  );
}

export async function getFeaturedScenarioOfWeek(): Promise<FeaturedScenarioResponse> {
  return request<FeaturedScenarioResponse>('features/scenario-of-week');
}

export async function saveScenarioToLibrary(
  authToken: string,
  scenarioId: string,
): Promise<ScenarioEnvelope> {
  return request<ScenarioEnvelope>(`scenarios/${scenarioId}/save`, {
    authToken,
    method: 'POST',
  });
}

export async function unsaveScenarioFromLibrary(
  authToken: string,
  scenarioId: string,
): Promise<void> {
  await request<void>(`scenarios/${scenarioId}/save`, {
    authToken,
    method: 'DELETE',
  });
}

export async function setScenarioReaction(
  authToken: string,
  scenarioId: string,
  payload: ReactionRequest,
): Promise<ReactionResponse> {
  return request<ReactionResponse>(`scenarios/${scenarioId}/reaction`, {
    authToken,
    method: 'PUT',
    body: payload,
  });
}

export async function getScenarioFeedback(
  scenarioId: string,
  authToken?: string | null,
): Promise<ScenarioFeedbackResponse> {
  return request<ScenarioFeedbackResponse>(`scenarios/${scenarioId}/feedback`, {
    authToken,
  });
}

export async function addScenarioComment(
  authToken: string,
  scenarioId: string,
  payload: CommentCreateRequest,
): Promise<CommentResponse> {
  return request<CommentResponse>(`scenarios/${scenarioId}/comments`, {
    authToken,
    method: 'POST',
    body: payload,
  });
}

export async function listTeamHealthSummaries(
  season?: string,
): Promise<TeamListResponse> {
  return request<TeamListResponse>('teams', {
    query: { season },
  });
}

export async function getTeamRoster(
  teamId: number,
  season?: string,
): Promise<TeamRosterResponse> {
  return request<TeamRosterResponse>(`teams/${teamId}/roster`, {
    query: { season },
  });
}

export async function getTeamCap(
  teamId: number,
  season?: string,
): Promise<TeamCapResponse> {
  return request<TeamCapResponse>(`teams/${teamId}/cap`, {
    query: { season },
  });
}

async function createScenario(
  scenarioType: ScenarioType,
  payload: ScenarioCreatePayload,
): Promise<ScenarioEnvelope> {
  return request<ScenarioEnvelope>(`scenarios/${scenarioType}`, {
    method: 'POST',
    body: payload,
  });
}

export async function createTradeScenario(
  payload: ScenarioCreatePayload,
): Promise<ScenarioEnvelope> {
  return createScenario('trade', payload);
}

export async function createBrowserTradeScenario(
  payload: TradeValidationRequest,
): Promise<ScenarioEnvelope> {
  return request<ScenarioEnvelope>('scenarios/trade/browser', {
    method: 'POST',
    body: payload,
  });
}

export async function validateTradeProposal(
  payload: TradeValidationRequest,
): Promise<TradeValidationResponse> {
  return request<TradeValidationResponse>('scenarios/trade/validate', {
    method: 'POST',
    body: payload,
  });
}

export async function previewTradeProposal(
  payload: TradeValidationRequest,
): Promise<TradePreviewResponse> {
  return request<TradePreviewResponse>('scenarios/trade/preview', {
    method: 'POST',
    body: payload,
  });
}

export async function findComparableTrades(
  payload: ComparableTradeRequest,
): Promise<ComparableTradeResponse> {
  return request<ComparableTradeResponse>('scenarios/trade/comparables', {
    method: 'POST',
    body: payload,
  });
}

export async function previewFreeAgentScenario(
  payload: FreeAgentPreviewRequest,
): Promise<FreeAgentPreviewResponse> {
  return request<FreeAgentPreviewResponse>('scenarios/free-agent/preview', {
    method: 'POST',
    body: payload,
  });
}

export async function previewInjuryScenario(
  payload: InjuryPreviewRequest,
): Promise<InjuryPreviewResponse> {
  return request<InjuryPreviewResponse>('scenarios/injury/preview', {
    method: 'POST',
    body: payload,
  });
}

export async function previewLineupScenario(
  payload: LineupPreviewRequest,
): Promise<LineupPreviewResponse> {
  return request<LineupPreviewResponse>('scenarios/lineup/preview', {
    method: 'POST',
    body: payload,
  });
}

export async function createFreeAgentScenario(
  payload: ScenarioCreatePayload,
): Promise<ScenarioEnvelope> {
  return createScenario('free-agent', payload);
}

export async function createBrowserFreeAgentScenario(
  payload: FreeAgentPreviewRequest,
): Promise<ScenarioEnvelope> {
  return request<ScenarioEnvelope>('scenarios/free-agent/browser', {
    method: 'POST',
    body: payload,
  });
}

export async function createInjuryScenario(
  payload: ScenarioCreatePayload,
): Promise<ScenarioEnvelope> {
  return createScenario('injury', payload);
}

export async function createBrowserInjuryScenario(
  payload: InjuryPreviewRequest,
): Promise<ScenarioEnvelope> {
  return request<ScenarioEnvelope>('scenarios/injury/browser', {
    method: 'POST',
    body: payload,
  });
}

export async function createLineupScenario(
  payload: ScenarioCreatePayload,
): Promise<ScenarioEnvelope> {
  return createScenario('lineup', payload);
}

export async function createBrowserLineupScenario(
  payload: LineupPreviewRequest,
): Promise<ScenarioEnvelope> {
  return request<ScenarioEnvelope>('scenarios/lineup/browser', {
    method: 'POST',
    body: payload,
  });
}

export const getMeProfile = getMe;
export const saveScenario = saveScenarioToLibrary;
export const unsaveScenario = unsaveScenarioFromLibrary;
export const storeBrowserTradeScenario = createBrowserTradeScenario;
export const storeBrowserFreeAgentScenario = createBrowserFreeAgentScenario;
export const storeBrowserInjuryScenario = createBrowserInjuryScenario;
export const storeBrowserLineupScenario = createBrowserLineupScenario;

export async function getScenario(
  scenarioId: string,
): Promise<ScenarioEnvelope> {
  return request<ScenarioEnvelope>(`scenarios/${scenarioId}`);
}
