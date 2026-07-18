import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { CHAT_API_URL, getToken } from '../api';

/**
 * Owns the single Socket.io connection to chat-service and exposes a
 * small imperative API + reactive state for the current room.
 */
export function useChatSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [presenceCount, setPresenceCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [activeRoom, setActiveRoom] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(CHAT_API_URL, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('message:new', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('system:message', (msg) => {
      setMessages((prev) => [...prev, { system: true, text: msg.text, createdAt: msg.at }]);
    });

    socket.on('presence:update', ({ count }) => setPresenceCount(count));

    socket.on('typing:update', ({ username, typing }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (typing) next.add(username);
        else next.delete(username);
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((roomName) => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit('room:join', { roomName }, (ack) => {
        if (ack?.ok) {
          setMessages([]);
          setActiveRoom(ack.room);
          resolve(ack.room);
        } else {
          reject(new Error(ack?.error || 'Failed to join room'));
        }
      });
    });
  }, []);

  const sendMessage = useCallback((text) => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit('message:send', { text }, (ack) => {
        if (ack?.ok) resolve();
        else reject(new Error(ack?.error || 'Failed to send'));
      });
    });
  }, []);

  const setTyping = useCallback((typing) => {
    socketRef.current?.emit(typing ? 'typing:start' : 'typing:stop');
  }, []);

  const seedHistory = useCallback((history) => {
    setMessages(history);
  }, []);

  return {
    connected,
    messages,
    presenceCount,
    typingUsers,
    activeRoom,
    joinRoom,
    sendMessage,
    setTyping,
    seedHistory,
  };
}
