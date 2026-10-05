/**
 * webflow-api.mjs — the few Webflow Data API v2 calls the CMS scripts share
 * (cms-derived-fields.mjs, search-index.mjs): an authorised request that
 * waits out rate limits, and a reader for paginated lists.
 *
 * The token is a site API token (docs/webflow-setup.md); it never goes into
 * the repository.
 */

const API = "https://api.webflow.com/v2";
/** Items per page the API hands out. */
const PAGE = 100;
/** Retries after a 429, waiting as long as the API asks. */
const RETRIES = 3;

export async function api(token, path, { method = "GET", body } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(`${API}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 429 && attempt < RETRIES) {
      const seconds = Number(response.headers.get("retry-after")) || 10;
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      continue;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `${method} ${path} → ${response.status}: ${text.slice(0, 300)}`,
      );
    }
    return response.status === 204 ? null : response.json();
  }
}

/** Every item behind a paginated list endpoint. */
export async function listAll(token, path) {
  const items = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await api(token, `${path}?limit=${PAGE}&offset=${offset}`);
    const batch = page.items ?? [];
    items.push(...batch);
    const total = page.pagination?.total ?? items.length;
    if (batch.length === 0 || items.length >= total) break;
  }
  return items;
}
