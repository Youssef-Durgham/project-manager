"use client";

import { TaskStatus, STATUS_CONFIG } from "@/lib/types";

interface StatusBadgeProps {
  status: TaskStatus;
  size?: "sm" | "md";
  onClick?: () => void;
}

const styles: Record<TaskStatus, string> = {
  draft: "bg-slate-500/10 text-slate-500 border-slate-500/20 shadow-slate-500/5 border-dashed",
  ready: "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5",
  waiting: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5",
  "in-progress": "bg-violet-500/10 text-violet-400 border-violet-500/20 shadow-violet-500/5",
  review: "bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-orange-500/5",
  revision: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/5",
  approved: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-cyan-500/5",
  done: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5",
};

const dotColors: Record<TaskStatus, string> = {
  draft: "bg-slate-500",
  ready: "bg-blue-400",
  waiting: "bg-amber-400",
  "in-progress": "bg-violet-400 animate-pulse",
  review: "bg-orange-400 animate-pulse",
  revision: "bg-rose-400",
  approved: "bg-cyan-400",
  done: "bg-emerald-400",
};

export default function StatusBadge({ status, size = "sm", onClick }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { icon: '❓', label: status || 'Unknown' };
  const sizeClass = size === "sm" ? "text-[10px] px-2 py-[3px] gap-1.5" : "text-xs px-2.5 py-1 gap-1.5";

  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center rounded-md border font-medium shadow-sm
        ${styles[status]} ${sizeClass}
        ${onClick ? "cursor-pointer hover:brightness-125 active:scale-95" : ""}
        transition-all duration-150
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status]}`} />
      <span>{config.label}</span>
    </span>
  );
}
