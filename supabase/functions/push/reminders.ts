// Renewal maths shared with the web app (src/lib.ts), kept dependency-free for Deno.
export type Cycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export interface Row {
  id: string; name: string; price: number; cycle: Cycle; start_date: string;
  status: 'active' | 'trial' | 'paused'; currency: string | null;
}
export interface Message { title: string; body: string; tag?: string; url?: string }

const months: Record<Cycle, number> = { weekly: 0, monthly: 1, quarterly: 3, yearly: 12 };
export const parseISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

function occurrence(a: Date, c: Cycle, k: number): Date {
  if (c === 'weekly') return new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate() + 7 * k));
  const total = a.getUTCMonth() + months[c] * k;
  const y = a.getUTCFullYear() + Math.floor(total / 12), m = ((total % 12) + 12) % 12;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(a.getUTCDate(), last)));
}
export function nextRenewal(start: string, cycle: Cycle, from: Date): Date {
  const a = parseISO(start);
  if (a >= from) return a;
  const approx = cycle === 'weekly' ? 7 : months[cycle] * 30.44;
  let k = Math.max(0, Math.floor(daysBetween(a, from) / approx) - 1);
  let d = occurrence(a, cycle, k);
  while (d < from) d = occurrence(a, cycle, ++k);
  return d;
}

export function todayIn(tz: string): Date {
  try { return parseISO(new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())); }
  catch { return parseISO(new Date().toISOString().slice(0, 10)); }
}
const money = (n: number, c: string) => { try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: c }).format(n); } catch { return `${n.toFixed(2)} ${c}`; } };
const dateLabel = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const when = (n: number) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`);

/** Notifications one device should get today. */
export function buildReminders(rows: Row[], daysBefore: number, main: string, today: Date): Message[] {
  const regular: { name: string; price: string; days: number; date: Date }[] = [];
  const out: Message[] = [];
  const iso = today.toISOString().slice(0, 10);
  for (const r of rows) {
    if (r.status === 'paused') continue;
    const d = nextRenewal(r.start_date, r.cycle, today);
    const days = daysBetween(today, d);
    const price = money(Number(r.price), r.currency || main);
    if (r.status === 'trial') {
      if (days === daysBefore || days === 3 || days === 1) {
        out.push({ title: `${r.name} trial ends ${when(days)}`, body: `You’ll be charged ${price} on ${dateLabel(d)} unless you cancel.`, tag: `trial-${r.id}-${iso}` });
      }
    } else if (days === daysBefore) {
      regular.push({ name: r.name, price, days, date: d });
    }
  }
  if (regular.length === 1) {
    const [x] = regular;
    out.unshift({ title: `${x.name} renews ${when(x.days)}`, body: `${x.price} will be charged ${x.days ? `on ${dateLabel(x.date)}` : 'today'}.`, tag: `renew-${iso}` });
  } else if (regular.length > 1) {
    out.unshift({ title: `${regular.length} renewals ${when(regular[0].days)}`, body: regular.map((x) => `${x.name} ${x.price}`).join(' · '), tag: `renew-${iso}` });
  }
  return out;
}
