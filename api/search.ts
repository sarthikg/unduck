import { findBang, getDefaultBang } from "./bang-data";

/** Extract the bang trigger and cleaned query from a raw search string */
function parseQuery(raw: string) {
  const query = raw.trim();
  const match = query.match(/!(\S+)/i);
  const trigger = match?.[1]?.toLowerCase();
  const cleanQuery = query.replace(/!\S+\s*/i, "").trim();
  return { trigger, cleanQuery };
}

/** Extract the query parameter name from a search URL (e.g., ?q={{{s}}} → "q") */
function getPostParamName(url: string): string {
  const match = url.match(/[?&]([^=&]+)=\{\{\{s\}\}\}/);
  return match?.[1] ?? "q";
}

/** Escape HTML entities */
function esc(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Build the target search URL for a given bang + query */
function buildSearchUrl(rawQuery: string) {
  const { trigger, cleanQuery } = parseQuery(rawQuery);

  const bang = trigger ? findBang(trigger) : getDefaultBang();
  if (!bang) return null;

  const encoded = encodeURIComponent(cleanQuery).replace(/%2F/g, "/");
  const fullUrl = bang.u.replace("{{{s}}}", encoded);
  const method = bang.m ?? "GET";

  if (method === "POST") {
    // For POST, strip the query param from the URL — it goes in the form body
    const postParam = getPostParamName(bang.u);
    const baseUrl = fullUrl
      .replace(new RegExp(`[?&]${postParam}=[^&]*`), "")
      .replace(/\?$/, "");
    return { url: baseUrl, method, postParam, query: cleanQuery };
  }

  return { url: fullUrl, method };
}

/** Return an HTML page that auto-submits a POST form to the target */
function postRedirectHtml(targetUrl: string, query: string, paramName: string) {
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

function handleSearch(rawQuery: string) {
  const result = buildSearchUrl(rawQuery);
  if (!result) {
    return new Response("No matching bang found", { status: 404 });
  }

  if (result.method === "POST") {
    return new Response(
      postRedirectHtml(result.url, result.query, result.postParam ?? "q"),
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }

  return Response.redirect(result.url, 302);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  return handleSearch(query);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let query = "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await request.text();
    const params = new URLSearchParams(body);
    query = params.get("q") ?? "";
  }

  return handleSearch(query);
}
