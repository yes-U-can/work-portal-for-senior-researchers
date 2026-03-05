import { NextRequest, NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
import { normalizeConnectorError } from "@/lib/integrations/connector-error";
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
    return NextResponse.json(
      {
        error: "Gmail이 연결되어 있지 않습니다.",
        recoveryAction: "대시보드에서 Gmail 연결을 시작한 뒤 다시 시도하세요."
      },
      { status: 400 }
    );
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
    const guidance = normalizeConnectorError(
      error,
      "Gmail 목록을 불러오지 못했습니다.",
      "잠시 후 다시 시도하거나 Gmail을 재연결하세요."
    );

    return NextResponse.json(
      { error: guidance.message, recoveryAction: guidance.recoveryAction },
      { status: 502 }
    );
  }
}
