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
      <h1 className="page-title">Google Drive Connection</h1>
      <p className="page-subtitle">
        Step order: connect account, find files, and upload. Each step shows status directly on this page.
      </p>
      <DriveWorkspace />
    </main>
  );
}
