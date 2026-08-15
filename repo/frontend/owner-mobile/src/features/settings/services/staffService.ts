import { apiRequest } from "../../../api/apiClient";

/** Owner sets prices and sees the books; staff run the day's work. */
export type StaffRole = "Owner" | "Staff";

/**
 * A person who can sign in, as opposed to an invitation that has not been accepted.
 */
export interface StaffAccountDto {
  id: string;
  fullName: string;
  emailAddress: string;
  mobileNumber: string | null;
  role: StaffRole;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  /** Their own photo, or null. Null is normal, and the row falls back to initials. */
  photoUrl: string | null;
}

export function getStaffAccounts() {
  return apiRequest<StaffAccountDto[]>("/api/staff");
}

/**
 * Withdraws or restores one person's access.
 *
 * The account is kept either way, so the orders and receipts they recorded stay attributable.
 * The API refuses to deactivate your own account or the last active owner.
 */
export function setStaffAccountActive(staffUserId: string, isActive: boolean) {
  return apiRequest<StaffAccountDto>(
    `/api/staff/${staffUserId}/${isActive ? "activate" : "deactivate"}`,
    { method: "POST" },
  );
}

export interface StaffInvitationDto {
  invitationId: string;
  emailAddress: string;
  role: StaffRole;
  expiresAt: string;
  createdAt: string;
}

/**
 * The response to issuing an invitation.
 *
 * The code appears here and nowhere else. It is stored hashed, so this is the only
 * chance to read it — which is why the screen keeps it on display until the owner
 * dismisses it rather than clearing the form straight away.
 */
export interface IssuedInvitationDto {
  invitationId: string;
  emailAddress: string;
  role: StaffRole;
  invitationCode: string;
  expiresAt: string;
}

export function getStaffInvitations() {
  return apiRequest<StaffInvitationDto[]>("/api/staff/invitations");
}

export function inviteStaff(input: { emailAddress: string; role: StaffRole }) {
  return apiRequest<IssuedInvitationDto>("/api/staff/invitations", {
    body: { emailAddress: input.emailAddress, role: input.role },
    method: "POST",
  });
}

export function revokeStaffInvitation(invitationId: string) {
  return apiRequest<void>(`/api/staff/invitations/${invitationId}/revoke`, {
    method: "POST",
  });
}
