import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import DriveWorkspace from "./workspace";

export default async function DrivePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  return (
    <main className="page-shell" id="main-content">
      <h1 className="page-title">Google Drive 연결</h1>
      <p className="page-subtitle">
        순서대로 `연결 → 검색 → 업로드`를 진행하세요. 각 단계 상태를 이 화면에서 바로 확인할 수 있습니다.
      </p>
      <DriveWorkspace />
    </main>
  );
}
