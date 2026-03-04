import { NextRequest, NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
import { getLatestDecryptedIntegrationToken } from "@/lib/integrations/account-store";
import { listNaverMailMessages } from "@/lib/integrations/naver-mail-service";
import { getCurrentUser } from "@/lib/session";
import { resolveTenantAccessForUser } from "@/lib/tenant-access";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await resolveTenantAccessForUser(user);
  if (!access) {
    return NextResponse.json({ error: "Tenant access not found." }, { status: 403 });
  }

  const token = await getLatestDecryptedIntegrationToken(access.tenantId, IntegrationProvider.NAVER_MAIL);
  if (!token) {
    return NextResponse.json({ error: "Naver Mail is not connected." }, { status: 400 });
  }

  const maxRaw = request.nextUrl.searchParams.get("max");
  const max = maxRaw ? Number.parseInt(maxRaw, 10) : 20;
  const limit = Number.isNaN(max) ? 20 : Math.min(Math.max(max, 1), 50);

  try {
    const messages = await listNaverMailMessages(
      {
        email: token.providerAccountId,
        appPassword: token.accessToken
      },
      limit
    );
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load Naver Mail messages." },
      { status: 502 }
    );
  }
}
