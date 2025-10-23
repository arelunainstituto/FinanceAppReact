import { useEffect, useState, useRef } from 'react';

interface UseCountUpOptions {
  start?: number;
  end: number;
  duration?: number; // em milissegundos
  decimals?: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
  easingFn?: (t: number) => number;
}

export const useCountUp = ({
  start = 0,
  end,
  duration = 2000,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = '',
  easingFn = (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1, // easeInOutCubic
}: UseCountUpOptions): string => {
  const [count, setCount] = useState(start);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const progress = Math.min((currentTime - startTimeRef.current) / duration, 1);
      const easedProgress = easingFn(progress);
      const currentCount = start + (end - start) * easedProgress;

      setCount(currentCount);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [end, start, duration, easingFn]);

  // Formatação do número
  const formatNumber = (value: number): string => {
    const fixedValue = value.toFixed(decimals);
    const parts = fixedValue.split('.');
    
    // Adicionar separador de milhares se especificado
    if (separator) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    }
    
    const formatted = parts.join(decimals > 0 ? '.' : '');
    return `${prefix}${formatted}${suffix}`;
  };

  return formatNumber(count);
};

// Hook especializado para moeda
export const useCurrencyCountUp = (
  value: number,
  duration: number = 2000,
  currency: string = '€'
): string => {
  const displayValue = value >= 1000000 
    ? value / 1000000 
    : value >= 1000 
    ? value / 1000 
    : value;

  const decimals = value >= 1000000 || value >= 1000 ? 1 : 0;
  
  const suffix = value >= 1000000 
    ? 'M' 
    : value >= 1000 
    ? 'K' 
    : '';

  return useCountUp({
    start: 0,
    end: displayValue,
    duration,
    decimals,
    prefix: currency,
    suffix,
    separator: '',
  });
};

// Hook especializado para números inteiros
export const useIntegerCountUp = (
  value: number,
  duration: number = 1500
): string => {
  return useCountUp({
    start: 0,
    end: value,
    duration,
    decimals: 0,
    separator: '',
  });
};

