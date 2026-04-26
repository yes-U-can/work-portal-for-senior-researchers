"use server";

import { SiteAssistantKind, SiteContentVisibility, SitePostCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSiteAdminAccess } from "@/lib/site-admin/access";
import { recordSiteAdminAudit } from "@/lib/site-admin/audit";
import {
  sitePostLabelOptions,
  siteWorkshopOptions,
  type SiteWorkshopSlug
} from "@/lib/site-admin/constants";
import { sanitizePostBody } from "@/lib/site-admin/sanitize";

type LinkItem = {
  title: string;
  url: string;
};

const validCategories = new Set(Object.values(SitePostCategory));
const validVisibilities = new Set(Object.values(SiteContentVisibility));
const validAssistantKinds = new Set(Object.values(SiteAssistantKind));
const validWorkshopSlugs = new Set<string>(siteWorkshopOptions.map((workshop) => workshop.slug));
const validLabels = new Set<string>(sitePostLabelOptions);

export async function createSitePostAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  const title = readRequiredString(formData, "title");
  const body = sanitizePostBody(readRequiredString(formData, "body"));
  const category = readEnum(formData, "category", validCategories, SitePostCategory.GENERAL);
  const visibility = readEnum(formData, "visibility", validVisibilities, SiteContentVisibility.DRAFT);
  const labels = readLabels(formData);
  const relatedLinks = parseLinkLines(readOptionalString(formData, "relatedLinks"), 3);
  const attachments = readAttachments(formData);
  const requestedPinned = formData.get("isPinned") === "on";
  const isPinned = requestedPinned && (await canAddPinnedPost(access.tenant.tenantId));

  const post = await db.sitePost.create({
    data: {
      tenantId: access.tenant.tenantId,
      authorUserId: access.appUserId,
      title,
      body,
      category,
      visibility,
      labels,
      relatedLinks,
      attachments,
      isPinned,
      pinnedRank: isPinned ? 100 : null
    }
  });
  await recordSiteAdminAudit(access, {
    action: "site_post.create",
    resourceType: "SitePost",
    resourceId: post.id,
    metaJson: { category, visibility, labels }
  });

  revalidatePath("/site-admin");
  redirectWithMessage("created");
}

export async function updateSitePostAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  const id = readRequiredString(formData, "id");
  const post = await db.sitePost.findFirst({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: null
    }
  });

  if (!post || (!access.canManageSystemSettings && post.authorUserId !== access.appUserId)) {
    redirectWithError("post-permission");
  }

  const requestedPinned = formData.get("isPinned") === "on";
  const isPinned = requestedPinned && (post.isPinned || (await canAddPinnedPost(access.tenant.tenantId)));

  await db.sitePost.update({
    where: { id },
    data: {
      title: readRequiredString(formData, "title"),
      body: sanitizePostBody(readRequiredString(formData, "body")),
      category: readEnum(formData, "category", validCategories, SitePostCategory.GENERAL),
      visibility: readEnum(formData, "visibility", validVisibilities, SiteContentVisibility.DRAFT),
      labels: readLabels(formData),
      relatedLinks: parseLinkLines(readOptionalString(formData, "relatedLinks"), 3),
      attachments: readAttachments(formData),
      isPinned,
      pinnedRank: isPinned ? post.pinnedRank ?? 100 : null
    }
  });
  await recordSiteAdminAudit(access, {
    action: "site_post.update",
    resourceType: "SitePost",
    resourceId: id
  });

  revalidatePath("/site-admin");
  revalidatePath(`/site-admin/posts/${id}`);
  redirectWithMessage("updated");
}

export async function softDeleteSitePostAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  const id = readRequiredString(formData, "id");
  const post = await db.sitePost.findFirst({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: null
    }
  });

  if (!post || (!access.canManageSystemSettings && post.authorUserId !== access.appUserId)) {
    redirectWithError("post-permission");
  }

  await db.sitePost.update({
    where: { id },
    data: { deletedAt: new Date(), isPinned: false, pinnedRank: null }
  });
  await recordSiteAdminAudit(access, {
    action: "site_post.soft_delete",
    resourceType: "SitePost",
    resourceId: id
  });

  revalidatePath("/site-admin");
  redirectWithMessage("deleted");
}

export async function restoreSitePostAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  const id = readRequiredString(formData, "id");
  const post = await db.sitePost.findFirst({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: { not: null }
    }
  });

  if (!post || (!access.canManageSystemSettings && post.authorUserId !== access.appUserId)) {
    redirectWithError("post-permission");
  }

  await db.sitePost.update({
    where: { id },
    data: { deletedAt: null }
  });
  await recordSiteAdminAudit(access, {
    action: "site_post.restore",
    resourceType: "SitePost",
    resourceId: id
  });

  revalidatePath("/site-admin");
  redirectWithMessage("restored");
}

export async function permanentlyDeleteSitePostAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  if (!access.canManageSystemSettings) {
    redirectWithError("hard-delete-permission");
  }

  const id = readRequiredString(formData, "id");
  await db.sitePost.deleteMany({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: { not: null }
    }
  });
  await recordSiteAdminAudit(access, {
    action: "site_post.permanent_delete",
    resourceType: "SitePost",
    resourceId: id
  });

  revalidatePath("/site-admin");
  redirectWithMessage("hard-deleted");
}

export async function createSiteResourceAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  const workshopSlug = readWorkshopSlug(formData);

  const resource = await db.siteResource.create({
    data: {
      tenantId: access.tenant.tenantId,
      authorUserId: access.appUserId,
      workshopSlug,
      session: readRequiredString(formData, "session"),
      title: readRequiredString(formData, "title"),
      description: readOptionalString(formData, "description"),
      url: readRequiredHttpUrl(formData, "url"),
      visibility: readEnum(formData, "visibility", validVisibilities, SiteContentVisibility.PUBLIC)
    }
  });
  await recordSiteAdminAudit(access, {
    action: "site_resource.create",
    resourceType: "SiteResource",
    resourceId: resource.id,
    metaJson: { workshopSlug }
  });

  revalidatePath("/site-admin");
  redirectWithMessage("resource-created");
}

export async function updateSiteResourceAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  const id = readRequiredString(formData, "id");
  const resource = await db.siteResource.findFirst({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: null
    }
  });

  if (!resource || (!access.canManageSystemSettings && resource.authorUserId !== access.appUserId)) {
    redirectWithError("resource-permission");
  }

  await db.siteResource.update({
    where: { id },
    data: {
      workshopSlug: readWorkshopSlug(formData),
      session: readRequiredString(formData, "session"),
      title: readRequiredString(formData, "title"),
      description: readOptionalString(formData, "description"),
      url: readRequiredHttpUrl(formData, "url"),
      visibility: readEnum(formData, "visibility", validVisibilities, SiteContentVisibility.PUBLIC)
    }
  });
  await recordSiteAdminAudit(access, {
    action: "site_resource.update",
    resourceType: "SiteResource",
    resourceId: id
  });

  revalidatePath("/site-admin");
  redirectWithMessage("resource-updated");
}

export async function softDeleteSiteResourceAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  const id = readRequiredString(formData, "id");
  const resource = await db.siteResource.findFirst({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: null
    }
  });

  if (!resource || (!access.canManageSystemSettings && resource.authorUserId !== access.appUserId)) {
    redirectWithError("resource-permission");
  }

  await db.siteResource.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
  await recordSiteAdminAudit(access, {
    action: "site_resource.soft_delete",
    resourceType: "SiteResource",
    resourceId: id
  });

  revalidatePath("/site-admin");
  redirectWithMessage("resource-deleted");
}

export async function restoreSiteResourceAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  const id = readRequiredString(formData, "id");
  const resource = await db.siteResource.findFirst({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: { not: null }
    }
  });

  if (!resource || (!access.canManageSystemSettings && resource.authorUserId !== access.appUserId)) {
    redirectWithError("resource-permission");
  }

  await db.siteResource.update({
    where: { id },
    data: { deletedAt: null }
  });
  await recordSiteAdminAudit(access, {
    action: "site_resource.restore",
    resourceType: "SiteResource",
    resourceId: id
  });

  revalidatePath("/site-admin");
  redirectWithMessage("resource-restored");
}

export async function permanentlyDeleteSiteResourceAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  if (!access.canManageSystemSettings) {
    redirectWithError("hard-delete-permission");
  }

  const id = readRequiredString(formData, "id");
  await db.siteResource.deleteMany({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: { not: null }
    }
  });
  await recordSiteAdminAudit(access, {
    action: "site_resource.permanent_delete",
    resourceType: "SiteResource",
    resourceId: id
  });

  revalidatePath("/site-admin");
  redirectWithMessage("resource-hard-deleted");
}

export async function createWorkshopScheduleAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  const workshopSlug = readWorkshopSlug(formData);
  const scheduleDates = readWorkshopScheduleDates(formData);

  const schedule = await db.workshopSchedule.create({
    data: {
      tenantId: access.tenant.tenantId,
      authorUserId: access.appUserId,
      workshopSlug,
      title: readRequiredString(formData, "scheduleTitle"),
      description: readOptionalString(formData, "scheduleDescription"),
      applicationFormUrl: readOptionalHttpUrl(formData, "scheduleApplicationFormUrl"),
      ...scheduleDates,
      visibility: readEnum(formData, "scheduleVisibility", validVisibilities, SiteContentVisibility.PUBLIC)
    }
  });
  await recordSiteAdminAudit(access, {
    action: "workshop_schedule.create",
    resourceType: "WorkshopSchedule",
    resourceId: schedule.id,
    metaJson: { workshopSlug }
  });

  revalidatePath("/site-admin");
  redirectWithMessage("schedule-created");
}

export async function updateWorkshopScheduleAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  const id = readRequiredString(formData, "id");
  const schedule = await db.workshopSchedule.findFirst({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: null
    }
  });

  if (!schedule) {
    redirectWithError("schedule-permission");
  }

  const workshopSlug = readWorkshopSlug(formData);
  const scheduleDates = readWorkshopScheduleDates(formData);

  await db.workshopSchedule.update({
    where: { id },
    data: {
      workshopSlug,
      title: readRequiredString(formData, "scheduleTitle"),
      description: readOptionalString(formData, "scheduleDescription"),
      applicationFormUrl: readOptionalHttpUrl(formData, "scheduleApplicationFormUrl"),
      ...scheduleDates,
      visibility: readEnum(formData, "scheduleVisibility", validVisibilities, SiteContentVisibility.PUBLIC)
    }
  });
  await recordSiteAdminAudit(access, {
    action: "workshop_schedule.update",
    resourceType: "WorkshopSchedule",
    resourceId: id,
    metaJson: { workshopSlug }
  });

  revalidatePath("/site-admin");
  redirectWithMessage("schedule-updated");
}

export async function softDeleteWorkshopScheduleAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  const id = readRequiredString(formData, "id");

  await db.workshopSchedule.updateMany({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: null
    },
    data: { deletedAt: new Date() }
  });
  await recordSiteAdminAudit(access, {
    action: "workshop_schedule.soft_delete",
    resourceType: "WorkshopSchedule",
    resourceId: id
  });

  revalidatePath("/site-admin");
  redirectWithMessage("schedule-deleted");
}

export async function restoreWorkshopScheduleAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  const id = readRequiredString(formData, "id");

  await db.workshopSchedule.updateMany({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: { not: null }
    },
    data: { deletedAt: null }
  });
  await recordSiteAdminAudit(access, {
    action: "workshop_schedule.restore",
    resourceType: "WorkshopSchedule",
    resourceId: id
  });

  revalidatePath("/site-admin");
  redirectWithMessage("schedule-restored");
}

export async function permanentlyDeleteWorkshopScheduleAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  if (!access.canManageSystemSettings) {
    redirectWithError("hard-delete-permission");
  }

  const id = readRequiredString(formData, "id");
  await db.workshopSchedule.deleteMany({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: { not: null }
    }
  });
  await recordSiteAdminAudit(access, {
    action: "workshop_schedule.permanent_delete",
    resourceType: "WorkshopSchedule",
    resourceId: id
  });

  revalidatePath("/site-admin");
  redirectWithMessage("schedule-hard-deleted");
}

export async function createAssistantLinkAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  requireSystemManager(access);

  const assistantLink = await db.siteAssistantLink.create({
    data: {
      tenantId: access.tenant.tenantId,
      authorUserId: access.appUserId,
      kind: readEnum(formData, "assistantKind", validAssistantKinds, SiteAssistantKind.GPTS),
      title: readRequiredString(formData, "assistantTitle"),
      description: readOptionalString(formData, "assistantDescription"),
      url: readRequiredHttpUrl(formData, "assistantUrl"),
      glyph: readGlyph(formData),
      sortOrder: readSortOrder(formData),
      visibility: readEnum(formData, "assistantVisibility", validVisibilities, SiteContentVisibility.PUBLIC)
    }
  });
  await recordSiteAdminAudit(access, {
    action: "assistant_link.create",
    resourceType: "SiteAssistantLink",
    resourceId: assistantLink.id,
    metaJson: { kind: assistantLink.kind }
  });

  revalidatePath("/site-admin");
  redirectWithMessage("assistant-created");
}

export async function updateAssistantLinkAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  requireSystemManager(access);

  const id = readRequiredString(formData, "id");
  const assistantLink = await db.siteAssistantLink.findFirst({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: null
    }
  });

  if (!assistantLink) {
    redirectWithError("assistant-permission");
  }

  await db.siteAssistantLink.update({
    where: { id },
    data: {
      kind: readEnum(formData, "assistantKind", validAssistantKinds, SiteAssistantKind.GPTS),
      title: readRequiredString(formData, "assistantTitle"),
      description: readOptionalString(formData, "assistantDescription"),
      url: readRequiredHttpUrl(formData, "assistantUrl"),
      glyph: readGlyph(formData),
      sortOrder: readSortOrder(formData),
      visibility: readEnum(formData, "assistantVisibility", validVisibilities, SiteContentVisibility.PUBLIC)
    }
  });
  await recordSiteAdminAudit(access, {
    action: "assistant_link.update",
    resourceType: "SiteAssistantLink",
    resourceId: id
  });

  revalidatePath("/site-admin");
  redirectWithMessage("assistant-updated");
}

export async function softDeleteAssistantLinkAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  requireSystemManager(access);

  const id = readRequiredString(formData, "id");
  await db.siteAssistantLink.updateMany({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: null
    },
    data: { deletedAt: new Date() }
  });
  await recordSiteAdminAudit(access, {
    action: "assistant_link.soft_delete",
    resourceType: "SiteAssistantLink",
    resourceId: id
  });

  revalidatePath("/site-admin");
  redirectWithMessage("assistant-deleted");
}

export async function restoreAssistantLinkAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  requireSystemManager(access);

  const id = readRequiredString(formData, "id");
  await db.siteAssistantLink.updateMany({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: { not: null }
    },
    data: { deletedAt: null }
  });
  await recordSiteAdminAudit(access, {
    action: "assistant_link.restore",
    resourceType: "SiteAssistantLink",
    resourceId: id
  });

  revalidatePath("/site-admin");
  redirectWithMessage("assistant-restored");
}

export async function permanentlyDeleteAssistantLinkAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  requireSystemManager(access);

  const id = readRequiredString(formData, "id");
  await db.siteAssistantLink.deleteMany({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: { not: null }
    }
  });
  await recordSiteAdminAudit(access, {
    action: "assistant_link.permanent_delete",
    resourceType: "SiteAssistantLink",
    resourceId: id
  });

  revalidatePath("/site-admin");
  redirectWithMessage("assistant-hard-deleted");
}

export async function updateAuthorProfileAction(formData: FormData) {
  const access = await requireSiteAdminAccess();
  const displayName = readRequiredString(formData, "displayName");

  await db.authorProfile.update({
    where: {
      tenantId_userId: {
        tenantId: access.tenant.tenantId,
        userId: access.appUserId
      }
    },
    data: { displayName }
  });
  await recordSiteAdminAudit(access, {
    action: "author_profile.update",
    resourceType: "AuthorProfile",
    resourceId: access.appUserId
  });

  revalidatePath("/site-admin");
  redirectWithMessage("profile-updated");
}

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key)?.toString().trim();
  if (!value) {
    throw new Error(`Missing required field: ${key}`);
  }

  return value;
}

function readOptionalString(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() || null;
}

function readEnum<T extends string>(formData: FormData, key: string, validValues: Set<T>, fallback: T) {
  const value = formData.get(key)?.toString();
  return value && validValues.has(value as T) ? (value as T) : fallback;
}

function readLabels(formData: FormData) {
  return formData
    .getAll("labels")
    .map((value) => value.toString())
    .filter((label) => validLabels.has(label));
}

function readWorkshopSlug(formData: FormData): SiteWorkshopSlug {
  const value = readRequiredString(formData, "workshopSlug");
  if (!validWorkshopSlugs.has(value)) {
    throw new Error(`Invalid workshop slug: ${value}`);
  }

  return value as SiteWorkshopSlug;
}

function readOptionalDate(formData: FormData, key: string) {
  const value = readOptionalString(formData, key);
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date field: ${key}`);
  }

  return date;
}

function readRequiredDate(formData: FormData, key: string) {
  const date = readOptionalDate(formData, key);
  if (!date) {
    throw new Error(`Missing required date field: ${key}`);
  }

  return date;
}

function readWorkshopScheduleDates(formData: FormData) {
  const applicationStartsAt = readOptionalDate(formData, "scheduleApplicationStartsAt");
  const applicationEndsAt = readOptionalDate(formData, "scheduleApplicationEndsAt");
  const workshopStartsAt = readRequiredDate(formData, "scheduleWorkshopStartsAt");
  const workshopEndsAt = readOptionalDate(formData, "scheduleWorkshopEndsAt");

  if (applicationStartsAt && applicationEndsAt && applicationEndsAt < applicationStartsAt) {
    throw new Error("Application period must end after it starts.");
  }

  if (workshopEndsAt && workshopEndsAt < workshopStartsAt) {
    throw new Error("Workshop must end after it starts.");
  }

  return {
    applicationStartsAt,
    applicationEndsAt,
    workshopStartsAt,
    workshopEndsAt
  };
}

function readGlyph(formData: FormData) {
  return readRequiredString(formData, "assistantGlyph").slice(0, 12);
}

function readSortOrder(formData: FormData) {
  const value = Number.parseInt(readOptionalString(formData, "assistantSortOrder") ?? "100", 10);
  return Number.isFinite(value) ? value : 100;
}

function requireSystemManager(access: Awaited<ReturnType<typeof requireSiteAdminAccess>>) {
  if (!access.canManageSystemSettings) {
    redirectWithError("assistant-permission");
  }
}

function parseLinkLines(value: string | null, limit: number): LinkItem[] {
  if (!value) {
    return [];
  }

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit)
    .map((line) => {
      const [title, url] = line.includes("|") ? line.split("|", 2) : [line, line];
      return {
        title: title.trim(),
        url: normalizeHttpUrl(url.trim(), "link")
      };
    })
    .filter((item): item is LinkItem => Boolean(item.title && item.url));
}

function readAttachments(formData: FormData) {
  return [
    ...parseLinkLines(readOptionalString(formData, "attachments"), 5),
    ...parseLinkLines(readOptionalString(formData, "uploadedAttachments"), 5)
  ].slice(0, 5);
}

async function canAddPinnedPost(tenantId: string) {
  const pinnedCount = await db.sitePost.count({
    where: {
      tenantId,
      deletedAt: null,
      isPinned: true
    }
  });

  return pinnedCount < 3;
}

function readRequiredHttpUrl(formData: FormData, key: string) {
  const value = normalizeHttpUrl(readRequiredString(formData, key), key);
  if (!value) {
    throw new Error(`Missing required URL field: ${key}`);
  }

  return value;
}

function readOptionalHttpUrl(formData: FormData, key: string) {
  const value = readOptionalString(formData, key);
  return value ? normalizeHttpUrl(value, key) : null;
}

function normalizeHttpUrl(value: string, key: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    // Fall through to the shared validation error below.
  }

  throw new Error(`Invalid URL field: ${key}`);
}

function redirectWithMessage(message: string): never {
  redirect(`/site-admin?message=${message}`);
}

function redirectWithError(error: string): never {
  redirect(`/site-admin?error=${error}`);
}
