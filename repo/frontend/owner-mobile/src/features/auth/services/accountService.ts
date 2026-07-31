import { apiRequest } from "../../../api/apiClient";

export interface AccountProfile {
  id: string;
  fullName: string;
  emailAddress: string;
  mobileNumber?: string;
  role: "Owner" | "Staff";
  isActive: boolean;
}

export function getAccountProfile() {
  return apiRequest<AccountProfile>("/api/auth/me");
}

export function updateAccountProfile(input: {
  fullName: string;
  emailAddress: string;
  mobileNumber?: string;
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
