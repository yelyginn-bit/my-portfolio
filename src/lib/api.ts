let csrfToken = "";

export async function secureFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = String(init.method || "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && !csrfToken) {
    const response = await fetch("/api/csrf", { credentials: "same-origin" });
    const data = await response.json();
    csrfToken = data.csrfToken || "";
  }
  const headers = new Headers(init.headers);
  if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("X-CSRF-Token", csrfToken);
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}
