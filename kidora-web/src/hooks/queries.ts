/**
 * Re-export only.
 *
 * This file used to be a byte-identical copy of lib/hooks/queries.ts. Two
 * copies of the same query keys mean two independent caches, so an
 * invalidation through one would silently leave the other stale.
 * lib/hooks/queries.ts is the implementation; this path is kept because it is
 * the one src/hooks/* consumers reach for.
 */
export * from "@/lib/hooks/queries";
