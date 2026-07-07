// ── Bang data (self-contained, no cross-directory imports) ──────

const bangs = [
  // AI Apps
  {
    s: "ChatGPT",
    d: "www.chatgpt.com",
    t: ["ai", "chat", "gpt", "chatgpt"],
    u: "https://www.chatgpt.com/search?q={{{s}}}",
  },
  // Social Media
  {
    s: "Twitter",
    d: "twitter.com",
    t: ["x", "tw", "twt", "twtr", "twitter"],
    u: "https://twitter.com/search?q={{{s}}}",
  },
  {
    s: "Twitter users",
    d: "twitter.com",
    t: "twuser",
    u: "https://twitter.com/search/users?q={{{s}}}",
  },
  {
    s: "Reddit",
    d: "www.reddit.com",
    t: ["r", "reddit"],
    u: "https://www.reddit.com/search?q={{{s}}}",
  },
  {
    s: "Reddit subs",
    d: "www.reddit.com",
    t: "sr",
    u: "https://www.reddit.com/r/{{{s}}}",
  },
  // Programming
  {
    s: "GitHub",
    d: "github.com",
    t: ["gh", "github"],
    u: "https://github.com/search?utf8=%E2%9C%93&q={{{s}}}",
  },
  // Search Engines
  {
    s: "Startpage",
    d: "www.startpage.com",
    t: ["s", "sp", "startpage"],
    u: "https://www.startpage.com/sp/search?query={{{s}}}",
    m: "POST",
  },
  {
    s: "Google",
    d: "www.google.com",
    t: ["g", "gg", "google"],
    u: "https://www.google.com/search?q={{{s}}}",
  },
  {
    s: "Google Images",
    d: "google.com",
    t: ["gi", "gimg", "gimages"],
    u: "https://google.com/search?tbm=isch&q={{{s}}}&tbs=imgo:1",
  },
  {
    s: "Google Maps",
    d: "google.com",
    t: ["gm", "gmaps"],
    u: "https://google.com/maps/place/{{{s}}}",
  },
  // Shopping
  {
    s: "Flipkart",
    d: "www.flipkart.com",
    t: "fk",
    u: "https://www.flipkart.com/search?q={{{s}}}",
  },
  {
    s: "Amazon",
    d: "www.amazon.in",
    t: ["am", "amz", "amzn", "amazon"],
    u: "https://www.amazon.in/s?k={{{s}}}",
  },
  // Content
  {
    s: "YouTube",
    d: "www.youtube.com",
    t: ["yt", "youtube"],
    u: "https://www.youtube.com/results?search_query={{{s}}}",
  },
];

// ── Bang lookup ────────────────────────────────────────────────────

function searchBang(bang, search) {
  if (Array.isArray(bang.t)) return bang.t.includes(search);
  return bang.t === search;
}

function findBang(trigger) {
  return bangs.find((b) => searchBang(b, trigger));
}

function getDefaultBang() {
  return findBang("s") ?? bangs[0];
}

// ── Helpers ────────────────────────────────────────────────────────

function parseQuery(raw) {
  const query = raw.trim();
  const match = query.match(/!(\S+)/i);
  const trigger = match?.[1]?.toLowerCase();
  const cleanQuery = query.replace(/!\S+\s*/i, "").trim();
  return { trigger, cleanQuery };
}

function getPostParamName(url) {
  const match = url.match(/[?&]([^=&]+)=\{\{\{s\}\}\}/);
  return match?.[1] ?? "q";
}

function esc(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Handler ────────────────────────────────────────────────────────

function handleSearch(rawQuery) {
  const { trigger, cleanQuery } = parseQuery(rawQuery);
  const bang = trigger ? findBang(trigger) : getDefaultBang();
  if (!bang) {
    return new Response("No matching bang found", { status: 404 });
  }

  const encoded = encodeURIComponent(cleanQuery).replace(/%2F/g, "/");
  const fullUrl = bang.u.replace("{{{s}}}", encoded);
  const method = bang.m ?? "GET";

  if (method === "POST") {
    const postParam = getPostParamName(bang.u);
    const baseUrl = fullUrl
      .replace(new RegExp(`[?&]${postParam}=[^&]*`), "")
      .replace(/\?$/, "");
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redirecting…</title></head>
<body>
  <form id="f" action="${esc(baseUrl)}" method="POST" accept-charset="utf-8">
    <input type="hidden" name="${esc(postParam)}" value="${esc(cleanQuery)}">
  </form>
  <script>document.getElementById("f").submit();</script>
</body>
</html>`;
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return Response.redirect(fullUrl, 302);
}

export async function GET(request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  return handleSearch(query);
}

export async function POST(request) {
  const contentType = request.headers.get("content-type") ?? "";
  let query = "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await request.text();
    const params = new URLSearchParams(body);
    query = params.get("q") ?? "";
  }
  return handleSearch(query);
}
