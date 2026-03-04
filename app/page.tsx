import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

const modules = [
  {
    title: "1) BAND 연결",
    description: "연구실 BAND의 밴드 목록, 게시글, 댓글을 한곳에서 확인합니다."
  },
  {
    title: "2) Google Drive 연결",
    description: "주요 파일을 검색하고, 새 파일을 바로 업로드합니다."
  },
  {
    title: "3) 메일 연결",
    description: "Gmail 또는 개인 네이버메일(IMAP 앱 비밀번호)을 연결해 최근 메일을 확인합니다."
  }
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="page-shell" id="main-content">
      <header className="section-stack" aria-labelledby="home-title">
        <p className="badge">시니어 연구자용 통합 업무 포털</p>
        <h1 className="page-title" id="home-title">
          Work Portal for Senior Researchers
        </h1>
        <p className="page-subtitle">
          BAND, Google Drive, Gmail, 개인 네이버메일을 한 화면에서 확인할 수 있습니다. 기존 도구는 그대로
          쓰고, 이동 횟수만 줄입니다.
        </p>
        <div className="actions-row">
          {user ? (
            <Link className="link-button" href="/dashboard">
              대시보드 열기
            </Link>
          ) : (
            <Link className="link-button" href="/signin">
              로그인하기
            </Link>
          )}
          <Link className="button-secondary" href="/api/health">
            서비스 상태 확인
          </Link>
        </div>
      </header>

      <section className="section grid-cards" aria-label="핵심 연결 단계">
        {modules.map((module) => (
          <article key={module.title} className="surface-card">
            <div className="card-body">
              <h2 className="card-title">{module.title}</h2>
              <p className="card-text">{module.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="section surface-card surface-card-soft">
        <div className="card-body">
          <p className="card-text">
            처음 사용이라면 <code>/dashboard</code>에서 순서대로 연결 버튼을 누르세요. 단계별로 성공 여부를 바로
            확인할 수 있습니다.
          </p>
        </div>
      </section>
    </main>
  );
}
