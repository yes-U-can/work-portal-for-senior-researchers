import { SiteContentVisibility, SitePostCategory } from "@prisma/client";

export const sitePostCategoryLabels: Record<SitePostCategory, string> = {
  GENERAL: "연구소 전체 공지",
  WORKSHOP: "워크숍 공지",
  COUNSELING: "상담 안내",
  GREEN_BOARD: "초록 칠판"
};

export const siteVisibilityLabels: Record<SiteContentVisibility, string> = {
  PUBLIC: "공개",
  INTERNAL: "포털 내부",
  DRAFT: "비공개 초안"
};

export const sitePostLabelOptions = ["AI", "DSM", "MMPI", "Rorschach"] as const;

export const siteWorkshopOptions = [
  {
    slug: "ai",
    shortName: "AI",
    title: "AI에 탑승한 심리검사"
  },
  {
    slug: "dsm",
    shortName: "DSM",
    title: "DSM 워크숍"
  },
  {
    slug: "mmpi",
    shortName: "MMPI",
    title: "MMPI-2 단계별 워크숍"
  },
  {
    slug: "rorschach",
    shortName: "Rorschach",
    title: "3단계 로샤 언어학교"
  }
] as const;

export type SiteWorkshopSlug = (typeof siteWorkshopOptions)[number]["slug"];
