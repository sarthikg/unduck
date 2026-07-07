export interface Bang {
  /** Short name / service title */
  s: string;
  /** Domain */
  d: string;
  /** Trigger(s) — the bang keyword(s) the user types after ! */
  t: string | string[];
  /** Search URL with {{{s}}} placeholder */
  u: string;
  /** Suggestion/autocomplete API URL with {{{s}}} placeholder (optional) */
  su?: string;
  /** HTTP method the target search engine expects: "GET" (default) or "POST" */
  m?: "GET" | "POST";
}

export const bangs: Bang[] = [
  // AI Apps
  {
    d: "www.chatgpt.com",
    s: "ChatGPT",
    t: ["ai", "chat", "gpt", "chatgpt"],
    u: "https://www.chatgpt.com/search?q={{{s}}}",
  },
  // Social Media
  {
    d: "twitter.com",
    s: "Twitter",
    t: ["x", "tw", "twt", "twtr", "twitter"],
    u: "https://twitter.com/search?q={{{s}}}",
  },
  {
    d: "twitter.com",
    s: "Twitter users",
    t: "twuser",
    u: "https://twitter.com/search/users?q={{{s}}}",
  },
  {
    d: "www.reddit.com",
    s: "Reddit",
    t: ["r", "reddit"],
    u: "https://www.reddit.com/search?q={{{s}}}",
  },
  {
    d: "www.reddit.com",
    s: "Reddit",
    t: ["sr"],
    u: "https://www.reddit.com/r/{{{s}}}",
    su: "https://www.reddit.com/api/subreddit_autocomplete_v2.json?query={{{s}}}",
  },
  // Programming
  {
    d: "github.com",
    s: "GitHub",
    t: ["gh", "github"],
    u: "https://github.com/search?utf8=%E2%9C%93&q={{{s}}}",
  },
  // Search Engines
  {
    d: "www.startpage.com",
    s: "Startpage",
    t: ["s", "sp", "startpage"],
    u: "https://www.startpage.com/sp/search?query={{{s}}}",
    su: "https://www.startpage.com/osuggestions?q={{{s}}}",
    m: "POST",
  },
  {
    d: "www.google.com",
    s: "Google",
    t: ["g", "gg", "google"],
    u: "https://www.google.com/search?q={{{s}}}",
    su: "https://www.google.com/complete/search?client=firefox&q={{{s}}}",
  },
  {
    d: "google.com",
    s: "Google Images",
    t: ["gi", "gimg", "gimages"],
    u: "https://google.com/search?tbm=isch&q={{{s}}}&tbs=imgo:1",
  },
  {
    d: "google.com",
    s: "Google Maps",
    t: ["gm", "gmaps"],
    u: "https://google.com/maps/place/{{{s}}}",
  },
  // Shopping
  {
    d: "www.flipkart.com",
    s: "Flipkart",
    t: "fk",
    u: "https://www.flipkart.com/search?q={{{s}}}",
  },
  {
    d: "www.amazon.in",
    s: "Amazon",
    t: ["am", "amz", "amzn", "amazon"],
    u: "https://www.amazon.in/s?k={{{s}}}",
    su: "https://completion.amazon.com/api/2017/suggestions?mid=ATVPDKIKX0DER&q={{{s}}}",
  },
  // Content
  {
    d: "www.youtube.com",
    s: "YouTube",
    t: ["yt", "youtube"],
    u: "https://www.youtube.com/results?search_query={{{s}}}",
    su: "https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q={{{s}}}",
  },
];

/** Check whether a bang's trigger(s) match the given search keyword */
export function searchBang(bang: Bang, search: string): boolean {
  if (Array.isArray(bang.t)) {
    return bang.t.includes(search);
  }
  return bang.t === search;
}

/** Find a bang by its trigger keyword */
export function findBang(trigger: string): Bang | undefined {
  return bangs.find((b) => searchBang(b, trigger));
}

/** Return the default bang (Startpage, trigger "s").
 *  Must exist in the bangs array — used as fallback when no bang trigger is specified. */
export function getDefaultBang(): Bang | undefined {
  return findBang("s") ?? bangs[0];
}
