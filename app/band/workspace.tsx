"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { BandAvailability } from "@/lib/integrations/types";

type BandStatusResponse = {
  connected: boolean;
  status: string;
  providerAccountId: string | null;
  updatedAt: string | null;
  availability: BandAvailability;
  availabilityMessage: string;
};

type BandItem = {
  band_key: string;
  name: string;
};

type PostItem = {
  post_key: string;
  content?: string;
  created_at?: string;
  writer?: { name?: string };
  comment_count?: number;
};

type CommentItem = {
  comment_key: string;
  body?: string;
  created_at?: string;
  author?: { name?: string };
};

type ErrorPayload = {
  error?: string;
  recoveryAction?: string;
};

function statusLabel(status: BandStatusResponse | null) {
  if (!status) {
    return "확인 중";
  }

  if (status.availability === "PENDING_REVIEW") {
    return "심사중 (연결 대기)";
  }

  if (status.connected && status.status === "CONNECTED") {
    return "연결 완료";
  }

  if (status.status === "EXPIRED") {
    return "재연결 필요";
  }

  if (!status.connected) {
    return "미연결";
  }

  return "오류";
}

function statusClass(status: BandStatusResponse | null) {
  if (!status || status.availability === "PENDING_REVIEW") {
    return "state-pending";
  }

  if (status.connected && status.status === "CONNECTED") {
    return "state-connected";
  }

  if (!status.connected) {
    return "state-pending";
  }

  return "state-error";
}

export default function BandWorkspace() {
  const [bandStatus, setBandStatus] = useState<BandStatusResponse | null>(null);
  const [bands, setBands] = useState<BandItem[]>([]);
  const [selectedBandKey, setSelectedBandKey] = useState("");
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [selectedPostKey, setSelectedPostKey] = useState("");
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [error, setError] = useState("");
  const [recoveryAction, setRecoveryAction] = useState("");
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingBands, setLoadingBands] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const selectedBand = useMemo(
    () => bands.find((band) => band.band_key === selectedBandKey),
    [bands, selectedBandKey]
  );

  async function loadStatus() {
    setLoadingStatus(true);
    const response = await fetch("/api/integrations/band/status");
    const data = (await response.json()) as BandStatusResponse | ErrorPayload;
    setLoadingStatus(false);

    if (!response.ok) {
      const payload = data as ErrorPayload;
      setError(payload.error ?? "BAND 연결 상태를 확인하지 못했습니다.");
      setRecoveryAction(payload.recoveryAction ?? "잠시 후 다시 시도하거나 관리자에게 문의하세요.");
      return;
    }

    setBandStatus(data as BandStatusResponse);
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    async function loadBands() {
      if (!bandStatus || bandStatus.availability !== "AVAILABLE" || !bandStatus.connected) {
        setBands([]);
        setSelectedBandKey("");
        return;
      }

      setLoadingBands(true);
      setError("");
      setRecoveryAction("");

      const response = await fetch("/api/integrations/band/bands");
      const data = (await response.json()) as { bands?: BandItem[] } & ErrorPayload;
      setLoadingBands(false);

      if (!response.ok) {
        setError(data.error ?? "BAND 목록을 불러오지 못했습니다.");
        setRecoveryAction(
          data.recoveryAction ?? "대시보드에서 BAND 재연결을 시도한 뒤 다시 목록을 불러오세요."
        );
        return;
      }

      setBands(data.bands ?? []);
      if (data.bands?.length) {
        setSelectedBandKey(data.bands[0].band_key);
      }
    }

    void loadBands();
  }, [bandStatus]);

  useEffect(() => {
    async function loadPosts() {
      if (!selectedBandKey) {
        setPosts([]);
        setSelectedPostKey("");
        return;
      }

      setLoadingPosts(true);
      setError("");
      setRecoveryAction("");

      const response = await fetch(`/api/integrations/band/posts?bandKey=${encodeURIComponent(selectedBandKey)}`);
      const data = (await response.json()) as { posts?: PostItem[] } & ErrorPayload;
      setLoadingPosts(false);

      if (!response.ok) {
        setError(data.error ?? "게시글 목록을 불러오지 못했습니다.");
        setRecoveryAction(
          data.recoveryAction ?? "잠시 후 다시 시도하세요. 문제가 계속되면 BAND를 다시 연결하세요."
        );
        return;
      }

      setPosts(data.posts ?? []);
      if (data.posts?.length) {
        setSelectedPostKey(data.posts[0].post_key);
      } else {
        setSelectedPostKey("");
      }
    }

    void loadPosts();
  }, [selectedBandKey]);

  useEffect(() => {
    async function loadComments() {
      if (!selectedBandKey || !selectedPostKey) {
        setComments([]);
        return;
      }

      setLoadingComments(true);
      setError("");
      setRecoveryAction("");

      const response = await fetch(
        `/api/integrations/band/comments?bandKey=${encodeURIComponent(selectedBandKey)}&postKey=${encodeURIComponent(selectedPostKey)}`
      );
      const data = (await response.json()) as { comments?: CommentItem[] } & ErrorPayload;
      setLoadingComments(false);

      if (!response.ok) {
        setError(data.error ?? "댓글을 불러오지 못했습니다.");
        setRecoveryAction(data.recoveryAction ?? "잠시 후 다시 시도하세요.");
        return;
      }

      setComments(data.comments ?? []);
    }

    void loadComments();
  }, [selectedBandKey, selectedPostKey]);

  const bandPending = bandStatus?.availability === "PENDING_REVIEW";
  const bandConnected = bandStatus?.connected && bandStatus.status === "CONNECTED";

  return (
    <div className="section-stack">
      <section className="surface-card">
        <div className="card-body section-stack">
          <h2 className="card-title">BAND 연결 상태</h2>
          <p className={`state-text ${statusClass(bandStatus)}`}>{statusLabel(bandStatus)}</p>
          <p className="hint">
            계정: {bandStatus?.providerAccountId ?? "-"} | 업데이트:{" "}
            {bandStatus?.updatedAt ? new Date(bandStatus.updatedAt).toLocaleString("ko-KR") : "-"}
          </p>
          <p className="hint">
            {bandStatus?.availabilityMessage ??
              "연결 상태를 확인한 뒤 BAND 목록을 불러옵니다."}
          </p>
          <div className="actions-row">
            {bandPending ? (
              <span className="button-disabled" aria-disabled="true">
                BAND 심사중
              </span>
            ) : (
              <Link className="button" href="/api/integrations/band/connect">
                BAND 연결 시작
              </Link>
            )}
            <button className="button-secondary" type="button" onClick={() => void loadStatus()} disabled={loadingStatus}>
              {loadingStatus ? "상태 확인 중..." : "상태 다시 확인"}
            </button>
          </div>
        </div>
      </section>

      {bandPending ? (
        <section className="surface-card surface-card-soft">
          <div className="card-body section-stack">
            <h2 className="card-title">심사 완료 전 안내</h2>
            <p className="card-text">
              BAND 앱 키가 발급되면 이 화면에서 바로 BAND 연결과 게시글 조회를 시작할 수 있습니다.
            </p>
            <p className="card-text">
              심사 기간에는 Drive와 Mail 연결을 먼저 완료해 업무 포털 핵심 기능을 사용할 수 있습니다.
            </p>
            <div className="actions-row">
              <Link className="button-secondary" href="/drive">
                Drive 먼저 연결
              </Link>
              <Link className="button-secondary" href="/mail">
                Mail 먼저 연결
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {!bandPending && !bandConnected ? (
        <section className="surface-card">
          <div className="card-body section-stack">
            <h2 className="card-title">연결 후 사용 가능</h2>
            <p className="card-text">
              BAND 연결을 완료하면 밴드, 게시글, 댓글을 이 화면에서 확인할 수 있습니다.
            </p>
          </div>
        </section>
      ) : null}

      {!bandPending && bandConnected ? (
        <>
          <section className="surface-card">
            <div className="card-body section-stack">
              <h2 className="card-title">1단계: 밴드 선택</h2>
              <p className="hint">밴드를 선택하면 해당 밴드의 최신 게시글이 표시됩니다.</p>
              {loadingBands ? <p className="hint">BAND 목록 불러오는 중...</p> : null}
              <label className="form-label" htmlFor="band-select">
                밴드 목록
                <select
                  className="select-input"
                  id="band-select"
                  value={selectedBandKey}
                  onChange={(event) => setSelectedBandKey(event.target.value)}
                >
                  {!bands.length ? <option value="">연결된 BAND가 없습니다.</option> : null}
                  {bands.map((band) => (
                    <option key={band.band_key} value={band.band_key}>
                      {band.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="surface-card" aria-busy={loadingPosts}>
            <div className="card-body section-stack">
              <h2 className="card-title">2단계: 게시글 선택 {selectedBand ? `(${selectedBand.name})` : ""}</h2>
              {loadingPosts ? <p className="hint">게시글 불러오는 중...</p> : null}
              {!loadingPosts && !posts.length ? <p className="hint">표시할 게시글이 없습니다.</p> : null}
              <div className="post-list">
                {posts.map((post) => (
                  <button
                    className={`item-card ${selectedPostKey === post.post_key ? "item-card-active" : ""}`}
                    key={post.post_key}
                    type="button"
                    onClick={() => setSelectedPostKey(post.post_key)}
                  >
                    <p className="item-title">
                      작성자: {post.writer?.name ?? "정보 없음"} | 댓글 {post.comment_count ?? 0}개
                    </p>
                    <p className="item-snippet">{(post.content ?? "").slice(0, 220) || "(본문 없음)"}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="surface-card" aria-busy={loadingComments}>
            <div className="card-body section-stack">
              <h2 className="card-title">3단계: 댓글 확인</h2>
              {loadingComments ? <p className="hint">댓글 불러오는 중...</p> : null}
              {!loadingComments && !comments.length ? <p className="hint">표시할 댓글이 없습니다.</p> : null}
              <div className="message-list">
                {comments.map((comment) => (
                  <article className="item-card" key={comment.comment_key}>
                    <p className="item-title">{comment.author?.name ?? "작성자 정보 없음"}</p>
                    <p className="item-subtitle">
                      {comment.created_at ? new Date(comment.created_at).toLocaleString("ko-KR") : "-"}
                    </p>
                    <p className="item-snippet">{comment.body ?? "(내용 없음)"}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}

      <div className="live-region" aria-live="polite" role="status">
        {error ? <p className="error-text">{error}</p> : null}
        {recoveryAction ? <p className="hint hint-recovery">{recoveryAction}</p> : null}
      </div>
    </div>
  );
}
