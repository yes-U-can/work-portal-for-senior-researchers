import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { AppUser } from "@/lib/session";

export type TenantAccessContext = {
  tenantId: string;
  tenantSlug: string;
  role: Role;
};

function isDevAutoProvisionEnabled() {
  return !env.IS_PRODUCTION && env.DEV_AUTO_PROVISION;
}

export async function resolveTenantAccessForUser(user: AppUser): Promise<TenantAccessContext | null> {
  const activeTenantSlug = env.ACTIVE_TENANT_SLUG;
  const allowAutoProvision = isDevAutoProvisionEnabled();

  const appUser = await db.user.upsert({
    where: { email: user.email },
    create: {
      email: user.email,
      name: user.name
    },
    update: {
      name: user.name
    }
  });

  let tenant = await db.tenant.findUnique({
    where: { slug: activeTenantSlug }
  });

  if (!tenant && allowAutoProvision) {
    tenant = await db.tenant.create({
      data: {
        name: "SICP Senior Research Lab",
        slug: activeTenantSlug
      }
    });
  }

  if (!tenant) {
    return null;
  }

  let membership = await db.membership.findUnique({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: appUser.id
      }
    }
  });

  if (!membership && allowAutoProvision) {
    membership = await db.membership.create({
      data: {
        tenantId: tenant.id,
        userId: appUser.id,
        role: Role.OWNER
      }
    });
  }

  if (!membership) {
    return null;
  }

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    role: membership.role
  };
}
