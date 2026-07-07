import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Simple dev-server API handler so /search and /suggest work locally.
// In production, vercel.json rewrites handle these routes.
function apiFallbackPlugin() {
  return {
    name: "api-fallback",
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = new URL(req.url, "http://localhost");

        if (url.pathname === "/search") {
          const query = url.searchParams.get("q") ?? "";
          const { findBang, getDefaultBang } = await import("./src/bang");
          const trigger = query.match(/!(\S+)/i)?.[1]?.toLowerCase();
          const cleanQuery = query.replace(/!\S+\s*/i, "").trim();
          const bang = trigger ? findBang(trigger) : getDefaultBang();

          if (!bang) {
            res.statusCode = 404;
            res.end("No matching bang found");
            return;
          }

          const target = bang.u.replace(
            "{{{s}}}",
            encodeURIComponent(cleanQuery).replace(/%2F/g, "/"),
          );

          res.writeHead(302, { Location: target });
          res.end();
          return;
        }

        if (url.pathname === "/suggest") {
          const rawQuery = url.searchParams.get("q")?.trim() ?? "";
          const { bangs, findBang, getDefaultBang } =
            await import("./src/bang");
          const trigger = rawQuery.match(/!(\S+)/i)?.[1]?.toLowerCase();
          const cleanQuery = rawQuery.replace(/!\S+\s*/i, "").trim();
          const bang = trigger ? findBang(trigger) : getDefaultBang();

          // Try external suggest API first
          if (bang?.su) {
            try {
              const suggestUrl = bang.su.replace(
                "{{{s}}}",
                encodeURIComponent(cleanQuery || rawQuery),
              );
              const apiRes = await fetch(suggestUrl);
              if (apiRes.ok) {
                const data = await apiRes.json();
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(data));
                return;
              }
            } catch {
              /* fall through */
            }
          }

          // Fallback: local bang suggestions
          const searchTerm = trigger ?? rawQuery;
          const lower = searchTerm.toLowerCase();
          const matches = bangs
            .filter((b: any) => {
              const triggers = Array.isArray(b.t) ? b.t : [b.t];
              return triggers.some((t: string) => t.startsWith(lower));
            })
            .slice(0, 8);
          const suggestions = matches.map((b: any) => {
            const t = Array.isArray(b.t) ? b.t[0] : b.t;
            return `!${t} ${b.s}`;
          });
          const descriptions = matches.map((b: any) => b.d);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify([searchTerm, suggestions, descriptions, []]));
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
