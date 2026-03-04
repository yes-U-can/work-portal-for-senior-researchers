import { NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
import { getLatestIntegrationHealth } from "@/lib/integrations/account-store";
import { getCurrentUser } from "@/lib/session";
import { resolveTenantAccessForUser } from "@/lib/tenant-access";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await resolveTenantAccessForUser(user);
  if (!access) {
    return NextResponse.json({ error: "Tenant access not found." }, { status: 403 });
  }

  const health = await getLatestIntegrationHealth(access.tenantId, IntegrationProvider.BAND);
  return NextResponse.json(health);
}
