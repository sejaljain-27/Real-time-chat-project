import { useState } from 'react';
import { authApi, setToken } from '../api';

export default function Login({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : { username: form.username, email: form.email, password: form.password };

      const res = mode === 'login' ? await authApi.login(payload) : await authApi.register(payload);
      setToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <form onSubmit={handleSubmit} className="bg-panel p-8 rounded-xl w-full max-w-sm shadow-xl border border-white/5">
        <h1 className="text-xl font-semibold mb-1">Realtime Hub</h1>
        <p className="text-slate-400 text-sm mb-6">
          {mode === 'login' ? 'Sign in to continue' : 'Create an account'}
        </p>

        {mode === 'register' && (
          <label className="block mb-3">
            <span className="text-sm text-slate-300">Username</span>
            <input
              className="mt-1 w-full rounded-md bg-surface border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              value={form.username}
              onChange={update('username')}
              required
              minLength={3}
            />
          </label>
        )}

        <label className="block mb-3">
          <span className="text-sm text-slate-300">Email</span>
          <input
            type="email"
            className="mt-1 w-full rounded-md bg-surface border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            value={form.email}
            onChange={update('email')}
            required
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm text-slate-300">Password</span>
          <input
            type="password"
            className="mt-1 w-full rounded-md bg-surface border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            value={form.password}
            onChange={update('password')}
            required
            minLength={6}
          />
        </label>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-surface font-medium rounded-md py-2 text-sm hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="w-full mt-3 text-xs text-slate-400 hover:text-slate-200"
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
