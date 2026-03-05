import { NextRequest, NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
import { getLatestDecryptedIntegrationToken } from "@/lib/integrations/account-store";
import { normalizeConnectorError } from "@/lib/integrations/connector-error";
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
    return NextResponse.json(
      {
        error: "개인 네이버메일이 연결되어 있지 않습니다.",
        recoveryAction: "메일 화면에서 네이버메일 연결을 먼저 완료하세요."
      },
      { status: 400 }
    );
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
    const guidance = normalizeConnectorError(
      error,
      "네이버메일 목록을 불러오지 못했습니다.",
      "앱 비밀번호를 확인한 뒤 다시 시도하세요."
    );

    return NextResponse.json(
      { error: guidance.message, recoveryAction: guidance.recoveryAction },
      { status: 502 }
    );
  }
}
