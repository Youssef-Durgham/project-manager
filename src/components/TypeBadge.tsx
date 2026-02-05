"use client";

import { ProjectType, TYPE_LABELS } from "@/lib/types";

interface TypeBadgeProps {
  type: ProjectType;
  size?: "sm" | "md";
}

const styles: Record<ProjectType, string> = {
  mobile: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  web: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  backend: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  fullstack: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
};

export default function TypeBadge({ type, size = "sm" }: TypeBadgeProps) {
  const config = TYPE_LABELS[type] || { icon: '📦', label: type || 'Unknown' };
  const sizeClass = size === "sm" ? "text-[10px] px-2 py-[3px]" : "text-xs px-2.5 py-1";

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border font-medium ${styles[type]} ${sizeClass}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
