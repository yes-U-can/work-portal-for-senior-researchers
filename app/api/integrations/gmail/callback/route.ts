import { NextRequest, NextResponse } from "next/server";
import { IntegrationProvider, IntegrationStatus } from "@prisma/client";
import { upsertIntegrationToken } from "@/lib/integrations/account-store";
import { exchangeGoogleAuthorizationCode, getGoogleRedirectUri } from "@/lib/integrations/google-oauth";
import { getCurrentUser } from "@/lib/session";

const OAUTH_STATE_COOKIE = "google_gmail_oauth_state";
const OAUTH_TENANT_COOKIE = "google_gmail_oauth_tenant_id";

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(OAUTH_TENANT_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const tenantId = request.cookies.get(OAUTH_TENANT_COOKIE)?.value;

  const errorRedirect = NextResponse.redirect(new URL("/dashboard?gmail=error", request.url));
  if (!code || !state || !expectedState || !tenantId || state !== expectedState) {
    clearOAuthCookies(errorRedirect);
    return errorRedirect;
  }

  try {
    const token = await exchangeGoogleAuthorizationCode({
      code,
      redirectUri: getGoogleRedirectUri(IntegrationProvider.GMAIL, request.nextUrl.origin)
    });

    await upsertIntegrationToken({
      tenantId,
      provider: IntegrationProvider.GMAIL,
      providerAccountId: user.email,
      status: IntegrationStatus.CONNECTED,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      scope: token.scope ?? null
    });

    const successRedirect = NextResponse.redirect(new URL("/dashboard?gmail=connected", request.url));
    clearOAuthCookies(successRedirect);
    return successRedirect;
  } catch {
    clearOAuthCookies(errorRedirect);
    return errorRedirect;
  }
}
