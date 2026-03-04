import { Role } from "@prisma/client";

const roleOrder: Role[] = ["VIEWER", "MEMBER", "ADMIN", "OWNER"];

export function hasRoleOrAbove(currentRole: Role, minRole: Role): boolean {
  return roleOrder.indexOf(currentRole) >= roleOrder.indexOf(minRole);
}
