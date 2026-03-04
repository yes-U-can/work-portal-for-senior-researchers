import { IntegrationProvider, IntegrationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { decryptText, encryptText } from "@/lib/crypto";
import { env } from "@/lib/env";
import type { IntegrationHealth } from "@/lib/integrations/types";

type UpsertIntegrationTokenInput = {
  tenantId: string;
  provider: IntegrationProvider;
  providerAccountId: string;
  status?: IntegrationStatus;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scope?: string | null;
};

export type DecryptedIntegrationToken = {
  accountId: string;
  providerAccountId: string;
  status: IntegrationStatus;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
  updatedAt: Date;
};

export async function upsertIntegrationToken(input: UpsertIntegrationTokenInput) {
  const account = await db.integrationAccount.upsert({
    where: {
      tenantId_provider_providerAccountId: {
        tenantId: input.tenantId,
        provider: input.provider,
        providerAccountId: input.providerAccountId
      }
    },
    update: {
      status: input.status ?? IntegrationStatus.CONNECTED
    },
    create: {
      tenantId: input.tenantId,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      status: input.status ?? IntegrationStatus.CONNECTED
    }
  });

  await db.integrationToken.deleteMany({
    where: {
      integrationAccountId: account.id
    }
  });

  await db.integrationToken.create({
    data: {
      integrationAccountId: account.id,
      accessTokenEncrypted: encryptText(input.accessToken, env.ENCRYPTION_KEY),
      refreshTokenEncrypted: input.refreshToken
        ? encryptText(input.refreshToken, env.ENCRYPTION_KEY)
        : null,
      expiresAt: input.expiresAt ?? null,
      scope: input.scope ?? null
    }
  });

  return account;
}

export async function getLatestIntegrationHealth(
  tenantId: string,
  provider: IntegrationProvider
): Promise<IntegrationHealth> {
  const account = await db.integrationAccount.findFirst({
    where: {
      tenantId,
      provider
    },
    orderBy: {
      updatedAt: "desc"
    },
    select: {
      status: true,
      providerAccountId: true,
      updatedAt: true
    }
  });

  return {
    provider,
    connected: Boolean(account),
    status: account?.status ?? "NOT_CONNECTED",
    providerAccountId: account?.providerAccountId ?? null,
    updatedAt: account?.updatedAt ?? null
  };
}

export async function getLatestDecryptedIntegrationToken(
  tenantId: string,
  provider: IntegrationProvider
): Promise<DecryptedIntegrationToken | null> {
  const account = await db.integrationAccount.findFirst({
    where: {
      tenantId,
      provider
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
  if (!account || !latestToken) {
    return null;
  }

  return {
    accountId: account.id,
    providerAccountId: account.providerAccountId,
    status: account.status,
    accessToken: decryptText(latestToken.accessTokenEncrypted, env.ENCRYPTION_KEY),
    refreshToken: latestToken.refreshTokenEncrypted
      ? decryptText(latestToken.refreshTokenEncrypted, env.ENCRYPTION_KEY)
      : null,
    expiresAt: latestToken.expiresAt,
    scope: latestToken.scope,
    updatedAt: latestToken.updatedAt
  };
}

export async function updateIntegrationStatus(accountId: string, status: IntegrationStatus) {
  await db.integrationAccount.update({
    where: {
      id: accountId
    },
    data: {
      status
    }
  });
}
