export function Sparkline({ color = '#FFB300', points = [10, 20, 15, 30, 25, 35, 30] }) {
  const w = 120, h = 30;
  const max = Math.max(...points);
  const step = w / (points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - (p / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="g3" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill="url(#g3)" opacity="0.9" />
    </svg>
  );
}

