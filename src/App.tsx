import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './components/Icon';
import { SubForm } from './components/SubForm';
import { SettingsModal } from './components/SettingsModal';
import { Calendar } from './components/Calendar';
import { Logo } from './components/Logo';
import { SwipeRow } from './components/SwipeRow';
import { AuthModal, AuthScreen, NewPasswordModal } from './components/Auth';
import { supabase } from './supabase';
import { useAuth, useData, type SyncState } from './store';
import { domainFor } from './logos';
import {
  CATEGORIES, CYCLES, categoryColor, chargesSoFar, daysBetween, loadSubs, money, monthly, nextRenewal,
  relativeDay, sampleData, shortDate, today, yearly, type Settings, type Status, type Subscription,
} from './lib';

type Sort = 'next' | 'price' | 'name';
type Filter = 'all' | Status;

const GUEST_KEY = 'recurring:guest';
const readGuest = () => { try { return localStorage.getItem(GUEST_KEY) === '1'; } catch { return false; } };

export default function App() {
  const auth = useAuth();
  const { user } = auth;
  const { subs, setSubs, settings, setSettings, loaded, sync, retry } = useData(user);
  const [guest, setGuestState] = useState(readGuest);
  const setGuest = (v: boolean) => { setGuestState(v); try { v ? localStorage.setItem(GUEST_KEY, '1') : localStorage.removeItem(GUEST_KEY); } catch { /* ignore */ } };
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [swiped, setSwiped] = useState<string | null>(null);
  const [editing, setEditing] = useState<Subscription | 'new' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('next');
  const [filter, setFilter] = useState<Filter>('all');
  const [category, setCategory] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number>();
  const theme = useTheme();

  useEffect(() => { if (user) { setGuest(false); setShowAuth(false); } }, [user]);
  const signOut = async () => {
    setMenuOpen(false);
    setShowSettings(false);
    await supabase?.auth.signOut();
    notify('Signed out');
  };

  const cur = settings.currency;
  const view = settings.view;
  const per = (s: Subscription) => (view === 'month' ? monthly(s) : yearly(s));
  const unit = view === 'month' ? '/ mo' : '/ yr';

  const notify = useCallback((text: string, undo?: () => void) => {
    window.clearTimeout(toastTimer.current);
    setToast({ text, undo });
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  }, []);

  /* ---------- derived ---------- */
  const t = today();
  const stats = useMemo(() => {
    const active = subs.filter((s) => s.status === 'active');
    const trials = subs.filter((s) => s.status === 'trial');
    const paused = subs.filter((s) => s.status === 'paused');
    const m = active.reduce((a, s) => a + monthly(s), 0);
    const afterTrials = m + trials.reduce((a, s) => a + monthly(s), 0);
    const saved = paused.reduce((a, s) => a + monthly(s), 0);
    const paid = active.reduce((a, s) => a + chargesSoFar(s) * s.price, 0);
    const upcoming = subs
      .filter((s) => s.status !== 'paused')
      .map((s) => ({ s, d: nextRenewal(s) }))
      .sort((a, b) => a.d.getTime() - b.d.getTime());
    const next30 = upcoming.filter((u) => daysBetween(t, u.d) <= 30);
    const byCat = new Map<string, number>();
    for (const s of active) byCat.set(s.category, (byCat.get(s.category) ?? 0) + monthly(s));
    const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
    const priciest = [...active].sort((a, b) => monthly(b) - monthly(a))[0];
    return { active, trials, paused, m, afterTrials, saved, paid, upcoming, next30, cats, priciest };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs, t.getTime()]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rank: Record<Status, number> = { active: 0, trial: 1, paused: 2 };
    return subs
      .filter((s) => filter === 'all' || s.status === filter)
      .filter((s) => !category || s.category === category)
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.notes?.toLowerCase().includes(q))
      .map((s) => ({ s, next: nextRenewal(s) }))
      .sort((a, b) => {
        if (sort === 'name') return a.s.name.localeCompare(b.s.name);
        if (sort === 'price') return monthly(b.s) - monthly(a.s);
        return rank[a.s.status] - rank[b.s.status] || a.next.getTime() - b.next.getTime();
      });
  }, [subs, query, sort, filter, category]);

  /* ---------- actions ---------- */
  const save = (s: Subscription) => {
    const exists = subs.some((x) => x.id === s.id);
    setSubs((prev) => (exists ? prev.map((x) => (x.id === s.id ? s : x)) : [...prev, s]));
    setEditing(null);
    notify(exists ? `Saved ${s.name}` : `Added ${s.name}`);
  };
  const remove = (s: Subscription) => {
    const snapshot = subs;
    setSubs((prev) => prev.filter((x) => x.id !== s.id));
    setEditing(null);
    notify(`Deleted ${s.name}`, () => setSubs(snapshot));
  };
  const togglePause = (s: Subscription) => {
    const next: Status = s.status === 'paused' ? 'active' : 'paused';
    setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: next } : x)));
    notify(next === 'paused' ? `Paused ${s.name} — saving ${money(monthly(s), cur)}/mo` : `Resumed ${s.name}`,
      () => setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: s.status } : x))));
  };
  const setView = (v: Settings['view']) => setSettings((p) => ({ ...p, view: v }));

  /* ---------- shortcuts ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (editing || showSettings || e.metaKey || e.ctrlKey || e.altKey) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        if (e.key === 'Escape') el.blur();
        return;
      }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setEditing('new'); }
      else if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === 'm' || e.key === 'M') setSettings((p) => ({ ...p, view: p.view === 'month' ? 'year' : 'month' }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, showSettings]);

  const total = view === 'month' ? stats.m : stats.m * 12;
  const budgetPct = settings.budget ? Math.min(100, (stats.m / settings.budget) * 100) : 0;
  const overBudget = settings.budget != null && stats.m > settings.budget;
  const next = stats.upcoming[0];

  const needsAuth = !!supabase && auth.ready && !user && !guest;
  if (!auth.ready) return <div className="app boot" aria-busy="true"><span className="spinner lg" /></div>;
  if (needsAuth) {
    return (
      <div className="app">
        <header className="topbar"><Brand /></header>
        <AuthScreen onGuest={() => setGuest(true)} localCount={loadSubs('guest').length} />
        {auth.recovery && <NewPasswordModal onClose={auth.endRecovery} />}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <Brand />
        <div className="row gap-8">
          {user && <SyncBadge state={sync} onRetry={retry} />}
          <button className="icon-btn" onClick={theme.toggle} aria-label={`Switch to ${theme.dark ? 'light' : 'dark'} mode`} title="Toggle theme">
            <Icon name={theme.dark ? 'sun' : 'moon'} />
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings" title="Settings">
            <Icon name="settings" />
          </button>
          {supabase && !user && (
            <button className="btn ghost hide-xs" onClick={() => setShowAuth(true)}>Log in</button>
          )}
          {user && (
            <div className="account">
              <button className="account-btn" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Account">
                {(user.email ?? '?')[0].toUpperCase()}
              </button>
              {menuOpen && (
                <>
                  <div className="menu-scrim" onClick={() => setMenuOpen(false)} />
                  <div className="menu" role="menu">
                    <div className="menu-head">
                      <span className="small muted">Signed in as</span>
                      <strong className="menu-email">{user.email}</strong>
                    </div>
                    <button role="menuitem" onClick={() => { setMenuOpen(false); setShowSettings(true); }}><Icon name="settings" /> Settings & export</button>
                    <button role="menuitem" onClick={signOut}><Icon name="logout" /> Log out</button>
                  </div>
                </>
              )}
            </div>
          )}
          <button className="btn primary hide-sm" onClick={() => setEditing('new')}>
            <Icon name="plus" /> Add subscription <kbd>N</kbd>
          </button>
        </div>
      </header>

      {!loaded ? (
        <div className="boot" aria-busy="true"><span className="spinner lg" /></div>
      ) : 

subs.length === 0 ? (
        <Empty onAdd={() => setEditing('new')} onSample={() => { setSubs(sampleData()); notify('Loaded sample data — edit or delete freely'); }} />
      ) : (
        <main>
          {/* ---------- summary ---------- */}
          <section className="summary">
            <div className="hero">
              <div className="hero-top">
                <span className="eyebrow">You spend</span>
                <div className="segmented sm" role="radiogroup" aria-label="Show totals per">
                  <button role="radio" aria-checked={view === 'month'} className={view === 'month' ? 'on' : ''} onClick={() => setView('month')}>Monthly</button>
                  <button role="radio" aria-checked={view === 'year'} className={view === 'year' ? 'on' : ''} onClick={() => setView('year')}>Yearly</button>
                </div>
              </div>
              <div className="hero-amount">
                <span className="num">{money(total, cur)}</span>
                <span className="hero-unit">{view === 'month' ? 'per month' : 'per year'}</span>
              </div>
              <p className="muted hero-sub">
                {view === 'month' ? <>{money(stats.m * 12, cur)} a year</> : <>{money(stats.m, cur)} a month</>}
                {' · '}{money((stats.m * 12) / 365, cur)} a day
                {stats.trials.length > 0 && <> · <span className="fg">{money(view === 'month' ? stats.afterTrials : stats.afterTrials * 12, cur)}</span> after trials</>}
              </p>
              {settings.budget == null && (
                <button className="budget-cta" onClick={() => setShowSettings(true)}>
                  <span className="dot" style={{ background: 'var(--border-strong)' }} /> Set a monthly budget to track your limit <Icon name="right" size={14} />
                </button>
              )}
              {settings.budget != null && (
                <div className="budget">
                  <div className="budget-bar" aria-hidden="true">
                    <div className={`budget-fill${overBudget ? ' over' : budgetPct > 85 ? ' warn' : ''}`} style={{ width: `${budgetPct}%` }} />
                  </div>
                  <span className="small muted">
                    {overBudget
                      ? <><span className="tone-red">{money(stats.m - settings.budget, cur)} over</span> your {money(settings.budget, cur)} monthly budget</>
                      : <>{money(settings.budget - stats.m, cur)} left of {money(settings.budget, cur)} monthly budget</>}
                  </span>
                </div>
              )}
            </div>

            <div className="stats">
              <Stat label="Active" value={String(stats.active.length)} hint={`${subs.length} total${stats.trials.length ? ` · ${stats.trials.length} trial` : ''}`} />
              <Stat
                label="Next charge"
                value={next ? next.s.name : '—'}
                hint={next ? `${money(next.s.price, cur)} · ${relativeDay(next.d)}` : 'Nothing scheduled'}
                tone={next && daysBetween(t, next.d) <= 2 ? 'amber' : undefined}
              />
              <Stat label="Paid to date" value={money(stats.paid, cur, { compact: stats.paid > 9999 })} hint="Across active subscriptions" />
              {stats.paused.length > 0 ? (
                <Stat label="Saving" value={money(stats.saved, cur) + ' /mo'} hint={`${stats.paused.length} paused · ${money(stats.saved * 12, cur)} a year`} tone="green" />
              ) : (
                <Stat label="Most expensive" value={stats.priciest?.name ?? '—'} hint={stats.priciest ? `${money(per(stats.priciest), cur)} ${unit}` : ''} />
              )}
            </div>
          </section>

          <div className="layout">
            {/* ---------- list ---------- */}
            <section className="card list-card">
              <div className="toolbar">
                <div className="search">
                  <Icon name="search" />
                  <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search subscriptions" />
                  {query ? <button className="icon-btn sm" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="x" size={14} /></button> : <kbd className="hide-sm">/</kbd>}
                </div>
                <div className="row gap-8">
                  <div className="segmented sm" role="radiogroup" aria-label="Filter by status">
                    {(['all', 'active', 'trial', 'paused'] as Filter[]).map((f) => (
                      <button key={f} role="radio" aria-checked={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                        {f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                  <select className="select-sm" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by">
                    <option value="next">Next renewal</option>
                    <option value="price">Highest cost</option>
                    <option value="name">Name</option>
                  </select>
                </div>
              </div>

              {category && (
                <div className="active-filter">
                  <span className="chip on"><span className="dot" style={{ background: categoryColor(category) }} />{category}
                    <button onClick={() => setCategory(null)} aria-label="Clear category filter"><Icon name="x" size={12} /></button>
                  </span>
                </div>
              )}

              {list.length === 0 ? (
                <div className="list-empty">
                  <p>No subscriptions match.</p>
                  <button className="btn ghost" onClick={() => { setQuery(''); setFilter('all'); setCategory(null); }}>Clear filters</button>
                </div>
              ) : (
                <ul className="subs">
                  {list.map(({ s, next }) => {
                    const days = daysBetween(t, next);
                    const soon = s.status !== 'paused' && days <= 3;
                    return (
                      <SwipeRow key={s.id} className={`sub${s.status === 'paused' ? ' paused' : ''}`} open={swiped === s.id} onOpenChange={(o) => setSwiped(o ? s.id : null)} onDelete={() => remove(s)} onPause={() => togglePause(s)} paused={s.status === 'paused'}>
                        <button className="sub-main" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>
                          <Logo name={s.name} url={s.url} category={s.category} />
                          <span className="sub-info">
                            <span className="sub-name">
                              {s.name}
                              {s.status === 'trial' && <span className="badge amber">Trial</span>}
                              {s.status === 'paused' && <span className="badge">Paused</span>}
                              {s.notes && <span className="sub-note" title={s.notes}>{s.notes.replace(/\s+/g, ' ')}</span>}
                            </span>
                            <span className="sub-meta">
                              {s.category} · {money(s.price, cur)} {CYCLES.find((c) => c.id === s.cycle)!.label.toLowerCase()}
                            </span>
                          </span>
                          <span className="sub-when">
                            {s.status === 'paused' ? (
                              <span className="muted">—</span>
                            ) : (
                              <>
                                <span className={soon ? 'tone-amber' : ''}>{s.status === 'trial' ? `Trial ends ${relativeDay(next).toLowerCase()}` : relativeDay(next)}</span>
                                <span className="muted">{shortDate(next)}</span>
                              </>
                            )}
                          </span>
                          <span className="sub-price">
                            <span className="num">{money(per(s), cur)}<span className="muted unit"> {unit}</span></span>
                            <span className={`sub-when-sm ${soon ? 'tone-amber' : 'muted'}`}>
                              {s.status === 'paused' ? 'Paused' : s.status === 'trial' ? `Trial · ${relativeDay(next)}` : relativeDay(next)}
                            </span>
                          </span>
                        </button>
                        <div className="sub-actions">
                          {domainFor(s.name, s.url) && (
                            <a className="icon-btn sm" href={s.url ? (s.url.startsWith('http') ? s.url : `https://${s.url}`) : `https://${domainFor(s.name)}`} target="_blank" rel="noreferrer" aria-label={`Open ${s.name} website`} title="Manage on website">
                              <Icon name="link" size={14} />
                            </a>
                          )}
                          <button className="icon-btn sm" onClick={() => togglePause(s)} aria-label={s.status === 'paused' ? `Resume ${s.name}` : `Pause ${s.name}`} title={s.status === 'paused' ? 'Resume' : 'Pause'}>
                            <Icon name={s.status === 'paused' ? 'play' : 'pause'} size={14} />
                          </button>
                        </div>
                      </SwipeRow>
                    );
                  })}
                </ul>
              )}
              <div className="list-foot muted small">
                <span>{list.length} of {subs.length}<span className="touch-only"> · Swipe left to delete</span></span>
                <span className="num">{money(list.filter((x) => x.s.status === 'active').reduce((a, x) => a + per(x.s), 0), cur)} {unit}</span>
              </div>
            </section>

            {/* ---------- side ---------- */}
            <aside className="side">
              <section className="card">
                <div className="card-head">
                  <h3>Next 30 days</h3>
                  <span className="muted small num">{money(stats.next30.reduce((a, u) => a + u.s.price, 0), cur)}</span>
                </div>
                {stats.next30.length === 0 ? (
                  <p className="muted small">Nothing renews in the next 30 days.</p>
                ) : (
                  <ol className="timeline">
                    {stats.next30.slice(0, 6).map(({ s, d }) => (
                      <li key={s.id}>
                        <button onClick={() => setEditing(s)}>
                          <span className="tl-date">
                            <strong>{d.getDate()}</strong>
                            <span>{d.toLocaleDateString(undefined, { month: 'short' })}</span>
                          </span>
                          <span className="grow">
                            <span className="tl-name">{s.name}</span>
                            <span className={`small ${daysBetween(t, d) <= 3 ? 'tone-amber' : 'muted'}`}>{s.status === 'trial' ? 'Trial ends · ' : ''}{relativeDay(d)}</span>
                          </span>
                          <span className="num">{money(s.price, cur)}</span>
                        </button>
                      </li>
                    ))}
                    {stats.next30.length > 6 && <li className="muted small tl-more">+{stats.next30.length - 6} more</li>}
                  </ol>
                )}
              </section>

              {stats.cats.length > 0 && (
                <section className="card">
                  <div className="card-head">
                    <h3>By category</h3>
                    <span className="muted small">{unit.replace('/ ', 'per ')}</span>
                  </div>
                  <div className="stack-bar" aria-hidden="true">
                    {stats.cats.map(([c, v]) => (
                      <span key={c} style={{ width: `${(v / stats.m) * 100}%`, background: categoryColor(c) }} />
                    ))}
                  </div>
                  <ul className="legend">
                    {stats.cats.map(([c, v]) => (
                      <li key={c}>
                        <button className={category === c ? 'on' : ''} onClick={() => setCategory(category === c ? null : c)} aria-pressed={category === c}>
                          <span className="dot" style={{ background: categoryColor(c) }} />
                          <span className="grow">{c}</span>
                          <span className="muted small">{Math.round((v / stats.m) * 100)}%</span>
                          <span className="num">{money(view === 'month' ? v : v * 12, cur)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <Calendar subs={subs} currency={cur} onOpen={(s) => setEditing(s)} />
            </aside>
          </div>
        </main>
      )}

      <footer className="foot muted small">
        {user ? <>Synced to {user.email}</> : <>Stored privately in your browser{supabase && <> · <button className="link" onClick={() => setShowAuth(true)}>Log in to sync</button></>}</>}
        {' · '}<button className="link" onClick={() => setShowSettings(true)}>Backup & export</button>
      </footer>

      {loaded && subs.length > 0 && (
        <button className="fab" onClick={() => setEditing('new')} aria-label="Add subscription">
          <Icon name="plus" size={24} />
        </button>
      )}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {auth.recovery && <NewPasswordModal onClose={auth.endRecovery} />}

      {editing && (
        <SubForm
          initial={editing === 'new' ? undefined : editing}
          currency={cur}
          onSave={save}
          onDelete={remove}
          onClose={() => setEditing(null)}
        />
      )}
      {showSettings && (
        <SettingsModal
          settings={settings}
          subs={subs}
          onChange={setSettings}
          onImport={(incoming) => setSubs((prev) => {
            const ids = new Set(incoming.map((s) => s.id));
            return [...prev.filter((p) => !ids.has(p.id)), ...incoming.map((s) => ({ ...s, category: CATEGORIES.some((c) => c.id === s.category) ? s.category : 'Other', status: s.status ?? 'active' }))];
          })}
          onClear={() => setSubs([])}
          email={user?.email ?? null}
          onSignOut={user ? signOut : undefined}
          onSignIn={supabase && !user ? () => { setShowSettings(false); setShowAuth(true); } : undefined}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div className="toast-region" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.text}>
            <span>{toast.text}</span>
            {toast.undo && <button onClick={() => { toast.undo!(); setToast(null); }}>Undo</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'amber' | 'green' }) {
  return (
    <div className="stat">
      <span className="eyebrow">{tone && <span className={`pulse ${tone}`} />}{label}</span>
      <strong className="stat-value" title={value}>{value}</strong>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}

function Empty({ onAdd, onSample }: { onAdd: () => void; onSample: () => void }) {
  return (
    <main className="empty">
      <div className="empty-art" aria-hidden="true">
        {['#ef4444', '#3b82f6', '#22c55e'].map((c, i) => (
          <div key={c} className="ghost-row" style={{ animationDelay: `${i * 120}ms` }}>
            <span className="ghost-avatar"><i style={{ background: c }} /></span>
            <span className="ghost-line" style={{ width: `${60 - i * 12}%` }} />
            <span className="ghost-line short" />
          </div>
        ))}
      </div>
      <h1>Know exactly what you pay for.</h1>
      <p className="muted">Add your subscriptions once. See the real monthly and yearly cost, what renews next, and where the money goes.</p>
      <div className="row gap-8 center wrap">
        <button className="btn primary lg" onClick={onAdd}><Icon name="plus" /> Add your first subscription</button>
        <button className="btn ghost lg" onClick={onSample}>Try with sample data</button>
      </div>
    </main>
  );
}

function Brand() {
  return (
    <div className="brand">
      <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="currentColor" /><path d="M10 16a6 6 0 1 0 6-6" fill="none" stroke="var(--bg)" strokeWidth="2.6" strokeLinecap="round" /><circle cx="16" cy="10" r="2.2" fill="#22c55e" /></svg>
      <span>Recurring</span>
    </div>
  );
}

function SyncBadge({ state, onRetry }: { state: SyncState; onRetry: () => void }) {
  if (state === 'error') return <button className="sync err" onClick={onRetry} title="Retry sync"><span className="pulse red" />Not synced · Retry</button>;
  const label = state === 'loading' ? 'Loading' : state === 'saving' ? 'Saving' : 'Synced';
  return <span className={`sync ${state}`} title="Your subscriptions are saved to your account"><span className={`pulse ${state === 'synced' ? 'green' : 'gray'}`} /><span className="hide-xs">{label}</span></span>;
}

function useTheme() {
  const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const read = () => {
    const forced = document.documentElement.dataset.theme;
    return forced ? forced === 'dark' : !!mq?.matches;
  };
  const [dark, setDark] = useState(read);
  useEffect(() => {
    if (!mq) return;
    const on = () => setDark(read());
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('recurring:theme', next); } catch { /* ignore */ }
    setDark(!dark);
  };
  return { dark, toggle };
}
