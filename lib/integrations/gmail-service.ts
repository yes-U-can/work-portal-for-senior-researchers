import { ConnectorError } from "@/lib/integrations/connector-error";
import type { MailMessageDetail, MailMessageSummary } from "@/lib/integrations/types";

type GmailMessageListResponse = {
  messages?: Array<{
    id: string;
  }>;
};

type GmailHeader = {
  name: string;
  value: string;
};

type GmailMessageResponse = {
  id: string;
  snippet?: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
  };
};

type ListGmailMessagesInput = {
  accessToken: string;
  maxResults?: number;
};

const METADATA_HEADERS = ["Subject", "From", "To", "Date"];

function readHeader(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function toIsoDate(value: string | undefined, fallbackEpoch: string | undefined): string | null {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  if (fallbackEpoch) {
    const epochMs = Number.parseInt(fallbackEpoch, 10);
    if (!Number.isNaN(epochMs)) {
      return new Date(epochMs).toISOString();
    }
  }

  return null;
}

function mapMessage(data: GmailMessageResponse): MailMessageSummary {
  const headers = data.payload?.headers;
  const toHeader = readHeader(headers, "To");

  return {
    id: data.id,
    provider: "GMAIL",
    subject: readHeader(headers, "Subject") || "(no subject)",
    from: readHeader(headers, "From") || "Unknown sender",
    to: toHeader ? toHeader.split(",").map((item) => item.trim()) : [],
    receivedAt: toIsoDate(readHeader(headers, "Date"), data.internalDate),
    snippet: data.snippet ?? "",
    unread: Boolean(data.labelIds?.includes("UNREAD"))
  };
}

function throwGmailError(status: number, action: "list" | "detail"): never {
  if (status === 401 || status === 403) {
    throw new ConnectorError(
      "Gmail 권한이 만료되었거나 승인되지 않았습니다.",
      "대시보드에서 Gmail을 다시 연결한 뒤 목록을 새로고침하세요."
    );
  }

  if (status === 429) {
    throw new ConnectorError(
      "Gmail 요청이 잠시 많아 처리되지 않았습니다.",
      "잠시 후 다시 시도하세요."
    );
  }

  if (action === "detail") {
    throw new ConnectorError(
      `메일 상세를 불러오지 못했습니다. (${status})`,
      "목록을 새로고침한 뒤 메일을 다시 선택하세요."
    );
  }

  throw new ConnectorError(
    `Gmail 목록을 불러오지 못했습니다. (${status})`,
    "Gmail 연결 상태를 확인한 뒤 다시 시도하세요."
  );
}

export async function getGmailMessage(accessToken: string, messageId: string): Promise<MailMessageDetail> {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`);
  url.searchParams.set("format", "metadata");
  url.searchParams.set("metadataHeaders", METADATA_HEADERS.join(","));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throwGmailError(response.status, "detail");
  }

  const message = (await response.json()) as GmailMessageResponse;
  const summary = mapMessage(message);

  return {
    ...summary,
    bodyPreview: summary.snippet
  };
}

export async function listGmailMessages(input: ListGmailMessagesInput): Promise<MailMessageSummary[]> {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.set("maxResults", String(input.maxResults ?? 20));
  url.searchParams.set("labelIds", "INBOX");

  const listResponse = await fetch(url, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`
    },
    cache: "no-store"
  });

  if (!listResponse.ok) {
    throwGmailError(listResponse.status, "list");
  }

  const listData = (await listResponse.json()) as GmailMessageListResponse;
  const messageIds = (listData.messages ?? []).map((message) => message.id);

  const messages = await Promise.all(
    messageIds.map(async (messageId) => {
      const detail = await getGmailMessage(input.accessToken, messageId);
      return detail;
    })
  );

  return messages;
}
