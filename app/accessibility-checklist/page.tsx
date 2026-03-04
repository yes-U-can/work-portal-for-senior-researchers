import Link from "next/link";

const scenarios = [
  {
    id: "S1",
    task: "Sign in and open dashboard",
    route: "/signin -> /dashboard",
    target: "Complete within 2 minutes, no help from facilitator",
    success: "User can explain what to click next"
  },
  {
    id: "S2",
    task: "Connect BAND",
    route: "/dashboard",
    target: "Complete within 3 minutes",
    success: "Status changes to Connected and user opens /band"
  },
  {
    id: "S3",
    task: "Read BAND post comments",
    route: "/band",
    target: "Complete within 2 minutes",
    success: "User selects one band, one post, and reads comments"
  },
  {
    id: "S4",
    task: "Connect Google Drive",
    route: "/dashboard -> /drive",
    target: "Complete within 3 minutes",
    success: "Status changes to Connected"
  },
  {
    id: "S5",
    task: "Search a file in Drive",
    route: "/drive",
    target: "Complete within 2 minutes",
    success: "User executes search and identifies one result"
  },
  {
    id: "S6",
    task: "Upload file to Drive",
    route: "/drive",
    target: "Complete within 2 minutes",
    success: "Success message appears and file is visible in list"
  },
  {
    id: "S7",
    task: "Connect Gmail",
    route: "/mail",
    target: "Complete within 3 minutes",
    success: "Gmail status becomes Connected"
  },
  {
    id: "S8",
    task: "Connect personal Naver Mail (IMAP)",
    route: "/mail",
    target: "Complete within 4 minutes",
    success: "User enters email + app password and sees Connected"
  },
  {
    id: "S9",
    task: "Read one mail preview",
    route: "/mail",
    target: "Complete within 2 minutes",
    success: "User selects mail from list and reads preview panel"
  },
  {
    id: "S10",
    task: "Recover from connection error",
    route: "/dashboard or /mail",
    target: "Complete within 3 minutes",
    success: "User understands error text and retries without support"
  }
];

export default function AccessibilityChecklistPage() {
  return (
    <main className="page-shell" id="main-content">
      <header className="section-stack">
        <p className="badge">Senior-first usability validation</p>
        <h1 className="page-title">Accessibility and Usability Checklist</h1>
        <p className="page-subtitle">
          Use this page for facilitator-led sessions with senior researchers. The pass condition is task
          completion without confusion, not only technical success.
        </p>
        <div className="actions-row">
          <Link className="button-secondary" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </header>

      <section className="section surface-card">
        <div className="card-body section-stack">
          <h2 className="card-title">Release gate targets</h2>
          <div className="metric-grid">
            <article className="metric-card">
              <p className="metric-label">Task completion</p>
              <p className="metric-value">90% or higher</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">No-help completion</p>
              <p className="metric-value">80% or higher</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">Critical confusion events</p>
              <p className="metric-value">0 per task</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">Average setup time</p>
              <p className="metric-value">10 minutes max</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section surface-card">
        <div className="card-body section-stack">
          <h2 className="card-title">10 scenario checklist</h2>
          <div className="checklist-table-wrap">
            <table className="checklist-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Task</th>
                  <th>Route</th>
                  <th>Target time</th>
                  <th>Pass condition</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario) => (
                  <tr key={scenario.id}>
                    <td>{scenario.id}</td>
                    <td>{scenario.task}</td>
                    <td>{scenario.route}</td>
                    <td>{scenario.target}</td>
                    <td>{scenario.success}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section surface-card surface-card-soft">
        <div className="card-body section-stack">
          <h2 className="card-title">Recording template</h2>
          <p className="card-text">
            For each task, record: `completed(Y/N)`, `time`, `help needed(Y/N)`, `confusion trigger`, and
            `fix proposal`.
          </p>
          <p className="card-text">
            Any task that fails due to unclear label, missing guidance, or weak error instruction must block
            release.
          </p>
        </div>
      </section>
    </main>
  );
}
