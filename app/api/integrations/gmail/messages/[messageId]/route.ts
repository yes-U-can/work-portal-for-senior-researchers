import { NextResponse } from "next/server";
import { IntegrationProvider } from "@prisma/client";
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
    return NextResponse.json({ error: "Gmail is not connected." }, { status: 400 });
  }

  const { messageId } = await context.params;
  if (!messageId) {
    return NextResponse.json({ error: "messageId is required." }, { status: 400 });
  }

  try {
    const message = await getGmailMessage(accessToken, messageId);
    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load Gmail message." },
      { status: 502 }
    );
  }
}
