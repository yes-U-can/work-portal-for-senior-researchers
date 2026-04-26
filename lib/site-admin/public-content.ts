import { SiteContentVisibility, type SiteAssistantLink, type WorkshopSchedule } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { siteWorkshopOptions } from "@/lib/site-admin/constants";

type PublicWorkshopStatus = "OPEN" | "CLOSED" | "ENDED" | "NO_SCHEDULE";

const publicWorkshopStatusLabels: Record<PublicWorkshopStatus, string> = {
  OPEN: "신청 중",
  CLOSED: "신청 마감",
  ENDED: "종료된 워크숍입니다",
  NO_SCHEDULE: "등록된 일정 없음"
};

export async function getPublicSiteContent() {
  const tenant = await db.tenant.findUnique({
    where: { slug: env.ACTIVE_TENANT_SLUG },
    select: { id: true, slug: true, name: true }
  });

  if (!tenant) {
    return {
      tenant: null,
      notices: [],
      resources: [],
      schedules: [],
      workshops: siteWorkshopOptions.map((workshop) => ({
        ...workshop,
        status: "NO_SCHEDULE" as PublicWorkshopStatus,
        statusLabel: publicWorkshopStatusLabels.NO_SCHEDULE,
        applicationFormUrl: null,
        applicationStartsAt: null,
        applicationEndsAt: null,
        workshopStartsAt: null,
        workshopEndsAt: null
      })),
      aiAssistants: []
    };
  }

  const [notices, resources, schedules, assistantLinks] = await Promise.all([
    db.sitePost.findMany({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        visibility: SiteContentVisibility.PUBLIC
      },
      orderBy: [{ isPinned: "desc" }, { pinnedRank: "asc" }, { updatedAt: "desc" }],
      include: {
        author: {
          select: {
            email: true,
            authorProfiles: {
              where: { tenantId: tenant.id },
              select: { displayName: true },
              take: 1
            }
          }
        }
      }
    }),
    db.siteResource.findMany({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        visibility: SiteContentVisibility.PUBLIC
      },
      orderBy: [{ workshopSlug: "asc" }, { session: "asc" }, { updatedAt: "desc" }]
    }),
    db.workshopSchedule.findMany({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        visibility: SiteContentVisibility.PUBLIC
      },
      orderBy: [{ workshopStartsAt: "asc" }, { updatedAt: "desc" }]
    }),
    db.siteAssistantLink.findMany({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        visibility: SiteContentVisibility.PUBLIC
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }]
    })
  ]);

  const schedulesBySlug = new Map<string, WorkshopSchedule[]>();
  for (const schedule of schedules) {
    const items = schedulesBySlug.get(schedule.workshopSlug) ?? [];
    items.push(schedule);
    schedulesBySlug.set(schedule.workshopSlug, items);
  }

  return {
    tenant,
    notices: notices.map((notice) => ({
      id: notice.id,
      title: notice.title,
      body: notice.body,
      category: notice.category,
      labels: notice.labels,
      relatedLinks: notice.relatedLinks ?? [],
      attachments: notice.attachments ?? [],
      isPinned: notice.isPinned,
      pinnedRank: notice.pinnedRank,
      authorName: notice.author?.authorProfiles[0]?.displayName ?? notice.author?.email ?? "관리자",
      createdAt: notice.createdAt.toISOString(),
      updatedAt: notice.updatedAt.toISOString()
    })),
    resources: resources.map((resource) => ({
      id: resource.id,
      workshopSlug: resource.workshopSlug,
      session: resource.session,
      title: resource.title,
      description: resource.description,
      url: resource.url,
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString()
    })),
    aiAssistants: assistantLinks.map(formatAssistantLink),
    schedules: schedules.map((schedule) => {
      const status = resolveWorkshopStatus(schedule);

      return {
        id: schedule.id,
        workshopSlug: schedule.workshopSlug,
        title: schedule.title,
        description: schedule.description,
        status,
        statusLabel: publicWorkshopStatusLabels[status],
        applicationFormUrl: status === "OPEN" ? schedule.applicationFormUrl ?? null : null,
        applicationStartsAt: schedule.applicationStartsAt?.toISOString() ?? null,
        applicationEndsAt: schedule.applicationEndsAt?.toISOString() ?? null,
        workshopStartsAt: schedule.workshopStartsAt.toISOString(),
        workshopEndsAt: schedule.workshopEndsAt?.toISOString() ?? null,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString()
      };
    }),
    workshops: siteWorkshopOptions.map((workshop) => {
      const schedule = pickDisplaySchedule(schedulesBySlug.get(workshop.slug) ?? []);
      const status = resolveWorkshopStatus(schedule);

      return {
        ...workshop,
        status,
        statusLabel: publicWorkshopStatusLabels[status],
        applicationFormUrl: status === "OPEN" ? schedule?.applicationFormUrl ?? null : null,
        applicationStartsAt: schedule?.applicationStartsAt?.toISOString() ?? null,
        applicationEndsAt: schedule?.applicationEndsAt?.toISOString() ?? null,
        workshopStartsAt: schedule?.workshopStartsAt?.toISOString() ?? null,
        workshopEndsAt: schedule?.workshopEndsAt?.toISOString() ?? null
      };
    })
  };
}

function formatAssistantLink(link: SiteAssistantLink) {
  return {
    id: link.id,
    kind: link.kind,
    title: link.title,
    description: link.description,
    url: link.url,
    glyph: link.glyph,
    sortOrder: link.sortOrder,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString()
  };
}

function pickDisplaySchedule(schedules: WorkshopSchedule[]) {
  const now = new Date();
  const upcoming = schedules
    .filter((schedule) => (schedule.workshopEndsAt ?? schedule.workshopStartsAt) >= now)
    .sort((a, b) => a.workshopStartsAt.getTime() - b.workshopStartsAt.getTime());

  if (upcoming[0]) {
    return upcoming[0];
  }

  return [...schedules].sort((a, b) => b.workshopStartsAt.getTime() - a.workshopStartsAt.getTime())[0];
}

function resolveWorkshopStatus(schedule: WorkshopSchedule | undefined): PublicWorkshopStatus {
  if (!schedule?.workshopStartsAt) {
    return "NO_SCHEDULE";
  }

  const now = new Date();
  const applicationStartsAt = schedule.applicationStartsAt;
  const applicationEndsAt = schedule.applicationEndsAt;
  const workshopEndsAt = schedule.workshopEndsAt ?? schedule.workshopStartsAt;

  if (applicationStartsAt && applicationEndsAt && applicationStartsAt <= now && now <= applicationEndsAt) {
    return "OPEN";
  }

  if (workshopEndsAt < now) {
    return "ENDED";
  }

  if (applicationEndsAt && applicationEndsAt < now) {
    return "CLOSED";
  }

  return "CLOSED";
}
