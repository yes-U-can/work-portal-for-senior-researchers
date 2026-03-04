"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type IntegrationStatusResponse = {
  connected: boolean;
  status: string;
  providerAccountId: string | null;
  updatedAt: string | null;
};

type MailMessageSummary = {
  id: string;
  provider: "GMAIL" | "NAVER_MAIL";
  subject: string;
  from: string;
  to: string[];
  receivedAt: string | null;
  snippet: string;
  unread: boolean;
};

type MailMessageDetail = MailMessageSummary & {
  bodyPreview: string;
};

type MailTab = "GMAIL" | "NAVER_MAIL";

function statusClass(status: IntegrationStatusResponse | null) {
  if (!status || !status.connected) {
    return "state-pending";
  }

  if (status.status === "CONNECTED") {
    return "state-connected";
  }

  return "state-error";
}

function statusLabel(status: IntegrationStatusResponse | null) {
  if (!status || !status.connected) {
    return "미연결";
  }

  if (status.status === "CONNECTED") {
    return "연결 완료";
  }

  if (status.status === "EXPIRED") {
    return "재연결 필요";
  }

  return status.status;
}

export default function MailWorkspace() {
  const [activeTab, setActiveTab] = useState<MailTab>("GMAIL");
  const [gmailStatus, setGmailStatus] = useState<IntegrationStatusResponse | null>(null);
  const [naverStatus, setNaverStatus] = useState<IntegrationStatusResponse | null>(null);
  const [messages, setMessages] = useState<MailMessageSummary[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<MailMessageDetail | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [connectingNaver, setConnectingNaver] = useState(false);
  const [naverEmail, setNaverEmail] = useState("");
  const [naverAppPassword, setNaverAppPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const currentStatus = useMemo(
    () => (activeTab === "GMAIL" ? gmailStatus : naverStatus),
    [activeTab, gmailStatus, naverStatus]
  );

  async function loadStatuses() {
    const [gmailResponse, naverResponse] = await Promise.all([
      fetch("/api/integrations/gmail/status"),
      fetch("/api/integrations/naver-mail/status")
    ]);
    const [gmailData, naverData] = await Promise.all([gmailResponse.json(), naverResponse.json()]);

    if (gmailResponse.ok) {
      setGmailStatus(gmailData);
    }

    if (naverResponse.ok) {
      setNaverStatus(naverData);
    }
  }

  const loadMessageDetail = useCallback(async (tab: MailTab, messageId: string) => {
    if (!messageId) {
      return;
    }

    setLoadingDetail(true);
    const endpoint =
      tab === "GMAIL"
        ? `/api/integrations/gmail/messages/${encodeURIComponent(messageId)}`
        : `/api/integrations/naver-mail/messages/${encodeURIComponent(messageId)}`;

    const response = await fetch(endpoint);
    const data = await response.json();
    setLoadingDetail(false);

    if (!response.ok) {
      setSelectedMessage(null);
      setError(data.error ?? "메일 상세를 불러오지 못했습니다.");
      return;
    }

    setSelectedMessage(data.message ?? null);
  }, []);

  const loadMessages = useCallback(
    async (tab: MailTab) => {
      setLoadingList(true);
      setError("");
      setSuccessMessage("");
      setSelectedMessageId("");
      setSelectedMessage(null);

      const endpoint =
        tab === "GMAIL"
          ? "/api/integrations/gmail/messages?max=20"
          : "/api/integrations/naver-mail/messages?max=20";
      const response = await fetch(endpoint);
      const data = await response.json();
      setLoadingList(false);

      if (!response.ok) {
        setMessages([]);
        setError(data.error ?? "메일 목록을 불러오지 못했습니다.");
        return;
      }

      setMessages(data.messages ?? []);
      if (data.messages?.length) {
        const firstId = data.messages[0].id as string;
        setSelectedMessageId(firstId);
        await loadMessageDetail(tab, firstId);
      }
    },
    [loadMessageDetail]
  );

  useEffect(() => {
    void loadStatuses();
  }, []);

  useEffect(() => {
    void loadMessages(activeTab);
  }, [activeTab, loadMessages]);

  async function onConnectNaver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConnectingNaver(true);
    setError("");
    setSuccessMessage("");

    const response = await fetch("/api/integrations/naver-mail/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: naverEmail,
        appPassword: naverAppPassword
      })
    });
    const data = await response.json();
    setConnectingNaver(false);

    if (!response.ok) {
      setError(data.error ?? "네이버메일 연결에 실패했습니다.");
      return;
    }

    setNaverAppPassword("");
    setSuccessMessage("네이버메일 연결이 완료되었습니다.");
    await loadStatuses();
    if (activeTab === "NAVER_MAIL") {
      await loadMessages("NAVER_MAIL");
    }
  }

  return (
    <div className="section-stack">
      <section className="surface-card">
        <div className="card-body section-stack">
          <h2 className="card-title">메일 제공자 선택</h2>
          <p className="hint hint-strong">둘 중 하나만 먼저 연결해도 메일 확인을 시작할 수 있습니다.</p>
          <div className="tab-row" role="tablist" aria-label="메일 제공자">
            <button
              className={`tab-button ${activeTab === "GMAIL" ? "tab-button-active" : ""}`}
              role="tab"
              aria-selected={activeTab === "GMAIL"}
              type="button"
              onClick={() => setActiveTab("GMAIL")}
            >
              Gmail
            </button>
            <button
              className={`tab-button ${activeTab === "NAVER_MAIL" ? "tab-button-active" : ""}`}
              role="tab"
              aria-selected={activeTab === "NAVER_MAIL"}
              type="button"
              onClick={() => setActiveTab("NAVER_MAIL")}
            >
              개인 네이버메일
            </button>
          </div>
          <p className={`state-text ${statusClass(currentStatus)}`}>{statusLabel(currentStatus)}</p>
          <p className="hint">
            계정: {currentStatus?.providerAccountId ?? "-"} | 업데이트:{" "}
            {currentStatus?.updatedAt ? new Date(currentStatus.updatedAt).toLocaleString("ko-KR") : "-"}
          </p>
        </div>
      </section>

      {activeTab === "GMAIL" ? (
        <section className="surface-card">
          <div className="card-body section-stack">
            <h2 className="card-title">Gmail 연결</h2>
            <p className="hint">Google 동의 화면에서 승인하면 바로 연결됩니다.</p>
            <div className="actions-row">
              <Link className="button" href="/api/integrations/gmail/connect">
                Gmail 연결 시작
              </Link>
              <button className="button-secondary" type="button" onClick={() => void loadMessages("GMAIL")}>
                Gmail 목록 새로고침
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="surface-card">
          <div className="card-body section-stack">
            <h2 className="card-title">개인 네이버메일 연결(IMAP)</h2>
            <p className="hint">
              네이버 2단계 인증 + 앱 비밀번호가 필요합니다. 일반 비밀번호는 사용할 수 없습니다.
            </p>
            <form className="form-grid" onSubmit={onConnectNaver}>
              <label className="form-label" htmlFor="naver-email">
                네이버 이메일
                <input
                  className="text-input"
                  id="naver-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={naverEmail}
                  onChange={(event) => setNaverEmail(event.target.value)}
                />
              </label>
              <label className="form-label" htmlFor="naver-app-password">
                앱 비밀번호
                <input
                  className="text-input"
                  id="naver-app-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={naverAppPassword}
                  onChange={(event) => setNaverAppPassword(event.target.value)}
                />
              </label>
              <div className="actions-row">
                <button className="button" type="submit" disabled={connectingNaver}>
                  {connectingNaver ? "연결 중..." : "네이버메일 연결"}
                </button>
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => void loadMessages("NAVER_MAIL")}
                >
                  네이버 목록 새로고침
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      <section className="surface-card" aria-busy={loadingList}>
        <div className="card-body section-stack">
          <h2 className="card-title">최근 메일 목록</h2>
          {loadingList ? <p className="hint">메일 목록을 불러오는 중입니다...</p> : null}
          {!loadingList && !messages.length ? <p className="hint">표시할 메일이 없습니다.</p> : null}
          <div className="message-list">
            {messages.map((message) => (
              <button
                className={`item-card ${selectedMessageId === message.id ? "item-card-active" : ""}`}
                key={message.id}
                type="button"
                onClick={() => {
                  setSelectedMessageId(message.id);
                  void loadMessageDetail(activeTab, message.id);
                }}
              >
                <p className="item-title">{message.subject || "(제목 없음)"}</p>
                <p className="item-subtitle">
                  보낸사람: {message.from} | 수신시각:{" "}
                  {message.receivedAt ? new Date(message.receivedAt).toLocaleString("ko-KR") : "-"}
                </p>
                <p className="item-snippet">{message.snippet || "(미리보기 없음)"}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="surface-card" aria-busy={loadingDetail}>
        <div className="card-body section-stack">
          <h2 className="card-title">선택한 메일 미리보기</h2>
          {loadingDetail ? <p className="hint">메일 내용을 불러오는 중입니다...</p> : null}
          {!loadingDetail && !selectedMessage ? <p className="hint">목록에서 메일을 선택하세요.</p> : null}
          {selectedMessage ? (
            <article className="item-card">
              <p className="item-title">{selectedMessage.subject || "(제목 없음)"}</p>
              <p className="item-subtitle">보낸사람: {selectedMessage.from}</p>
              <p className="item-subtitle">
                받는사람: {selectedMessage.to.length ? selectedMessage.to.join(", ") : "-"}
              </p>
              <p className="item-subtitle">
                날짜:{" "}
                {selectedMessage.receivedAt
                  ? new Date(selectedMessage.receivedAt).toLocaleString("ko-KR")
                  : "-"}
              </p>
              <p className="item-snippet">
                {selectedMessage.bodyPreview || selectedMessage.snippet || "(미리보기 없음)"}
              </p>
            </article>
          ) : null}
        </div>
      </section>

      <div className="live-region" aria-live="polite" role="status">
        {error ? <p className="error-text">{error}</p> : null}
        {successMessage ? <p className="success-text">{successMessage}</p> : null}
      </div>
    </div>
  );
}
