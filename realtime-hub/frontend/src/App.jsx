import { useEffect, useState } from 'react';
import { authApi, clearToken, getToken } from './api';
import Login from './components/Login.jsx';
import ChatRoom from './components/ChatRoom.jsx';
import LiveTicker from './components/LiveTicker.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [tab, setTab] = useState('chat'); // 'chat' | 'analytics'

  useEffect(() => {
    if (!getToken()) {
      setLoadingSession(false);
      return;
    }
    authApi
      .me()
      .then((res) => setUser(res.user))
      .catch(() => clearToken())
      .finally(() => setLoadingSession(false));
  }, []);

  function handleLogout() {
    clearToken();
    setUser(null);
  }

  if (loadingSession) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;
  }

  if (!user) {
    return <Login onAuthenticated={setUser} />;
  }

  return (
    <div className="h-screen flex flex-col p-4 gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Realtime Hub</h1>
          <nav className="flex gap-1 bg-panel rounded-lg p-1 border border-white/5">
            <button
              onClick={() => setTab('chat')}
              className={`px-3 py-1 rounded-md text-sm ${tab === 'chat' ? 'bg-accent text-surface' : 'text-slate-300 hover:bg-white/5'}`}
            >
              Chat
            </button>
            <button
              onClick={() => setTab('analytics')}
              className={`px-3 py-1 rounded-md text-sm ${tab === 'analytics' ? 'bg-accent text-surface' : 'text-slate-300 hover:bg-white/5'}`}
            >
              Live Analytics
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-slate-300">
            <span className="w-2 h-2 rounded-full" style={{ background: user.avatarColor }} />
            {user.username}
          </span>
          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-slate-200">
            Log out
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        {tab === 'chat' ? <ChatRoom currentUser={user} /> : <LiveTicker />}
      </main>
    </div>
  );
}
