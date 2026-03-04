import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  ENCRYPTION_KEY: z.string().min(16),
  NEXTAUTH_URL: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  DEV_AUTH_EMAIL: z.string().optional(),
  DEV_AUTH_PASSWORD: z.string().optional(),
  DEV_AUTO_PROVISION: z.string().optional(),
  ACTIVE_TENANT_SLUG: z.string().optional(),
  BAND_CLIENT_ID: z.string().optional(),
  BAND_CLIENT_SECRET: z.string().optional(),
  BAND_REDIRECT_URI: z.string().optional(),
  BAND_AUTHORIZE_URL: z.string().optional(),
  BAND_TOKEN_URL: z.string().optional(),
  BAND_OAUTH_SCOPE: z.string().optional(),
  BAND_API_BASE_URL: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_AUTHORIZE_URL: z.string().optional(),
  GOOGLE_OAUTH_TOKEN_URL: z.string().optional(),
  GOOGLE_DRIVE_REDIRECT_URI: z.string().optional(),
  GOOGLE_GMAIL_REDIRECT_URI: z.string().optional(),
  GOOGLE_DRIVE_OAUTH_SCOPE: z.string().optional(),
  GOOGLE_GMAIL_OAUTH_SCOPE: z.string().optional(),
  NAVER_IMAP_HOST: z.string().optional(),
  NAVER_IMAP_PORT: z.coerce.number().int().positive().optional(),
  NAVER_IMAP_SECURE: z.string().optional()
});

const raw = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  DEV_AUTH_EMAIL: process.env.DEV_AUTH_EMAIL,
  DEV_AUTH_PASSWORD: process.env.DEV_AUTH_PASSWORD,
  DEV_AUTO_PROVISION: process.env.DEV_AUTO_PROVISION,
  ACTIVE_TENANT_SLUG: process.env.ACTIVE_TENANT_SLUG,
  BAND_CLIENT_ID: process.env.BAND_CLIENT_ID,
  BAND_CLIENT_SECRET: process.env.BAND_CLIENT_SECRET,
  BAND_REDIRECT_URI: process.env.BAND_REDIRECT_URI,
  BAND_AUTHORIZE_URL: process.env.BAND_AUTHORIZE_URL,
  BAND_TOKEN_URL: process.env.BAND_TOKEN_URL,
  BAND_OAUTH_SCOPE: process.env.BAND_OAUTH_SCOPE,
  BAND_API_BASE_URL: process.env.BAND_API_BASE_URL,
  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  GOOGLE_OAUTH_AUTHORIZE_URL: process.env.GOOGLE_OAUTH_AUTHORIZE_URL,
  GOOGLE_OAUTH_TOKEN_URL: process.env.GOOGLE_OAUTH_TOKEN_URL,
  GOOGLE_DRIVE_REDIRECT_URI: process.env.GOOGLE_DRIVE_REDIRECT_URI,
  GOOGLE_GMAIL_REDIRECT_URI: process.env.GOOGLE_GMAIL_REDIRECT_URI,
  GOOGLE_DRIVE_OAUTH_SCOPE: process.env.GOOGLE_DRIVE_OAUTH_SCOPE,
  GOOGLE_GMAIL_OAUTH_SCOPE: process.env.GOOGLE_GMAIL_OAUTH_SCOPE,
  NAVER_IMAP_HOST: process.env.NAVER_IMAP_HOST,
  NAVER_IMAP_PORT: process.env.NAVER_IMAP_PORT,
  NAVER_IMAP_SECURE: process.env.NAVER_IMAP_SECURE
});

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }

  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }

  return defaultValue;
}

export const env = {
  ...raw,
  IS_PRODUCTION: raw.NODE_ENV === "production",
  ACTIVE_TENANT_SLUG: raw.ACTIVE_TENANT_SLUG ?? "sicp-senior-research",
  DEV_AUTO_PROVISION: parseBoolean(raw.DEV_AUTO_PROVISION, true),
  BAND_AUTHORIZE_URL: raw.BAND_AUTHORIZE_URL ?? "https://auth.band.us/oauth2/authorize",
  BAND_TOKEN_URL: raw.BAND_TOKEN_URL ?? "https://auth.band.us/oauth2/token",
  BAND_OAUTH_SCOPE: raw.BAND_OAUTH_SCOPE ?? "read_profile read_band",
  BAND_API_BASE_URL: raw.BAND_API_BASE_URL ?? "https://openapi.band.us",
  GOOGLE_OAUTH_AUTHORIZE_URL: raw.GOOGLE_OAUTH_AUTHORIZE_URL ?? "https://accounts.google.com/o/oauth2/v2/auth",
  GOOGLE_OAUTH_TOKEN_URL: raw.GOOGLE_OAUTH_TOKEN_URL ?? "https://oauth2.googleapis.com/token",
  GOOGLE_DRIVE_OAUTH_SCOPE:
    raw.GOOGLE_DRIVE_OAUTH_SCOPE ??
    "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly",
  GOOGLE_GMAIL_OAUTH_SCOPE:
    raw.GOOGLE_GMAIL_OAUTH_SCOPE ?? "https://www.googleapis.com/auth/gmail.metadata",
  NAVER_IMAP_HOST: raw.NAVER_IMAP_HOST ?? "imap.naver.com",
  NAVER_IMAP_PORT: raw.NAVER_IMAP_PORT ?? 993,
  NAVER_IMAP_SECURE: parseBoolean(raw.NAVER_IMAP_SECURE, true)
};
