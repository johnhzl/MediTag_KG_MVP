// frontend/src/services/http.ts
// 一个简单的 fetch 封装，不依赖 axios

const BASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) || "http://localhost:8000";

export interface HttpError extends Error {
  status?: number;
  bodyText?: string;
}

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    // 不是 json，就直接丢回给调用方
    throw Object.assign(new Error("响应不是合法 JSON"), {
      status: res.status,
      bodyText: text,
    }) as HttpError;
  }
}

export async function http<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const { headers, ...rest } = options;

  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
  });

  if (!res.ok) {
    const bodyText = await res.text();
    const err: HttpError = Object.assign(
      new Error(`HTTP ${res.status}: ${res.statusText}`),
      {
        status: res.status,
        bodyText,
      }
    );
    throw err;
  }

  return (await parseJsonSafe<T>(res)) as T;
}
