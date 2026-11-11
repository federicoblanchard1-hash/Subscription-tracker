// Daily Vercel Cron: asks the Supabase "push" function to send today's renewal reminders.
// Sending is idempotent per device per day, so this needs no secret. The daily request also
// keeps the free Supabase project from pausing for inactivity.
const URL = 'https://ltmcfrtrivohehribwlm.supabase.co/functions/v1/push';
const KEY = 'sb_publishable_8qqmjkMeaswYKhtet5mN9w_8i8YFYWo';

export default async function handler(_req: any, res: any) {
  try {
    const r = await fetch(URL, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'run' }) });
    return res.status(r.ok ? 200 : 502).json(await r.json().catch(() => ({ status: r.status })));
  } catch (e) {
    return res.status(502).json({ error: (e as Error).message });
  }
}
