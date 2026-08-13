import * as SecureStore from "expo-secure-store";

import * as FileSystem from "expo-file-system/legacy";

import { getConnectivitySnapshot } from "../offline/connectivityStore";
import {
  cacheApiResponse,
  clearOfflineCache,
  readCachedApiResponse,
} from "../offline/offlineCache";
import { apiConfig } from "./apiConfig";

const REQUEST_TIMEOUT_MS = 10_000;
const SESSION_STORAGE_KEY = "spinner.owner.session";

export interface AuthSession {
  accessToken: string;
  expiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  userId: string;
  fullName: string;
  emailAddress: string;
  role: "Owner" | "Staff";
}

interface ProblemDetails {
  detail?: string;
  errors?: unknown;
  title?: string;
}

function collectErrorMessages(value: unknown): string[] {
  if (typeof value === "string") {
    const message = value.trim();
    return message ? [message] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectErrorMessages);
  }

  if (!value || typeof value !== "object") return [];

  const error = value as Record<string, unknown>;
  if (typeof error.message === "string") {
    return collectErrorMessages(error.message);
  }

  return Object.values(error).flatMap(collectErrorMessages);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: ProblemDetails,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Machine-readable code from the API, e.g. "order.possible_duplicate". */
  get code(): string | undefined {
    const value = (this.details as { code?: unknown } | undefined)?.code;
    return typeof value === "string" ? value : undefined;
  }
}

/**
 * The request never reached the API: no signal, captive Wi-Fi, DNS failure, or
 * the service being restarted. The message is written for a laundromat owner
 * standing in the shop, not for a developer reading a stack trace. The endpoint
 * detail is kept for development builds only.
 */
export class NetworkUnavailableError extends ApiError {
  constructor(
    public readonly reason: "offline" | "timeout" | "unreachable",
    technicalDetail: string,
  ) {
    super(NetworkUnavailableError.describe(reason), 0);
    this.name = "NetworkUnavailableError";
    this.technicalDetail = technicalDetail;
  }

  readonly technicalDetail: string;

  private static describe(reason: "offline" | "timeout" | "unreachable") {
    if (reason === "offline") {
      return "You are offline. Reconnect to Wi-Fi or mobile data and try again.";
    }
    if (reason === "timeout") {
      return "The connection is too slow to finish this right now. Please try again.";
    }
    return "Spinner cannot be reached right now. Check your internet connection and try again.";
  }
}

export class OfflineActionError extends ApiError {
  constructor() {
    super(
      "This change needs an internet connection. Saved information is still available to view.",
      0,
    );
    this.name = "OfflineActionError";
  }
}

/** Message safe to show to the owner for any thrown API failure. */
export function describeApiError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

let accessToken: string | undefined;
let expiresAt = 0;
let currentSession: AuthSession | undefined;
let refreshPromise: Promise<AuthSession> | undefined;
let sessionExpiredHandler: (() => void) | undefined;
let sessionUpdatedHandler: ((session: AuthSession) => void) | undefined;

async function persistSession(session: AuthSession) {
  currentSession = session;
  accessToken = session.accessToken;
  expiresAt = new Date(session.expiresAt).getTime();
  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session));
}

async function fetchApi(
  path: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${apiConfig.baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    const endpoint = `${apiConfig.baseUrl}${path}`;

    if (error instanceof Error && error.name === "AbortError") {
      throw new NetworkUnavailableError(
        "timeout",
        `${endpoint} did not respond within ${timeoutMs / 1000}s.`,
      );
    }

    throw new NetworkUnavailableError(
      getConnectivitySnapshot() === "offline" ? "offline" : "unreachable",
      `${endpoint} could not be reached: ${
        error instanceof Error ? error.message : "unknown transport error"
      }`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson<T>(response: Response): Promise<T | undefined> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) return undefined;
  return (await response.json()) as T;
}

async function throwApiError(response: Response): Promise<never> {
  const problem = await readJson<ProblemDetails>(response);
  const validationMessages = collectErrorMessages(problem?.errors);
  const validationMessage = [...new Set(validationMessages)].join(" ");
  throw new ApiError(
    validationMessage ||
      problem?.detail ||
      problem?.title ||
      `Request failed with status ${response.status}.`,
    response.status,
    problem,
  );
}

export async function signIn(
  login: string,
  password: string,
): Promise<AuthSession> {
  const response = await fetchApi("/api/auth/login", {
    body: JSON.stringify({
      login,
      password,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) return throwApiError(response);

  const session = await readJson<AuthSession>(response);
  if (!session?.accessToken) {
    throw new ApiError("The API returned an invalid login response.", 500);
  }

  await persistSession(session);
  return session;
}

export interface RegisterAccountRequest {
  confirmPassword: string;
  emailAddress: string;
  fullName: string;
  /**
   * Required for every account except the shop's first one, which has nobody to
   * invite it. The owner issues codes from staff settings.
   */
  invitationCode?: string;
  mobileNumber: string;
  password: string;
}

export interface RegistrationResponse {
  codeExpiresInMinutes: number;
  emailAddress: string;
  verificationRequired: boolean;
}

export interface AccountCodeDeliveryResponse {
  message: string;
}

export async function registerAccount(
  request: RegisterAccountRequest,
): Promise<RegistrationResponse> {
  const response = await fetchApi("/api/auth/register", {
    body: JSON.stringify(request),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) return throwApiError(response);

  const registration = await readJson<RegistrationResponse>(response);
  if (!registration?.emailAddress || !registration.verificationRequired) {
    throw new ApiError(
      "The API returned an invalid registration response.",
      500,
    );
  }

  return registration;
}

export async function verifyEmail(
  emailAddress: string,
  code: string,
): Promise<AuthSession> {
  const response = await fetchApi("/api/auth/verify-email", {
    body: JSON.stringify({ emailAddress, code }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) return throwApiError(response);

  const session = await readJson<AuthSession>(response);
  if (!session?.accessToken || !session.refreshToken) {
    throw new ApiError(
      "The API returned an invalid verification response.",
      500,
    );
  }

  await persistSession(session);
  return session;
}

export async function resendEmailVerification(
  emailAddress: string,
): Promise<AccountCodeDeliveryResponse> {
  const response = await fetchApi("/api/auth/resend-verification", {
    body: JSON.stringify({ emailAddress }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) return throwApiError(response);

  return (
    (await readJson<AccountCodeDeliveryResponse>(response)) ?? {
      message: "If the account exists, a verification code has been sent.",
    }
  );
}

export async function requestPasswordReset(
  login: string,
): Promise<AccountCodeDeliveryResponse> {
  const response = await fetchApi("/api/auth/forgot-password", {
    body: JSON.stringify({ login }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) return throwApiError(response);

  return (
    (await readJson<AccountCodeDeliveryResponse>(response)) ?? {
      message: "If the account exists, a password reset code has been sent.",
    }
  );
}

export async function resetPassword(
  login: string,
  code: string,
  newPassword: string,
  confirmPassword: string,
): Promise<void> {
  const response = await fetchApi("/api/auth/reset-password", {
    body: JSON.stringify({
      code,
      confirmPassword,
      login,
      newPassword,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) return throwApiError(response);
}

export async function restoreApiSession(): Promise<AuthSession | undefined> {
  const stored = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
  if (!stored) return undefined;

  try {
    const session = JSON.parse(stored) as AuthSession;
    const storedExpiry = new Date(session.expiresAt).getTime();
    const refreshExpiry = new Date(session.refreshTokenExpiresAt).getTime();
    if (
      !session.accessToken ||
      !session.refreshToken ||
      !Number.isFinite(storedExpiry) ||
      !Number.isFinite(refreshExpiry) ||
      refreshExpiry <= Date.now()
    ) {
      await resetApiSession();
      return undefined;
    }

    await persistSession(session);
    return session;
  } catch {
    await resetApiSession();
    return undefined;
  }
}

async function getAccessToken() {
  if (accessToken && expiresAt - Date.now() > 60_000) {
    return accessToken;
  }

  const refreshed = await refreshApiSession();
  return refreshed.accessToken;
}

async function refreshApiSession(): Promise<AuthSession> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const session = currentSession;
    const refreshExpiry = session
      ? new Date(session.refreshTokenExpiresAt).getTime()
      : 0;
    if (
      !session?.refreshToken ||
      !Number.isFinite(refreshExpiry) ||
      refreshExpiry <= Date.now()
    ) {
      await resetApiSession();
      sessionExpiredHandler?.();
      throw new ApiError(
        "Your session has expired. Please sign in again.",
        401,
      );
    }

    const response = await fetchApi("/api/auth/refresh", {
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        await resetApiSession();
        sessionExpiredHandler?.();
      }
      return throwApiError(response);
    }

    const refreshed = await readJson<AuthSession>(response);
    if (!refreshed?.accessToken || !refreshed.refreshToken) {
      await resetApiSession();
      sessionExpiredHandler?.();
      throw new ApiError("The API returned an invalid refresh response.", 500);
    }

    await persistSession(refreshed);
    sessionUpdatedHandler?.(refreshed);
    return refreshed;
  })().finally(() => {
    refreshPromise = undefined;
  });

  return refreshPromise;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  authenticated?: boolean;
  body?: unknown;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { authenticated = true, body, headers, ...requestInit } = options;
  const method = (requestInit.method ?? "GET").toUpperCase();
  const isCacheableRead = method === "GET" && body === undefined;
  const cacheUserId = authenticated
    ? (currentSession?.userId ?? "signed-in")
    : "public";
  const cacheKey = `${cacheUserId}:${path}`;
  const send = async () => {
    const token = authenticated ? await getAccessToken() : undefined;
    return fetchApi(path, {
      ...requestInit,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  };

  try {
    let response = await send();
    if (authenticated && response.status === 401) {
      await refreshApiSession();
      response = await send();
    }
    if (authenticated && response.status === 401) {
      await resetApiSession();
      sessionExpiredHandler?.();
    }
    if (!response.ok) return throwApiError(response);

    const value = (await readJson<T>(response)) as T;
    if (isCacheableRead && value !== undefined) {
      await cacheApiResponse(cacheKey, cacheUserId, value).catch(() => {
        // A cache write must never turn a successful API response into an error.
      });
    }
    return value;
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      if (isCacheableRead) {
        const cached = await readCachedApiResponse<T>(cacheKey).catch(
          () => undefined,
        );
        if (cached !== undefined) return cached;
      } else {
        throw new OfflineActionError();
      }
    }
    throw error;
  }
}

/**
 * Uploads one file and returns the parsed response.
 *
 * Deliberately not `fetch` with a `FormData` body. On Android that path is unreliable for
 * files, and worse, it is opaque: React Native reports an early server response — a 401, a
 * 413, an authorisation failure — as a transport error indistinguishable from having no
 * signal. That is how a failing upload came to be reported to the owner as "this change
 * needs an internet connection" when the connection was fine.
 *
 * `uploadAsync` performs the multipart upload natively and hands back the real status code
 * and body, so a refusal can be reported as what it is.
 */
export async function apiUpload<T>(
  path: string,
  fileUri: string,
  options: { fieldName?: string; mimeType: string },
): Promise<T> {
  const url = `${apiConfig.baseUrl}${path}`;

  const send = async () => {
    const token = await getAccessToken();

    return FileSystem.uploadAsync(url, fileUri, {
      fieldName: options.fieldName ?? "file",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      httpMethod: "POST",
      mimeType: options.mimeType,
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    });
  };

  let result: FileSystem.FileSystemUploadResult;
  try {
    result = await send();

    // Same one-shot refresh the JSON path performs. Possible here only because the real
    // status is visible rather than collapsed into a transport failure.
    if (result.status === 401) {
      await refreshApiSession();
      result = await send();
    }
  } catch (error) {
    // A genuine transport failure: the request never completed.
    throw new NetworkUnavailableError(
      getConnectivitySnapshot() === "offline" ? "offline" : "unreachable",
      `${url} could not be reached: ${
        error instanceof Error ? error.message : "unknown transport error"
      }`,
    );
  }

  if (result.status === 401) {
    await resetApiSession();
    sessionExpiredHandler?.();
  }

  if (result.status < 200 || result.status >= 300) {
    throw buildUploadError(result);
  }

  return (result.body ? JSON.parse(result.body) : undefined) as T;
}

/**
 * Turns a refused upload into the same shape of error the JSON path produces, so callers
 * and dialogs treat both identically.
 */
function buildUploadError(result: FileSystem.FileSystemUploadResult): ApiError {
  let problem: ProblemDetails | undefined;
  try {
    problem = result.body
      ? (JSON.parse(result.body) as ProblemDetails)
      : undefined;
  } catch {
    // A non-JSON body, which is what a rejection by the web server rather than the
    // application looks like. The status code still says enough.
    problem = undefined;
  }

  const validationMessage = [
    ...new Set(collectErrorMessages(problem?.errors)),
  ].join(" ");

  // Named explicitly, because these two are refused before the application ever sees the
  // file and would otherwise arrive as a bare status number.
  const fallback =
    result.status === 413
      ? "That image is too large to upload. Choose a smaller one."
      : result.status === 415
        ? "That file type cannot be uploaded."
        : `Upload failed with status ${result.status}.`;

  return new ApiError(
    validationMessage || problem?.detail || problem?.title || fallback,
    result.status,
    problem,
  );
}

export async function resetApiSession() {
  currentSession = undefined;
  accessToken = undefined;
  expiresAt = 0;
  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}

export async function revokeApiSession() {
  const refreshToken = currentSession?.refreshToken;
  const userId = currentSession?.userId;
  try {
    if (refreshToken) {
      await fetchApi("/api/auth/logout", {
        body: JSON.stringify({ refreshToken }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
    }
  } finally {
    await resetApiSession();
    if (userId) await clearOfflineCache(userId);
  }
}

export async function revokeAllApiSessions() {
  const userId = currentSession?.userId;
  await apiRequest<void>("/api/auth/logout-all", { method: "POST" });
  await resetApiSession();
  if (userId) await clearOfflineCache(userId);
}

export async function updateStoredApiSessionIdentity(profile: {
  emailAddress: string;
  fullName: string;
}) {
  if (!currentSession) return undefined;

  const updatedSession = {
    ...currentSession,
    emailAddress: profile.emailAddress,
    fullName: profile.fullName,
  };
  await persistSession(updatedSession);
  return updatedSession;
}

export function setSessionExpiredHandler(handler?: () => void) {
  sessionExpiredHandler = handler;
}

export function setSessionUpdatedHandler(
  handler?: (session: AuthSession) => void,
) {
  sessionUpdatedHandler = handler;
}
