import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hasRoleOrAbove } from "@/lib/authorization";

type RouteContext = {
  params: Promise<{
    tenantId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = await context.params;
  const membership = await db.membership.findFirst({
    where: {
      tenantId,
      user: {
        email: user.email
      }
    }
  });

  if (!membership || !hasRoleOrAbove(membership.role, Role.ADMIN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await db.membership.findMany({
    where: { tenantId },
    select: {
      role: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ members });
}
