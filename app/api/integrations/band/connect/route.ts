import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { hasRoleOrAbove } from "@/lib/authorization";
import { env } from "@/lib/env";
import { getBandAuthorizeUrl, getBandClientId, getBandScope } from "@/lib/integrations/band-oauth";
import { getCurrentUser } from "@/lib/session";
import { resolveTenantAccessForUser } from "@/lib/tenant-access";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  const access = await resolveTenantAccessForUser(user);
  if (!access || !hasRoleOrAbove(access.role, Role.ADMIN)) {
    return NextResponse.json({ error: "Integration admin role is required." }, { status: 403 });
  }

  const clientId = getBandClientId();
  if (!clientId) {
    return NextResponse.json({ error: "BAND_CLIENT_ID is not configured." }, { status: 500 });
  }

  const state = randomUUID();
  const callbackUrl = env.BAND_REDIRECT_URI ?? `${request.nextUrl.origin}/api/integrations/band/callback`;

  const authorizeUrl = new URL(getBandAuthorizeUrl());
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizeUrl.searchParams.set("scope", getBandScope());
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("band_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.IS_PRODUCTION,
    path: "/",
    maxAge: 60 * 10
  });
  response.cookies.set("band_oauth_tenant_id", access.tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.IS_PRODUCTION,
    path: "/",
    maxAge: 60 * 10
  });

  return response;
}
