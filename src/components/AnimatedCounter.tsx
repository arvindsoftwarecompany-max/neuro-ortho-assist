import { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

export default function AnimatedCounter({ value, duration = 1000, suffix = '', prefix = '' }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;
    const steps = 30;
    const stepValue = diff / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      if (step >= steps) {
        setCount(value);
        ref.current = value;
        clearInterval(timer);
      } else {
        setCount(Math.round(start + stepValue * step));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span className="font-mono-med tabular-nums">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}
