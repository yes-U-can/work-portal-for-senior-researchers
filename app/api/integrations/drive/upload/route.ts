import { NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
import { normalizeConnectorError } from "@/lib/integrations/connector-error";
import { getGoogleAccessTokenForTenant } from "@/lib/integrations/google-token";
import { uploadDriveFile } from "@/lib/integrations/drive-service";
import { getCurrentUser } from "@/lib/session";
import { resolveTenantAccessForUser } from "@/lib/tenant-access";

export async function POST(request: Request) {
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
        recoveryAction: "대시보드에서 Drive를 먼저 연결하세요."
      },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        error: "업로드할 파일이 없습니다.",
        recoveryAction: "파일을 선택한 뒤 다시 업로드하세요."
      },
      { status: 400 }
    );
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const uploaded = await uploadDriveFile({
      accessToken,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      bytes
    });

    return NextResponse.json({
      file: uploaded
    });
  } catch (error) {
    const guidance = normalizeConnectorError(
      error,
      "파일 업로드에 실패했습니다.",
      "Drive 연결 상태를 확인한 뒤 다시 업로드하세요."
    );

    return NextResponse.json(
      { error: guidance.message, recoveryAction: guidance.recoveryAction },
      { status: 502 }
    );
  }
}
