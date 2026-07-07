import { bangs, findBang, getDefaultBang } from "./bang-data";

/** Extract the bang trigger and cleaned query from a raw search string */
function parseQuery(raw: string) {
  const query = raw.trim();
  const match = query.match(/!(\S+)/i);
  const trigger = match?.[1]?.toLowerCase();
  const cleanQuery = query.replace(/!\S+\s*/i, "").trim();
  return { trigger, cleanQuery };
}

/** Return matching bang names as suggestions when no external API is available */
function localBangSuggestions(
  partialTrigger: string,
): [string, string[], string[]] {
  const lower = partialTrigger.toLowerCase();
  const matches = bangs
    .filter((b) => {
      const triggers = Array.isArray(b.t) ? b.t : [b.t];
      return triggers.some((t) => t.startsWith(lower));
    })
    .slice(0, 8); // limit to top 8

  const suggestions = matches.map((b) => {
    const trigger = Array.isArray(b.t) ? b.t[0] : b.t;
    return `!${trigger} ${b.s}`;
  });
  const descriptions = matches.map((b) => b.d);

  return [partialTrigger, suggestions, descriptions];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawQuery = url.searchParams.get("q")?.trim() ?? "";

  if (!rawQuery) {
    return Response.json([rawQuery, [], [], []]);
  }

  const { trigger, cleanQuery } = parseQuery(rawQuery);

  // If no bang trigger is present, use the default bang
  const bang = trigger ? findBang(trigger) : getDefaultBang();

  if (!bang) {
    return Response.json([rawQuery, [], [], []]);
  }

  // If the bang has an external suggestion URL, proxy to it
  if (bang.su) {
    const suggestUrl = bang.su.replace(
      "{{{s}}}",
      encodeURIComponent(cleanQuery || rawQuery),
    );

    try {
      const res = await fetch(suggestUrl);
      if (res.ok) {
        const data = await res.json();
        return Response.json(data);
      }
    } catch {
      // fall through to local suggestions
    }
  }

  // Fallback: return matching bangs from the local registry
  // Use the trigger or the raw query as the search term
  const searchTerm = trigger ?? rawQuery;
  const [q, suggestions, descriptions] = localBangSuggestions(searchTerm);
  return Response.json([q, suggestions, descriptions, []]);
}
