// ── Minimal bang registry (triggers + names only, for suggestions) ─

const bangs = [
  { n: "ChatGPT",      t: ["ai", "chat", "gpt", "chatgpt"] },
  { n: "Twitter",      t: ["x", "tw", "twt", "twtr", "twitter"] },
  { n: "Twitter users",t: "twuser" },
  { n: "Reddit",       t: ["r", "reddit"] },
  { n: "Reddit subs",  t: "sr" },
  { n: "GitHub",       t: ["gh", "github"] },
  { n: "Startpage",    t: ["s", "sp", "startpage"] },
  { n: "Google",       t: ["g", "gg", "google"] },
  { n: "Google Images",t: ["gi", "gimg", "gimages"] },
  { n: "Google Maps",  t: ["gm", "gmaps"] },
  { n: "Flipkart",     t: "fk" },
  { n: "Amazon",       t: ["am", "amz", "amzn", "amazon"] },
  { n: "YouTube",      t: ["yt", "youtube"] },
];

// ── Helper ─────────────────────────────────────────────────────────

function matchTrigger(bang, search) {
  const triggers = Array.isArray(bang.t) ? bang.t : [bang.t];
  return triggers.some((t) => t.startsWith(search));
}

// ── Handler ────────────────────────────────────────────────────────

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const raw = url.searchParams.get("q")?.trim() ?? "";

    if (!raw) {
      return Response.json([raw, [], [], []]);
    }

    // Check for a bang trigger
    const match = raw.match(/!(\S+)/i);
    const trigger = match?.[1]?.toLowerCase();

    if (!trigger) {
      return Response.json([raw, [], [], []]);
    }

    // Find matching bangs by partial trigger prefix
    const lower = trigger.toLowerCase();
    const matches = bangs
      .filter((b) => matchTrigger(b, lower))
      .slice(0, 8);

    const suggestions = matches.map((b) => {
      const t = Array.isArray(b.t) ? b.t[0] : b.t;
      return `!${t} ${b.n}`;
    });
    const descriptions = matches.map((b) => "");
    const urls = matches.map((b) => "");

    return Response.json([trigger, suggestions, descriptions, urls]);
  } catch (e) {
    return Response.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
