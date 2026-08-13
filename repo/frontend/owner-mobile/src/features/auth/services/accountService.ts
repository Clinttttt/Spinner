import { apiRequest } from "../../../api/apiClient";

export interface AccountProfile {
  id: string;
  fullName: string;
  emailAddress: string;
  mobileNumber?: string;
  role: "Owner" | "Staff";
  isActive: boolean;
  /**
   * The person's profile picture, or null when they have not set one.
   *
   * Absent is normal and permanent for anyone who never uploads one, so every place that
   * shows a face has to have an answer for null — their initials.
   */
  photoUrl?: string | null;
}

export function getAccountProfile() {
  return apiRequest<AccountProfile>("/api/auth/me");
}

export function updateAccountProfile(input: {
  fullName: string;
  emailAddress: string;
  mobileNumber?: string;
  photoUrl?: string | null;
}) {
  return apiRequest<AccountProfile>("/api/auth/profile", {
    body: input,
    method: "PUT",
  });
}

export function changeAccountPassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  return apiRequest<void>("/api/auth/password", {
    body: input,
    method: "PUT",
  });
}
