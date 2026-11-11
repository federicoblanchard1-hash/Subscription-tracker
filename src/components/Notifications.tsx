import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { disablePush, enablePush, isIOS, pushState, sendTestPush, updateDaysBefore, type PushState } from '../push';

const DAYS_KEY = 'recurring:push-days';
const readDays = () => { try { const v = Number(localStorage.getItem(DAYS_KEY)); return Number.isFinite(v) && v >= 0 && v <= 7 && localStorage.getItem(DAYS_KEY) !== null ? v : 1; } catch { return 1; } };
const OPTIONS = [
  { v: 0, label: 'On the day' },
  { v: 1, label: '1 day before' },
  { v: 2, label: '2 days before' },
  { v: 3, label: '3 days before' },
  { v: 7, label: '1 week before' },
];

export function Notifications({ signedIn, onSignIn }: { signedIn: boolean; onSignIn?: () => void }) {
  const [state, setState] = useState<PushState | 'loading'>('loading');
  const [days, setDays] = useState(readDays);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);

  useEffect(() => { pushState().then(setState).catch(() => setState('unsupported')); }, []);

  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true); setMsg(null);
    try { const t = await fn(); if (t) setMsg({ text: t }); }
    catch (e) { setMsg({ text: (e as Error).message, err: true }); }
    finally { setBusy(false); setState(await pushState().catch(() => 'unsupported' as const)); }
  };

  const changeDays = (v: number) => {
    setDays(v);
    try { localStorage.setItem(DAYS_KEY, String(v)); } catch { /* ignore */ }
    if (state === 'on') run(async () => { await updateDaysBefore(v); return 'Saved.'; });
  };

  return (
    <div className="settings-group">
      <span className="label">Renewal notifications</span>
      {!signedIn ? (
        <div className="account-row">
          <p className="muted small grow">Log in to get a notification before each renewal and before free trials end.</p>
          {onSignIn && <button className="btn" onClick={onSignIn}>Log in</button>}
        </div>
      ) : state === 'ios-install' ? (
        <div className="notice">
          <p className="small"><strong>On iPhone, add the app to your Home Screen first.</strong></p>
          <ol className="steps small muted">
            <li>Tap <strong>Share</strong> <span className="share-ico" aria-hidden="true">⬆︎</span> in Safari</li>
            <li>Choose <strong>Add to Home Screen</strong></li>
            <li>Open Recurring from your Home Screen and come back here</li>
          </ol>
        </div>
      ) : state === 'unsupported' ? (
        <p className="muted small">This browser doesn’t support notifications.{isIOS() ? ' Update to iOS 16.4 or later.' : ''}</p>
      ) : state === 'denied' ? (
        <p className="muted small">Notifications are blocked for this app. {isIOS() ? 'Allow them in iPhone Settings → Notifications → Recurring.' : 'Allow them in your browser’s site settings, then reload.'}</p>
      ) : (
        <>
          <div className="notif-row">
            <div className="grow">
              <p className="small">{state === 'on' ? 'On for this device' : 'Get reminded before you’re charged'}</p>
              <p className="muted small">Also warns you 3 days and 1 day before a free trial ends.</p>
            </div>
            <button
              className={`switch${state === 'on' ? ' on' : ''}`}
              role="switch"
              aria-checked={state === 'on'}
              aria-label="Renewal notifications"
              disabled={busy || state === 'loading'}
              onClick={() => run(async () => {
                if (state === 'on') { await disablePush(); return 'Notifications turned off for this device.'; }
                await enablePush(days);
                return 'Notifications are on.';
              })}
            ><span /></button>
          </div>
          <div className="notif-row">
            <label htmlFor="n-days" className="small grow">Remind me</label>
            <select id="n-days" className="select-sm" value={days} onChange={(e) => changeDays(Number(e.target.value))} disabled={busy}>
              {OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
          {state === 'on' && (
            <button className="btn ghost sm self-start" disabled={busy} onClick={() => run(sendTestPush)}>
              <Icon name="bell" /> Send a test notification
            </button>
          )}
        </>
      )}
      {msg && <p className={`small note${msg.err ? ' err-note' : ''}`} role="status">{msg.text}</p>}
    </div>
  );
}
