import { NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
import { getLatestDecryptedIntegrationToken } from "@/lib/integrations/account-store";
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
    return NextResponse.json({ error: "Naver Mail is not connected." }, { status: 400 });
  }

  const { uid } = await context.params;
  const uidNumber = Number.parseInt(uid, 10);
  if (Number.isNaN(uidNumber) || uidNumber <= 0) {
    return NextResponse.json({ error: "Valid uid is required." }, { status: 400 });
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load Naver Mail message." },
      { status: 502 }
    );
  }
}
