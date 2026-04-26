import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { hasRoleOrAbove } from "@/lib/authorization";
import { getCurrentUser, type AppUser } from "@/lib/session";
import { resolveTenantAccessForUser, type TenantAccessContext } from "@/lib/tenant-access";
import {
  canManageSiteSystemSettings,
  getSiteAdminAccount,
  isAllowedSiteAdminEmail
} from "@/lib/site-admin/allowed-users";

export type SiteAdminAccess = {
  user: AppUser;
  tenant: TenantAccessContext;
  appUserId: string;
  displayName: string;
  canManageSystemSettings: boolean;
};

export async function resolveSiteAdminAccess(): Promise<SiteAdminAccess | null> {
  const user = await getCurrentUser();
  if (!user || !isAllowedSiteAdminEmail(user.email)) {
    return null;
  }

  const tenant = await resolveTenantAccessForUser(user);
  if (!tenant || !hasRoleOrAbove(tenant.role, Role.MEMBER)) {
    return null;
  }

  const appUser = await db.user.findUnique({
    where: { email: user.email },
    select: { id: true }
  });

  if (!appUser) {
    return null;
  }

  const account = getSiteAdminAccount(user.email);
  const profile = await db.authorProfile.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.tenantId,
        userId: appUser.id
      }
    },
    create: {
      tenantId: tenant.tenantId,
      userId: appUser.id,
      displayName: account?.defaultDisplayName ?? user.name ?? "관리자"
    },
    update: {}
  });

  return {
    user,
    tenant,
    appUserId: appUser.id,
    displayName: profile.displayName,
    canManageSystemSettings: canManageSiteSystemSettings(user.email)
  };
}

export async function requireSiteAdminAccess(): Promise<SiteAdminAccess> {
  const access = await resolveSiteAdminAccess();
  if (!access) {
    throw new Error("SITE_ADMIN_ACCESS_DENIED");
  }

  return access;
}
