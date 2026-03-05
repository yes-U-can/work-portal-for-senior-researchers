import { NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
import { normalizeConnectorError } from "@/lib/integrations/connector-error";
import { getGmailMessage } from "@/lib/integrations/gmail-service";
import { getGoogleAccessTokenForTenant } from "@/lib/integrations/google-token";
import { getCurrentUser } from "@/lib/session";
import { resolveTenantAccessForUser } from "@/lib/tenant-access";

type RouteContext = {
  params: Promise<{
    messageId: string;
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

  const accessToken = await getGoogleAccessTokenForTenant(access.tenantId, IntegrationProvider.GMAIL);
  if (!accessToken) {
    return NextResponse.json(
      {
        error: "Gmail이 연결되어 있지 않습니다.",
        recoveryAction: "대시보드에서 Gmail 연결을 완료한 뒤 다시 시도하세요."
      },
      { status: 400 }
    );
  }

  const { messageId } = await context.params;
  if (!messageId) {
    return NextResponse.json(
      { error: "messageId가 필요합니다.", recoveryAction: "메일 목록에서 항목을 다시 선택하세요." },
      { status: 400 }
    );
  }

  try {
    const message = await getGmailMessage(accessToken, messageId);
    return NextResponse.json({ message });
  } catch (error) {
    const guidance = normalizeConnectorError(
      error,
      "Gmail 상세 메일을 불러오지 못했습니다.",
      "메일 목록을 새로고침한 뒤 다시 선택하세요."
    );

    return NextResponse.json(
      { error: guidance.message, recoveryAction: guidance.recoveryAction },
      { status: 502 }
    );
  }
}
