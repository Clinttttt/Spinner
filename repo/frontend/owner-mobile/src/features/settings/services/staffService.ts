import { apiRequest } from "../../../api/apiClient";

/** Owner sets prices and sees the books; staff run the day's work. */
export type StaffRole = "Owner" | "Staff";

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
