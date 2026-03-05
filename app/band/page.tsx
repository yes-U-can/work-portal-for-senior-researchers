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
        BAND 심사 상태를 먼저 확인한 뒤, 연결 가능 상태에서 밴드/게시글/댓글을 확인할 수 있습니다.
      </p>
      <BandWorkspace />
    </main>
  );
}
