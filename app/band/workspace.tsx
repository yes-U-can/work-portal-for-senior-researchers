"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function BandWorkspace() {
  const [bands, setBands] = useState<BandItem[]>([]);
  const [selectedBandKey, setSelectedBandKey] = useState("");
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [selectedPostKey, setSelectedPostKey] = useState("");
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [error, setError] = useState("");
  const [loadingBands, setLoadingBands] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const selectedBand = useMemo(
    () => bands.find((band) => band.band_key === selectedBandKey),
    [bands, selectedBandKey]
  );

  useEffect(() => {
    async function loadBands() {
      setLoadingBands(true);
      setError("");

      const response = await fetch("/api/integrations/band/bands");
      const data = await response.json();
      setLoadingBands(false);

      if (!response.ok) {
        setError(data.error ?? "BAND 목록을 불러오지 못했습니다.");
        return;
      }

      setBands(data.bands ?? []);
      if (data.bands?.length) {
        setSelectedBandKey(data.bands[0].band_key);
      }
    }

    void loadBands();
  }, []);

  useEffect(() => {
    async function loadPosts() {
      if (!selectedBandKey) {
        setPosts([]);
        return;
      }

      setLoadingPosts(true);
      setError("");

      const response = await fetch(`/api/integrations/band/posts?bandKey=${encodeURIComponent(selectedBandKey)}`);
      const data = await response.json();
      setLoadingPosts(false);

      if (!response.ok) {
        setError(data.error ?? "게시글 목록을 불러오지 못했습니다.");
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

      const response = await fetch(
        `/api/integrations/band/comments?bandKey=${encodeURIComponent(selectedBandKey)}&postKey=${encodeURIComponent(selectedPostKey)}`
      );
      const data = await response.json();
      setLoadingComments(false);

      if (!response.ok) {
        setError(data.error ?? "댓글을 불러오지 못했습니다.");
        return;
      }

      setComments(data.comments ?? []);
    }

    void loadComments();
  }, [selectedBandKey, selectedPostKey]);

  return (
    <div className="section-stack">
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

      <div className="live-region" aria-live="polite" role="status">
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </div>
  );
}
