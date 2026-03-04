import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import BandWorkspace from "./workspace";

export default async function BandPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  return (
    <main className="page-shell" id="main-content">
      <h1 className="page-title">BAND 연결 화면</h1>
      <p className="page-subtitle">
        연결된 BAND에서 밴드, 게시글, 댓글을 확인합니다. 먼저 대시보드에서 BAND 연결을 완료하세요.
      </p>
      <BandWorkspace />
    </main>
  );
}
