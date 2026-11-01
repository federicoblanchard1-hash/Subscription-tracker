import type { Cycle } from './lib';

/** Known services: name → website domain, category and typical billing cycle. */
export interface Service { name: string; domain: string; category: string; cycle: Cycle; aliases?: string[] }

const S = (name: string, domain: string, category: string, cycle: Cycle = 'monthly', aliases?: string[]): Service =>
  ({ name, domain, category, cycle, aliases });

export const SERVICES: Service[] = [
  // Entertainment
  S('Netflix', 'netflix.com', 'Entertainment'),
  S('Disney+', 'disneyplus.com', 'Entertainment', 'monthly', ['disney plus', 'disney']),
  S('YouTube Premium', 'youtube.com', 'Entertainment', 'monthly', ['youtube']),
  S('Prime Video', 'primevideo.com', 'Entertainment'),
  S('Apple TV+', 'tv.apple.com', 'Entertainment', 'monthly', ['apple tv']),
  S('HBO Max', 'max.com', 'Entertainment', 'monthly', ['max', 'hbo']),
  S('Hulu', 'hulu.com', 'Entertainment'),
  S('Paramount+', 'paramountplus.com', 'Entertainment', 'monthly', ['paramount']),
  S('Peacock', 'peacocktv.com', 'Entertainment'),
  S('Crunchyroll', 'crunchyroll.com', 'Entertainment'),
  S('Canal+', 'canalplus.com', 'Entertainment', 'monthly', ['canal plus']),
  S('DAZN', 'dazn.com', 'Entertainment'),
  S('Twitch', 'twitch.tv', 'Entertainment'),
  S('Patreon', 'patreon.com', 'Entertainment'),
  S('OnlyFans', 'onlyfans.com', 'Entertainment'),
  // Music & audio
  S('Spotify', 'spotify.com', 'Music'),
  S('Apple Music', 'music.apple.com', 'Music'),
  S('Deezer', 'deezer.com', 'Music'),
  S('Tidal', 'tidal.com', 'Music'),
  S('SoundCloud', 'soundcloud.com', 'Music', 'monthly', ['soundcloud go']),
  S('YouTube Music', 'music.youtube.com', 'Music'),
  S('Amazon Music', 'music.amazon.com', 'Music'),
  S('Audible', 'audible.com', 'Podcasts & audiobooks'),
  S('Storytel', 'storytel.com', 'Podcasts & audiobooks'),
  S('Blinkist', 'blinkist.com', 'Podcasts & audiobooks', 'yearly'),
  // Reading & news
  S('Kindle Unlimited', 'amazon.com', 'News & reading', 'monthly', ['kindle']),
  S('Medium', 'medium.com', 'News & reading'),
  S('Substack', 'substack.com', 'News & reading'),
  S('The New York Times', 'nytimes.com', 'News & reading', 'monthly', ['nyt', 'new york times']),
  S('The Economist', 'economist.com', 'News & reading', 'yearly', ['economist']),
  S('Le Monde', 'lemonde.fr', 'News & reading'),
  S('Financial Times', 'ft.com', 'News & reading', 'monthly', ['ft']),
  S('Apple News+', 'apple.com', 'News & reading', 'monthly', ['apple news']),
  // Gaming
  S('Xbox Game Pass', 'xbox.com', 'Gaming', 'monthly', ['game pass', 'xbox']),
  S('PlayStation Plus', 'playstation.com', 'Gaming', 'yearly', ['ps plus', 'playstation']),
  S('Nintendo Switch Online', 'nintendo.com', 'Gaming', 'yearly', ['nintendo']),
  S('EA Play', 'ea.com', 'Gaming'),
  S('Ubisoft+', 'ubisoft.com', 'Gaming', 'monthly', ['ubisoft']),
  S('Apple Arcade', 'apple.com', 'Gaming'),
  S('Steam', 'steampowered.com', 'Gaming'),
  S('Discord Nitro', 'discord.com', 'Social & dating', 'monthly', ['discord', 'nitro']),
  // Social & dating
  S('X Premium', 'x.com', 'Social & dating', 'monthly', ['twitter', 'x']),
  S('Snapchat+', 'snapchat.com', 'Social & dating', 'monthly', ['snapchat']),
  S('LinkedIn Premium', 'linkedin.com', 'Social & dating', 'monthly', ['linkedin']),
  S('Telegram Premium', 'telegram.org', 'Social & dating', 'monthly', ['telegram']),
  S('Tinder', 'tinder.com', 'Social & dating'),
  S('Bumble', 'bumble.com', 'Social & dating'),
  S('Hinge', 'hinge.co', 'Social & dating'),
  S('Meta Verified', 'meta.com', 'Social & dating'),
  // AI
  S('ChatGPT Plus', 'chatgpt.com', 'AI tools', 'monthly', ['chatgpt', 'openai']),
  S('Claude Pro', 'claude.ai', 'AI tools', 'monthly', ['claude', 'anthropic']),
  S('Gemini Advanced', 'gemini.google.com', 'AI tools', 'monthly', ['gemini']),
  S('Perplexity Pro', 'perplexity.ai', 'AI tools', 'monthly', ['perplexity']),
  S('Midjourney', 'midjourney.com', 'AI tools'),
  S('Mistral Le Chat', 'mistral.ai', 'AI tools', 'monthly', ['mistral', 'le chat']),
  S('Grok', 'x.ai', 'AI tools'),
  S('ElevenLabs', 'elevenlabs.io', 'AI tools'),
  S('Cursor', 'cursor.com', 'Developer tools'),
  // Productivity & software
  S('Notion', 'notion.so', 'Productivity'),
  S('Microsoft 365', 'microsoft.com', 'Productivity', 'yearly', ['office 365', 'office', 'microsoft']),
  S('Google Workspace', 'workspace.google.com', 'Productivity'),
  S('Evernote', 'evernote.com', 'Productivity'),
  S('Todoist', 'todoist.com', 'Productivity', 'yearly'),
  S('Slack', 'slack.com', 'Productivity'),
  S('Zoom', 'zoom.us', 'Productivity'),
  S('Grammarly', 'grammarly.com', 'Productivity', 'yearly'),
  S('Superhuman', 'superhuman.com', 'Productivity'),
  S('1Password', '1password.com', 'Security & VPN', 'yearly'),
  S('Bitwarden', 'bitwarden.com', 'Security & VPN', 'yearly'),
  S('Dashlane', 'dashlane.com', 'Security & VPN', 'yearly'),
  S('NordVPN', 'nordvpn.com', 'Security & VPN', 'yearly', ['nord']),
  S('ExpressVPN', 'expressvpn.com', 'Security & VPN', 'yearly'),
  S('Proton', 'proton.me', 'Security & VPN', 'monthly', ['proton mail', 'proton vpn', 'protonmail']),
  S('Surfshark', 'surfshark.com', 'Security & VPN', 'yearly'),
  S('Norton', 'norton.com', 'Security & VPN', 'yearly'),
  // Design & dev
  S('Figma', 'figma.com', 'Design & creative'),
  S('Adobe Creative Cloud', 'adobe.com', 'Design & creative', 'monthly', ['adobe', 'creative cloud', 'photoshop', 'lightroom']),
  S('Canva Pro', 'canva.com', 'Design & creative', 'yearly', ['canva']),
  S('Framer', 'framer.com', 'Design & creative'),
  S('Final Cut Pro', 'apple.com', 'Design & creative'),
  S('CapCut Pro', 'capcut.com', 'Design & creative', 'monthly', ['capcut']),
  S('GitHub', 'github.com', 'Developer tools', 'monthly', ['github copilot', 'copilot']),
  S('Vercel', 'vercel.com', 'Developer tools'),
  S('Netlify', 'netlify.com', 'Developer tools'),
  S('Supabase', 'supabase.com', 'Developer tools'),
  S('JetBrains', 'jetbrains.com', 'Developer tools', 'yearly'),
  S('DigitalOcean', 'digitalocean.com', 'Developer tools'),
  S('AWS', 'aws.amazon.com', 'Developer tools', 'monthly', ['amazon web services']),
  S('Cloudflare', 'cloudflare.com', 'Developer tools'),
  S('Squarespace', 'squarespace.com', 'Software', 'yearly'),
  S('Wix', 'wix.com', 'Software', 'yearly'),
  S('Shopify', 'shopify.com', 'Software'),
  S('GoDaddy', 'godaddy.com', 'Software', 'yearly'),
  // Cloud
  S('iCloud+', 'icloud.com', 'Cloud & storage', 'monthly', ['icloud']),
  S('Google One', 'one.google.com', 'Cloud & storage', 'monthly', ['google drive', 'google storage']),
  S('Dropbox', 'dropbox.com', 'Cloud & storage', 'yearly'),
  S('OneDrive', 'onedrive.live.com', 'Cloud & storage'),
  S('Apple One', 'apple.com', 'Cloud & storage'),
  S('Backblaze', 'backblaze.com', 'Cloud & storage'),
  // Shopping & memberships
  S('Amazon Prime', 'amazon.com', 'Shopping & memberships', 'yearly', ['amazon', 'prime']),
  S('Costco', 'costco.com', 'Shopping & memberships', 'yearly'),
  S('Walmart+', 'walmart.com', 'Shopping & memberships', 'monthly', ['walmart']),
  S('Uber One', 'uber.com', 'Transport', 'monthly', ['uber']),
  S('Lime', 'li.me', 'Transport'),
  S('Bolt', 'bolt.eu', 'Transport'),
  S('Deliveroo Plus', 'deliveroo.com', 'Food & delivery', 'monthly', ['deliveroo']),
  S('Uber Eats', 'ubereats.com', 'Food & delivery'),
  S('DoorDash DashPass', 'doordash.com', 'Food & delivery', 'monthly', ['doordash', 'dashpass']),
  S('Just Eat', 'just-eat.com', 'Food & delivery'),
  S('HelloFresh', 'hellofresh.com', 'Food & delivery', 'weekly'),
  S('Too Good To Go', 'toogoodtogo.com', 'Food & delivery'),
  // Health
  S('Strava', 'strava.com', 'Health & fitness', 'yearly'),
  S('Peloton', 'onepeloton.com', 'Health & fitness'),
  S('Headspace', 'headspace.com', 'Health & fitness', 'yearly'),
  S('Calm', 'calm.com', 'Health & fitness', 'yearly'),
  S('Fitbit Premium', 'fitbit.com', 'Health & fitness', 'monthly', ['fitbit']),
  S('MyFitnessPal', 'myfitnesspal.com', 'Health & fitness', 'yearly'),
  S('WHOOP', 'whoop.com', 'Health & fitness', 'yearly', ['whoop']),
  S('Basic-Fit', 'basic-fit.com', 'Health & fitness', 'monthly', ['basic fit', 'basicfit']),
  S('Oura', 'ouraring.com', 'Health & fitness'),
  // Education
  S('Duolingo', 'duolingo.com', 'Education', 'yearly'),
  S('Babbel', 'babbel.com', 'Education', 'yearly'),
  S('Coursera', 'coursera.org', 'Education'),
  S('Udemy', 'udemy.com', 'Education'),
  S('MasterClass', 'masterclass.com', 'Education', 'yearly'),
  S('Skillshare', 'skillshare.com', 'Education', 'yearly'),
  S('Brilliant', 'brilliant.org', 'Education', 'yearly'),
  // Finance
  S('Revolut', 'revolut.com', 'Finance', 'monthly', ['revolut premium', 'revolut metal']),
  S('N26', 'n26.com', 'Finance'),
  S('YNAB', 'ynab.com', 'Finance', 'yearly'),
  S('TradingView', 'tradingview.com', 'Finance'),
  // Phone & internet
  S('Swisscom', 'swisscom.ch', 'Phone & internet'),
  S('Salt', 'salt.ch', 'Phone & internet'),
  S('Sunrise', 'sunrise.ch', 'Phone & internet'),
  S('Orange', 'orange.fr', 'Phone & internet'),
  S('Free', 'free.fr', 'Phone & internet', 'monthly', ['free mobile']),
  S('SFR', 'sfr.fr', 'Phone & internet'),
  S('Bouygues Telecom', 'bouyguestelecom.fr', 'Phone & internet', 'monthly', ['bouygues']),
  S('Vodafone', 'vodafone.com', 'Phone & internet'),
  S('Verizon', 'verizon.com', 'Phone & internet'),
  S('T-Mobile', 't-mobile.com', 'Phone & internet', 'monthly', ['tmobile']),
  S('AT&T', 'att.com', 'Phone & internet', 'monthly', ['att']),
  S('Starlink', 'starlink.com', 'Phone & internet'),
  // Other
  S('Google Play Pass', 'play.google.com', 'Gaming', 'monthly', ['play pass']),
  S('Tesla Premium Connectivity', 'tesla.com', 'Transport', 'monthly', ['tesla']),
  S('Ring Protect', 'ring.com', 'Security & VPN', 'monthly', ['ring']),
  S('BarkBox', 'barkbox.com', 'Pets'),
];

export const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\+/g, ' plus').replace(/[^a-z0-9]+/g, ' ').trim();

const index = new Map<string, Service>();
for (const s of SERVICES) {
  index.set(norm(s.name), s);
  for (const a of s.aliases ?? []) if (!index.has(norm(a))) index.set(norm(a), s);
}

/** Best match for a typed name: exact (incl. aliases), then "name starts with a known brand". */
export function matchService(name: string): Service | null {
  const n = norm(name);
  if (!n) return null;
  const exact = index.get(n);
  if (exact) return exact;
  // "Netflix Premium 4K" → Netflix ; require a word boundary and ≥3 chars
  let best: Service | null = null;
  let bestLen = 0;
  for (const [k, s] of index) {
    if (k.length >= 3 && k.length > bestLen && (n.startsWith(k + ' ') || n === k)) { best = s; bestLen = k.length; }
  }
  return best;
}

/** Suggestions for the name field. */
export function searchServices(q: string, limit = 5): Service[] {
  const n = norm(q);
  if (!n) return [];
  const starts: Service[] = [], contains: Service[] = [];
  const seen = new Set<string>();
  for (const [k, s] of index) {
    if (seen.has(s.name)) continue;
    if (k.startsWith(n)) { starts.push(s); seen.add(s.name); }
    else if (k.includes(n) && n.length >= 2) { contains.push(s); seen.add(s.name); }
  }
  return [...starts, ...contains].filter((s) => norm(s.name) !== n).slice(0, limit);
}

export function domainFromUrl(url?: string): string | null {
  if (!url) return null;
  const raw = url.trim();
  if (!raw || /\s/.test(raw)) return null;
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = u.hostname.replace(/^www\./, '');
    return host.includes('.') && host.split('.').pop()!.length >= 2 ? host : null;
  } catch {
    return null;
  }
}

/** Domain to show a logo for: the website the user typed wins, else a known service. */
export function domainFor(name: string, url?: string): string | null {
  return domainFromUrl(url) ?? matchService(name)?.domain ?? null;
}

export const logoSrc = (domain: string, size = 128) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
