import { bangs, findBang, getDefaultBang } from "./bang-data";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseQuery(raw: string) {
  const query = raw.trim();
  const match = query.match(/!(\S+)/i);
  const trigger = match?.[1]?.toLowerCase();
  const cleanQuery = query.replace(/!\S+\s*/i, "").trim();
  return { trigger, cleanQuery };
}

function localBangSuggestions(partialTrigger: string) {
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

  return [partialTrigger, suggestions, descriptions] as const;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawQuery = url.searchParams.get("q")?.trim() ?? "";

    if (!rawQuery) {
      return json([rawQuery, [], [], []]);
    }

    const { trigger, cleanQuery } = parseQuery(rawQuery);
    const bang = trigger ? findBang(trigger) : getDefaultBang();

    if (!bang) {
      return json([rawQuery, [], [], []]);
    }

    // Proxy to external suggest API if available
    if (bang.su) {
      const suggestUrl = bang.su.replace(
        "{{{s}}}",
        encodeURIComponent(cleanQuery || rawQuery),
      );
      try {
        const res = await fetch(suggestUrl);
        if (res.ok) {
          const data = await res.json();
          return json(data);
        }
      } catch {
        /* fall through */
      }
    }

    // Fallback: local bang matching
    const searchTerm = trigger ?? rawQuery;
    const result = localBangSuggestions(searchTerm);
    return json([result[0], result[1], result[2], []]);
  } catch (e: any) {
    return json({ error: e?.message ?? "Unknown error" }, 500);
  }
}
