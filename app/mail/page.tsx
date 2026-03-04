import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import MailWorkspace from "./workspace";

export default async function MailPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  return (
    <main className="page-shell" id="main-content">
      <h1 className="page-title">메일 연결 화면</h1>
      <p className="page-subtitle">
        Gmail 또는 개인 네이버메일을 연결해 최근 메일을 확인합니다. 두 메일 중 하나만 먼저 연결해도 됩니다.
      </p>
      <MailWorkspace />
    </main>
  );
}
