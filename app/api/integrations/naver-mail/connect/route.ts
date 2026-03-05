import { NextResponse } from "next/server";
import { IntegrationProvider, IntegrationStatus, Role } from "@prisma/client";
import { z } from "zod";
import { hasRoleOrAbove } from "@/lib/authorization";
import { normalizeConnectorError } from "@/lib/integrations/connector-error";
import { upsertIntegrationToken } from "@/lib/integrations/account-store";
import { verifyNaverMailImap } from "@/lib/integrations/naver-mail-service";
import { getCurrentUser } from "@/lib/session";
import { resolveTenantAccessForUser } from "@/lib/tenant-access";

export const runtime = "nodejs";

const connectBodySchema = z.object({
  email: z.string().email(),
  appPassword: z.string().min(1)
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await resolveTenantAccessForUser(user);
  if (!access || !hasRoleOrAbove(access.role, Role.ADMIN)) {
    return NextResponse.json({ error: "Integration admin role is required." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = connectBodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "올바른 이메일과 앱 비밀번호를 입력하세요.",
        recoveryAction: "네이버 계정 이메일과 앱 비밀번호를 다시 확인해 입력하세요."
      },
      { status: 400 }
    );
  }

  try {
    await verifyNaverMailImap({
      email: parsed.data.email,
      appPassword: parsed.data.appPassword
    });

    await upsertIntegrationToken({
      tenantId: access.tenantId,
      provider: IntegrationProvider.NAVER_MAIL,
      providerAccountId: parsed.data.email,
      status: IntegrationStatus.CONNECTED,
      accessToken: parsed.data.appPassword,
      refreshToken: null,
      expiresAt: null,
      scope: "imap"
    });

    return NextResponse.json({
      ok: true,
      provider: IntegrationProvider.NAVER_MAIL,
      providerAccountId: parsed.data.email
    });
  } catch (error) {
    const guidance = normalizeConnectorError(
      error,
      "네이버메일 연결에 실패했습니다.",
      "2단계 인증과 앱 비밀번호를 확인한 뒤 다시 연결하세요."
    );

    return NextResponse.json(
      { error: guidance.message, recoveryAction: guidance.recoveryAction },
      { status: 502 }
    );
  }
}
