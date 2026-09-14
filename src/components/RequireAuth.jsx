import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

function LoginForm() {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(password);
    } catch (err) {
      setError(err.message || '登入失敗');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <h1 className="font-display text-xl font-semibold mb-1">病人追蹤 — 登入</h1>
      <p className="text-sm text-ink/60 mb-4">請輸入科內共用密碼。此密碼僅作為存取門檻，非個人帳號系統。</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密碼"
          autoFocus
          className="w-full border border-rule bg-white/70 px-3 py-2 outline-none focus:border-alert"
        />
        {error && <div className="text-sm text-alert">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full border border-ink bg-ink text-paper px-3 py-2 font-medium disabled:opacity-50"
        >
          {loading ? '登入中…' : '登入'}
        </button>
      </form>
    </div>
  );
}

export default function RequireAuth() {
  const { isAuthed } = useAuth();
  if (!isAuthed) return <LoginForm />;
  return <Outlet />;
}
