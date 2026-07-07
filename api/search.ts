import { buildSearchUrl, postRedirectHtml } from "../src/shared";

function handleSearch(rawQuery: string): Response {
  const result = buildSearchUrl(rawQuery);
  if (!result) {
    return new Response("No matching bang found", { status: 404 });
  }

  if (result.method === "POST") {
    return new Response(
      postRedirectHtml(result.url, result.query, result.postParam ?? "q"),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  return Response.redirect(result.url, 302);
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  return handleSearch(query);
}

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  let query = "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await request.text();
    const params = new URLSearchParams(body);
    query = params.get("q") ?? "";
  }

  return handleSearch(query);
}
