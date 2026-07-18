import { useEffect, useRef, useState } from 'react';
import { roomApi } from '../api';
import { useChatSocket } from '../hooks/useChatSocket';

export default function ChatRoom({ currentUser }) {
  const {
    connected,
    messages,
    presenceCount,
    typingUsers,
    activeRoom,
    joinRoom,
    sendMessage,
    setTyping,
    seedHistory,
  } = useChatSocket();

  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    roomApi
      .list()
      .then((res) => setRooms(res.rooms))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleJoin(room) {
    try {
      const joined = await joinRoom(room.name);
      const history = await roomApi.history(joined.id);
      seedHistory(
        history.messages.map((m) => ({
          id: m._id,
          sender: m.senderUsername,
          text: m.text,
          createdAt: m.createdAt,
        }))
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateRoom(e) {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      const res = await roomApi.create({ name: newRoomName.trim() });
      setRooms((prev) => [...prev, res.room]);
      setNewRoomName('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim() || !activeRoom) return;
    try {
      await sendMessage(draft);
      setDraft('');
      setTyping(false);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleDraftChange(e) {
    setDraft(e.target.value);
    setTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 1500);
  }

  const othersTyping = [...typingUsers].filter((u) => u !== currentUser.username);

  return (
    <div className="flex h-full gap-4">
      {/* Room list */}
      <aside className="w-56 shrink-0 bg-panel rounded-lg border border-white/5 p-3 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-300">Rooms</h2>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} title={connected ? 'connected' : 'disconnected'} />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {rooms.map((room) => (
            <button
              key={room._id}
              onClick={() => handleJoin(room)}
              className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${
                activeRoom?.id === room._id ? 'bg-accent text-surface font-medium' : 'hover:bg-white/5 text-slate-300'
              }`}
            >
              # {room.name}
            </button>
          ))}
        </div>
        <form onSubmit={handleCreateRoom} className="mt-2 flex gap-1">
          <input
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="new room"
            className="flex-1 min-w-0 bg-surface border border-white/10 rounded-md px-2 py-1 text-xs"
          />
          <button className="bg-white/10 rounded-md px-2 text-xs hover:bg-white/20">+</button>
        </form>
      </aside>

      {/* Message pane */}
      <section className="flex-1 flex flex-col bg-panel rounded-lg border border-white/5 overflow-hidden">
        <header className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200">
            {activeRoom ? `# ${activeRoom.name}` : 'Select a room to start chatting'}
          </h3>
          {activeRoom && <span className="text-xs text-slate-400">{presenceCount} online</span>}
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.map((m, i) =>
            m.system ? (
              <p key={i} className="text-center text-xs text-slate-500 italic">
                {m.text}
              </p>
            ) : (
              <div key={m.id || i} className={`flex ${m.sender === currentUser.username ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                    m.sender === currentUser.username ? 'bg-accent text-surface' : 'bg-white/5 text-slate-100'
                  }`}
                >
                  {m.sender !== currentUser.username && (
                    <p className="text-[10px] uppercase tracking-wide opacity-60 mb-0.5">{m.sender}</p>
                  )}
                  <p>{m.text}</p>
                </div>
              </div>
            )
          )}
          <div ref={bottomRef} />
        </div>

        {othersTyping.length > 0 && (
          <p className="px-4 pb-1 text-xs text-slate-500 italic">{othersTyping.join(', ')} typing…</p>
        )}

        <form onSubmit={handleSend} className="p-3 border-t border-white/5 flex gap-2">
          <input
            value={draft}
            onChange={handleDraftChange}
            disabled={!activeRoom}
            placeholder={activeRoom ? 'Type a message…' : 'Join a room first'}
            className="flex-1 bg-surface border border-white/10 rounded-md px-3 py-2 text-sm disabled:opacity-50"
          />
          <button
            disabled={!activeRoom}
            className="bg-accent text-surface px-4 rounded-md text-sm font-medium disabled:opacity-50"
          >
            Send
          </button>
        </form>
        {error && <p className="px-4 pb-2 text-xs text-red-400">{error}</p>}
      </section>
    </div>
  );
}
