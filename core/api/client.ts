"use client"

export interface ApiRequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined | null>
}

export class ApiClientError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = "ApiClientError"
    this.status = status
    this.payload = payload
  }
}

function buildUrl(path: string, query?: ApiRequestOptions["query"]) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const url = new URL(`${baseUrl}${normalizedPath}`, typeof window !== "undefined" ? window.location.origin : "http://localhost")
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

function getAuthToken() {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(^| )glonetz_session=([^;]+)/)
  if (!match) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(match[2])) as { token?: string }
    return parsed.token ?? null
  } catch {
    return null
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { query, headers, body, ...rest } = options
  const token = getAuthToken()
  const contentTypeHeader = body instanceof FormData ? {} : { "Content-Type": "application/json" }

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    headers: {
      ...contentTypeHeader,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body:
      body instanceof FormData
        ? body
        : typeof body === "string" || body === undefined
          ? body
          : JSON.stringify(body),
  })

  const contentType = response.headers.get("content-type") ?? ""
  const payload = contentType.includes("application/json") ? await response.json() : await response.text()

  if (!response.ok) {
    throw new ApiClientError("API request failed", response.status, payload)
  }

  return payload as T
}

