import { supabase } from './supabase';


export type PushState =
  | 'unsupported'      // browser can't do web push
  | 'ios-install'      // iPhone/iPad Safari: must be added to the Home Screen first
  | 'denied'           // user blocked notifications
  | 'off'
  | 'on';

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

export function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
}

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function publicKey(): Promise<string> {
  const { data, error } = await supabase!.functions.invoke('push', { body: { action: 'public-key' } });
  if (error || !data?.publicKey) throw new Error('Couldn’t reach the notification service. Try again.');
  return data.publicKey;
}

export async function pushState(): Promise<PushState> {
  if (!supported()) return isIOS() && !isStandalone() ? 'ios-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

function keyToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Asks permission, subscribes this device and stores it on the account. */
export async function enablePush(daysBefore: number): Promise<void> {
  if (!supabase || !supported()) throw new Error('Notifications aren’t supported here.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifications are blocked. Allow them in your settings.' : 'Permission was not granted.');
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(await publicKey()) }));
  await savePush(sub, daysBefore);
}

export async function savePush(sub: PushSubscription, daysBefore: number) {
  const j = sub.toJSON();
  const { error } = await supabase!.rpc('claim_push_subscription', {
    p_endpoint: j.endpoint,
    p_p256dh: j.keys?.p256dh,
    p_auth: j.keys?.auth,
    p_days_before: daysBefore,
    p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });
  if (error) throw new Error('Couldn’t save this device. Try again.');
}

export async function updateDaysBefore(daysBefore: number) {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await savePush(sub, daysBefore);
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase?.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

export async function sendTestPush(): Promise<string> {
  const { data, error } = await supabase!.functions.invoke('push', { body: { action: 'test' } });
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(body?.error || 'Couldn’t send a test notification.');
  }
  return data.sent === 1 ? 'Test sent. It should arrive in a few seconds.' : `Test sent to ${data.sent} devices.`;
}
