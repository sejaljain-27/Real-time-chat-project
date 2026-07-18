import { useEffect, useRef, useState } from 'react';
import { ANALYTICS_WS_URL } from '../api';

const MAX_POINTS = 150;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 15000;

/**
 * Subscribes to the FastAPI ticker WebSocket for a single symbol using
 * the native browser WebSocket API (no client library needed — this is
 * a plain JSON push feed). Auto-reconnects with exponential backoff so
 * a dropped connection doesn't require a page refresh.
 */
export function useAnalyticsSocket(symbol) {
  const [status, setStatus] = useState('connecting'); // connecting | open | reconnecting | closed
  const [ticks, setTicks] = useState([]);
  const [latestPrice, setLatestPrice] = useState(null);
  const wsRef = useRef(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const shouldReconnectRef = useRef(true);

  useEffect(() => {
    shouldReconnectRef.current = true;
    setTicks([]);
    setLatestPrice(null);

    function connect() {
      setStatus((prev) => (prev === 'connecting' ? 'connecting' : 'reconnecting'));
      const ws = new WebSocket(`${ANALYTICS_WS_URL}/ws/${symbol}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('open');
        backoffRef.current = INITIAL_BACKOFF_MS;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'tick') {
            setLatestPrice(data.price);
            setTicks((prev) => {
              const next = [...prev, { time: data.timestamp, price: data.price }];
              return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
            });
          }
        } catch {
          // ignore malformed frame
        }
      };

      ws.onclose = () => {
        if (!shouldReconnectRef.current) {
          setStatus('closed');
          return;
        }
        setStatus('reconnecting');
        const delay = backoffRef.current;
        backoffRef.current = Math.min(delay * 2, MAX_BACKOFF_MS);
        setTimeout(() => {
          if (shouldReconnectRef.current) connect();
        }, delay);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      shouldReconnectRef.current = false;
      wsRef.current?.close();
    };
  }, [symbol]);

  return { status, ticks, latestPrice };
}
