import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteContentVisibility, SitePostCategory } from "@prisma/client";
import { AttachmentUploader } from "@/app/site-admin/attachment-uploader";
import { DraftAutosave } from "@/app/site-admin/draft-autosave";
import { RichTextEditor } from "@/app/site-admin/rich-text-editor";
import {
  createSitePostAction,
  createSiteResourceAction,
  createWorkshopScheduleAction,
  permanentlyDeleteSitePostAction,
  permanentlyDeleteSiteResourceAction,
  permanentlyDeleteWorkshopScheduleAction,
  restoreSitePostAction,
  restoreSiteResourceAction,
  restoreWorkshopScheduleAction,
  softDeleteSitePostAction,
  softDeleteSiteResourceAction,
  softDeleteWorkshopScheduleAction,
  updateAuthorProfileAction,
  updateSiteResourceAction,
  updateWorkshopScheduleAction
} from "@/app/site-admin/actions";
import { resolveSiteAdminAccess } from "@/lib/site-admin/access";
import {
  sitePostCategoryLabels,
  sitePostLabelOptions,
  siteVisibilityLabels,
  siteWorkshopOptions
} from "@/lib/site-admin/constants";
import { getSiteAdminOverview } from "@/lib/site-admin/queries";

type SiteAdminPageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
    q?: string;
    category?: string;
    visibility?: string;
    label?: string;
    resourceWorkshop?: string;
    scheduleWorkshop?: string;
    sort?: string;
  }>;
};

const messageLabels: Record<string, string> = {
  created: "공지글을 저장했습니다.",
  updated: "공지글을 수정했습니다.",
  deleted: "공지글을 휴지통으로 보냈습니다.",
  restored: "공지글을 복구했습니다.",
  "hard-deleted": "공지글을 완전히 삭제했습니다.",
  "resource-created": "자료 링크를 저장했습니다.",
  "resource-updated": "자료 링크를 수정했습니다.",
  "resource-deleted": "자료 링크를 휴지통으로 보냈습니다.",
  "resource-restored": "자료 링크를 복구했습니다.",
  "resource-hard-deleted": "자료 링크를 완전히 삭제했습니다.",
  "schedule-created": "워크숍 일정을 저장했습니다.",
  "schedule-updated": "워크숍 일정을 수정했습니다.",
  "schedule-deleted": "워크숍 일정을 휴지통으로 보냈습니다.",
  "schedule-restored": "워크숍 일정을 복구했습니다.",
  "schedule-hard-deleted": "워크숍 일정을 완전히 삭제했습니다.",
  "profile-updated": "작성자 표시명을 저장했습니다."
};

const errorLabels: Record<string, string> = {
  "post-permission": "이 공지글을 수정하거나 삭제할 권한이 없습니다.",
  "resource-permission": "이 자료 링크를 삭제할 권한이 없습니다.",
  "schedule-permission": "워크숍 일정을 수정하거나 삭제할 권한이 없습니다.",
  "hard-delete-permission": "완전삭제는 관리자 계정만 사용할 수 있습니다."
};

export default async function SiteAdminPage({ searchParams }: SiteAdminPageProps) {
  const access = await resolveSiteAdminAccess();
  if (!access) {
    redirect("/signin");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const filters = parseFilters(resolvedSearchParams);
  const overview = await getSiteAdminOverview(access, filters);
  const message = resolvedSearchParams?.message ? messageLabels[resolvedSearchParams.message] : "";
  const error = resolvedSearchParams?.error ? errorLabels[resolvedSearchParams.error] : "";

  return (
    <main className="page-shell" id="main-content">
      <header className="heading-row">
        <div>
          <h1 className="page-title">공개 웹사이트 관리</h1>
          <p className="page-subtitle">
            공지사항, 워크숍 일정, 자료실 링크를 관리합니다. 작성자 표시명은{" "}
            <strong>{overview.profile?.displayName ?? access.displayName}</strong>입니다.
          </p>
        </div>
        <div className="actions-row">
          <Link className="button-secondary" href="/dashboard">
            대시보드
          </Link>
          <Link className="button-secondary" href="/api/auth/signout">
            로그아웃
          </Link>
        </div>
      </header>

      <div className="live-region" aria-live="polite" role="status">
        {message ? <p className="success-text">{message}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <section className="metric-grid section" aria-label="공개 사이트 관리 현황">
        <article className="metric-card">
          <p className="metric-label">공지글</p>
          <p className="metric-value">{overview.stats.postsCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">공개 공지</p>
          <p className="metric-value">{overview.stats.publicPostsCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">초안</p>
          <p className="metric-value">{overview.stats.draftPostsCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">자료 링크</p>
          <p className="metric-value">{overview.stats.resourcesCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">워크숍 일정</p>
          <p className="metric-value">{overview.stats.schedulesCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">휴지통</p>
          <p className="metric-value">{overview.stats.trashCount}</p>
        </article>
      </section>

      <section className="section-stack section">
        <article className="surface-card">
          <div className="card-body section-stack">
            <h2 className="card-title">검색과 필터</h2>
            <form className="form-grid" action="/site-admin">
              <label className="form-label">
                검색어
                <input
                  className="text-input"
                  name="q"
                  placeholder="제목, 본문, 회차, URL 검색"
                  defaultValue={filters.q ?? ""}
                />
              </label>
              <div className="form-row">
                <label className="form-label">
                  공지 카테고리
                  <select className="select-input" name="category" defaultValue={filters.category ?? "ALL"}>
                    <option value="ALL">전체</option>
                    {Object.entries(sitePostCategoryLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-label">
                  공개 범위
                  <select className="select-input" name="visibility" defaultValue={filters.visibility ?? "ALL"}>
                    <option value="ALL">전체</option>
                    {Object.entries(siteVisibilityLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label className="form-label">
                  공지 라벨
                  <select className="select-input" name="label" defaultValue={filters.label ?? "ALL"}>
                    <option value="ALL">전체</option>
                    {sitePostLabelOptions.map((label) => (
                      <option value={label} key={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-label">
                  자료실 워크숍
                  <select className="select-input" name="resourceWorkshop" defaultValue={filters.resourceWorkshop ?? "ALL"}>
                    <option value="ALL">전체</option>
                    {siteWorkshopOptions.map((workshop) => (
                      <option value={workshop.slug} key={workshop.slug}>
                        {workshop.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-label">
                  일정 워크숍
                  <select className="select-input" name="scheduleWorkshop" defaultValue={filters.scheduleWorkshop ?? "ALL"}>
                    <option value="ALL">전체</option>
                    {siteWorkshopOptions.map((workshop) => (
                      <option value={workshop.slug} key={workshop.slug}>
                        {workshop.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="form-label">
                정렬
                <select className="select-input" name="sort" defaultValue={filters.sort ?? "updated"}>
                  <option value="updated">수정일 최신순</option>
                  <option value="created">작성일 최신순</option>
                </select>
              </label>
              <div className="actions-row">
                <button className="button" type="submit">
                  검색 적용
                </button>
                <Link className="button-secondary" href="/site-admin">
                  초기화
                </Link>
              </div>
            </form>
          </div>
        </article>

        <article className="surface-card">
          <div className="card-body section-stack">
            <h2 className="card-title">내 작성자 표시명</h2>
            <form className="form-grid" action={updateAuthorProfileAction}>
              <label className="form-label">
                작성자 표시명
                <input
                  className="text-input"
                  name="displayName"
                  defaultValue={overview.profile?.displayName ?? access.displayName}
                  maxLength={24}
                  required
                />
              </label>
              <button className="button" type="submit">
                표시명 저장
              </button>
            </form>
          </div>
        </article>

        <article className="surface-card">
          <div className="card-body section-stack">
            <h2 className="card-title">공지사항 작성</h2>
            <form className="form-grid" action={createSitePostAction} id="site-post-create-form">
              <DraftAutosave formId="site-post-create-form" storageKey="site-admin:new-post" />
              <label className="form-label">
                제목
                <input className="text-input" name="title" required maxLength={120} />
              </label>
              <label className="form-label">
                본문
                <RichTextEditor name="body" />
              </label>
              <div className="form-row">
                <label className="form-label">
                  카테고리
                  <select className="select-input" name="category" defaultValue={SitePostCategory.GENERAL}>
                    {Object.entries(sitePostCategoryLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-label">
                  공개 범위
                  <select className="select-input" name="visibility" defaultValue={SiteContentVisibility.DRAFT}>
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
                      <input type="checkbox" name="labels" value={label} />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="checkbox-label">
                <input type="checkbox" name="isPinned" />
                상단 고정 공지로 저장하기. 최대 3개까지만 고정됩니다.
              </label>
              <label className="form-label">
                관련 링크. 한 줄에 하나씩 `제목 | URL` 형식, 최대 3개
                <textarea className="text-area text-area-small" name="relatedLinks" rows={3} />
              </label>
              <label className="form-label">
                첨부파일 링크. 한 줄에 하나씩 `파일명 | URL` 형식, 최대 5개
                <textarea className="text-area text-area-small" name="attachments" rows={4} />
              </label>
              <AttachmentUploader />
              <button className="button" type="submit">
                공지 저장
              </button>
            </form>
          </div>
        </article>

        <article className="surface-card">
          <div className="card-body section-stack">
            <h2 className="card-title">공지사항 목록</h2>
            <div className="admin-list">
              {overview.posts.map((post) => (
                <article className="item-card" key={post.id}>
                  <div>
                    <p className="item-title">{post.title}</p>
                    <p className="item-subtitle">
                      {sitePostCategoryLabels[post.category]} · {siteVisibilityLabels[post.visibility]} · 작성자:{" "}
                      {post.author?.authorProfiles[0]?.displayName ?? post.author?.email ?? "알 수 없음"}
                    </p>
                  </div>
                  <div className="actions-row">
                    {canManageItem(access, post.authorUserId) ? (
                      <>
                        <Link className="button-secondary" href={`/site-admin/posts/${post.id}`}>
                          수정
                        </Link>
                        <form action={softDeleteSitePostAction}>
                          <input type="hidden" name="id" value={post.id} />
                          <button className="button-danger" type="submit">
                            삭제
                          </button>
                        </form>
                      </>
                    ) : (
                      <span className="hint">읽기 전용</span>
                    )}
                  </div>
                </article>
              ))}
              {overview.posts.length === 0 ? <p className="hint">아직 작성된 공지글이 없습니다.</p> : null}
            </div>
          </div>
        </article>

        <article className="surface-card">
          <div className="card-body section-stack">
            <h2 className="card-title">워크숍 자료 링크 등록</h2>
            <form className="form-grid" action={createSiteResourceAction}>
              <div className="form-row">
                <label className="form-label">
                  워크숍
                  <select className="select-input" name="workshopSlug" defaultValue="ai">
                    {siteWorkshopOptions.map((workshop) => (
                      <option value={workshop.slug} key={workshop.slug}>
                        {workshop.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-label">
                  공개 범위
                  <select className="select-input" name="visibility" defaultValue={SiteContentVisibility.PUBLIC}>
                    {Object.entries(siteVisibilityLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="form-label">
                회차/묶음
                <input className="text-input" name="session" required placeholder="예: 제1회 AI에 탑승한 심리검사" />
              </label>
              <label className="form-label">
                자료 제목
                <input className="text-input" name="title" required />
              </label>
              <label className="form-label">
                자료 링크
                <input className="text-input" name="url" type="url" required />
              </label>
              <label className="form-label">
                설명
                <textarea className="text-area text-area-small" name="description" rows={3} />
              </label>
              <button className="button" type="submit">
                자료 링크 저장
              </button>
            </form>
          </div>
        </article>

        <article className="surface-card">
          <div className="card-body section-stack">
            <h2 className="card-title">자료 링크 목록</h2>
            <div className="admin-list">
              {overview.resources.map((resource) => (
                <article className="item-card" key={resource.id}>
                  <div>
                    <p className="item-title">{resource.title}</p>
                    <p className="item-subtitle">
                      {resource.workshopSlug} · {resource.session} · {siteVisibilityLabels[resource.visibility]}
                    </p>
                    <p className="item-snippet">{resource.url}</p>
                  </div>
                  {canManageItem(access, resource.authorUserId) ? (
                    <>
                      <details className="inline-edit">
                        <summary>수정 열기</summary>
                        <form className="form-grid" action={updateSiteResourceAction}>
                          <input type="hidden" name="id" value={resource.id} />
                          <div className="form-row">
                            <label className="form-label">
                              워크숍
                              <select className="select-input" name="workshopSlug" defaultValue={resource.workshopSlug}>
                                {siteWorkshopOptions.map((workshop) => (
                                  <option value={workshop.slug} key={workshop.slug}>
                                    {workshop.title}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="form-label">
                              공개 범위
                              <select className="select-input" name="visibility" defaultValue={resource.visibility}>
                                {Object.entries(siteVisibilityLabels).map(([value, label]) => (
                                  <option value={value} key={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <label className="form-label">
                            회차/묶음
                            <input className="text-input" name="session" required defaultValue={resource.session} />
                          </label>
                          <label className="form-label">
                            자료 제목
                            <input className="text-input" name="title" required defaultValue={resource.title} />
                          </label>
                          <label className="form-label">
                            자료 링크
                            <input className="text-input" name="url" type="url" required defaultValue={resource.url} />
                          </label>
                          <label className="form-label">
                            설명
                            <textarea
                              className="text-area text-area-small"
                              name="description"
                              rows={3}
                              defaultValue={resource.description ?? ""}
                            />
                          </label>
                          <div className="actions-row">
                            <button className="button" type="submit">
                              자료 수정 저장
                            </button>
                          </div>
                        </form>
                      </details>
                      <div className="actions-row">
                        <form action={softDeleteSiteResourceAction}>
                          <input type="hidden" name="id" value={resource.id} />
                          <button className="button-danger" type="submit">
                            삭제
                          </button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <span className="hint">읽기 전용</span>
                  )}
                </article>
              ))}
              {overview.resources.length === 0 ? <p className="hint">아직 등록된 자료 링크가 없습니다.</p> : null}
            </div>
          </div>
        </article>

        <article className="surface-card">
          <div className="card-body section-stack">
            <h2 className="card-title">워크숍 일정 등록</h2>
            <p className="hint">
              공개 사이트의 달력은 이 일정 데이터를 기준으로 표시됩니다. 신청 기간과 워크숍 일시를 입력하면 신청 중, 신청 마감,
              종료 상태가 자동으로 계산됩니다.
            </p>
            <form className="form-grid" action={createWorkshopScheduleAction}>
              <div className="form-row">
                <label className="form-label">
                  워크숍
                  <select className="select-input" name="workshopSlug" defaultValue="ai">
                    {siteWorkshopOptions.map((workshop) => (
                      <option value={workshop.slug} key={workshop.slug}>
                        {workshop.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-label">
                  공개 범위
                  <select className="select-input" name="scheduleVisibility" defaultValue={SiteContentVisibility.PUBLIC}>
                    {Object.entries(siteVisibilityLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="form-label">
                일정 제목
                <input className="text-input" name="scheduleTitle" required placeholder="예: 제1회 AI에 탑승한 심리검사" />
              </label>
              <label className="form-label">
                신청 구글폼 링크
                <input className="text-input" name="scheduleApplicationFormUrl" type="url" placeholder="https://forms.gle/..." />
              </label>
              <div className="form-row">
                <label className="form-label">
                  신청 시작
                  <input className="text-input" name="scheduleApplicationStartsAt" type="datetime-local" />
                </label>
                <label className="form-label">
                  신청 종료
                  <input className="text-input" name="scheduleApplicationEndsAt" type="datetime-local" />
                </label>
              </div>
              <div className="form-row">
                <label className="form-label">
                  워크숍 시작
                  <input className="text-input" name="scheduleWorkshopStartsAt" type="datetime-local" required />
                </label>
                <label className="form-label">
                  워크숍 종료
                  <input className="text-input" name="scheduleWorkshopEndsAt" type="datetime-local" />
                </label>
              </div>
              <label className="form-label">
                간단 메모
                <textarea className="text-area text-area-small" name="scheduleDescription" rows={3} />
              </label>
              <button className="button" type="submit">
                워크숍 일정 저장
              </button>
            </form>
          </div>
        </article>

        <article className="surface-card">
          <div className="card-body section-stack">
            <h2 className="card-title">워크숍 일정 목록</h2>
            <div className="admin-list">
              {overview.schedules.map((schedule) => (
                <article className="item-card" key={schedule.id}>
                  <div>
                    <p className="item-title">{schedule.title}</p>
                    <p className="item-subtitle">
                      {getWorkshopTitle(schedule.workshopSlug)} · {siteVisibilityLabels[schedule.visibility]} ·{" "}
                      {getScheduleStatusLabel(schedule)}
                    </p>
                    <p className="item-snippet">
                      워크숍: {formatDateTime(schedule.workshopStartsAt)}
                      {schedule.workshopEndsAt ? ` - ${formatDateTime(schedule.workshopEndsAt)}` : ""}
                    </p>
                    {schedule.applicationStartsAt && schedule.applicationEndsAt ? (
                      <p className="item-snippet">
                        신청: {formatDateTime(schedule.applicationStartsAt)} - {formatDateTime(schedule.applicationEndsAt)}
                      </p>
                    ) : null}
                    <p className="item-subtitle">
                      작성자: {schedule.author?.authorProfiles[0]?.displayName ?? schedule.author?.email ?? "관리자"}
                    </p>
                  </div>
                  <details className="inline-edit">
                    <summary>수정 열기</summary>
                    <form className="form-grid" action={updateWorkshopScheduleAction}>
                      <input type="hidden" name="id" value={schedule.id} />
                      <div className="form-row">
                        <label className="form-label">
                          워크숍
                          <select className="select-input" name="workshopSlug" defaultValue={schedule.workshopSlug}>
                            {siteWorkshopOptions.map((workshop) => (
                              <option value={workshop.slug} key={workshop.slug}>
                                {workshop.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="form-label">
                          공개 범위
                          <select className="select-input" name="scheduleVisibility" defaultValue={schedule.visibility}>
                            {Object.entries(siteVisibilityLabels).map(([value, label]) => (
                              <option value={value} key={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="form-label">
                        일정 제목
                        <input className="text-input" name="scheduleTitle" required defaultValue={schedule.title} />
                      </label>
                      <label className="form-label">
                        신청 구글폼 링크
                        <input
                          className="text-input"
                          name="scheduleApplicationFormUrl"
                          type="url"
                          defaultValue={schedule.applicationFormUrl ?? ""}
                        />
                      </label>
                      <div className="form-row">
                        <label className="form-label">
                          신청 시작
                          <input
                            className="text-input"
                            name="scheduleApplicationStartsAt"
                            type="datetime-local"
                            defaultValue={toInputDate(schedule.applicationStartsAt)}
                          />
                        </label>
                        <label className="form-label">
                          신청 종료
                          <input
                            className="text-input"
                            name="scheduleApplicationEndsAt"
                            type="datetime-local"
                            defaultValue={toInputDate(schedule.applicationEndsAt)}
                          />
                        </label>
                      </div>
                      <div className="form-row">
                        <label className="form-label">
                          워크숍 시작
                          <input
                            className="text-input"
                            name="scheduleWorkshopStartsAt"
                            type="datetime-local"
                            required
                            defaultValue={toInputDate(schedule.workshopStartsAt)}
                          />
                        </label>
                        <label className="form-label">
                          워크숍 종료
                          <input
                            className="text-input"
                            name="scheduleWorkshopEndsAt"
                            type="datetime-local"
                            defaultValue={toInputDate(schedule.workshopEndsAt)}
                          />
                        </label>
                      </div>
                      <label className="form-label">
                        간단 메모
                        <textarea
                          className="text-area text-area-small"
                          name="scheduleDescription"
                          rows={3}
                          defaultValue={schedule.description ?? ""}
                        />
                      </label>
                      <button className="button" type="submit">
                        일정 수정 저장
                      </button>
                    </form>
                  </details>
                  <div className="actions-row">
                    <form action={softDeleteWorkshopScheduleAction}>
                      <input type="hidden" name="id" value={schedule.id} />
                      <button className="button-danger" type="submit">
                        삭제
                      </button>
                    </form>
                  </div>
                </article>
              ))}
              {overview.schedules.length === 0 ? <p className="hint">아직 등록된 워크숍 일정이 없습니다.</p> : null}
            </div>
          </div>
        </article>

        <article className="surface-card">
          <div className="card-body section-stack">
            <h2 className="card-title">휴지통</h2>
            <p className="hint">
              본인이 삭제한 항목은 직접 복구할 수 있습니다. 완전삭제는 관리자 계정만 사용할 수 있습니다.
            </p>
            <div className="admin-list">
              {overview.deletedPosts.map((post) => (
                <article className="item-card" key={post.id}>
                  <div>
                    <p className="item-title">공지: {post.title}</p>
                    <p className="item-subtitle">
                      {sitePostCategoryLabels[post.category]} · 작성자:{" "}
                      {post.author?.authorProfiles[0]?.displayName ?? post.author?.email ?? "알 수 없음"}
                    </p>
                  </div>
                  <div className="actions-row">
                    <form action={restoreSitePostAction}>
                      <input type="hidden" name="id" value={post.id} />
                      <button className="button-secondary" type="submit">
                        복구
                      </button>
                    </form>
                    {access.canManageSystemSettings ? (
                      <form action={permanentlyDeleteSitePostAction}>
                        <input type="hidden" name="id" value={post.id} />
                        <button className="button-danger" type="submit">
                          완전삭제
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              ))}

              {overview.deletedResources.map((resource) => (
                <article className="item-card" key={resource.id}>
                  <div>
                    <p className="item-title">자료: {resource.title}</p>
                    <p className="item-subtitle">
                      {resource.workshopSlug} · {resource.session} · {siteVisibilityLabels[resource.visibility]}
                    </p>
                  </div>
                  <div className="actions-row">
                    <form action={restoreSiteResourceAction}>
                      <input type="hidden" name="id" value={resource.id} />
                      <button className="button-secondary" type="submit">
                        복구
                      </button>
                    </form>
                    {access.canManageSystemSettings ? (
                      <form action={permanentlyDeleteSiteResourceAction}>
                        <input type="hidden" name="id" value={resource.id} />
                        <button className="button-danger" type="submit">
                          완전삭제
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              ))}

              {overview.deletedSchedules.map((schedule) => (
                <article className="item-card" key={schedule.id}>
                  <div>
                    <p className="item-title">일정: {schedule.title}</p>
                    <p className="item-subtitle">
                      {getWorkshopTitle(schedule.workshopSlug)} · {siteVisibilityLabels[schedule.visibility]} · 작성자:{" "}
                      {schedule.author?.authorProfiles[0]?.displayName ?? schedule.author?.email ?? "알 수 없음"}
                    </p>
                  </div>
                  <div className="actions-row">
                    <form action={restoreWorkshopScheduleAction}>
                      <input type="hidden" name="id" value={schedule.id} />
                      <button className="button-secondary" type="submit">
                        복구
                      </button>
                    </form>
                    {access.canManageSystemSettings ? (
                      <form action={permanentlyDeleteWorkshopScheduleAction}>
                        <input type="hidden" name="id" value={schedule.id} />
                        <button className="button-danger" type="submit">
                          완전삭제
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              ))}

              {overview.deletedPosts.length + overview.deletedResources.length + overview.deletedSchedules.length === 0 ? (
                <p className="hint">휴지통에 보관된 항목이 없습니다.</p>
              ) : null}
            </div>
          </div>
        </article>

        <article className="surface-card">
          <div className="card-body section-stack">
            <h2 className="card-title">최근 운영 기록</h2>
            <div className="admin-list">
              {overview.auditLogs.map((log) => (
                <article className="item-card" key={log.id}>
                  <p className="item-title">{auditActionLabel(log.action)}</p>
                  <p className="item-subtitle">
                    {log.resourceType} · {formatDateTime(log.createdAt)} · 작업자:{" "}
                    {log.actorUser?.authorProfiles[0]?.displayName ?? log.actorUser?.email ?? "알 수 없음"}
                  </p>
                </article>
              ))}
              {overview.auditLogs.length === 0 ? <p className="hint">아직 운영 기록이 없습니다.</p> : null}
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

function parseFilters(searchParams: Awaited<SiteAdminPageProps["searchParams"]> | undefined) {
  const category = Object.values(SitePostCategory).includes(searchParams?.category as SitePostCategory)
    ? (searchParams?.category as SitePostCategory)
    : undefined;
  const visibility = Object.values(SiteContentVisibility).includes(searchParams?.visibility as SiteContentVisibility)
    ? (searchParams?.visibility as SiteContentVisibility)
    : undefined;
  const label = sitePostLabelOptions.includes(searchParams?.label as (typeof sitePostLabelOptions)[number])
    ? searchParams?.label
    : undefined;
  const resourceWorkshop = siteWorkshopOptions.some((workshop) => workshop.slug === searchParams?.resourceWorkshop)
    ? searchParams?.resourceWorkshop
    : undefined;
  const scheduleWorkshop = siteWorkshopOptions.some((workshop) => workshop.slug === searchParams?.scheduleWorkshop)
    ? searchParams?.scheduleWorkshop
    : undefined;
  const sort: "created" | "updated" = searchParams?.sort === "created" ? "created" : "updated";
  const q = searchParams?.q?.trim() || undefined;

  return {
    q,
    category,
    visibility,
    label,
    resourceWorkshop,
    scheduleWorkshop,
    sort
  };
}

function toInputDate(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(
    value.getMinutes()
  )}`;
}

function getScheduleStatusLabel(
  schedule:
    | {
        applicationStartsAt: Date | null;
        applicationEndsAt: Date | null;
        workshopStartsAt: Date;
        workshopEndsAt: Date | null;
      }
    | undefined
) {
  if (!schedule?.workshopStartsAt) {
    return "등록된 일정 없음";
  }

  const now = new Date();
  const workshopEndsAt = schedule.workshopEndsAt ?? schedule.workshopStartsAt;

  if (
    schedule.applicationStartsAt &&
    schedule.applicationEndsAt &&
    schedule.applicationStartsAt <= now &&
    now <= schedule.applicationEndsAt
  ) {
    return "신청 중";
  }

  if (workshopEndsAt < now) {
    return "종료된 워크숍입니다";
  }

  if (schedule.applicationEndsAt && schedule.applicationEndsAt < now) {
    return "신청 마감";
  }

  return "신청 마감";
}

function getWorkshopTitle(workshopSlug: string) {
  return siteWorkshopOptions.find((workshop) => workshop.slug === workshopSlug)?.title ?? workshopSlug;
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    "site_post.create": "공지글 작성",
    "site_post.update": "공지글 수정",
    "site_post.soft_delete": "공지글 휴지통 이동",
    "site_post.restore": "공지글 복구",
    "site_post.permanent_delete": "공지글 완전삭제",
    "site_resource.create": "자료 링크 작성",
    "site_resource.update": "자료 링크 수정",
    "site_resource.soft_delete": "자료 링크 휴지통 이동",
    "site_resource.restore": "자료 링크 복구",
    "site_resource.permanent_delete": "자료 링크 완전삭제",
    "workshop_schedule.create": "워크숍 일정 작성",
    "workshop_schedule.update": "워크숍 일정 수정",
    "workshop_schedule.soft_delete": "워크숍 일정 휴지통 이동",
    "workshop_schedule.restore": "워크숍 일정 복구",
    "workshop_schedule.permanent_delete": "워크숍 일정 완전삭제",
    "author_profile.update": "작성자 표시명 수정"
  };

  return labels[action] ?? action;
}

function formatDateTime(value: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}.${pad(value.getMonth() + 1)}.${pad(value.getDate())} ${pad(value.getHours())}:${pad(
    value.getMinutes()
  )}`;
}

function canManageItem(access: NonNullable<Awaited<ReturnType<typeof resolveSiteAdminAccess>>>, authorUserId: string | null) {
  return access.canManageSystemSettings || authorUserId === access.appUserId;
}
