import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/** Charts size to their container — never a hard-coded screen width. */
export function useChartWidth(initial = 300) {
  const [width, setWidth] = useState(initial);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
  }, []);
  return { width, onLayout };
}
