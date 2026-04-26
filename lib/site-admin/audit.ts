import { ActionResult, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SiteAdminAccess } from "@/lib/site-admin/access";

type SiteAdminAuditInput = {
  action: string;
  resourceType: string;
  resourceId?: string;
  metaJson?: Prisma.InputJsonValue;
};

export async function recordSiteAdminAudit(access: SiteAdminAccess, input: SiteAdminAuditInput) {
  try {
    await db.auditLog.create({
      data: {
        tenantId: access.tenant.tenantId,
        actorUserId: access.appUserId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        result: ActionResult.SUCCESS,
        metaJson: input.metaJson
      }
    });
  } catch (error) {
    console.error("Failed to write site admin audit log", error);
  }
}
