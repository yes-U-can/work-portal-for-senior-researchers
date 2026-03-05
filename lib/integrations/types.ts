import { IntegrationProvider, IntegrationStatus } from "@prisma/client";

export type MailProvider = "GMAIL" | "NAVER_MAIL";
export type BandAvailability = "PENDING_REVIEW" | "AVAILABLE";

export type IntegrationHealth = {
  provider: IntegrationProvider;
  connected: boolean;
  status: IntegrationStatus | "NOT_CONNECTED";
  providerAccountId: string | null;
  updatedAt: Date | null;
};

export type RecoveryGuidance = {
  message: string;
  recoveryAction: string;
};

export type MailMessageSummary = {
  id: string;
  provider: MailProvider;
  subject: string;
  from: string;
  to: string[];
  receivedAt: string | null;
  snippet: string;
  unread: boolean;
};

export type MailMessageDetail = MailMessageSummary & {
  bodyPreview: string;
};

export type DriveFileSummary = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  modifiedTime: string | null;
  shared: boolean;
  owners: string[];
};

export interface ConnectorHealthCheck {
  provider: IntegrationProvider;
  tenantId: string;
}

export interface ConnectorService<TItem, TDetail = TItem> {
  connect(): Promise<void>;
  refreshTokenIfNeeded(tenantId: string): Promise<void>;
  listItems(tenantId: string, params?: Record<string, string | number | boolean>): Promise<TItem[]>;
  getItemDetail(tenantId: string, id: string): Promise<TDetail | null>;
  healthCheck(input: ConnectorHealthCheck): Promise<IntegrationHealth>;
}
