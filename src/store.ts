import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { loadSettings, loadSubs, saveSettings, saveSubs, type Settings, type Subscription } from './lib';

/* ---------- auth ---------- */

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { user: session?.user ?? null, ready, recovery, endRecovery: () => setRecovery(false) };
}

/* ---------- rows ---------- */

interface Row {
  user_id: string;
  id: string;
  name: string;
  price: number;
  cycle: Subscription['cycle'];
  start_date: string;
  category: string;
  status: Subscription['status'];
  url: string | null;
  notes: string | null;
  created_at: string;
}

const toRow = (s: Subscription, userId: string): Row => ({
  user_id: userId,
  id: s.id,
  name: s.name,
  price: s.price,
  cycle: s.cycle,
  start_date: s.startDate,
  category: s.category,
  status: s.status,
  url: s.url ?? null,
  notes: s.notes ?? null,
  created_at: new Date(s.createdAt || Date.now()).toISOString(),
});

const fromRow = (r: Row): Subscription => ({
  id: r.id,
  name: r.name,
  price: Number(r.price),
  cycle: r.cycle,
  startDate: r.start_date,
  category: r.category,
  status: r.status,
  url: r.url ?? undefined,
  notes: r.notes ?? undefined,
  createdAt: Date.parse(r.created_at) || Date.now(),
});

const sig = (s: Subscription) => JSON.stringify([s.name, s.price, s.cycle, s.startDate, s.category, s.status, s.url ?? '', s.notes ?? '']);
const settingsSig = (s: Settings) => JSON.stringify([s.currency, s.budget, s.view]);

/* ---------- data ---------- */

export type SyncState = 'local' | 'loading' | 'synced' | 'saving' | 'error';

/**
 * Subscriptions + settings. Guests keep everything in localStorage. Signed-in users load from
 * Supabase; every change is diffed against the last synced state and written through.
 */
export function useData(user: User | null) {
  const scope = user?.id ?? 'guest';
  const [data, setData] = useState(() => ({ scope, subs: loadSubs(scope) }));
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [loaded, setLoaded] = useState(!user);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const synced = useRef<Map<string, string> | null>(null);
  const settingsSynced = useRef<string | null>(null);
  const migrating = useRef(false);

  const subs = data.scope === scope ? data.subs : [];
  const setSubs = useCallback(
    (next: Subscription[] | ((prev: Subscription[]) => Subscription[])) =>
      setData((d) => ({ scope: d.scope, subs: typeof next === 'function' ? next(d.subs) : next })),
    [],
  );

  /* load whenever the account changes */
  useEffect(() => {
    let cancelled = false;
    synced.current = null;
    settingsSynced.current = null;
    migrating.current = false;
    setError(null);
    setData({ scope, subs: loadSubs(scope) });
    if (!user || !supabase) { setLoaded(true); return; }
    setLoaded(false);
    (async () => {
      const [subsRes, setRes] = await Promise.all([
        supabase.from('subscriptions').select('*').order('created_at'),
        supabase.from('user_settings').select('*').maybeSingle(),
      ]);
      if (cancelled) return;
      if (subsRes.error || setRes.error) {
        setError('Couldn’t load your data. Check your connection and reload.');
        setLoaded(true);
        return;
      }
      let list = (subsRes.data as Row[]).map(fromRow);
      synced.current = new Map(list.map((s) => [s.id, sig(s)]));
      if (list.length === 0) {
        // first sign-in on this device: bring the guest list into the account
        const guest = loadSubs('guest');
        if (guest.length) { list = guest; migrating.current = true; }
      }
      if (setRes.data) {
        const st = setRes.data as { currency: string; budget: number | null; view: Settings['view'] };
        const remote: Settings = { currency: st.currency, budget: st.budget == null ? null : Number(st.budget), view: st.view };
        settingsSynced.current = settingsSig(remote);
        setSettings(remote);
      } else {
        settingsSynced.current = '';
      }
      setData({ scope, subs: list });
      setLoaded(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  /* write-through sync */
  useEffect(() => {
    if (data.scope !== scope) return;
    saveSubs(scope, data.subs);
    const prev = synced.current;
    if (!user || !supabase || !loaded || !prev) return;
    const upserts = data.subs.filter((s) => prev.get(s.id) !== sig(s));
    const ids = new Set(data.subs.map((s) => s.id));
    const deletes = [...prev.keys()].filter((id) => !ids.has(id));
    if (!upserts.length && !deletes.length) return;

    const before = new Map(prev);
    upserts.forEach((s) => prev.set(s.id, sig(s)));
    deletes.forEach((id) => prev.delete(id));
    const wasMigrating = migrating.current;
    migrating.current = false;
    setPending((n) => n + 1);
    (async () => {
      const ops = [];
      if (upserts.length) ops.push(supabase.from('subscriptions').upsert(upserts.map((s) => toRow(s, user.id)), { onConflict: 'user_id,id' }));
      if (deletes.length) ops.push(supabase.from('subscriptions').delete().in('id', deletes));
      const res = await Promise.all(ops);
      const err = res.find((r) => r.error)?.error;
      if (err) {
        // roll the bookkeeping back so the next change (or retry) sends these again
        synced.current = before;
        setError('Changes not saved to your account yet.');
      } else {
        setError(null);
        if (wasMigrating) saveSubs('guest', []);
      }
      setPending((n) => n - 1);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loaded, scope]);

  /* settings */
  useEffect(() => {
    saveSettings(settings);
    if (!user || !supabase || settingsSynced.current == null) return;
    const s = settingsSig(settings);
    if (s === settingsSynced.current) return;
    const t = window.setTimeout(async () => {
      const { error: e } = await supabase!
        .from('user_settings')
        .upsert({ user_id: user.id, currency: settings.currency, budget: settings.budget, view: settings.view, updated_at: new Date().toISOString() });
      if (!e) settingsSynced.current = s;
    }, 600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, user?.id]);

  const retry = useCallback(() => setData((d) => ({ ...d, subs: [...d.subs] })), []);

  const sync: SyncState = !user ? 'local' : !loaded ? 'loading' : error ? 'error' : pending > 0 ? 'saving' : 'synced';
  return { subs, setSubs, settings, setSettings, loaded, sync, error, retry };
}
