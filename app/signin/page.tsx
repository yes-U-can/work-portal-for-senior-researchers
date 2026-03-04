import { env } from "@/lib/env";
import SignInForm from "./signin-form";

export default function SignInPage() {
  const googleEnabled = Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET);
  const credentialsEnabled = !env.IS_PRODUCTION && Boolean(env.DEV_AUTH_EMAIL && env.DEV_AUTH_PASSWORD);

  return (
    <main className="page-shell narrow-main" id="main-content">
      <h1 className="page-title">로그인</h1>
      <p className="page-subtitle">로그인 후 대시보드에서 BAND, Drive, 메일 연결을 순서대로 진행하세요.</p>
      <SignInForm googleEnabled={googleEnabled} credentialsEnabled={credentialsEnabled} />
    </main>
  );
}
