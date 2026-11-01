import { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { categoryColor, charge, money, occurrencesBetween, toISO, today, type Subscription } from '../lib';

export function Calendar({ subs, currency, onOpen }: { subs: Subscription[]; currency: string; onOpen: (s: Subscription) => void }) {
  const t = today();
  const [cursor, setCursor] = useState(() => new Date(t.getFullYear(), t.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);

  const { cells, byDay, total } = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const byDay = new Map<string, Subscription[]>();
    let total = 0;
    for (const s of subs) {
      if (s.status === 'paused') continue;
      for (const d of occurrencesBetween(s, first, last)) {
        const k = toISO(d);
        byDay.set(k, [...(byDay.get(k) ?? []), s]);
        total += charge(s);
      }
    }
    const lead = (first.getDay() + 6) % 7; // Monday first
    const cells: (Date | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(first.getFullYear(), first.getMonth(), d));
    while (cells.length % 7) cells.push(null);
    return { cells, byDay, total };
  }, [subs, cursor, currency]);

  const move = (n: number) => { setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1)); setSelected(null); };
  const todayKey = toISO(t);
  const sel = selected ? byDay.get(selected) ?? [] : [];

  return (
    <section className="card">
      <div className="card-head">
        <h3>{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
        <div className="row gap-4">
          <button className="icon-btn sm" onClick={() => move(-1)} aria-label="Previous month"><Icon name="left" /></button>
          <button className="icon-btn sm" onClick={() => move(1)} aria-label="Next month"><Icon name="right" /></button>
        </div>
      </div>
      <p className="muted small cal-total">
        <span className="num">{money(total, currency)}</span> charged this month
      </p>
      <div className="cal" role="grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="cal-dow">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const k = toISO(d);
          const items = byDay.get(k);
          return (
            <button
              key={i}
              className={`cal-day${k === todayKey ? ' today' : ''}${k === selected ? ' sel' : ''}${items ? ' has' : ''}`}
              onClick={() => setSelected(k === selected ? null : k)}
              disabled={!items}
              aria-label={`${d.toDateString()}${items ? `, ${items.length} charge${items.length > 1 ? 's' : ''}` : ''}`}
            >
              <span>{d.getDate()}</span>
              {items && (
                <span className="cal-dots">
                  {items.slice(0, 3).map((s) => <i key={s.id} style={{ background: categoryColor(s.category) }} />)}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {sel.length > 0 && (
        <ul className="mini-list">
          {sel.map((s) => (
            <li key={s.id}>
              <button onClick={() => onOpen(s)}>
                <span className="dot" style={{ background: categoryColor(s.category) }} />
                <span className="grow">{s.name}</span>
                <span className="num">{money(charge(s), currency)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
