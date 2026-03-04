import { IntegrationProvider } from "@prisma/client";
import { env } from "@/lib/env";

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type ExchangeGoogleCodeInput = {
  code: string;
  redirectUri: string;
};

type RefreshGoogleTokenInput = {
  refreshToken: string;
};

const GOOGLE_DRIVE_PROVIDER = IntegrationProvider.GOOGLE_DRIVE;
const GMAIL_PROVIDER = IntegrationProvider.GMAIL;

function assertGoogleOAuthConfig() {
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials are not configured.");
  }
}

export function getGoogleOAuthScope(provider: IntegrationProvider): string {
  if (provider === GOOGLE_DRIVE_PROVIDER) {
    return env.GOOGLE_DRIVE_OAUTH_SCOPE;
  }

  if (provider === GMAIL_PROVIDER) {
    return env.GOOGLE_GMAIL_OAUTH_SCOPE;
  }

  throw new Error(`Unsupported Google OAuth provider: ${provider}`);
}

export function getGoogleRedirectUri(provider: IntegrationProvider, origin: string): string {
  if (provider === GOOGLE_DRIVE_PROVIDER) {
    return env.GOOGLE_DRIVE_REDIRECT_URI ?? `${origin}/api/integrations/drive/callback`;
  }

  if (provider === GMAIL_PROVIDER) {
    return env.GOOGLE_GMAIL_REDIRECT_URI ?? `${origin}/api/integrations/gmail/callback`;
  }

  throw new Error(`Unsupported Google redirect provider: ${provider}`);
}

export function buildGoogleAuthorizeUrl(
  provider: IntegrationProvider,
  state: string,
  origin: string
): URL {
  assertGoogleOAuthConfig();

  const url = new URL(env.GOOGLE_OAUTH_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.GOOGLE_OAUTH_CLIENT_ID as string);
  url.searchParams.set("redirect_uri", getGoogleRedirectUri(provider, origin));
  url.searchParams.set("scope", getGoogleOAuthScope(provider));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);

  return url;
}

export async function exchangeGoogleAuthorizationCode(
  input: ExchangeGoogleCodeInput
): Promise<GoogleTokenResponse> {
  assertGoogleOAuthConfig();

  const body = new URLSearchParams({
    code: input.code,
    client_id: env.GOOGLE_OAUTH_CLIENT_ID as string,
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET as string,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code"
  });

  const response = await fetch(env.GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${payload}`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function refreshGoogleAccessToken(
  input: RefreshGoogleTokenInput
): Promise<GoogleTokenResponse> {
  assertGoogleOAuthConfig();

  const body = new URLSearchParams({
    refresh_token: input.refreshToken,
    client_id: env.GOOGLE_OAUTH_CLIENT_ID as string,
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET as string,
    grant_type: "refresh_token"
  });

  const response = await fetch(env.GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Google token refresh failed (${response.status}): ${payload}`);
  }

  return (await response.json()) as GoogleTokenResponse;
}
