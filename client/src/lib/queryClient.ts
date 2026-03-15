import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const API_NOT_REACHABLE_MSG =
  "API returned a web page instead of data. Ensure your app URL points to the Node server (e.g. only Cloudflare Tunnel → Node on port 5010; no nginx serving the same host).";

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("<!") || trimmed.startsWith("<html");
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("clinicpos_user");
      window.dispatchEvent(new Event("clinicpos_logout_redirect"));
    }
    const text = (await res.text()) || res.statusText;
    if (looksLikeHtml(text)) throw new Error(API_NOT_REACHABLE_MSG);
    let message = text;
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") message = json.message;
    } catch {
      // keep message as text
    }
    throw new Error(message);
  }
}

async function parseJsonOrThrow(res: Response): Promise<unknown> {
  const text = await res.text();
  if (looksLikeHtml(text)) throw new Error(API_NOT_REACHABLE_MSG);
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(API_NOT_REACHABLE_MSG);
  }
}

/** Use for fetch() responses that may be JSON or HTML (e.g. when API is unreachable). */
export async function safeJsonRes(res: Response): Promise<unknown> {
  return parseJsonOrThrow(res);
}

/** Fetch a URL (e.g. sample-template or export) and trigger file download. Avoids navigating to API URL (which can show SPA 404). */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const fullUrl = url.startsWith("/api") ? getApiUrl(url) : url;
  const res = await fetch(fullUrl, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text() || res.statusText}`);
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition && /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
  const name = match ? match[1].replace(/['"]/g, "") : filename;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = url.startsWith("/api") ? getApiUrl(url) : url;
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

/** Normalize paginated API response: accept either { items, total, ... } or raw array. */
export function normalizePaginatedResponse<T>(data: unknown): { items: T[]; total: number; [k: string]: unknown } {
  if (Array.isArray(data)) return { items: data, total: data.length };
  const obj = (data as Record<string, unknown>) || {};
  return {
    ...obj,
    items: Array.isArray(obj.items) ? obj.items : [],
    total: typeof obj.total === "number" ? obj.total : (Array.isArray(obj.items) ? obj.items.length : 0),
  };
}

/** Build URLSearchParams from an object, omitting undefined/null/empty strings for optional params. */
export function buildPaginatedParams(params: Record<string, string | number | undefined | null>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s === "" && (k === "search" || k === "dateFrom" || k === "dateTo" || k.startsWith("filter"))) continue;
    sp.set(k, s);
  }
  return sp;
}

/** Fetch paginated API - uses cache: no-store to avoid stale responses, proper URL building. */
export async function fetchPaginated<T>(
  endpoint: string,
  params: Record<string, string | number | undefined | null>
): Promise<{ items: T[]; total: number }> {
  const sp = buildPaginatedParams(params);
  const url = getApiUrl(`${endpoint}?${sp}`);
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(await res.text() || res.statusText);
  const raw = await res.json();
  return normalizePaginatedResponse(raw) as { items: T[]; total: number };
}

/** Fetch stats API - same pattern as fetchPaginated. */
export async function fetchStats<T>(endpoint: string, params: Record<string, string | undefined | null>): Promise<T> {
  const sp = buildPaginatedParams(params as Record<string, string | number | undefined | null>);
  const url = getApiUrl(`${endpoint}?${sp}`);
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(await res.text() || res.statusText);
  return res.json();
}

/** Build absolute API URL to avoid 404s when app is served from subpath or behind proxy. */
export function getApiUrl(path: string): string {
  if (typeof window === "undefined") return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) || "";
  if (base && base.startsWith("http")) return `${base.replace(/\/$/, "")}${p}`;
  if (base) return `${window.location.origin}${base.replace(/\/$/, "")}${p}`;
  return `${window.location.origin}${p}`;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const parts = Array.isArray(queryKey)
      ? queryKey.filter((k): k is string | number => (typeof k === "string" || typeof k === "number") && String(k) !== "")
      : [];
    const path = parts.join("/").replace(/\/+/g, "/"); // collapse multiple slashes
    const url = path.startsWith("/api") ? getApiUrl(path) : path;
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    if (res.status === 401) {
      localStorage.removeItem("clinicpos_user");
      window.dispatchEvent(new Event("clinicpos_logout_redirect"));
    }

    await throwIfResNotOk(res);
    return await parseJsonOrThrow(res) as any;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
