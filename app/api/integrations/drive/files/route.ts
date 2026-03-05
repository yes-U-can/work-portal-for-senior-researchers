import { NextRequest, NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
import { normalizeConnectorError } from "@/lib/integrations/connector-error";
import { listDriveFiles } from "@/lib/integrations/drive-service";
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

  const accessToken = await getGoogleAccessTokenForTenant(access.tenantId, IntegrationProvider.GOOGLE_DRIVE);
  if (!accessToken) {
    return NextResponse.json(
      {
        error: "Google Drive가 연결되어 있지 않습니다.",
        recoveryAction: "대시보드에서 Drive 연결을 시작한 뒤 다시 시도하세요."
      },
      { status: 400 }
    );
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();

  try {
    const files = await listDriveFiles({
      accessToken,
      query
    });
    return NextResponse.json({ files });
  } catch (error) {
    const guidance = normalizeConnectorError(
      error,
      "Drive 파일 목록을 불러오지 못했습니다.",
      "잠시 후 다시 시도하거나 Drive를 재연결하세요."
    );

    return NextResponse.json(
      { error: guidance.message, recoveryAction: guidance.recoveryAction },
      { status: 502 }
    );
  }
}
