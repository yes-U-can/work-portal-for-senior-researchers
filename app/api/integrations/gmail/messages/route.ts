import { NextRequest, NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
import { listGmailMessages } from "@/lib/integrations/gmail-service";
import { getGoogleAccessTokenForTenant } from "@/lib/integrations/google-token";
import { getCurrentUser } from "@/lib/session";
import { resolveTenantAccessForUser } from "@/lib/tenant-access";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await resolveTenantAccessForUser(user);
  if (!access) {
    return NextResponse.json({ error: "Tenant access not found." }, { status: 403 });
  }

  const accessToken = await getGoogleAccessTokenForTenant(access.tenantId, IntegrationProvider.GMAIL);
  if (!accessToken) {
    return NextResponse.json({ error: "Gmail is not connected." }, { status: 400 });
  }

  const maxResultsRaw = request.nextUrl.searchParams.get("max");
  const maxResults = maxResultsRaw ? Number.parseInt(maxResultsRaw, 10) : 20;

  try {
    const messages = await listGmailMessages({
      accessToken,
      maxResults: Number.isNaN(maxResults) ? 20 : Math.min(Math.max(maxResults, 1), 50)
    });

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load Gmail messages." },
      { status: 502 }
    );
  }
}
