import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export type AppUser = {
  id: string;
  email: string;
  name?: string;
};

export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  return {
    id: "session-user",
    email: session.user.email,
    name: session.user.name ?? undefined
  };
}
