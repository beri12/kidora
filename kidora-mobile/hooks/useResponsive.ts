import { useWindowDimensions } from 'react-native';

/** Breakpoints for small Android phones → tablets. Never assume a fixed width. */
export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();
  const isSmall = width < 360;
  const isTablet = Math.min(width, height) >= 600;
  return {
    width,
    height,
    fontScale,
    isSmall,
    isTablet,
    /** columns for card grids */
    columns: isTablet ? (width >= 1000 ? 4 : 3) : 2,
    /** max content width so tablets don't get stretched lines */
    contentWidth: Math.min(width, isTablet ? 820 : width),
  };
}
