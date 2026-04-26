import { env } from "@/lib/env";
import SignInForm from "./signin-form";

export default function SignInPage() {
  const googleEnabled = Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET);
  const credentialsEnabled =
    !env.IS_PRODUCTION && env.ENABLE_DEV_CREDENTIALS && Boolean(env.DEV_AUTH_EMAIL && env.DEV_AUTH_PASSWORD);

  return (
    <main className="page-shell narrow-main" id="main-content">
      <h1 className="page-title">로그인</h1>
      <p className="page-subtitle">
        로그인 후 대시보드에서 Drive와 메일을 먼저 연결하세요. BAND는 심사 완료 후 연결 기능이 활성화됩니다.
      </p>
      <SignInForm googleEnabled={googleEnabled} credentialsEnabled={credentialsEnabled} />
    </main>
  );
}
