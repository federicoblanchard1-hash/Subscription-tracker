import { useMemo, useState } from 'react';
import { Logo } from './Logo';
import { billed, daysBetween, nextRenewal, relativeDay, shortDate, toISO, today, type Subscription } from '../lib';
import { domainFor } from '../logos';

const KEY = 'recurring:dismissed:v1';
const load = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const save = (v: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(v.slice(-200))); } catch { /* ignore */ } };

interface Props {
  subs: Subscription[];
  onKeep: (s: Subscription) => void;
  onCancelled: (s: Subscription) => void;
}

/** Proactive alerts: trials about to convert, and big (quarterly/yearly) renewals coming up. */
export function HeadsUp({ subs, onKeep, onCancelled }: Props) {
  const [dismissed, setDismissed] = useState<string[]>(load);
  const t = today();

  const items = useMemo(() => subs
    .filter((s) => s.status !== 'paused')
    .map((s) => {
      const d = nextRenewal(s);
      const days = daysBetween(t, d);
      const kind = s.status === 'trial' ? (days <= 7 ? 'trial' : null) : (s.cycle === 'yearly' || s.cycle === 'quarterly') && days <= 14 ? 'renewal' : null;
      return kind ? { s, d, days, kind, key: `${s.id}:${toISO(d)}` } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x && !dismissed.includes(x.key))
    .sort((a, b) => a.days - b.days),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [subs, dismissed, t.getTime()]);

  if (!items.length) return null;

  const dismiss = (key: string) => { const v = [...dismissed, key]; setDismissed(v); save(v); };

  return (
    <section className="headsup" aria-label="Heads-up">
      {items.slice(0, 3).map(({ s, d, days, kind, key }) => {
        const domain = domainFor(s.name, s.url);
        const href = s.url ? (s.url.startsWith('http') ? s.url : `https://${s.url}`) : domain ? `https://${domain}` : null;
        return (
          <div key={key} className={`hu-item ${days <= 2 ? 'urgent' : ''}`}>
            <Logo name={s.name} url={s.url} size={36} />
            <div className="grow">
              <p className="hu-title">
                {kind === 'trial'
                  ? <>{s.name} trial ends {relativeDay(d).toLowerCase()}</>
                  : <>{s.name} renews {relativeDay(d).toLowerCase()}</>}
              </p>
              <p className="muted small">
                {kind === 'trial'
                  ? <>You’ll be charged {billed(s)} on {shortDate(d)} unless you cancel.</>
                  : <>{billed(s)} {s.cycle} charge on {shortDate(d)}. Still using it?</>}
              </p>
            </div>
            <div className="hu-actions">
              {href && <a className="btn ghost sm" href={href} target="_blank" rel="noreferrer">Manage</a>}
              <button className="btn ghost sm" onClick={() => { dismiss(key); onCancelled(s); }}>I cancelled it</button>
              <button className="btn sm" onClick={() => { dismiss(key); if (kind === 'trial') onKeep(s); }}>{kind === 'trial' ? 'Keep it' : 'Got it'}</button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
