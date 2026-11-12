/** Small typed wrapper around the SARURA API (same origin under /api/). */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

export type QueryValue = string | number | boolean | null | undefined;

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown, message = `Request failed (${status})`) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function buildQuery(params: Record<string, QueryValue>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { signal?: AbortSignal } = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    credentials: "same-origin",
  });

  const data = await parseBody(response);
  if (!response.ok) {
    throw new ApiError(response.status, data);
  }
  return data as T;
}

export function apiGet<T>(
  path: string,
  params: Record<string, QueryValue> = {},
  signal?: AbortSignal,
): Promise<T> {
  return request<T>(`${path}${buildQuery(params)}`, { signal });
}

export function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}
