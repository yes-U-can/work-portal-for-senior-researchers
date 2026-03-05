import { NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
import { getLatestDecryptedIntegrationToken } from "@/lib/integrations/account-store";
import { normalizeConnectorError } from "@/lib/integrations/connector-error";
import { getNaverMailMessage } from "@/lib/integrations/naver-mail-service";
import { getCurrentUser } from "@/lib/session";
import { resolveTenantAccessForUser } from "@/lib/tenant-access";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    uid: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
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

  const { uid } = await context.params;
  const uidNumber = Number.parseInt(uid, 10);
  if (Number.isNaN(uidNumber) || uidNumber <= 0) {
    return NextResponse.json(
      { error: "올바른 uid가 필요합니다.", recoveryAction: "메일 목록에서 항목을 다시 선택하세요." },
      { status: 400 }
    );
  }

  try {
    const message = await getNaverMailMessage(
      {
        email: token.providerAccountId,
        appPassword: token.accessToken
      },
      uidNumber
    );

    return NextResponse.json({ message });
  } catch (error) {
    const guidance = normalizeConnectorError(
      error,
      "네이버메일 상세를 불러오지 못했습니다.",
      "메일 목록을 새로고침한 뒤 다시 선택하세요."
    );

    return NextResponse.json(
      { error: guidance.message, recoveryAction: guidance.recoveryAction },
      { status: 502 }
    );
  }
}
