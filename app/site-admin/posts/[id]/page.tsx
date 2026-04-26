import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteContentVisibility, SitePostCategory } from "@prisma/client";
import { AttachmentUploader } from "@/app/site-admin/attachment-uploader";
import { updateSitePostAction } from "@/app/site-admin/actions";
import { DraftAutosave } from "@/app/site-admin/draft-autosave";
import { RichTextEditor } from "@/app/site-admin/rich-text-editor";
import { db } from "@/lib/db";
import { resolveSiteAdminAccess } from "@/lib/site-admin/access";
import {
  sitePostCategoryLabels,
  sitePostLabelOptions,
  siteVisibilityLabels
} from "@/lib/site-admin/constants";

type SitePostEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SitePostEditPage({ params }: SitePostEditPageProps) {
  const access = await resolveSiteAdminAccess();
  if (!access) {
    redirect("/signin");
  }

  const { id } = await params;
  const post = await db.sitePost.findFirst({
    where: {
      id,
      tenantId: access.tenant.tenantId,
      deletedAt: null
    }
  });

  if (!post) {
    notFound();
  }

  if (!access.canManageSystemSettings && post.authorUserId !== access.appUserId) {
    redirect("/site-admin?error=post-permission");
  }

  return (
    <main className="page-shell" id="main-content">
      <header className="heading-row">
        <div>
          <h1 className="page-title">공지사항 수정</h1>
          <p className="page-subtitle">본인이 작성한 글은 직접 수정할 수 있고, 관리자 계정은 모든 글을 수정할 수 있습니다.</p>
        </div>
        <Link className="button-secondary" href="/site-admin">
          관리 화면으로 돌아가기
        </Link>
      </header>

      <section className="surface-card section">
        <div className="card-body">
          <form className="form-grid" action={updateSitePostAction} id={`site-post-edit-form-${post.id}`}>
            <DraftAutosave formId={`site-post-edit-form-${post.id}`} storageKey={`site-admin:edit-post:${post.id}`} />
            <input type="hidden" name="id" value={post.id} />
            <label className="form-label">
              제목
              <input className="text-input" name="title" required maxLength={120} defaultValue={post.title} />
            </label>
            <label className="form-label">
              본문
              <RichTextEditor name="body" initialValue={post.body} />
            </label>
            <div className="form-row">
              <label className="form-label">
                카테고리
                <select className="select-input" name="category" defaultValue={post.category ?? SitePostCategory.GENERAL}>
                  {Object.entries(sitePostCategoryLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-label">
                공개 범위
                <select className="select-input" name="visibility" defaultValue={post.visibility ?? SiteContentVisibility.DRAFT}>
                  {Object.entries(siteVisibilityLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className="fieldset">
              <legend>라벨</legend>
              <div className="checkbox-row">
                {sitePostLabelOptions.map((label) => (
                  <label className="checkbox-label" key={label}>
                    <input type="checkbox" name="labels" value={label} defaultChecked={post.labels.includes(label)} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="checkbox-label">
              <input type="checkbox" name="isPinned" defaultChecked={post.isPinned} />
              상단 고정 공지로 표시하기
            </label>
            <label className="form-label">
              관련 링크. 한 줄에 하나씩 `제목 | URL` 형식, 최대 3개
              <textarea
                className="text-area text-area-small"
                name="relatedLinks"
                rows={3}
                defaultValue={jsonLinksToTextarea(post.relatedLinks)}
              />
            </label>
            <label className="form-label">
              첨부파일 링크. 한 줄에 하나씩 `파일명 | URL` 형식, 최대 5개
              <textarea
                className="text-area text-area-small"
                name="attachments"
                rows={4}
                defaultValue={jsonLinksToTextarea(post.attachments)}
              />
            </label>
            <AttachmentUploader />
            <button className="button" type="submit">
              수정 저장
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function jsonLinksToTextarea(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((item) => {
      if (!isLinkItem(item)) {
        return "";
      }

      return `${item.title} | ${item.url}`;
    })
    .filter(Boolean)
    .join("\n");
}

function isLinkItem(value: unknown): value is { title: string; url: string } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { title?: unknown; url?: unknown };
  return typeof candidate.title === "string" && typeof candidate.url === "string";
}
