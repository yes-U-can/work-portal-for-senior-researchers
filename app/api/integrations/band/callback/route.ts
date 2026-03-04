import { NextRequest, NextResponse } from "next/server";
import { IntegrationProvider, IntegrationStatus } from "@prisma/client";
import { env } from "@/lib/env";
import { upsertIntegrationToken } from "@/lib/integrations/account-store";
import { getBandClientId, getBandClientSecret, getBandTokenUrl } from "@/lib/integrations/band-oauth";
import { getCurrentUser } from "@/lib/session";

type BandTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  user_key?: string;
};

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set("band_oauth_state", "", { path: "/", maxAge: 0 });
  response.cookies.set("band_oauth_tenant_id", "", { path: "/", maxAge: 0 });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("band_oauth_state")?.value;
  const tenantId = request.cookies.get("band_oauth_tenant_id")?.value;

  const errorRedirect = NextResponse.redirect(new URL("/dashboard?band=error", request.url));
  if (!code || !state || !expectedState || !tenantId || state !== expectedState) {
    clearOAuthCookies(errorRedirect);
    return errorRedirect;
  }

  const clientId = getBandClientId();
  const clientSecret = getBandClientSecret();
  const callbackUrl = env.BAND_REDIRECT_URI ?? `${request.nextUrl.origin}/api/integrations/band/callback`;
  if (!clientId || !clientSecret) {
    clearOAuthCookies(errorRedirect);
    return NextResponse.json({ error: "BAND OAuth credentials are not configured." }, { status: 500 });
  }

  try {
    const tokenResponse = await fetch(getBandTokenUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl
      })
    });

    if (!tokenResponse.ok) {
      clearOAuthCookies(errorRedirect);
      return errorRedirect;
    }

    const tokenData = (await tokenResponse.json()) as BandTokenResponse;
    await upsertIntegrationToken({
      tenantId,
      provider: IntegrationProvider.BAND,
      providerAccountId: tokenData.user_key ?? user.email,
      status: IntegrationStatus.CONNECTED,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
      scope: tokenData.scope ?? null
    });

    const successRedirect = NextResponse.redirect(new URL("/dashboard?band=connected", request.url));
    clearOAuthCookies(successRedirect);
    return successRedirect;
  } catch {
    clearOAuthCookies(errorRedirect);
    return errorRedirect;
  }
}
