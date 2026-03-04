import { NextRequest, NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
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
    return NextResponse.json({ error: "Google Drive is not connected." }, { status: 400 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();

  try {
    const files = await listDriveFiles({
      accessToken,
      query
    });
    return NextResponse.json({ files });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load Drive files." },
      { status: 502 }
    );
  }
}
