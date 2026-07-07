import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
import { findBang, getDefaultBang } from "./bang";
import "./global.css";

// ── Landing page (shown when no search query) ──────────────────────

function noSearchDefaultPageRender(): void {
  const app = document.querySelector<HTMLDivElement>("#app")!;
  const searchUrl = `${location.origin}?q=%s`;

  app.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
      <div class="content-container">
        <h1>Und*ck</h1>
        <p>DuckDuckGo's bang redirects are too slow. Add the following URL as a custom search engine to your browser. Enables <a href="https://duckduckgo.com/bang.html" target="_blank">all of DuckDuckGo's bangs.</a></p>
        <div class="url-container">
          <label class="url-label">Search URL</label>
          <div class="url-row">
            <input type="text" class="url-input" value="${searchUrl}" readonly />
            <button class="copy-button" data-url="${searchUrl}">
              <img src="/clipboard.svg" alt="Copy" />
            </button>
          </div>
        </div>
        <p class="url-hint">Use <code>%s</code> in place of the query in your browser's custom search engine settings.</p>
      </div>
    </div>
  `;

  app.querySelectorAll<HTMLButtonElement>(".copy-button").forEach((btn) => {
    const icon = btn.querySelector<HTMLImageElement>("img")!;
    btn.addEventListener("click", async () => {
      const url = btn.dataset.url!;
      await navigator.clipboard.writeText(url);
      icon.src = "/clipboard-check.svg";
      setTimeout(() => {
        icon.src = "/clipboard.svg";
      }, 2000);
    });
  });
}

// ── Query parsing ──────────────────────────────────────────────────

function parseQuery(raw: string): {
  trigger: string | undefined;
  cleanQuery: string;
} {
  const query = raw.trim();
  const match = query.match(/!(\S+)/i);
  const trigger = match?.[1]?.toLowerCase();
  const cleanQuery = query.replace(/!\S+\s*/i, "").trim();
  return { trigger, cleanQuery };
}

function getPostParamName(url: string): string {
  const match = url.match(/[?&]([^=&]+)=\{\{\{s\}\}\}/);
  return match?.[1] ?? "q";
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Redirect ───────────────────────────────────────────────────────

function doRedirect(): void {
  const url = new URL(window.location.href);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    noSearchDefaultPageRender();
    return;
  }

  const { trigger, cleanQuery } = parseQuery(query);
  const bang = trigger ? findBang(trigger) : getDefaultBang();

  if (!bang) {
    noSearchDefaultPageRender();
    return;
  }

  const encoded = encodeURIComponent(cleanQuery).replace(/%2F/g, "/");
  const fullUrl = bang.u.replace("{{{s}}}", encoded);
  const method = bang.m ?? "GET";

  if (method === "POST") {
    const postParam = getPostParamName(bang.u);
    const baseUrl = fullUrl
      .replace(new RegExp(`[?&]${postParam}=[^&]*`), "")
      .replace(/\?$/, "");
    const safeUrl = esc(baseUrl);
    const safeQuery = esc(cleanQuery);
    const safeParam = esc(postParam);

    document.open("text/html");
    document.write(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redirecting…</title></head>
<body>
  <form id="f" action="${safeUrl}" method="POST" accept-charset="utf-8">
    <input type="hidden" name="${safeParam}" value="${safeQuery}">
  </form>
  <script>document.getElementById("f").submit();</script>
</body>
</html>`);
    document.close();
    return;
  }

  window.location.replace(fullUrl);
}

doRedirect();
inject();
injectSpeedInsights();
