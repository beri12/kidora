"use client";
import { useCallback, useEffect, useState } from "react";
import { useParentChildren } from "@/lib/hooks/queries";

const KEY = "kidora:selectedChild";

/** Selected child persists across parent pages (session-scoped, not sensitive). */
export function useSelectedChild() {
  const children = useParentChildren();
  const [childId, setChildId] = useState<string>("");
  useEffect(() => {
    if (childId || !children.data?.length) return;
    const stored = typeof window !== "undefined" ? window.sessionStorage.getItem(KEY) : null;
    const valid = children.data.find((c) => c.id === stored)?.id ?? children.data[0].id;
    setChildId(valid);
  }, [children.data, childId]);
  const select = useCallback((id: string) => { setChildId(id); try { window.sessionStorage.setItem(KEY, id); } catch { /* ignore */ } }, []);
  return { children, childId, select, child: children.data?.find((c) => c.id === childId) };
}
