import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function PriceChart({ data }) {
  const formatted = data.map((d) => ({
    time: new Date(d.time).toLocaleTimeString(),
    price: d.price,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={formatted} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#232733" strokeDasharray="3 3" />
        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#8b95a7' }} minTickGap={30} />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fontSize: 10, fill: '#8b95a7' }}
          width={70}
          tickFormatter={(v) => `$${v.toLocaleString()}`}
        />
        <Tooltip
          contentStyle={{ background: '#171a21', border: '1px solid #2a2f3a', fontSize: 12 }}
          formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Price']}
        />
        <Line type="monotone" dataKey="price" stroke="#22d3ee" dot={false} strokeWidth={2} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
