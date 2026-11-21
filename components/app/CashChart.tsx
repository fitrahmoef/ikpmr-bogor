import { rupiahShort } from '@/lib/format';

export type MonthFlow = { label: string; in: number; out: number };

// Mirrored bars: income above the axis, spending below. The latest month carries the accent,
// earlier months sit in neutral steps of the ramp.
export function CashChart({ data, height = 300 }: { data: MonthFlow[]; height?: number }) {
  const W = 720, H = height, L = 64, R = 16, T = 16, B = 32;
  const max = Math.max(1, ...data.flatMap((d) => [d.in, d.out]));
  const mid = T + (H - T - B) / 2;
  const half = (H - T - B) / 2 - 8;
  const step = (W - L - R) / data.length;
  const bw = Math.min(36, step * 0.42);
  const y = (v: number) => (v / max) * half;
  const ticks = [1, 0.5];

  return (
    <svg className="cash-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Pemasukan dan pengeluaran kas per bulan">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={mid - y(max * t)} y2={mid - y(max * t)} stroke="var(--line)" strokeDasharray="2 4" />
          <line x1={L} x2={W - R} y1={mid + y(max * t)} y2={mid + y(max * t)} stroke="var(--line)" strokeDasharray="2 4" />
          <text x={L - 8} y={mid - y(max * t) + 4} textAnchor="end">{rupiahShort(max * t)}</text>
          <text x={L - 8} y={mid + y(max * t) + 4} textAnchor="end">{rupiahShort(max * t)}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={mid} y2={mid} stroke="var(--line-strong)" />
      {data.map((d, i) => {
        const cx = L + step * i + step / 2;
        const last = i === data.length - 1;
        return (
          <g key={d.label}>
            <title>{`${d.label}: masuk ${rupiahShort(d.in)}, keluar ${rupiahShort(d.out)}`}</title>
            <rect x={cx - bw / 2} y={mid - y(d.in)} width={bw} height={y(d.in)} rx={3}
              fill={last ? 'var(--accent)' : 'var(--text-3)'} opacity={last ? 1 : 0.55} />
            <rect x={cx - bw / 2} y={mid + 1} width={bw} height={y(d.out)} rx={3}
              fill={last ? 'var(--accent)' : 'var(--text-3)'} opacity={last ? 0.45 : 0.25} />
            <text x={cx} y={H - 8} textAnchor="middle" style={last ? { fill: 'var(--text)' } : undefined}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function sixMonths(txs: { type: 'IN' | 'OUT'; amount: number; date: Date }[], now = new Date()): MonthFlow[] {
  const out: MonthFlow[] = [];
  for (let k = 5; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const rows = txs.filter((t) => `${t.date.getFullYear()}-${t.date.getMonth()}` === key);
    out.push({
      label: d.toLocaleDateString('id-ID', { month: 'short' }),
      in: rows.filter((t) => t.type === 'IN').reduce((s, t) => s + t.amount, 0),
      out: rows.filter((t) => t.type === 'OUT').reduce((s, t) => s + t.amount, 0),
    });
  }
  return out;
}
