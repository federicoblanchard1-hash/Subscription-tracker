import { useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';
import {
  CATEGORIES, CYCLES, PRESETS, categoryColor, money, monthly, nextRenewal, relativeDay, shortDate, toISO, today, uid, yearly,
  type Cycle, type Status, type Subscription,
} from '../lib';

interface Props {
  initial?: Subscription;
  currency: string;
  onSave: (s: Subscription) => void;
  onDelete?: (s: Subscription) => void;
  onClose: () => void;
}

export function SubForm({ initial, currency, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [cycle, setCycle] = useState<Cycle>(initial?.cycle ?? 'monthly');
  const [startDate, setStartDate] = useState(initial?.startDate ?? toISO(today()));
  const [category, setCategory] = useState(initial?.category ?? 'Entertainment');
  const [status, setStatus] = useState<Status>(initial?.status ?? 'active');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [touched, setTouched] = useState(false);

  const priceNum = parseFloat(price.replace(',', '.'));
  const valid = name.trim().length > 0 && Number.isFinite(priceNum) && priceNum >= 0 && !!startDate;

  const preview = useMemo(() => {
    if (!valid) return null;
    const s = { price: priceNum, cycle, startDate } as Subscription;
    return { m: monthly(s), y: yearly(s), next: nextRenewal(s) };
  }, [valid, priceNum, cycle, startDate]);

  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (initial || !q) return [];
    return PRESETS.filter((p) => p.name.toLowerCase().includes(q) && p.name.toLowerCase() !== q).slice(0, 4);
  }, [name, initial]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onSave({
      id: initial?.id ?? uid(),
      createdAt: initial?.createdAt ?? Date.now(),
      name: name.trim(),
      price: Math.round(priceNum * 100) / 100,
      cycle,
      startDate,
      category,
      status,
      url: url.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      title={initial ? 'Edit subscription' : 'New subscription'}
      onClose={onClose}
      footer={
        <>
          {initial && onDelete ? (
            <button type="button" className="btn ghost danger" onClick={() => onDelete(initial)}>
              <Icon name="trash" /> Delete
            </button>
          ) : <span />}
          <div className="row gap-8">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" form="sub-form" className="btn primary">{initial ? 'Save changes' : 'Add subscription'}</button>
          </div>
        </>
      }
    >
      <form id="sub-form" onSubmit={submit} className="form" noValidate>
        <div className="field">
          <label htmlFor="f-name">Name</label>
          <input id="f-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Netflix" autoComplete="off" aria-invalid={touched && !name.trim()} />
          {suggestions.length > 0 && (
            <div className="chips">
              {suggestions.map((p) => (
                <button type="button" key={p.name} className="chip" onClick={() => { setName(p.name); setCategory(p.category); setCycle(p.cycle); }}>
                  <span className="dot" style={{ background: categoryColor(p.category) }} />{p.name}
                </button>
              ))}
            </div>
          )}
          {touched && !name.trim() && <p className="err">Give it a name.</p>}
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="f-price">Price</label>
            <div className="input-affix">
              <input id="f-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0.00" aria-invalid={touched && !(priceNum >= 0)} />
              <span className="affix">{currency}</span>
            </div>
            {touched && !(priceNum >= 0) && <p className="err">Enter an amount.</p>}
          </div>
          <div className="field">
            <label htmlFor="f-date">{status === 'trial' ? 'Trial ends / first charge' : 'Next or first billing date'}</label>
            <input id="f-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <span className="label">Billing cycle</span>
          <div className="segmented" role="radiogroup" aria-label="Billing cycle">
            {CYCLES.map((c) => (
              <button type="button" role="radio" aria-checked={cycle === c.id} key={c.id} className={cycle === c.id ? 'on' : ''} onClick={() => setCycle(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {preview && (
          <div className="preview">
            <div><span className="muted">Per month</span><strong className="num">{money(preview.m, currency)}</strong></div>
            <div><span className="muted">Per year</span><strong className="num">{money(preview.y, currency)}</strong></div>
            <div><span className="muted">Next charge</span><strong>{shortDate(preview.next)} <span className="muted small">· {relativeDay(preview.next)}</span></strong></div>
          </div>
        )}

        <div className="grid-2">
          <div className="field">
            <label htmlFor="f-cat">Category</label>
            <div className="select-wrap">
              <span className="dot" style={{ background: categoryColor(category) }} />
              <select id="f-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <span className="label">Status</span>
            <div className="segmented" role="radiogroup" aria-label="Status">
              {(['active', 'trial', 'paused'] as Status[]).map((s) => (
                <button type="button" role="radio" aria-checked={status === s} key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>
                  {s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="f-url">Website <span className="muted">— optional</span></label>
          <input id="f-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="netflix.com/account" autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="f-notes">Notes <span className="muted">— optional</span></label>
          <textarea id="f-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Shared with family, paid with Visa…" />
        </div>
      </form>
    </Modal>
  );
}
