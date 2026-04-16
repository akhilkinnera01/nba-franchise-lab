let browserApiAccessToken: string | null = null;

export function setApiAuthToken(token: string | null): void {
  browserApiAccessToken = token?.trim() ? token : null;
}

export function getApiAuthToken(): string | null {
  return browserApiAccessToken;
}
