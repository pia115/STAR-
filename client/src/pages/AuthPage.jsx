import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { BRAND } from '../brand.js';
import Marquee from '../components/Marquee.jsx';

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { login, signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isSignup) await signup(form.name, form.email, form.password);
      else await login(form.email, form.password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <main className="auth">
      <span className="deco deco--star" style={{ top: '12%', left: '10%' }}>✦</span>
      <span className="deco deco--flower" style={{ top: '70%', left: '7%' }}>✿</span>
      <span className="deco deco--star" style={{ top: '20%', right: '9%' }}>✧</span>
      <span className="deco deco--flower" style={{ bottom: '10%', right: '12%' }}>❀</span>

      <div className="booth">
        <Marquee />
        <div className="booth__curtain" aria-hidden="true" />

        <div className="ticket">
          <p className="ticket__eyebrow">{isSignup ? '~ admit one ~' : '~ welcome back ~'}</p>
          <h2 className="ticket__title">{isSignup ? 'join the club' : 'step inside'}</h2>
          <p className="ticket__sub handwritten">{BRAND.tagline}</p>

          <form onSubmit={onSubmit} className="form" noValidate>
            {isSignup && (
              <label className="field">
                <span>your name</span>
                <input value={form.name} onChange={update('name')} autoComplete="name" placeholder="mia" required />
              </label>
            )}
            <label className="field">
              <span>email</span>
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="field">
              <span>password</span>
              <input
                type="password"
                value={form.password}
                onChange={update('password')}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder={isSignup ? 'at least 8 characters' : '••••••••'}
                required
              />
            </label>

            {error && <p className="form__error" role="alert">{error}</p>}

            <button className="btn btn--primary btn--big" disabled={busy}>
              {busy ? 'one moment…' : isSignup ? 'create my account' : 'log in'}
            </button>
          </form>

          <p className="ticket__switch">
            {isSignup ? (
              <>already a member? <Link to="/login">log in</Link></>
            ) : (
              <>new here? <Link to="/signup">sign up</Link></>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
