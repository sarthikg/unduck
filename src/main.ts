import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
import { findBang, getDefaultBang } from "./bang";
import "./global.css";

function noSearchDefaultPageRender() {
  const app = document.querySelector<HTMLDivElement>("#app")!;
  const searchUrl = `${location.origin}/search?q=%s`;
  const suggestUrl = `${location.origin}/suggest?q=%s`;

  app.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
      <div class="content-container">
        <h1>Und*ck</h1>
        <p>DuckDuckGo's bang redirects are too slow. Add the following URL as a custom search engine to your browser. Enables <a href="https://duckduckgo.com/bang.html" target="_blank">all of DuckDuckGo's bangs.</a></p>

        <div class="url-container">
          <label class="url-label">Search URL</label>
          <div class="url-row">
            <input
              type="text"
              class="url-input"
              value="${searchUrl}"
              readonly
            />
            <button class="copy-button" data-url="${searchUrl}">
              <img src="/clipboard.svg" alt="Copy" />
            </button>
          </div>
        </div>

        <div class="url-container">
          <label class="url-label">Suggest URL</label>
          <div class="url-row">
            <input
              type="text"
              class="url-input"
              value="${suggestUrl}"
              readonly
            />
            <button class="copy-button" data-url="${suggestUrl}">
              <img src="/clipboard.svg" alt="Copy" />
            </button>
          </div>
        </div>

        <p class="url-hint">Use <code>%s</code> in place of the query in your browser's custom search engine settings.</p>
      </div>
    </div>
  `;

  app.querySelectorAll<HTMLButtonElement>(".copy-button").forEach((btn) => {
    const icon = btn.querySelector("img")!;
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

function getBangredirectUrl() {
  const url = new URL(window.location.href);
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    noSearchDefaultPageRender();
    return null;
  }

  const match = query.match(/!(\S+)/i);
  const bangCandidate = match?.[1]?.toLowerCase();

  const selectedBang = bangCandidate
    ? findBang(bangCandidate)
    : getDefaultBang();

  // Remove the first bang from the query
  const cleanQuery = query.replace(/!\S+\s*/i, "").trim();

  const searchUrl = selectedBang?.u.replace(
    "{{{s}}}",
    // Replace %2F with / to fix formats like "!ghr+t3dotgg/unduck"
    encodeURIComponent(cleanQuery).replace(/%2F/g, "/"),
  );
  if (!searchUrl) return null;

  return searchUrl;
}

function doRedirect() {
  const searchUrl = getBangredirectUrl();
  if (!searchUrl) return;
  window.location.replace(searchUrl);
}

doRedirect();
inject();
injectSpeedInsights();
