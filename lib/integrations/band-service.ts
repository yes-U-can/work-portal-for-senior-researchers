import { IntegrationProvider } from "@prisma/client";
import { db } from "@/lib/db";
import { decryptText } from "@/lib/crypto";
import { env } from "@/lib/env";

export function getBandApiBaseUrl() {
  return env.BAND_API_BASE_URL;
}

export async function getBandAccessTokenForTenant(tenantId: string): Promise<string | null> {
  const account = await db.integrationAccount.findFirst({
    where: {
      tenantId,
      provider: IntegrationProvider.BAND
    },
    orderBy: {
      updatedAt: "desc"
    },
    include: {
      tokens: {
        orderBy: {
          updatedAt: "desc"
        },
        take: 1
      }
    }
  });

  const latestToken = account?.tokens[0];
  const encryptionKey = env.ENCRYPTION_KEY;

  if (!latestToken || !encryptionKey) {
    return null;
  }

  return decryptText(latestToken.accessTokenEncrypted, encryptionKey);
}

export async function callBandApi<T>(
  accessToken: string,
  path: string,
  params: Record<string, string | undefined> = {}
): Promise<T> {
  const requestUrl = new URL(path, getBandApiBaseUrl());
  requestUrl.searchParams.set("access_token", accessToken);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      requestUrl.searchParams.set(key, value);
    }
  }

  const response = await fetch(requestUrl, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`BAND API request failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as T;
}
