import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { MailMessageDetail, MailMessageSummary } from "@/lib/integrations/types";
import { env } from "@/lib/env";

type NaverImapAuth = {
  email: string;
  appPassword: string;
};

function toIsoDate(value: string | Date | undefined): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseAddressList(addresses: Array<{ name?: string | null; address?: string | null }> | undefined): string[] {
  return (addresses ?? []).map((item) => {
    const display = item.name?.trim();
    const address = item.address?.trim();

    if (display && address) {
      return `${display} <${address}>`;
    }

    return address ?? "Unknown recipient";
  });
}

function parseSingleAddress(addresses: Array<{ name?: string | null; address?: string | null }> | undefined): string {
  const first = parseAddressList(addresses)[0];
  return first ?? "Unknown sender";
}

function mapNaverImapError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Failed to connect to Naver Mail IMAP.";
  }

  const message = error.message.toLowerCase();
  if (message.includes("authentication") || message.includes("login")) {
    return "Authentication failed. Check your Naver Mail app password.";
  }

  if (message.includes("timeout")) {
    return "IMAP connection timed out. Please try again.";
  }

  return error.message;
}

async function withNaverImapClient<T>(auth: NaverImapAuth, task: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow({
    host: env.NAVER_IMAP_HOST,
    port: env.NAVER_IMAP_PORT,
    secure: env.NAVER_IMAP_SECURE,
    auth: {
      user: auth.email,
      pass: auth.appPassword
    }
  });

  try {
    await client.connect();
    return await task(client);
  } catch (error) {
    throw new Error(mapNaverImapError(error));
  } finally {
    try {
      await client.logout();
    } catch {
      // Ignore logout failures to preserve root error.
    }
  }
}

export async function verifyNaverMailImap(auth: NaverImapAuth): Promise<void> {
  await withNaverImapClient(auth, async (client) => {
    await client.mailboxOpen("INBOX");
  });
}

export async function listNaverMailMessages(
  auth: NaverImapAuth,
  limit: number
): Promise<MailMessageSummary[]> {
  return withNaverImapClient(auth, async (client) => {
    const mailbox = await client.mailboxOpen("INBOX");
    if (!mailbox.exists) {
      return [];
    }

    const start = Math.max(1, mailbox.exists - limit + 1);
    const range = `${start}:${mailbox.exists}`;
    const messages: MailMessageSummary[] = [];

    for await (const message of client.fetch(range, {
      uid: true,
      envelope: true,
      flags: true,
      internalDate: true
    })) {
      messages.push({
        id: String(message.uid),
        provider: "NAVER_MAIL",
        subject: message.envelope?.subject?.trim() || "(no subject)",
        from: parseSingleAddress(message.envelope?.from),
        to: parseAddressList(message.envelope?.to),
        receivedAt: toIsoDate(message.internalDate),
        snippet: message.envelope?.subject?.trim() || "",
        unread: !message.flags?.has("\\Seen")
      });
    }

    return messages.reverse();
  });
}

export async function getNaverMailMessage(auth: NaverImapAuth, uid: number): Promise<MailMessageDetail> {
  return withNaverImapClient(auth, async (client) => {
    await client.mailboxOpen("INBOX");

    const message = await client.fetchOne(
      uid,
      {
        uid: true,
        envelope: true,
        flags: true,
        internalDate: true,
        source: true
      },
      { uid: true }
    );

    if (!message) {
      throw new Error("Message not found.");
    }

    const parsed = message.source ? await simpleParser(message.source) : null;
    const subject = message.envelope?.subject?.trim() || parsed?.subject || "(no subject)";
    const from = parseSingleAddress(message.envelope?.from);
    const to = parseAddressList(message.envelope?.to);
    const textSource = typeof parsed?.text === "string" ? parsed.text : "";
    const htmlSource = typeof parsed?.html === "string" ? parsed.html : "";
    const snippetSource = textSource || htmlSource;
    const snippet = snippetSource.replace(/\s+/g, " ").trim().slice(0, 240);

    return {
      id: String(message.uid),
      provider: "NAVER_MAIL",
      subject,
      from,
      to,
      receivedAt: toIsoDate(message.internalDate),
      snippet,
      unread: !message.flags?.has("\\Seen"),
      bodyPreview: snippetSource.slice(0, 4000)
    };
  });
}
