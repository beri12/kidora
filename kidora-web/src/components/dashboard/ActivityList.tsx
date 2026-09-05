import { Avatar } from "./Avatar";
import { timeAgo } from "@/lib/format";
import type { ActivityItem } from "@/types/lms";
import { EmptyState } from "./States";

export function ActivityList({ items, emptyTitle = "No activity yet", emptyBody = "Activity will appear here as students learn." }: { items: ActivityItem[]; emptyTitle?: string; emptyBody?: string }) {
  if (!items.length) return <EmptyState title={emptyTitle} body={emptyBody} />;
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((a) => (
        <li key={a.id} className="flex items-center gap-3 py-2.5">
          <Avatar name={a.actor.name} src={a.actor.avatarUrl} color={a.actor.avatarColor} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{a.actor.name}{a.actor.grade && <span className="ml-1.5 text-xs font-normal text-muted">{a.actor.grade}</span>}</p>
            <p className="truncate text-xs text-muted">{a.title}</p>
          </div>
          <span className="shrink-0 text-[11px] text-muted">{timeAgo(a.createdAt)}</span>
          {a.xpDelta ? <span className="shrink-0 rounded-md bg-success-50 px-1.5 py-0.5 text-[11px] font-semibold text-success-700">+{a.xpDelta} XP</span> : null}
        </li>
      ))}
    </ul>
  );
}
