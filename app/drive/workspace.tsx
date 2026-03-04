"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type DriveStatusResponse = {
  connected: boolean;
  status: string;
  providerAccountId: string | null;
  updatedAt: string | null;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  modifiedTime: string | null;
  owners: string[];
};

function statusLabel(status: DriveStatusResponse | null) {
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

export default function DriveWorkspace() {
  const [status, setStatus] = useState<DriveStatusResponse | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadStatus() {
    const response = await fetch("/api/integrations/drive/status");
    const data = await response.json();
    if (response.ok) {
      setStatus(data);
    }
  }

  async function loadFiles(search?: string) {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    const params = new URLSearchParams();
    if (search?.trim()) {
      params.set("q", search.trim());
    }

    const response = await fetch(`/api/integrations/drive/files?${params.toString()}`);
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "파일 목록을 불러오지 못했습니다.");
      setFiles([]);
      return;
    }

    setFiles(data.files ?? []);
  }

  useEffect(() => {
    void loadStatus();
    void loadFiles();
  }, []);

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadFiles(query);
  }

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    if (!(file instanceof File)) {
      setError("업로드할 파일을 먼저 선택하세요.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccessMessage("");

    const response = await fetch("/api/integrations/drive/upload", {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    setUploading(false);

    if (!response.ok) {
      setError(data.error ?? "파일 업로드에 실패했습니다.");
      return;
    }

    setSuccessMessage(`업로드 완료: ${data.file?.name ?? file.name}`);
    form.reset();
    await loadFiles(query);
    await loadStatus();
  }

  return (
    <div className="section-stack">
      <section className="surface-card">
        <div className="card-body section-stack">
          <h2 className="card-title">먼저 이렇게 진행하세요</h2>
          <ol className="list-reset">
            <li>Google Drive 연결 버튼을 누릅니다.</li>
            <li>필요하면 파일 이름으로 검색합니다.</li>
            <li>파일 선택 후 업로드 버튼을 누릅니다.</li>
          </ol>
        </div>
      </section>

      <section className="surface-card">
        <div className="card-body section-stack">
          <h2 className="card-title">1단계: Drive 연결</h2>
          <p className={`state-text ${status?.connected ? "state-connected" : "state-pending"}`}>
            {statusLabel(status)}
          </p>
          <p className="hint">
            계정: {status?.providerAccountId ?? "-"} | 업데이트:{" "}
            {status?.updatedAt ? new Date(status.updatedAt).toLocaleString("ko-KR") : "-"}
          </p>
          <div className="actions-row">
            <Link className="button" href="/api/integrations/drive/connect">
              Google Drive 연결
            </Link>
            <button className="button-secondary" type="button" onClick={() => void loadFiles(query)}>
              목록 새로고침
            </button>
          </div>
        </div>
      </section>

      <section className="surface-card" aria-label="파일 검색">
        <div className="card-body section-stack">
          <h2 className="card-title">2단계: 파일 찾기</h2>
          <form className="toolbar-row" onSubmit={onSearch}>
            <label className="form-label" htmlFor="drive-search-input">
              파일명 검색
              <input
                id="drive-search-input"
                className="text-input"
                name="q"
                value={query}
                placeholder="예: proposal, 보고서"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button className="button-secondary" type="submit" disabled={loading}>
              {loading ? "검색 중..." : "검색"}
            </button>
          </form>
          <p className="hint">공유드라이브 검색 경로도 기본으로 활성화되어 있습니다.</p>
        </div>
      </section>

      <section className="surface-card" aria-label="파일 업로드">
        <div className="card-body section-stack">
          <h2 className="card-title">3단계: 파일 업로드</h2>
          <form className="toolbar-row" onSubmit={onUpload}>
            <label className="form-label" htmlFor="drive-file-input">
              업로드 파일
              <input className="text-input" id="drive-file-input" name="file" type="file" />
            </label>
            <button className="button" type="submit" disabled={uploading}>
              {uploading ? "업로드 중..." : "Drive에 업로드"}
            </button>
          </form>
        </div>
      </section>

      <section className="surface-card" aria-busy={loading}>
        <div className="card-body section-stack">
          <h2 className="card-title">최근 파일</h2>
          {loading ? <p className="hint">파일을 불러오는 중입니다...</p> : null}
          {!loading && !files.length ? <p className="hint">표시할 파일이 없습니다.</p> : null}
          <div className="file-list">
            {files.map((file) => (
              <article className="item-card" key={file.id}>
                <p className="item-title">{file.name}</p>
                <p className="item-subtitle">
                  형식: {file.mimeType} | 수정시각:{" "}
                  {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString("ko-KR") : "-"}
                </p>
                <p className="item-subtitle">소유자: {file.owners.join(", ") || "정보 없음"}</p>
                <div className="actions-row">
                  {file.webViewLink ? (
                    <a className="button-secondary" href={file.webViewLink} target="_blank" rel="noreferrer">
                      Drive에서 열기
                    </a>
                  ) : (
                    <span className="hint">열기 링크 없음</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="live-region" aria-live="polite" role="status">
        {error ? <p className="error-text">{error}</p> : null}
        {successMessage ? <p className="success-text">{successMessage}</p> : null}
      </div>
    </div>
  );
}
