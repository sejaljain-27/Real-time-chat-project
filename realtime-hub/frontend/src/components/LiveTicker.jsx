import { useEffect, useState } from 'react';
import { useAnalyticsSocket } from '../hooks/useAnalyticsSocket';
import { analyticsApi } from '../api';
import PriceChart from './PriceChart';

const SYMBOLS = ['btcusdt', 'ethusdt', 'solusdt'];

const STATUS_LABEL = {
  connecting: 'Connecting…',
  open: 'Live',
  reconnecting: 'Reconnecting…',
  closed: 'Disconnected',
};

const STATUS_COLOR = {
  connecting: 'bg-amber-400',
  open: 'bg-emerald-400',
  reconnecting: 'bg-amber-400',
  closed: 'bg-red-400',
};

export default function LiveTicker() {
  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const { status, ticks, latestPrice } = useAnalyticsSocket(symbol);
  const [seedTicks, setSeedTicks] = useState([]);
  const [stats, setStats] = useState(null);

  // Backfill so the chart isn't empty right after switching symbols /
  // on first load, before live ticks start arriving.
  useEffect(() => {
    analyticsApi
      .history(symbol, 150)
      .then((res) => setSeedTicks(res.ticks.map((t) => ({ time: t.timestamp, price: t.price }))))
      .catch(() => setSeedTicks([]));

    analyticsApi
      .stats(symbol)
      .then(setStats)
      .catch(() => setStats(null));
  }, [symbol]);

  const chartData = ticks.length > 0 ? [...seedTicks, ...ticks].slice(-150) : seedTicks;
  const displayPrice = latestPrice ?? stats?.last;
  const changePct = stats?.changePct;

  return (
    <div className="h-full bg-panel rounded-lg border border-white/5 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium uppercase ${
                symbol === s ? 'bg-accent text-surface' : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {s.replace('usdt', '/USDT')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className={`w-2 h-2 rounded-full ${STATUS_COLOR[status]}`} />
          {STATUS_LABEL[status]}
        </div>
      </div>

      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-3xl font-semibold tabular-nums">
          {displayPrice ? `$${Number(displayPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
        </span>
        {typeof changePct === 'number' && (
          <span className={`text-sm font-medium ${changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {changePct >= 0 ? '▲' : '▼'} {Math.abs(changePct)}%
          </span>
        )}
      </div>

      <PriceChart data={chartData} />

      {stats && (
        <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-slate-400">
          <div className="bg-surface rounded-md p-2">
            <p className="uppercase tracking-wide opacity-60">High</p>
            <p className="text-slate-200">${stats.high?.toLocaleString()}</p>
          </div>
          <div className="bg-surface rounded-md p-2">
            <p className="uppercase tracking-wide opacity-60">Low</p>
            <p className="text-slate-200">${stats.low?.toLocaleString()}</p>
          </div>
          <div className="bg-surface rounded-md p-2">
            <p className="uppercase tracking-wide opacity-60">Ticks seen</p>
            <p className="text-slate-200">{stats.count}</p>
          </div>
        </div>
      )}
    </div>
  );
}
