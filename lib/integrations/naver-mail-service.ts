import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { ConnectorError } from "@/lib/integrations/connector-error";
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

function mapNaverImapError(error: unknown): ConnectorError {
  if (!(error instanceof Error)) {
    return new ConnectorError(
      "네이버메일 IMAP 연결에 실패했습니다.",
      "잠시 후 다시 시도하세요."
    );
  }

  const message = error.message.toLowerCase();
  if (
    message.includes("authentication") ||
    message.includes("login failed") ||
    message.includes("invalid credentials")
  ) {
    return new ConnectorError(
      "네이버메일 인증에 실패했습니다.",
      "네이버 2단계 인증을 켠 뒤 앱 비밀번호를 새로 발급해 입력하세요."
    );
  }

  if (message.includes("timeout")) {
    return new ConnectorError(
      "네이버메일 서버 연결 시간이 초과되었습니다.",
      "네트워크 상태를 확인한 뒤 잠시 후 다시 시도하세요."
    );
  }

  if (message.includes("imap") && (message.includes("disabled") || message.includes("not enabled"))) {
    return new ConnectorError(
      "네이버메일 IMAP 사용이 비활성화되어 있습니다.",
      "네이버 메일 설정에서 IMAP 허용을 켠 뒤 다시 연결하세요."
    );
  }

  if (message.includes("application-specific password")) {
    return new ConnectorError(
      "앱 비밀번호가 필요합니다.",
      "일반 비밀번호 대신 네이버 앱 비밀번호를 입력하세요."
    );
  }

  return new ConnectorError(
    "네이버메일 연결 중 오류가 발생했습니다.",
    "앱 비밀번호를 다시 발급한 뒤 다시 시도하세요."
  );
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
    throw mapNaverImapError(error);
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
      throw new ConnectorError(
        "선택한 메일을 찾지 못했습니다.",
        "메일 목록을 새로고침한 뒤 다시 선택하세요."
      );
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
