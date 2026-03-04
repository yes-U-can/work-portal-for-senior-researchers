import { NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
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
    return NextResponse.json({ error: "Google Drive is not connected." }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file." },
      { status: 502 }
    );
  }
}
