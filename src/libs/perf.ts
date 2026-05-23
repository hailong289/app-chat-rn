import React from 'react';

export const perfMark = (label: string): void => {
  if (!__DEV__) return;
  const now = performance.now();
  console.log(`[perf] ${label}: ${now.toFixed(1)}ms`);
};

export function useRenderCount(label: string): void {
  if (!__DEV__) return;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ref = React.useRef(0);
  ref.current += 1;
  if (ref.current % 20 === 0) {
    console.log(`[perf] ${label} rendered ${ref.current} times`);
  }
}
