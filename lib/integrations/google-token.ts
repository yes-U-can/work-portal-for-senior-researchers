import { IntegrationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { encryptText } from "@/lib/crypto";
import { env } from "@/lib/env";
import { getLatestDecryptedIntegrationToken } from "@/lib/integrations/account-store";
import { refreshGoogleAccessToken } from "@/lib/integrations/google-oauth";

const EXPIRY_BUFFER_MS = 60_000;

export async function getGoogleAccessTokenForTenant(
  tenantId: string,
  provider: "GOOGLE_DRIVE" | "GMAIL"
): Promise<string | null> {
  const token = await getLatestDecryptedIntegrationToken(tenantId, provider);
  if (!token) {
    return null;
  }

  if (!token.expiresAt || token.expiresAt.getTime() - Date.now() > EXPIRY_BUFFER_MS) {
    return token.accessToken;
  }

  if (!token.refreshToken) {
    await db.integrationAccount.update({
      where: { id: token.accountId },
      data: { status: IntegrationStatus.EXPIRED }
    });
    return null;
  }

  try {
    const refreshed = await refreshGoogleAccessToken({
      refreshToken: token.refreshToken
    });

    const expiresAt = refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000)
      : token.expiresAt;

    await db.integrationToken.create({
      data: {
        integrationAccountId: token.accountId,
        accessTokenEncrypted: encryptText(refreshed.access_token, env.ENCRYPTION_KEY),
        refreshTokenEncrypted: encryptText(token.refreshToken, env.ENCRYPTION_KEY),
        expiresAt,
        scope: refreshed.scope ?? token.scope
      }
    });

    await db.integrationAccount.update({
      where: { id: token.accountId },
      data: { status: IntegrationStatus.CONNECTED }
    });

    return refreshed.access_token;
  } catch {
    await db.integrationAccount.update({
      where: { id: token.accountId },
      data: { status: IntegrationStatus.EXPIRED }
    });
    return null;
  }
}
