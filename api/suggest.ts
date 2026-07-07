import {
  findBang,
  getDefaultBang,
  json,
  localBangSuggestions,
  parseQuery,
} from "../src/shared";

export async function GET(request: Request): Promise<Response> {
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

    // Proxy external suggest API if the bang has one
    if (bang.su) {
      const suggestUrl = bang.su.replace(
        "{{{s}}}",
        encodeURIComponent(cleanQuery || rawQuery),
      );
      try {
        const res = await fetch(suggestUrl);
        if (res.ok) {
          const data: unknown = await res.json();
          return json(data);
        }
      } catch {
        /* fall through to local suggestions */
      }
    }

    const searchTerm = trigger ?? rawQuery;
    const result = localBangSuggestions(searchTerm);
    return json([result[0], result[1], result[2], []]);
  } catch (e: unknown) {
    return json({ error: (e as Error)?.message ?? "Unknown error" }, 500);
  }
}
