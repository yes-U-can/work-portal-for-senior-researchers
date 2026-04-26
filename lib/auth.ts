import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { env } from "@/lib/env";
import { isAllowedSiteAdminEmail } from "@/lib/site-admin/allowed-users";

function buildProviders(): NextAuthOptions["providers"] {
  const providers: NextAuthOptions["providers"] = [];

  if (env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: env.GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET
      })
    );
  }

  const devCredentialsEnabled =
    !env.IS_PRODUCTION && env.ENABLE_DEV_CREDENTIALS && Boolean(env.DEV_AUTH_EMAIL && env.DEV_AUTH_PASSWORD);

  if (devCredentialsEnabled) {
    providers.push(
      CredentialsProvider({
        name: "Development Credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
          if (!env.DEV_AUTH_EMAIL || !env.DEV_AUTH_PASSWORD) {
            return null;
          }

          const email = credentials?.email?.toString().trim().toLowerCase();
          const password = credentials?.password?.toString();

          if (email === env.DEV_AUTH_EMAIL.toLowerCase() && password === env.DEV_AUTH_PASSWORD) {
            return {
              id: "dev-user",
              email: env.DEV_AUTH_EMAIL,
              name: "Development Account"
            };
          }

          return null;
        }
      })
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  providers: buildProviders(),
  pages: {
    signIn: "/signin"
  },
  callbacks: {
    async signIn({ user }) {
      return isAllowedSiteAdminEmail(user.email);
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email ?? session.user.email;
        session.user.name = token.name ?? session.user.name;
      }

      return session;
    }
  }
};
