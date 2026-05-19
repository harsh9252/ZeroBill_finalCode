import { useEffect, useState } from 'react';

export function useCountUp(end, duration = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = performance.now();
    const from = 0;
    const to = end;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad-ish
      setValue(Math.floor(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [end, duration]);
  return value;
}

