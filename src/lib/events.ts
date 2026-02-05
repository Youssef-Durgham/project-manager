// Server-side event bus for SSE real-time updates
// Uses global variable to persist across hot reloads in development

export type EventType = 'task_updated' | 'project_updated' | 'comment_added' | 'blocker_changed';

export interface SSEEvent {
  type: EventType;
  data: Record<string, any>;
  timestamp: number;
  actor?: string;
}

type Subscriber = (event: SSEEvent) => void;

// Use global to survive Next.js hot reloads
const globalForEvents = globalThis as unknown as {
  __sseSubscribers: Set<Subscriber>;
  __sseRecentEvents: SSEEvent[];
};

if (!globalForEvents.__sseSubscribers) {
  globalForEvents.__sseSubscribers = new Set();
}
if (!globalForEvents.__sseRecentEvents) {
  globalForEvents.__sseRecentEvents = [];
}

const MAX_RECENT_EVENTS = 200;

export function emit(event: SSEEvent) {
  // Store in recent events buffer
  globalForEvents.__sseRecentEvents.push(event);
  if (globalForEvents.__sseRecentEvents.length > MAX_RECENT_EVENTS) {
    globalForEvents.__sseRecentEvents = globalForEvents.__sseRecentEvents.slice(-MAX_RECENT_EVENTS);
  }

  // Notify all subscribers
  for (const callback of globalForEvents.__sseSubscribers) {
    try {
      callback(event);
    } catch (err) {
      console.error('[SSE] Subscriber error:', err);
    }
  }
}

export function subscribe(callback: Subscriber) {
  globalForEvents.__sseSubscribers.add(callback);
}

export function unsubscribe(callback: Subscriber) {
  globalForEvents.__sseSubscribers.delete(callback);
}

export function getRecentEvents(since?: number, projectId?: string): SSEEvent[] {
  let events = globalForEvents.__sseRecentEvents;
  if (since) {
    events = events.filter(e => e.timestamp > since);
  }
  if (projectId) {
    events = events.filter(e => e.data.projectId === projectId || e.data.projectSlug === projectId);
  }
  return events;
}
