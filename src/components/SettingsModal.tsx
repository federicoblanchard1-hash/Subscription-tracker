import { useRef, useState } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { CURRENCIES, download, isSub, toCSV, toICS, type Settings, type Subscription } from '../lib';

interface Props {
  settings: Settings;
  subs: Subscription[];
  onChange: (s: Settings) => void;
  onImport: (subs: Subscription[]) => void;
  onClear: () => void;
  onClose: () => void;
}

export function SettingsModal({ settings, subs, onChange, onImport, onClear, onClose }: Props) {
  const [budget, setBudget] = useState(settings.budget != null ? String(settings.budget) : '');
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const stamp = new Date().toISOString().slice(0, 10);

  const commitBudget = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    onChange({ ...settings, budget: Number.isFinite(n) && n > 0 ? n : null });
  };

  const handleFile = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      const list = (Array.isArray(data) ? data : data?.subscriptions) as unknown[];
      const valid = (list ?? []).filter(isSub);
      if (!valid.length) throw new Error();
      onImport(valid);
      if (data?.settings?.currency) onChange({ ...settings, currency: data.settings.currency });
      setMsg(`Imported ${valid.length} subscription${valid.length > 1 ? 's' : ''}.`);
    } catch {
      setMsg('That file doesn’t look like a Recurring export.');
    }
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="form">
        <div className="grid-2">
          <div className="field">
            <label htmlFor="s-cur">Currency</label>
            <select id="s-cur" value={settings.currency} onChange={(e) => onChange({ ...settings, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="s-budget">Monthly budget <span className="muted">— optional</span></label>
            <div className="input-affix">
              <input id="s-budget" inputMode="decimal" value={budget} placeholder="No limit"
                onChange={(e) => setBudget(e.target.value.replace(/[^0-9.,]/g, ''))}
                onBlur={(e) => commitBudget(e.target.value)} />
              <span className="affix">{settings.currency}</span>
            </div>
          </div>
        </div>

        <div className="settings-group">
          <span className="label">Your data</span>
          <p className="muted small">Everything is stored in this browser only. Export a backup to move it to another device.</p>
          <div className="btn-list">
            <button className="btn" onClick={() => download(`recurring-${stamp}.json`, JSON.stringify({ version: 1, settings, subscriptions: subs }, null, 2), 'application/json')} disabled={!subs.length}>
              <Icon name="download" /> Backup (.json)
            </button>
            <button className="btn" onClick={() => file.current?.click()}>
              <Icon name="upload" /> Restore backup
            </button>
            <button className="btn" onClick={() => download(`subscriptions-${stamp}.csv`, toCSV(subs, settings.currency), 'text/csv')} disabled={!subs.length}>
              <Icon name="download" /> Spreadsheet (.csv)
            </button>
            <button className="btn" onClick={() => download('subscriptions.ics', toICS(subs, settings.currency), 'text/calendar')} disabled={!subs.length}>
              <Icon name="calendar" /> Add renewals to calendar
            </button>
          </div>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
          {msg && <p className="small note">{msg}</p>}
        </div>

        <div className="settings-group">
          <span className="label">Danger zone</span>
          {confirmClear ? (
            <div className="row gap-8 wrap">
              <span className="small">Delete all {subs.length} subscriptions?</span>
              <button className="btn danger-solid" onClick={() => { onClear(); setConfirmClear(false); setMsg('All data cleared.'); }}>Yes, delete all</button>
              <button className="btn ghost" onClick={() => setConfirmClear(false)}>Keep</button>
            </div>
          ) : (
            <button className="btn ghost danger" onClick={() => setConfirmClear(true)} disabled={!subs.length}>
              <Icon name="trash" /> Delete all data
            </button>
          )}
        </div>
        <p className="muted small kbd-help">
          Shortcuts: <kbd>N</kbd> new · <kbd>/</kbd> search · <kbd>M</kbd> toggle month/year · <kbd>Esc</kbd> close
        </p>
      </div>
    </Modal>
  );
}
