'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type EventType = 'task_updated' | 'project_updated' | 'comment_added' | 'blocker_changed';

export interface SSEEvent {
  type: EventType;
  data: Record<string, any>;
  timestamp: number;
  actor?: string;
}

interface UseEventsOptions {
  /** Only process events for this project */
  projectId?: string;
  /** Called on task updates */
  onTaskUpdated?: (event: SSEEvent) => void;
  /** Called on project updates */
  onProjectUpdated?: (event: SSEEvent) => void;
  /** Called on new comments */
  onCommentAdded?: (event: SSEEvent) => void;
  /** Called on blocker changes */
  onBlockerChanged?: (event: SSEEvent) => void;
  /** Called on any event */
  onAnyEvent?: (event: SSEEvent) => void;
  /** Enable/disable connection (default true) */
  enabled?: boolean;
}

export interface UpdateToast {
  id: string;
  message: string;
  type: EventType;
  timestamp: number;
}

export function useEvents(options: UseEventsOptions = {}) {
  const {
    projectId,
    onTaskUpdated,
    onProjectUpdated,
    onCommentAdded,
    onBlockerChanged,
    onAnyEvent,
    enabled = true,
  } = options;

  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState<UpdateToast[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(1000);

  // Use refs for callbacks to avoid re-establishing connection on callback changes
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  const addToast = useCallback((message: string, type: EventType) => {
    const toast: UpdateToast = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message,
      type,
      timestamp: Date.now(),
    };
    setToasts(prev => [...prev.slice(-4), toast]); // Keep max 5 toasts

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource('/api/events');
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      reconnectDelayRef.current = 1000; // Reset delay on successful connection
    };

    es.onerror = () => {
      setConnected(false);
      es.close();

      // Reconnect with exponential backoff
      const delay = reconnectDelayRef.current;
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(delay * 2, 30000);
        connect();
      }, delay);
    };

    // Listen to typed events
    const handleEvent = (e: MessageEvent) => {
      try {
        const event: SSEEvent = JSON.parse(e.data);
        const cb = callbacksRef.current;

        // Filter by projectId if specified
        if (cb.projectId && event.data.projectId !== cb.projectId && event.data.projectSlug !== cb.projectId) {
          return;
        }

        // Generate toast message
        const actor = event.actor || event.data.actor || 'Someone';
        let toastMsg = '';

        switch (event.type) {
          case 'task_updated':
            toastMsg = `🔄 ${event.data.taskTitle || 'Task'} updated by ${actor}`;
            cb.onTaskUpdated?.(event);
            break;
          case 'project_updated':
            toastMsg = `📂 Project updated by ${actor}`;
            cb.onProjectUpdated?.(event);
            break;
          case 'comment_added':
            toastMsg = `💬 New comment by ${actor}`;
            cb.onCommentAdded?.(event);
            break;
          case 'blocker_changed':
            toastMsg = `🚫 Blocker ${event.data.action || 'updated'} by ${actor}`;
            cb.onBlockerChanged?.(event);
            break;
        }

        if (toastMsg) {
          addToast(toastMsg, event.type);
        }

        cb.onAnyEvent?.(event);
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    };

    es.addEventListener('task_updated', handleEvent);
    es.addEventListener('project_updated', handleEvent);
    es.addEventListener('comment_added', handleEvent);
    es.addEventListener('blocker_changed', handleEvent);
  }, [enabled, addToast]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    connected,
    toasts,
    dismissToast,
  };
}
