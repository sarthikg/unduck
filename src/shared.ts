import { bangs, findBang, getDefaultBang } from "./bang";

/** Parse a raw query string into a bang trigger and the remaining search term */
export function parseQuery(raw: string): { trigger: string | undefined; cleanQuery: string } {
  const query = raw.trim();
  const match = query.match(/!(\S+)/i);
  const trigger = match?.[1]?.toLowerCase();
  const cleanQuery = query.replace(/!\S+\s*/i, "").trim();
  return { trigger, cleanQuery };
}

/** Extract the query-param name from a URL template that contains {{{s}}} */
function getPostParamName(url: string): string {
  const match = url.match(/[?&]([^=&]+)=\{\{\{s\}\}\}/);
  return match?.[1] ?? "q";
}

/** Minimal HTML-entity escaping to prevent injection in auto-submit forms */
export function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface SearchResult {
  url: string;
  method: "GET" | "POST";
  query: string;
  postParam?: string;
}

/**
 * Build a redirect target from a raw search query.
 * Returns `null` when no matching bang is found (caller should fall back).
 */
export function buildSearchUrl(rawQuery: string): SearchResult | null {
  const { trigger, cleanQuery } = parseQuery(rawQuery);
  const bang = trigger ? findBang(trigger) : getDefaultBang();
  if (!bang) return null;

  const encoded = encodeURIComponent(cleanQuery).replace(/%2F/g, "/");
  const fullUrl = bang.u.replace("{{{s}}}", encoded);
  const method = bang.m ?? "GET";

  if (method === "POST") {
    const postParam = getPostParamName(bang.u);
    const baseUrl = fullUrl
      .replace(new RegExp(`[?&]${postParam}=[^&]*`), "")
      .replace(/\?$/, "");
    return { url: baseUrl, method, postParam, query: cleanQuery };
  }

  return { url: fullUrl, method, query: cleanQuery };
}

/** Generate the auto-submitting POST form page used for POST-method bangs */
export function postRedirectHtml(targetUrl: string, query: string, paramName: string): string {
  const safeUrl = esc(targetUrl);
  const safeQuery = esc(query);
  const safeParam = esc(paramName);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redirecting…</title></head>
<body>
  <form id="f" action="${safeUrl}" method="POST" accept-charset="utf-8">
    <input type="hidden" name="${safeParam}" value="${safeQuery}">
  </form>
  <script>document.getElementById("f").submit();</script>
</body>
</html>`;
}

/**
 * Build local bang suggestions when the user is typing a partial trigger.
 * Returns [query, suggestions[], descriptions[]].
 */
export function localBangSuggestions(partialTrigger: string): [string, string[], string[]] {
  const lower = partialTrigger.toLowerCase();
  const matches = bangs
    .filter((b) => {
      const triggers = Array.isArray(b.t) ? b.t : [b.t];
      return triggers.some((t) => t.startsWith(lower));
    })
    .slice(0, 8);

  const suggestions = matches.map((b) => {
    const trigger = Array.isArray(b.t) ? b.t[0] : b.t;
    return `!${trigger} ${b.s}`;
  });
  const descriptions = matches.map((b) => b.d);

  return [partialTrigger, suggestions, descriptions];
}

/** Convenience: JSON Response helper */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Re-export bang lookups so callers only need one import
export { findBang, getDefaultBang, bangs };
