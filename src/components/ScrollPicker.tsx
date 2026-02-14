'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ScrollPickerProps {
  values: number[];
  initialValue: number;
  onChange: (value: number) => void;
  unit?: string;
}

export default function ScrollPicker({ values, initialValue, onChange, unit = '' }: ScrollPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(values.indexOf(initialValue));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const itemHeight = 60;
      scrollRef.current.scrollTo({
        top: selectedIndex * itemHeight,
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const itemHeight = 60;
    const scrollTop = scrollRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    if (index !== selectedIndex && index >= 0 && index < values.length) {
      setSelectedIndex(index);
      onChange(values[index]);
    }
  };

  return (
    <div className="relative w-full max-w-xs mx-auto">
      {/* Selection highlight */}
      <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 h-16 bg-coral/10 border-2 border-coral rounded-2xl pointer-events-none z-10" />

      {/* Fade effects */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white dark:from-gray-800 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none z-10" />

      {/* Scrollable list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-64 overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {/* Top padding */}
        <div className="h-24" />

        {values.map((value, index) => (
          <div
            key={index}
            className="h-16 flex items-center justify-center snap-center"
            onClick={() => {
              setSelectedIndex(index);
              onChange(value);
            }}
          >
            <motion.span
              animate={{
                scale: index === selectedIndex ? 1.3 : 1,
                opacity: index === selectedIndex ? 1 : 0.4,
              }}
              className={`text-2xl font-bold ${
                index === selectedIndex
                  ? 'text-coral'
                  : 'text-mediumGray dark:text-gray-500'
              }`}
            >
              {value}{unit}
            </motion.span>
          </div>
        ))}

        {/* Bottom padding */}
        <div className="h-24" />
      </div>
    </div>
  );
}
