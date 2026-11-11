// Web push for Recurring.
//   POST {action:"public-key"}  (signed-in)  → VAPID public key, generated on first use
//   POST {action:"test"}        (signed-in)  → test notification to the caller's devices
//   POST {action:"run"}         (daily cron) → today's renewal reminders; idempotent per device per day
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildReminders, todayIn, type Row } from './reminders.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Keys = { publicKey: string; privateKey: string };
let keys: Keys | null = null;
async function vapid(): Promise<Keys> {
  if (keys) return keys;
  const read = async () => (await admin.from('app_secrets').select('value').eq('key', 'vapid').maybeSingle()).data?.value as Keys | undefined;
  let k = await read();
  if (!k) {
    const fresh = webpush.generateVAPIDKeys();
    await admin.from('app_secrets').insert({ key: 'vapid', value: fresh }); // loses a race harmlessly
    k = await read();
  }
  if (!k) throw new Error('could not load VAPID keys');
  webpush.setVapidDetails('mailto:noreply@recurring.app', k.publicKey, k.privateKey);
  return (keys = k);
}

interface Device { endpoint: string; p256dh: string; auth: string; user_id: string; days_before: number; timezone: string; last_sent_on: string | null }

async function push(d: Device, m: unknown): Promise<'ok' | 'gone' | 'error'> {
  try {
    await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, JSON.stringify(m), { TTL: 72000 });
    return 'ok';
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) { await admin.from('push_subscriptions').delete().eq('endpoint', d.endpoint); return 'gone'; }
    console.error('push failed', code, (e as Error).message);
    return 'error';
  }
}

async function userFrom(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user ?? null;
}

async function run() {
  await vapid();
  const { data: devices, error } = await admin.from('push_subscriptions').select('*');
  if (error) throw error;
  const ids = [...new Set((devices as Device[]).map((d) => d.user_id))];
  if (!ids.length) return { devices: 0, sent: 0 };
  const [{ data: subs }, { data: settings }] = await Promise.all([
    admin.from('subscriptions').select('id,user_id,name,price,cycle,start_date,status,currency').in('user_id', ids).neq('status', 'paused'),
    admin.from('user_settings').select('user_id,currency').in('user_id', ids),
  ]);
  let sent = 0, skipped = 0, gone = 0;
  for (const d of devices as Device[]) {
    const today = todayIn(d.timezone || 'UTC');
    const iso = today.toISOString().slice(0, 10);
    if (d.last_sent_on === iso) { skipped++; continue; }
    const rows = ((subs ?? []) as (Row & { user_id: string })[]).filter((s) => s.user_id === d.user_id);
    const main = (settings ?? []).find((s: { user_id: string }) => s.user_id === d.user_id)?.currency || 'EUR';
    let alive = true;
    for (const m of buildReminders(rows, d.days_before ?? 1, main, today)) {
      const r = await push(d, { ...m, url: '/' });
      if (r === 'ok') sent++;
      if (r === 'gone') { gone++; alive = false; break; }
    }
    if (alive) await admin.from('push_subscriptions').update({ last_sent_on: iso }).eq('endpoint', d.endpoint);
  }
  return { devices: devices.length, sent, skipped, gone };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const { action } = await req.json().catch(() => ({ action: '' }));
  try {
    if (action === 'run') return json(await run());

    const user = await userFrom(req);
    if (!user) return json({ error: 'Log in first' }, 401);
    if (action === 'public-key') return json({ publicKey: (await vapid()).publicKey });
    if (action === 'test') {
      await vapid();
      const { data } = await admin.from('push_subscriptions').select('*').eq('user_id', user.id);
      if (!data?.length) return json({ error: 'No device has notifications turned on' }, 404);
      let sent = 0;
      for (const d of data as Device[]) {
        const w = d.days_before === 0 ? 'on the day of' : d.days_before === 1 ? '1 day before' : `${d.days_before} days before`;
        if ((await push(d, { title: 'Notifications are on', body: `You’ll get a reminder ${w} each renewal, and before free trials end.`, tag: 'test', url: '/' })) === 'ok') sent++;
      }
      return json({ sent, devices: data.length });
    }
    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
