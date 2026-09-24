export type UserRole = "STAFF" | "VERIFIER" | "ADMIN";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  shop?: string | null;
  shopName?: string | null;
}

export const ROLES = {
  STAFF: "STAFF" as const,
  VERIFIER: "VERIFIER" as const,
  ADMIN: "ADMIN" as const,
};

export function isAdmin(role?: string | null): boolean {
  return role === ROLES.ADMIN;
}

export function isVerifier(role?: string | null): boolean {
  return role === ROLES.VERIFIER;
}

export function isStaff(role?: string | null): boolean {
  return role === ROLES.STAFF;
}

export function canCreateFinanceRecord(user?: SessionUser | null): boolean {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  if (user.role === ROLES.STAFF && Boolean(user.shop)) return true;
  return false;
}

export function canEditFinanceRecord(
  user: SessionUser | null | undefined,
  record: { createdBy?: unknown; status: string; isLocked?: boolean }
): boolean {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  if (user.role === ROLES.STAFF) {
    const isOwner =
      record.createdBy?.toString() === user.id ||
      (typeof record.createdBy === "object" &&
        (record.createdBy as { _id?: unknown })._id?.toString() === user.id);
    return isOwner && record.status === "PENDING" && !record.isLocked;
  }
  return false;
}

export function canDeleteFinanceRecord(
  user: SessionUser | null | undefined,
  record: { createdBy?: unknown; status: string; isLocked?: boolean }
): boolean {
  return canEditFinanceRecord(user, record);
}

export function canReviewFinanceRecord(user?: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === ROLES.VERIFIER || user.role === ROLES.ADMIN;
}

export function canManageSystem(user?: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === ROLES.ADMIN;
}
