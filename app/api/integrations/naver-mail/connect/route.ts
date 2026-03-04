import { NextResponse } from "next/server";
import { IntegrationProvider, IntegrationStatus, Role } from "@prisma/client";
import { z } from "zod";
import { hasRoleOrAbove } from "@/lib/authorization";
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
    return NextResponse.json({ error: "Valid email and appPassword are required." }, { status: 400 });
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to connect Naver Mail." },
      { status: 502 }
    );
  }
}
