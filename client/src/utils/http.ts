export async function fetchJsonSafe<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    // Try to read body for more context
    let body = "";
    try {
      body = await res.text();
    } catch {
      // ignore
    }
    throw new Error(`HTTP ${res.status}${body ? `: ${body}` : ""}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  const text = await res.text();
  throw new Error(
    `Expected JSON, got ${contentType}. Body: ${text.substring(0, 200)}`
  );
}
