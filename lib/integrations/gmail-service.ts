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
    const payload = await response.text();
    throw new Error(`Gmail message load failed (${response.status}): ${payload}`);
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
    const payload = await listResponse.text();
    throw new Error(`Gmail message list failed (${listResponse.status}): ${payload}`);
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
