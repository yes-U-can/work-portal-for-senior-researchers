import Link from "next/link";
import { IntegrationProvider } from "@prisma/client";
import { redirect } from "next/navigation";
import { getLatestIntegrationHealth } from "@/lib/integrations/account-store";
import { getCurrentUser } from "@/lib/session";
import { resolveTenantAccessForUser } from "@/lib/tenant-access";

type ModuleStatus = {
  title: string;
  connectLabel: string;
  connectPath: string;
  workspacePath: string;
  status: string;
  connected: boolean;
  providerAccountId: string | null;
  updatedAt: Date | null;
};

function statusText(status: string) {
  if (status === "CONNECTED") {
    return "Connected";
  }

  if (status === "NOT_CONNECTED") {
    return "Not connected";
  }

  if (status === "EXPIRED") {
    return "Reconnect required";
  }

  return "Error";
}

function statusClass(status: string) {
  if (status === "CONNECTED") {
    return "state-connected";
  }

  if (status === "NOT_CONNECTED") {
    return "state-pending";
  }

  return "state-error";
}

export default async function DashboardPage() {
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

  const mailConnected = gmail.connected || naverMail.connected;
  const completedSteps = Number(band.connected) + Number(drive.connected) + Number(mailConnected);

  const moduleStatuses: ModuleStatus[] = [
    {
      title: "BAND",
      connectLabel: "Connect BAND",
      connectPath: "/api/integrations/band/connect",
      workspacePath: "/band",
      status: band.status,
      connected: band.connected,
      providerAccountId: band.providerAccountId,
      updatedAt: band.updatedAt
    },
    {
      title: "Google Drive",
      connectLabel: "Connect Drive",
      connectPath: "/api/integrations/drive/connect",
      workspacePath: "/drive",
      status: drive.status,
      connected: drive.connected,
      providerAccountId: drive.providerAccountId,
      updatedAt: drive.updatedAt
    },
    {
      title: "Gmail",
      connectLabel: "Connect Gmail",
      connectPath: "/api/integrations/gmail/connect",
      workspacePath: "/mail",
      status: gmail.status,
      connected: gmail.connected,
      providerAccountId: gmail.providerAccountId,
      updatedAt: gmail.updatedAt
    },
    {
      title: "Personal Naver Mail (IMAP)",
      connectLabel: "Connect Naver Mail",
      connectPath: "/mail",
      workspacePath: "/mail",
      status: naverMail.status,
      connected: naverMail.connected,
      providerAccountId: naverMail.providerAccountId,
      updatedAt: naverMail.updatedAt
    }
  ];

  return (
    <main className="page-shell" id="main-content">
      <header className="heading-row">
        <div>
          <h1 className="page-title">Connection Dashboard</h1>
          <p className="page-subtitle">
            Signed in as <strong>{user.email}</strong>
          </p>
        </div>
        <div className="actions-row">
          <Link className="button-secondary" href="/accessibility-checklist">
            Accessibility Checklist
          </Link>
          <Link className="button-secondary" href="/api/auth/signout">
            Sign out
          </Link>
        </div>
      </header>

      <section className="section-stack section" aria-label="Quick setup">
        <article className="surface-card">
          <div className="card-body section-stack">
            <h2 className="card-title">Quick setup in 3 steps</h2>
            <div className="progress-panel" role="status" aria-live="polite">
              <p className="progress-number">
                {completedSteps} / 3 steps completed
              </p>
              <p className="card-text">
                Step 1: BAND. Step 2: Google Drive. Step 3: Mail (Gmail or personal Naver Mail).
              </p>
            </div>

            <div className="setup-grid">
              <article className="setup-step">
                <p className="setup-step-title">Step 1: Connect BAND</p>
                <p className="setup-step-desc">Open BAND posts and comments from one place.</p>
                <p className={`state-text ${statusClass(band.status)}`}>{statusText(band.status)}</p>
                <div className="actions-row">
                  <Link className="button" href="/api/integrations/band/connect">
                    Connect BAND
                  </Link>
                  <Link className="button-secondary" href="/band">
                    Open BAND page
                  </Link>
                </div>
              </article>

              <article className="setup-step">
                <p className="setup-step-title">Step 2: Connect Drive</p>
                <p className="setup-step-desc">Search and upload research files from this portal.</p>
                <p className={`state-text ${statusClass(drive.status)}`}>{statusText(drive.status)}</p>
                <div className="actions-row">
                  <Link className="button" href="/api/integrations/drive/connect">
                    Connect Drive
                  </Link>
                  <Link className="button-secondary" href="/drive">
                    Open Drive page
                  </Link>
                </div>
              </article>

              <article className="setup-step">
                <p className="setup-step-title">Step 3: Connect Mail</p>
                <p className="setup-step-desc">
                  Connect either Gmail or personal Naver Mail first.
                </p>
                <p className={`state-text ${mailConnected ? "state-connected" : "state-pending"}`}>
                  {mailConnected ? "Connected" : "Not connected"}
                </p>
                <div className="actions-row">
                  <Link className="button" href="/api/integrations/gmail/connect">
                    Connect Gmail
                  </Link>
                  <Link className="button-secondary" href="/mail">
                    Connect Naver Mail
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </article>

        <section className="status-grid" aria-label="Detailed integration status">
          {moduleStatuses.map((module) => (
            <article className="surface-card" key={module.title}>
              <div className="card-body section-stack">
                <div>
                  <h3 className="card-title">{module.title}</h3>
                  <p className={`state-text ${statusClass(module.status)}`}>{statusText(module.status)}</p>
                  <p className="status-meta">Account: {module.providerAccountId ?? "Not connected"}</p>
                  <p className="status-meta">
                    Last update: {module.updatedAt ? new Date(module.updatedAt).toLocaleString("ko-KR") : "-"}
                  </p>
                </div>
                <div className="actions-row">
                  <Link className="button" href={module.connectPath}>
                    {module.connectLabel}
                  </Link>
                  <Link className="button-secondary" href={module.workspacePath}>
                    Open page
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
