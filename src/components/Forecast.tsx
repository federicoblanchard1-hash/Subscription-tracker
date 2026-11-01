import { useMemo, useState } from 'react';
import { charge, money, occurrencesBetween, today, type Subscription } from '../lib';

interface Month { start: Date; total: number; items: { s: Subscription; amount: number }[] }

/** Projected spend for the next 12 calendar months — shows the yearly-renewal spikes a monthly average hides. */
export function Forecast({ subs, currency }: { subs: Subscription[]; currency: string }) {
  const [sel, setSel] = useState<number | null>(null);

  const months = useMemo<Month[]>(() => {
    const t = today();
    const live = subs.filter((s) => s.status !== 'paused');
    return Array.from({ length: 12 }, (_, i) => {
      const start = new Date(t.getFullYear(), t.getMonth() + i, 1);
      const end = new Date(t.getFullYear(), t.getMonth() + i + 1, 0);
      const items = live
        .map((s) => ({ s, amount: occurrencesBetween(s, start, end).length * charge(s) }))
        .filter((x) => x.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      return { start, total: items.reduce((a, x) => a + x.amount, 0), items };
    });
    // currency is a dependency because charge() converts into it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs, currency]);

  const max = Math.max(...months.map((m) => m.total), 1);
  const sum = months.reduce((a, m) => a + m.total, 0);
  const avg = sum / 12;
  const peak = months.reduce((p, m, i) => (m.total > months[p].total ? i : p), 0);
  const active = sel ?? peak;
  const m = months[active];
  const label = (d: Date, long = false) => d.toLocaleDateString(undefined, long ? { month: 'long', year: 'numeric' } : { month: 'short' });

  if (sum === 0) return null;

  return (
    <section className="card">
      <div className="card-head">
        <h3>Next 12 months</h3>
        <span className="muted small num">{money(sum, currency)}</span>
      </div>
      <div className="fc" onMouseLeave={() => setSel(null)}>
        <div className="fc-avg" style={{ bottom: `${(avg / max) * 100}%` }} aria-hidden="true">
          <span>avg {money(avg, currency, { compact: true })}</span>
        </div>
        {months.map((mo, i) => (
          <button
            key={i}
            className={`fc-col${i === active ? ' on' : ''}`}
            onMouseEnter={() => setSel(i)}
            onFocus={() => setSel(i)}
            onClick={() => setSel(i === sel ? null : i)}
            aria-label={`${label(mo.start, true)}: ${money(mo.total, currency)}`}
          >
            <span className="fc-bar" style={{ height: `${Math.max(2, (mo.total / max) * 100)}%` }} />
          </button>
        ))}
      </div>
      <div className="fc-axis" aria-hidden="true">
        {months.map((mo, i) => <span key={i} className={i === active ? 'on' : ''}>{label(mo.start).slice(0, 1)}</span>)}
      </div>
      <div className="fc-detail" aria-live="polite">
        <div className="fc-detail-head">
          <span>{label(m.start, true)}{sel == null && <span className="muted"> · busiest</span>}</span>
          <strong className="num">{money(m.total, currency)}</strong>
        </div>
        <p className="muted small fc-items">
          {m.items.length
            ? m.items.slice(0, 4).map((x) => `${x.s.name} ${money(x.amount, currency)}`).join(' · ') + (m.items.length > 4 ? ` · +${m.items.length - 4} more` : '')
            : 'No charges'}
        </p>
      </div>
    </section>
  );
}
