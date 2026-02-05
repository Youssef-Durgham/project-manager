'use client';

import { UpdateToast } from '@/lib/useEvents';

interface EventToastsProps {
  toasts: UpdateToast[];
  onDismiss: (id: string) => void;
}

const TYPE_STYLES: Record<string, string> = {
  task_updated: 'border-violet-500/30 bg-violet-500/5',
  project_updated: 'border-indigo-500/30 bg-indigo-500/5',
  comment_added: 'border-blue-500/30 bg-blue-500/5',
  blocker_changed: 'border-rose-500/30 bg-rose-500/5',
};

export default function EventToasts({ toasts, onDismiss }: EventToastsProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[320px]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`glass-card rounded-xl px-4 py-3 border animate-slide-in-right cursor-pointer transition-all hover:scale-[1.02] ${TYPE_STYLES[toast.type] || 'border-slate-700/30'}`}
          onClick={() => onDismiss(toast.id)}
        >
          <p className="text-[12px] text-slate-300 font-medium leading-relaxed">{toast.message}</p>
          <p className="text-[10px] text-slate-600 mt-1">
            {new Date(toast.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      ))}
    </div>
  );
}
