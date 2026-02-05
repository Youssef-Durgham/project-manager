'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  task_assigned: '📋',
  status_changed: '🔄',
  comment: '💬',
  mention: '@',
  blocker: '🚧',
  deadline: '⏰',
};

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=20');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch {}
  }, []);

  // Poll for unread count
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // every 30s
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = async () => {
    setOpen(!open);
    if (!open) {
      setLoading(true);
      await loadNotifications();
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearRead = async () => {
    await fetch('/api/notifications', { method: 'DELETE' });
    setNotifications(prev => prev.filter(n => !n.read));
  };

  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="relative w-9 h-9 rounded-xl bg-slate-800/60 border border-slate-700/30 hover:bg-slate-700/60 flex items-center justify-center transition-all press"
      >
        <svg className="w-4.5 h-4.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-scale-in shadow-lg shadow-rose-500/30">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-12 w-80 lg:w-96 max-h-[70vh] glass-card rounded-2xl border border-slate-700/50 shadow-2xl z-50 animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30">
            <h3 className="text-[13px] font-bold text-white">🔔 Notifications — الإشعارات</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                  Mark all read
                </button>
              )}
              {notifications.some(n => n.read) && (
                <button onClick={clearRead} className="text-[10px] text-slate-500 hover:text-slate-300 font-medium transition-colors">
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[calc(70vh-60px)] scrollbar-hide">
            {!loading && notifications.length === 0 && (
              <div className="text-center py-10">
                <div className="text-3xl mb-2">🔕</div>
                <p className="text-[12px] text-slate-500">No notifications — لا توجد إشعارات</p>
              </div>
            )}
            {!loading && notifications.map(n => (
              <div key={n._id} className={`relative ${!n.read ? 'bg-indigo-500/5' : ''}`}>
                {n.link ? (
                  <Link
                    href={n.link}
                    onClick={() => { if (!n.read) markAsRead(n._id); setOpen(false); }}
                    className="block px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-slate-800/50"
                  >
                    <NotificationContent n={n} timeAgo={timeAgo} />
                  </Link>
                ) : (
                  <div
                    onClick={() => { if (!n.read) markAsRead(n._id); }}
                    className="block px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-slate-800/50 cursor-pointer"
                  >
                    <NotificationContent n={n} timeAgo={timeAgo} />
                  </div>
                )}
                {!n.read && (
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationContent({ n, timeAgo }: { n: Notification; timeAgo: (d: string) => string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base mt-0.5">{TYPE_ICONS[n.type] || '🔔'}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-medium truncate ${n.read ? 'text-slate-400' : 'text-slate-200'}`}>{n.title}</p>
        <p className={`text-[11px] mt-0.5 line-clamp-2 ${n.read ? 'text-slate-600' : 'text-slate-400'}`}>{n.message}</p>
        <p className="text-[9px] text-slate-600 mt-1">{timeAgo(n.createdAt)}</p>
      </div>
    </div>
  );
}
