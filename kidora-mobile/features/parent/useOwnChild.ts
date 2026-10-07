import { useParentChildren } from '@/hooks/parent';

/**
 * UI-side ownership check: a parent may only open their own children. The
 * backend enforces the same rule (tenancy.assertParentOf → 403).
 */
export function useOwnChild(childId: string) {
  const children = useParentChildren();
  const child = children.data?.find((c) => c.id === childId);
  return { child, isLoading: children.isLoading, forbidden: !!children.data && !child, error: children.error };
}
