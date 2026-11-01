export type Cycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type Status = 'active' | 'trial' | 'paused';

export interface Subscription {
  id: string;
  name: string;
  price: number;
  cycle: Cycle;
  /** First billing date (or trial end date) — renewals are computed from it. YYYY-MM-DD */
  startDate: string;
  category: string;
  status: Status;
  url?: string;
  notes?: string;
  /** Billing currency; undefined = the main currency. */
  currency?: string;
  /** Number of people sharing the cost (you included). 1 = just you. */
  splitWith?: number;
  createdAt: number;
}

export interface Settings {
  currency: string;
  budget: number | null;
  view: 'month' | 'year';
}

export const CYCLES: { id: Cycle; label: string; short: string }[] = [
  { id: 'weekly', label: 'Weekly', short: 'wk' },
  { id: 'monthly', label: 'Monthly', short: 'mo' },
  { id: 'quarterly', label: 'Quarterly', short: 'qtr' },
  { id: 'yearly', label: 'Yearly', short: 'yr' },
];

export const CATEGORIES: { id: string; color: string }[] = [
  { id: 'Entertainment', color: '#ef4444' },
  { id: 'Music', color: '#ec4899' },
  { id: 'Podcasts & audiobooks', color: '#f472b6' },
  { id: 'News & reading', color: '#f97316' },
  { id: 'Gaming', color: '#a855f7' },
  { id: 'Social & dating', color: '#e11d48' },
  { id: 'Productivity', color: '#3b82f6' },
  { id: 'AI tools', color: '#6366f1' },
  { id: 'Software', color: '#8b5cf6' },
  { id: 'Developer tools', color: '#0ea5e9' },
  { id: 'Design & creative', color: '#d946ef' },
  { id: 'Cloud & storage', color: '#06b6d4' },
  { id: 'Security & VPN', color: '#64748b' },
  { id: 'Phone & internet', color: '#0284c7' },
  { id: 'Utilities', color: '#14b8a6' },
  { id: 'Housing', color: '#78716c' },
  { id: 'Insurance', color: '#475569' },
  { id: 'Finance', color: '#84cc16' },
  { id: 'Shopping & memberships', color: '#f59e0b' },
  { id: 'Food & delivery', color: '#ea580c' },
  { id: 'Transport', color: '#0d9488' },
  { id: 'Health & fitness', color: '#22c55e' },
  { id: 'Education', color: '#eab308' },
  { id: 'Kids & family', color: '#fb7185' },
  { id: 'Pets', color: '#a16207' },
  { id: 'Charity & donations', color: '#10b981' },
  { id: 'Other', color: '#a3a3a3' },
];

export const categoryColor = (c: string) =>
  CATEGORIES.find((x) => x.id === c)?.color ?? '#a3a3a3';

export const CURRENCIES = ['GBP', 'EUR', 'USD', 'CHF', 'CAD', 'AUD', 'NZD', 'JPY', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'TRY', 'BRL', 'MXN', 'INR', 'SGD', 'HKD', 'ZAR', 'KRW', 'CNY', 'ILS'];

/* ---------- dates ---------- */

const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const today = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

const monthsPerCycle: Record<Cycle, number> = { weekly: 0, monthly: 1, quarterly: 3, yearly: 12 };

/** k-th billing date after the anchor. Month-based cycles clamp to the end of month without drifting (Jan 31 → Feb 28 → Mar 31). */
export function occurrence(anchor: Date, cycle: Cycle, k: number): Date {
  if (cycle === 'weekly') {
    return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 7 * k);
  }
  const total = anchor.getMonth() + monthsPerCycle[cycle] * k;
  const y = anchor.getFullYear() + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(anchor.getDate(), lastDay));
}

/** Next billing date on or after `from`. */
export function nextRenewal(s: Subscription, from = today()): Date {
  const anchor = parseISO(s.startDate);
  if (anchor >= from) return anchor;
  // jump close, then step
  const approxDays = s.cycle === 'weekly' ? 7 : monthsPerCycle[s.cycle] * 30.44;
  let k = Math.max(0, Math.floor(daysBetween(anchor, from) / approxDays) - 1);
  let d = occurrence(anchor, s.cycle, k);
  while (d < from) d = occurrence(anchor, s.cycle, ++k);
  return d;
}

/** All billing dates within [from, to]. */
export function occurrencesBetween(s: Subscription, from: Date, to: Date): Date[] {
  const out: Date[] = [];
  let d = nextRenewal(s, from);
  const anchor = parseISO(s.startDate);
  let k = 0;
  // find k for d
  while (occurrence(anchor, s.cycle, k) < d) k++;
  while (d <= to && out.length < 400) {
    out.push(d);
    d = occurrence(anchor, s.cycle, ++k);
  }
  return out;
}

/** Number of charges that already happened (start date … today, inclusive of start). */
export function chargesSoFar(s: Subscription, now = today()): number {
  const anchor = parseISO(s.startDate);
  if (anchor > now) return 0;
  let k = 0;
  while (occurrence(anchor, s.cycle, k + 1) <= now && k < 5000) k++;
  return k + 1;
}

/* ---------- money ---------- */

const perMonthFactor: Record<Cycle, number> = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };

/* Exchange rates (ECB, via frankfurter.dev). Rates are "1 BASE = r CUR". */
let MAIN = 'EUR';
let FX: { base: string; date: string; fetched?: string; rates: Record<string, number> } | null = null;
const FX_KEY = 'recurring:fx:v1';
try { const raw = localStorage.getItem(FX_KEY); if (raw) FX = JSON.parse(raw); } catch { /* ignore */ }

export const setMainCurrency = (c: string) => { MAIN = c; };
export const mainCurrency = () => MAIN;
export const fxDate = () => FX?.date ?? null;

function rate(cur: string): number | null {
  if (!FX) return null;
  if (cur === FX.base) return 1;
  return FX.rates[cur] ?? null;
}
/** Convert between currencies. Returns null when no rate is known. */
export function convert(amount: number, from: string, to: string): number | null {
  if (from === to) return amount;
  const a = rate(from), b = rate(to);
  return a && b ? (amount / a) * b : null;
}
export const hasRate = (from: string, to = MAIN) => convert(1, from, to) != null;

/** Fetch today's rates once a day; resolves true when new rates were stored. */
export async function refreshRates(): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  if (FX && FX.fetched === today) return false;
  try {
    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=EUR');
    if (!res.ok) return false;
    const j = await res.json();
    FX = { base: 'EUR', date: j.date, rates: j.rates, fetched: today };
    try { localStorage.setItem(FX_KEY, JSON.stringify(FX)); } catch { /* ignore */ }
    return true;
  } catch {
    return false;
  }
}

export const subCurrency = (s: Pick<Subscription, 'currency'>) => s.currency || MAIN;
export const splitOf = (s: Pick<Subscription, 'splitWith'>) => Math.max(1, Math.round(s.splitWith ?? 1));
/** What one charge costs you, in the main currency (your share, converted). */
export function charge(s: Pick<Subscription, 'price' | 'currency' | 'splitWith'>): number {
  const mine = s.price / splitOf(s);
  return convert(mine, subCurrency(s), MAIN) ?? mine;
}
export const monthly = (s: Subscription) => charge(s) * perMonthFactor[s.cycle];
export const yearly = (s: Subscription) => monthly(s) * 12;
/** The billed price as the provider charges it, e.g. "$20.00". */
export const billed = (s: Subscription) => money(s.price, subCurrency(s));

const fmtCache = new Map<string, Intl.NumberFormat>();
export function money(n: number, currency: string, opts: { compact?: boolean } = {}) {
  const key = currency + (opts.compact ? 'c' : '');
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: opts.compact ? 0 : undefined,
      maximumFractionDigits: opts.compact ? 0 : 2,
    });
    fmtCache.set(key, f);
  }
  return f.format(n);
}

/* ---------- formatting ---------- */

export function relativeDay(d: Date, now = today()) {
  const n = daysBetween(now, d);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n < 0) return `${-n}d ago`;
  if (n < 60) return `In ${n} days`;
  return `In ${Math.round(n / 30.44)} months`;
}

export const shortDate = (d: Date) =>
  d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/* ---------- storage ---------- */

const KEY = 'recurring:subs:v1';
const SKEY = 'recurring:settings:v1';

function guessCurrency(): string {
  try {
    const loc = navigator.language || 'en-US';
    const region = loc.split('-')[1]?.toUpperCase();
    const map: Record<string, string> = { US: 'USD', GB: 'GBP', CH: 'CHF', CA: 'CAD', AU: 'AUD', JP: 'JPY', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', BR: 'BRL', MX: 'MXN', IN: 'INR' };
    return (region && map[region]) || 'EUR';
  } catch {
    return 'EUR';
  }
}

const subsKey = (scope: string) => (scope === 'guest' ? KEY : `${KEY}:${scope}`);

export function loadSubs(scope = 'guest'): Subscription[] {
  try {
    const raw = localStorage.getItem(subsKey(scope));
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter(isSub) : [];
  } catch {
    return [];
  }
}
export function saveSubs(scope: string, s: Subscription[]) {
  try {
    localStorage.setItem(subsKey(scope), JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}
export function loadSettings(): Settings {
  const def: Settings = { currency: guessCurrency(), budget: null, view: 'month' };
  try {
    const raw = localStorage.getItem(SKEY);
    return raw ? { ...def, ...JSON.parse(raw) } : def;
  } catch {
    return def;
  }
}
export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SKEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

export function isSub(x: unknown): x is Subscription {
  const s = x as Subscription;
  return !!s && typeof s.id === 'string' && typeof s.name === 'string' && typeof s.price === 'number' &&
    ['weekly', 'monthly', 'quarterly', 'yearly'].includes(s.cycle) && typeof s.startDate === 'string';
}

/* ---------- export ---------- */

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function toCSV(subs: Subscription[], currency: string) {
  const esc = (v: string | number | undefined) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['Name', 'Price', 'Currency', 'Cycle', `Your share per month (${currency})`, `Your share per year (${currency})`, 'Next billing', 'Category', 'Status', 'Website', 'Notes'];
  const rows = subs.map((s) => [
    s.name, s.price.toFixed(2), subCurrency(s), s.cycle, monthly(s).toFixed(2), yearly(s).toFixed(2),
    toISO(nextRenewal(s)), s.category, s.status, s.url, s.notes,
  ].map(esc).join(','));
  return [head.join(','), ...rows].join('\n');
}

export function toICS(subs: Subscription[], currency: string) {
  const rule: Record<Cycle, string> = {
    weekly: 'FREQ=WEEKLY', monthly: 'FREQ=MONTHLY', quarterly: 'FREQ=MONTHLY;INTERVAL=3', yearly: 'FREQ=YEARLY',
  };
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Recurring//Subscriptions//EN', 'CALSCALE:GREGORIAN'];
  for (const s of subs.filter((x) => x.status !== 'paused')) {
    const d = s.startDate.replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${s.id}@recurring`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`,
      `RRULE:${rule[s.cycle]}`,
      `SUMMARY:${s.name} — ${money(s.price, s.currency || currency)}`.replace(/[,;]/g, (m) => '\\' + m),
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${s.name} renews tomorrow`, 'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function sampleData(): Subscription[] {
  const t = today();
  const at = (days: number) => toISO(new Date(t.getFullYear(), t.getMonth(), t.getDate() + days));
  const ago = (months: number, day: number) => toISO(new Date(t.getFullYear(), t.getMonth() - months, day));
  const mk = (p: Omit<Subscription, 'id' | 'createdAt'>): Subscription => ({ ...p, id: uid(), createdAt: Date.now() });
  return [
    mk({ name: 'Netflix', price: 13.49, cycle: 'monthly', startDate: ago(26, Math.min(28, t.getDate() + 3)), category: 'Entertainment', status: 'active' }),
    mk({ name: 'Spotify Family', splitWith: 4, price: 19.99, cycle: 'monthly', startDate: ago(40, Math.min(28, t.getDate() + 9)), category: 'Music', status: 'active' }),
    mk({ name: 'iCloud+', price: 2.99, cycle: 'monthly', startDate: ago(18, Math.min(28, t.getDate() + 1)), category: 'Cloud & storage', status: 'active' }),
    mk({ name: 'Claude Pro', currency: 'USD', price: 20, cycle: 'monthly', startDate: ago(5, Math.min(28, t.getDate() + 16)), category: 'AI tools', status: 'active' }),
    mk({ name: 'Figma', price: 144, cycle: 'yearly', startDate: ago(9, 14), category: 'Design & creative', status: 'active' }),
    mk({ name: 'Amazon Prime', price: 69.9, cycle: 'yearly', startDate: ago(30, 3), category: 'Shopping & memberships', status: 'active' }),
    mk({ name: 'Gym', price: 34.9, cycle: 'monthly', startDate: ago(11, 1), category: 'Health & fitness', status: 'active' }),
    mk({ name: 'Duolingo', price: 7.99, cycle: 'monthly', startDate: at(6), category: 'Education', status: 'trial', notes: 'Cancel before the trial ends if unused' }),
    mk({ name: 'Disney+', price: 8.99, cycle: 'monthly', startDate: ago(14, 20), category: 'Entertainment', status: 'paused' }),
  ];
}
