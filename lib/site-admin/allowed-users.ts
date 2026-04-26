export type SiteAdminKind = "manager" | "professor";

export type SiteAdminAccount = {
  email: string;
  defaultDisplayName: string;
  kind: SiteAdminKind;
};

const accounts: SiteAdminAccount[] = [
  {
    email: "thinkinthegrey@gmail.com",
    defaultDisplayName: "황성훈",
    kind: "professor"
  },
  {
    email: "loveyer@iscu.ac.kr",
    defaultDisplayName: "김환",
    kind: "professor"
  },
  {
    email: "mow.coding@gmail.com",
    defaultDisplayName: "관리자",
    kind: "manager"
  },
  {
    email: "sicpseoul@gmail.com",
    defaultDisplayName: "관리자",
    kind: "manager"
  }
];

export function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export function getSiteAdminAccount(email: string | null | undefined) {
  const normalized = normalizeEmail(email);
  return accounts.find((account) => account.email === normalized) ?? null;
}

export function isAllowedSiteAdminEmail(email: string | null | undefined) {
  return Boolean(getSiteAdminAccount(email));
}

export function canManageSiteSystemSettings(email: string | null | undefined) {
  return getSiteAdminAccount(email)?.kind === "manager";
}

export function getAllowedSiteAdminEmails() {
  return accounts.map((account) => account.email);
}
