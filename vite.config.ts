import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

function apiFallbackPlugin() {
  return {
    name: "api-fallback",
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = new URL(req.url, "http://localhost");

        if (url.pathname === "/search") {
          const query = url.searchParams.get("q") ?? "";
          const { buildSearchUrl, postRedirectHtml } =
            await import("./src/shared");
          const result = buildSearchUrl(query);

          if (!result) {
            res.statusCode = 404;
            res.end("No matching bang found");
            return;
          }

          if (result.method === "POST") {
            res.writeHead(200, {
              "Content-Type": "text/html; charset=utf-8",
            });
            res.end(
              postRedirectHtml(
                result.url,
                result.query,
                result.postParam ?? "q",
              ),
            );
            return;
          }

          res.writeHead(302, { Location: result.url });
          res.end();
          return;
        }

        if (url.pathname === "/suggest") {
          const rawQuery = url.searchParams.get("q")?.trim() ?? "";
          const {
            bangs,
            findBang,
            getDefaultBang,
            parseQuery,
            localBangSuggestions,
          } = await import("./src/shared");

          const { trigger, cleanQuery } = parseQuery(rawQuery);
          const bang = trigger ? findBang(trigger) : getDefaultBang();

          // Proxy external suggest API if available
          if (bang?.su) {
            try {
              const suggestUrl = bang.su.replace(
                "{{{s}}}",
                encodeURIComponent(cleanQuery || rawQuery),
              );
              const apiRes = await fetch(suggestUrl);
              if (apiRes.ok) {
                const data = await apiRes.json();
                res.writeHead(200, {
                  "Content-Type": "application/json",
                });
                res.end(JSON.stringify(data));
                return;
              }
            } catch {
              /* fall through to local suggestions */
            }
          }

          const searchTerm = trigger ?? rawQuery;
          const result = localBangSuggestions(searchTerm);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify([result[0], result[1], result[2], []]));
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
    }),
    apiFallbackPlugin(),
  ],
});
