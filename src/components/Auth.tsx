import { useState } from 'react';
import { supabase } from '../supabase';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { Modal } from './Modal';

type Mode = 'signin' | 'signup' | 'reset';

function friendly(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Wrong email or password.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists. Sign in instead.';
  if (m.includes('email not confirmed')) return 'Confirm your email first. Check your inbox for the link.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('password')) return msg;
  if (m.includes('fetch') || m.includes('network')) return 'Can’t reach the server. Check your connection.';
  return msg;
}

export function AuthForm({ initialMode = 'signin', onDone }: { initialMode?: Mode; onDone?: () => void }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchMode = (m: Mode) => { setMode(m); setError(null); setInfo(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (mode !== 'reset' && password.length < (mode === 'signup' ? 8 : 1)) {
      return setError(mode === 'signup' ? 'Use at least 8 characters for your password.' : 'Enter your password.');
    }
    setBusy(true);
    try {
      const redirect = window.location.origin;
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        onDone?.();
      } else if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirect } });
        if (err) throw err;
        if (data.user && data.user.identities?.length === 0) throw new Error('already registered');
        if (data.session) onDone?.();
        else setInfo(`We sent a confirmation link to ${email.trim()}. Open it, then sign in.`);
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect });
        if (err) throw err;
        setInfo('If an account exists for this email, a reset link is on its way.');
      }
    } catch (err) {
      setError(friendly((err as Error).message || 'Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      {mode !== 'reset' ? (
        <div className="segmented auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'on' : ''} onClick={() => switchMode('signin')}>Log in</button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => switchMode('signup')}>Create account</button>
        </div>
      ) : (
        <div>
          <h2 className="auth-title">Reset your password</h2>
          <p className="muted small">We’ll email you a link to choose a new one.</p>
        </div>
      )}

      <div className="field">
        <label htmlFor="a-email">Email</label>
        <input id="a-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>

      {mode !== 'reset' && (
        <div className="field">
          <div className="label-row">
            <label htmlFor="a-pass">Password</label>
            {mode === 'signin' && <button type="button" className="link small" onClick={() => switchMode('reset')}>Forgot password?</button>}
          </div>
          <div className="input-affix">
            <input id="a-pass" type={show ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'At least 8 characters' : ''} className="plain" />
            <button type="button" className="affix-btn" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="form-msg err-box" role="alert">{error}</p>}
      {info && <p className="form-msg info-box" role="status">{info}</p>}

      <button type="submit" className="btn primary lg block" disabled={busy}>
        {busy ? <span className="spinner" aria-hidden="true" /> : null}
        {mode === 'signin' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
      </button>
      {mode === 'reset' && (
        <button type="button" className="btn ghost block" onClick={() => switchMode('signin')}>Back to log in</button>
      )}
    </form>
  );
}

export function AuthScreen({ onGuest, localCount }: { onGuest: () => void; localCount: number }) {
  return (
    <main className="auth-screen">
      <section className="auth-pitch">
        <div className="logo-stack" aria-hidden="true">
          {[['Netflix', 'Entertainment'], ['Spotify', 'Music'], ['iCloud+', 'Cloud & storage'], ['Claude Pro', 'AI tools'], ['Figma', 'Design & creative']].map(([n, c]) => (
            <Logo key={n} name={n} category={c} size={44} />
          ))}
        </div>
        <h1>Know exactly what you pay for.</h1>
        <p className="muted">Every subscription in one place: the real monthly and yearly cost, what renews next, and where the money goes.</p>
        <ul className="auth-points">
          <li><Icon name="calendar" /> Renewal calendar and 30-day timeline</li>
          <li><Icon name="pause" /> Track trials and paused subscriptions</li>
          <li><Icon name="copy" /> Synced across your iPhone and computer</li>
        </ul>
      </section>
      <section className="auth-card card">
        <AuthForm />
        <div className="auth-divider"><span>or</span></div>
        <button className="btn ghost block" onClick={onGuest}>Continue without an account</button>
        <p className="muted small center-text">
          {localCount > 0
            ? `${localCount} subscription${localCount > 1 ? 's' : ''} saved on this device will be added to your account when you sign up.`
            : 'Without an account, your data stays in this browser only.'}
        </p>
      </section>
    </main>
  );
}

export function AuthModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Sync with an account" onClose={onClose}>
      <p className="muted small" style={{ marginBottom: 16 }}>Your subscriptions on this device will be added to your account.</p>
      <AuthForm onDone={onClose} />
    </Modal>
  );
}

export function NewPasswordModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (password.length < 8) return setError('Use at least 8 characters.');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) setError(friendly(err.message));
    else setDone(true);
  };

  return (
    <Modal title="Choose a new password" onClose={onClose}>
      {done ? (
        <div className="form">
          <p>Your password has been updated.</p>
          <button className="btn primary block" onClick={onClose}>Continue</button>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="np">New password</label>
            <input id="np" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
          {error && <p className="form-msg err-box">{error}</p>}
          <button className="btn primary block" disabled={busy}>Save password</button>
        </form>
      )}
    </Modal>
  );
}
