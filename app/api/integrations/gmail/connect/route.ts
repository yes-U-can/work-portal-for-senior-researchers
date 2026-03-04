import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { IntegrationProvider, Role } from "@prisma/client";
import { hasRoleOrAbove } from "@/lib/authorization";
import { env } from "@/lib/env";
import { buildGoogleAuthorizeUrl } from "@/lib/integrations/google-oauth";
import { getCurrentUser } from "@/lib/session";
import { resolveTenantAccessForUser } from "@/lib/tenant-access";

const OAUTH_STATE_COOKIE = "google_gmail_oauth_state";
const OAUTH_TENANT_COOKIE = "google_gmail_oauth_tenant_id";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  const access = await resolveTenantAccessForUser(user);
  if (!access || !hasRoleOrAbove(access.role, Role.ADMIN)) {
    return NextResponse.json({ error: "Integration admin role is required." }, { status: 403 });
  }

  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return NextResponse.json({ error: "Google OAuth credentials are not configured." }, { status: 500 });
  }

  const state = randomUUID();
  const authorizeUrl = buildGoogleAuthorizeUrl(IntegrationProvider.GMAIL, state, request.nextUrl.origin);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.IS_PRODUCTION,
    path: "/",
    maxAge: 60 * 10
  });
  response.cookies.set(OAUTH_TENANT_COOKIE, access.tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.IS_PRODUCTION,
    path: "/",
    maxAge: 60 * 10
  });

  return response;
}
