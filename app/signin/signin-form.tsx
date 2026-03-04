"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

type SignInFormProps = {
  googleEnabled: boolean;
  credentialsEnabled: boolean;
};

export default function SignInForm({ googleEnabled, credentialsEnabled }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onGoogleSignIn() {
    setGoogleLoading(true);
    setError("");

    await signIn("google", {
      callbackUrl: "/dashboard"
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCredentialsLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard",
      redirect: false
    });

    setCredentialsLoading(false);
    if (!result || result.error) {
      setError("Sign in failed. Check your credentials and try again.");
      return;
    }

    window.location.href = result.url ?? "/dashboard";
  }

  return (
    <section className="surface-card form-card">
      <div className="card-body form-grid">
        {googleEnabled ? (
          <button className="button" type="button" disabled={googleLoading} onClick={onGoogleSignIn}>
            {googleLoading ? "Google 로그인 화면으로 이동 중..." : "Google로 로그인"}
          </button>
        ) : (
          <p className="hint">
            Google 로그인이 설정되지 않았습니다. <code>GOOGLE_OAUTH_CLIENT_ID</code> 와{" "}
            <code>GOOGLE_OAUTH_CLIENT_SECRET</code> 값을 설정하세요.
          </p>
        )}

        {credentialsEnabled ? (
          <>
            <p className="auth-divider">또는</p>
            <form className="form-grid" onSubmit={onSubmit}>
              <label className="form-label">
                이메일
                <input
                  className="text-input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="form-label">
                비밀번호
                <input
                  className="text-input"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <button className="button-secondary" type="submit" disabled={credentialsLoading}>
                {credentialsLoading ? "로그인 중..." : "개발용 계정으로 로그인"}
              </button>
            </form>
          </>
        ) : null}

        <div className="live-region" aria-live="polite" role="status">
          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
