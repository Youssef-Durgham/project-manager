import { subscribe, unsubscribe, SSEEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode(': connected\n\n'));

      const onEvent = (event: SSEEvent) => {
        try {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`));
        } catch {
          // Client disconnected
        }
      };

      subscribe(onEvent);

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup when the stream is cancelled (client disconnects)
      const originalCancel = stream.cancel?.bind(stream);
      stream.cancel = (reason) => {
        clearInterval(heartbeat);
        unsubscribe(onEvent);
        return originalCancel?.(reason) ?? Promise.resolve();
      };
    },
    cancel() {
      // Additional cleanup hook
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
