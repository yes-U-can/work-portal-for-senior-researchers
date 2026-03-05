import Link from "next/link";
import { IntegrationProvider } from "@prisma/client";
import { redirect } from "next/navigation";
import { getLatestIntegrationHealth } from "@/lib/integrations/account-store";
import { getBandReadiness } from "@/lib/integrations/band-readiness";
import { getCurrentUser } from "@/lib/session";
import { resolveTenantAccessForUser } from "@/lib/tenant-access";

type DashboardPageProps = {
  searchParams?: {
    [key: string]: string | string[] | undefined;
  };
};

type ModuleStatus = {
  title: string;
  connectLabel: string;
  connectPath: string;
  connectDisabled: boolean;
  workspacePath: string;
  statusLabel: string;
  statusClassName: string;
  providerAccountId: string | null;
  updatedAt: Date | null;
  helperText: string;
};

function statusLabel(status: string) {
  if (status === "CONNECTED") {
    return "연결 완료";
  }

  if (status === "NOT_CONNECTED") {
    return "미연결";
  }

  if (status === "EXPIRED") {
    return "재연결 필요";
  }

  return "오류";
}

function statusClassName(status: string) {
  if (status === "CONNECTED") {
    return "state-connected";
  }

  if (status === "NOT_CONNECTED") {
    return "state-pending";
  }

  return "state-error";
}

function toSingleSearchParam(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return "";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  const access = await resolveTenantAccessForUser(user);
  if (!access) {
    redirect("/signin");
  }

  const [band, drive, gmail, naverMail] = await Promise.all([
    getLatestIntegrationHealth(access.tenantId, IntegrationProvider.BAND),
    getLatestIntegrationHealth(access.tenantId, IntegrationProvider.GOOGLE_DRIVE),
    getLatestIntegrationHealth(access.tenantId, IntegrationProvider.GMAIL),
    getLatestIntegrationHealth(access.tenantId, IntegrationProvider.NAVER_MAIL)
  ]);

  const bandReadiness = getBandReadiness();
  const bandAvailable = bandReadiness.availability === "AVAILABLE";
  const mailConnected = gmail.connected || naverMail.connected;

  const totalSteps = bandAvailable ? 3 : 2;
  const completedSteps =
    Number(drive.connected) + Number(mailConnected) + (bandAvailable ? Number(band.connected) : 0);

  const bandStatus = bandAvailable ? statusLabel(band.status) : "심사중 (연결 대기)";
  const bandStatusClass = bandAvailable ? statusClassName(band.status) : "state-pending";

  const moduleStatuses: ModuleStatus[] = [
    {
      title: "Google Drive",
      connectLabel: "Drive 연결",
      connectPath: "/api/integrations/drive/connect",
      connectDisabled: false,
      workspacePath: "/drive",
      statusLabel: statusLabel(drive.status),
      statusClassName: statusClassName(drive.status),
      providerAccountId: drive.providerAccountId,
      updatedAt: drive.updatedAt,
      helperText: "연구 파일 검색과 업로드를 먼저 준비하세요."
    },
    {
      title: "메일 (Gmail / 개인 네이버메일)",
      connectLabel: "메일 연결",
      connectPath: "/mail",
      connectDisabled: false,
      workspacePath: "/mail",
      statusLabel: mailConnected ? "연결 완료" : "미연결",
      statusClassName: mailConnected ? "state-connected" : "state-pending",
      providerAccountId: gmail.providerAccountId ?? naverMail.providerAccountId,
      updatedAt: gmail.updatedAt ?? naverMail.updatedAt,
      helperText: "Gmail 또는 개인 네이버메일 중 하나만 먼저 연결해도 됩니다."
    },
    {
      title: "BAND",
      connectLabel: bandAvailable ? "BAND 연결" : "심사중",
      connectPath: bandAvailable ? "/api/integrations/band/connect" : "/band",
      connectDisabled: !bandAvailable,
      workspacePath: "/band",
      statusLabel: bandStatus,
      statusClassName: bandStatusClass,
      providerAccountId: band.providerAccountId,
      updatedAt: band.updatedAt,
      helperText: bandReadiness.availabilityMessage
    }
  ];

  const bandQuery = toSingleSearchParam(searchParams?.band);

  return (
    <main className="page-shell" id="main-content">
      <header className="heading-row">
        <div>
          <h1 className="page-title">업무 포털 대시보드</h1>
          <p className="page-subtitle">
            로그인 계정: <strong>{user.email}</strong>
          </p>
        </div>
        <div className="actions-row">
          <Link className="button-secondary" href="/accessibility-checklist">
            접근성 체크리스트
          </Link>
          <Link className="button-secondary" href="/api/auth/signout">
            로그아웃
          </Link>
        </div>
      </header>

      {bandQuery === "pending_review" ? (
        <section className="section surface-card surface-card-soft">
          <div className="card-body section-stack">
            <p className="state-text state-pending">BAND 연동은 현재 심사중입니다.</p>
            <p className="card-text">{bandReadiness.availabilityMessage}</p>
          </div>
        </section>
      ) : null}

      <section className="section-stack section" aria-label="빠른 시작">
        <article className="surface-card">
          <div className="card-body section-stack">
            <h2 className="card-title">빠른 시작 (Drive → Mail 우선)</h2>
            <div className="progress-panel" role="status" aria-live="polite">
              <p className="progress-number">
                {completedSteps} / {totalSteps} 단계 완료
              </p>
              <p className="card-text">
                1단계 Drive 연결, 2단계 메일 연결을 먼저 완료하세요. BAND는 심사 완료 후 자동으로 활성화됩니다.
              </p>
            </div>

            <div className="setup-grid">
              <article className="setup-step">
                <p className="setup-step-title">1단계: Google Drive 연결</p>
                <p className="setup-step-desc">파일 검색과 업로드를 위해 Drive를 먼저 연결합니다.</p>
                <p className={`state-text ${statusClassName(drive.status)}`}>{statusLabel(drive.status)}</p>
                <div className="actions-row">
                  <Link className="button" href="/api/integrations/drive/connect">
                    Drive 연결 시작
                  </Link>
                  <Link className="button-secondary" href="/drive">
                    Drive 화면 열기
                  </Link>
                </div>
              </article>

              <article className="setup-step">
                <p className="setup-step-title">2단계: 메일 연결</p>
                <p className="setup-step-desc">
                  Gmail 또는 개인 네이버메일 중 하나만 먼저 연결해도 최근 메일 확인이 가능합니다.
                </p>
                <p className={`state-text ${mailConnected ? "state-connected" : "state-pending"}`}>
                  {mailConnected ? "연결 완료" : "미연결"}
                </p>
                <div className="actions-row">
                  <Link className="button" href="/mail">
                    메일 연결 시작
                  </Link>
                  <Link className="button-secondary" href="/mail">
                    메일 화면 열기
                  </Link>
                </div>
              </article>

              <article className="setup-step">
                <p className="setup-step-title">3단계: BAND 연결</p>
                <p className="setup-step-desc">{bandReadiness.availabilityMessage}</p>
                <p className={`state-text ${bandStatusClass}`}>{bandStatus}</p>
                <div className="actions-row">
                  {bandAvailable ? (
                    <Link className="button" href="/api/integrations/band/connect">
                      BAND 연결 시작
                    </Link>
                  ) : (
                    <span className="button-disabled" aria-disabled="true">
                      BAND 심사중
                    </span>
                  )}
                  <Link className="button-secondary" href="/band">
                    BAND 화면 열기
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </article>

        <section className="status-grid" aria-label="연동 상태 상세">
          {moduleStatuses.map((module) => (
            <article className="surface-card" key={module.title}>
              <div className="card-body section-stack">
                <div>
                  <h3 className="card-title">{module.title}</h3>
                  <p className={`state-text ${module.statusClassName}`}>{module.statusLabel}</p>
                  <p className="status-meta">계정: {module.providerAccountId ?? "연결 전"}</p>
                  <p className="status-meta">
                    마지막 업데이트: {module.updatedAt ? new Date(module.updatedAt).toLocaleString("ko-KR") : "-"}
                  </p>
                  <p className="status-meta">{module.helperText}</p>
                </div>
                <div className="actions-row">
                  {module.connectDisabled ? (
                    <span className="button-disabled" aria-disabled="true">
                      {module.connectLabel}
                    </span>
                  ) : (
                    <Link className="button" href={module.connectPath}>
                      {module.connectLabel}
                    </Link>
                  )}
                  <Link className="button-secondary" href={module.workspacePath}>
                    화면 열기
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
