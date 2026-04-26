import { Prisma, SiteContentVisibility, SitePostCategory } from "@prisma/client";
import { db } from "@/lib/db";
import type { SiteAdminAccess } from "@/lib/site-admin/access";

export type SiteAdminOverviewFilters = {
  q?: string;
  category?: SitePostCategory;
  visibility?: SiteContentVisibility;
  label?: string;
  resourceWorkshop?: string;
  scheduleWorkshop?: string;
  sort?: "created" | "updated";
};

export async function getSiteAdminOverview(access: SiteAdminAccess, filters: SiteAdminOverviewFilters = {}) {
  const trashOwnershipFilter = access.canManageSystemSettings ? {} : { authorUserId: access.appUserId };
  const postWhere: Prisma.SitePostWhereInput = {
    tenantId: access.tenant.tenantId,
    deletedAt: null,
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.visibility ? { visibility: filters.visibility } : {}),
    ...(filters.label ? { labels: { has: filters.label } } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" } },
            { body: { contains: filters.q, mode: "insensitive" } }
          ]
        }
      : {})
  };
  const resourceWhere: Prisma.SiteResourceWhereInput = {
    tenantId: access.tenant.tenantId,
    deletedAt: null,
    ...(filters.resourceWorkshop ? { workshopSlug: filters.resourceWorkshop } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" } },
            { session: { contains: filters.q, mode: "insensitive" } },
            { description: { contains: filters.q, mode: "insensitive" } },
            { url: { contains: filters.q, mode: "insensitive" } }
          ]
        }
      : {})
  };
  const scheduleWhere: Prisma.WorkshopScheduleWhereInput = {
    tenantId: access.tenant.tenantId,
    deletedAt: null,
    ...(filters.scheduleWorkshop ? { workshopSlug: filters.scheduleWorkshop } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" } },
            { description: { contains: filters.q, mode: "insensitive" } },
            { applicationFormUrl: { contains: filters.q, mode: "insensitive" } }
          ]
        }
      : {})
  };
  const sortField = filters.sort === "created" ? "createdAt" : "updatedAt";

  const [
    posts,
    deletedPosts,
    resources,
    deletedResources,
    schedules,
    deletedSchedules,
    assistantLinks,
    deletedAssistantLinks,
    profile,
    auditLogs
  ] = await Promise.all([
    db.sitePost.findMany({
      where: postWhere,
      orderBy: [{ isPinned: "desc" }, { [sortField]: "desc" }],
      take: 20,
      include: {
        author: {
          select: {
            email: true,
            authorProfiles: {
              where: { tenantId: access.tenant.tenantId },
              select: { displayName: true },
              take: 1
            }
          }
        }
      }
    }),
    db.sitePost.findMany({
      where: {
        tenantId: access.tenant.tenantId,
        deletedAt: { not: null },
        ...trashOwnershipFilter
      },
      orderBy: { deletedAt: "desc" },
      take: 20,
      include: {
        author: {
          select: {
            email: true,
            authorProfiles: {
              where: { tenantId: access.tenant.tenantId },
              select: { displayName: true },
              take: 1
            }
          }
        }
      }
    }),
    db.siteResource.findMany({
      where: resourceWhere,
      orderBy: { [sortField]: "desc" },
      take: 20
    }),
    db.siteResource.findMany({
      where: {
        tenantId: access.tenant.tenantId,
        deletedAt: { not: null },
        ...trashOwnershipFilter
      },
      orderBy: { deletedAt: "desc" },
      take: 20
    }),
    db.workshopSchedule.findMany({
      where: scheduleWhere,
      orderBy: [{ workshopStartsAt: "desc" }, { [sortField]: "desc" }],
      take: 30,
      include: {
        author: {
          select: {
            email: true,
            authorProfiles: {
              where: { tenantId: access.tenant.tenantId },
              select: { displayName: true },
              take: 1
            }
          }
        }
      }
    }),
    db.workshopSchedule.findMany({
      where: {
        tenantId: access.tenant.tenantId,
        deletedAt: { not: null }
      },
      orderBy: { deletedAt: "desc" },
      take: 20,
      include: {
        author: {
          select: {
            email: true,
            authorProfiles: {
              where: { tenantId: access.tenant.tenantId },
              select: { displayName: true },
              take: 1
            }
          }
        }
      }
    }),
    db.siteAssistantLink.findMany({
      where: {
        tenantId: access.tenant.tenantId,
        deletedAt: null
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 30,
      include: {
        author: {
          select: {
            email: true,
            authorProfiles: {
              where: { tenantId: access.tenant.tenantId },
              select: { displayName: true },
              take: 1
            }
          }
        }
      }
    }),
    db.siteAssistantLink.findMany({
      where: {
        tenantId: access.tenant.tenantId,
        deletedAt: { not: null },
        ...(access.canManageSystemSettings ? {} : { id: "__restricted__" })
      },
      orderBy: { deletedAt: "desc" },
      take: 20,
      include: {
        author: {
          select: {
            email: true,
            authorProfiles: {
              where: { tenantId: access.tenant.tenantId },
              select: { displayName: true },
              take: 1
            }
          }
        }
      }
    }),
    db.authorProfile.findUnique({
      where: {
        tenantId_userId: {
          tenantId: access.tenant.tenantId,
          userId: access.appUserId
        }
      }
    }),
    db.auditLog.findMany({
      where: {
        tenantId: access.tenant.tenantId,
        resourceType: {
          in: ["SitePost", "SiteResource", "WorkshopSchedule", "SiteAssistantLink", "AuthorProfile"]
        }
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        actorUser: {
          select: {
            email: true,
            authorProfiles: {
              where: { tenantId: access.tenant.tenantId },
              select: { displayName: true },
              take: 1
            }
          }
        }
      }
    })
  ]);

  const publicPostsCount = posts.filter((post) => post.visibility === SiteContentVisibility.PUBLIC).length;
  const draftPostsCount = posts.filter((post) => post.visibility === SiteContentVisibility.DRAFT).length;

  return {
    posts,
    deletedPosts,
    resources,
    deletedResources,
    schedules,
    deletedSchedules,
    assistantLinks,
    deletedAssistantLinks,
    profile,
    auditLogs,
    stats: {
      postsCount: posts.length,
      publicPostsCount,
      draftPostsCount,
      resourcesCount: resources.length,
      schedulesCount: schedules.length,
      assistantLinksCount: assistantLinks.length,
      trashCount: deletedPosts.length + deletedResources.length + deletedSchedules.length + deletedAssistantLinks.length
    }
  };
}
