
import React, { useState, useEffect } from 'react';

interface Props {
  targetDate: string;
}

export default function Countdown({ targetDate }: Props) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number }>({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        clearInterval(timer);
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
      } else {
        setTimeLeft({
          d: Math.floor(difference / (1000 * 60 * 60 * 24)),
          h: Math.floor((difference / (1000 * 60 * 60)) % 24),
          m: Math.floor((difference / 1000 / 60) % 60),
          s: Math.floor((difference / 1000) % 60)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const Item = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-white/10 backdrop-blur-sm rounded-xl px-2 py-1 md:px-4 md:py-2 min-w-[50px] md:min-w-[80px]">
        <span className="text-xl md:text-5xl font-black block tabular-nums">
          {value < 10 ? `0${value}` : value}
        </span>
      </div>
      <span className="text-[9px] md:text-xs uppercase mt-2 font-bold opacity-60">{label}</span>
    </div>
  );

  return (
    <div className="flex gap-1.5 md:gap-5" dir="ltr">
      <Item value={timeLeft.d} label="روز" />
      <span className="text-xl md:text-5xl font-black mt-1 md:mt-2 opacity-30">:</span>
      <Item value={timeLeft.h} label="ساعت" />
      <span className="text-xl md:text-5xl font-black mt-1 md:mt-2 opacity-30">:</span>
      <Item value={timeLeft.m} label="دقیقه" />
      <span className="text-xl md:text-5xl font-black mt-1 md:mt-2 opacity-30">:</span>
      <Item value={timeLeft.s} label="ثانیه" />
    </div>
  );
}
