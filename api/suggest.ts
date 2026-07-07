// Minimal suggest — no imports, no deps.
// Deploy this, test it, then we add complexity back.

const DEFAULT_BANG = {
  su: "https://www.startpage.com/osuggestions?q={{{s}}}",
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";

    if (!q) {
      return new Response(JSON.stringify([q, [], [], []]), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Proxy to Startpage suggestions
    const target = DEFAULT_BANG.su.replace("{{{s}}}", encodeURIComponent(q));
    const apiRes = await fetch(target);

    if (apiRes.ok) {
      const data = await apiRes.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify([q, [], [], []]), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
