// ── Bang registry ──────────────────────────────────────────────────

const bangs = [
  {
    s: "ChatGPT",
    d: "www.chatgpt.com",
    t: ["ai", "chat", "gpt", "chatgpt"],
    u: "https://www.chatgpt.com/search?q={{{s}}}",
  },
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
    su: "https://www.reddit.com/api/subreddit_autocomplete_v2.json?query={{{s}}}",
  },
  {
    s: "GitHub",
    d: "github.com",
    t: ["gh", "github"],
    u: "https://github.com/search?utf8=%E2%9C%93&q={{{s}}}",
  },
  {
    s: "Startpage",
    d: "www.startpage.com",
    t: ["s", "sp", "startpage"],
    u: "https://www.startpage.com/sp/search?query={{{s}}}",
    m: "POST",
    su: "https://www.startpage.com/osuggestions?q={{{s}}}",
  },
  {
    s: "Google",
    d: "www.google.com",
    t: ["g", "gg", "google"],
    u: "https://www.google.com/search?q={{{s}}}",
    su: "https://www.google.com/complete/search?client=firefox&q={{{s}}}",
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
    su: "https://completion.amazon.com/api/2017/suggestions?mid=ATVPDKIKX0DER&q={{{s}}}",
  },
  {
    s: "YouTube",
    d: "www.youtube.com",
    t: ["yt", "youtube"],
    u: "https://www.youtube.com/results?search_query={{{s}}}",
    su: "https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q={{{s}}}",
  },
];

// ── Helpers ────────────────────────────────────────────────────────

function findBang(trigger) {
  return bangs.find((b) => {
    const triggers = Array.isArray(b.t) ? b.t : [b.t];
    return triggers.some((t) => t === trigger);
  });
}

function getDefaultBang() {
  return findBang("s") ?? bangs[0];
}

function parseQuery(raw) {
  const query = raw.trim();
  const match = query.match(/!(\S+)/i);
  const trigger = match?.[1]?.toLowerCase();
  const cleanQuery = query.replace(/!\S+\s*/i, "").trim();
  return { trigger, cleanQuery };
}

// ── Handler ────────────────────────────────────────────────────────

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const rawQuery = url.searchParams.get("q")?.trim() ?? "";

    if (!rawQuery) {
      return Response.json([rawQuery, [], [], []]);
    }

    const { trigger, cleanQuery } = parseQuery(rawQuery);

    // Determine which bang to use for suggestions
    const bang = trigger ? findBang(trigger) : getDefaultBang();
    if (!bang) {
      return Response.json([rawQuery, [], [], []]);
    }

    // If the bang has an external suggest API, proxy it for real autocomplete
    if (bang.su) {
      const searchTerm = cleanQuery || rawQuery;
      if (!searchTerm) {
        return Response.json([trigger ?? rawQuery, [], [], []]);
      }
      const suggestUrl = bang.su.replace(
        "{{{s}}}",
        encodeURIComponent(searchTerm),
      );
      try {
        const res = await fetch(suggestUrl);
        if (res.ok) {
          const data = await res.json();
          return Response.json(data);
        }
      } catch {
        /* fall through */
      }
    }

    // No suggest API available — return empty suggestions
    return Response.json([trigger ?? rawQuery, [], [], []]);
  } catch (e) {
    return Response.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
