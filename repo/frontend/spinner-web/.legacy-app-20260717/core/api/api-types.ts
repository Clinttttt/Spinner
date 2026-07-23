export type ProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  traceId?: string;
  errors?: unknown;
};

export type ApiRequestOptions = {
  query?: Record<string, string | number | boolean | null | undefined>;
};
