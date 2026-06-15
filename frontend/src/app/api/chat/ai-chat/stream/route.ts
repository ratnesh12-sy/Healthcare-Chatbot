import { NextRequest } from 'next/server';

// SSE streaming proxy.
//
// The blanket `/api/:path*` rewrite in next.config.js (Vercel edge proxy) BUFFERS
// streaming responses, so the browser received the whole AI reply at once instead
// of token-by-token. A Next.js Route Handler streams the upstream body through
// correctly, while staying same-origin so the first-party auth cookie is still
// sent (calling Render directly would make the cookie third-party → 401).
//
// This handler matches the exact path /api/chat/ai-chat/stream; every other
// /api/* request continues to use the rewrite untouched.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN || 'https://healthcare-chatbot-backend-1a80.onrender.com';

export async function POST(req: NextRequest) {
  const body = await req.text();

  const upstream = await fetch(`${BACKEND_ORIGIN}/api/chat/ai-chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      // Forward the auth cookie (and anything else) so the backend authenticates.
      cookie: req.headers.get('cookie') || '',
    },
    body,
    // Don't let fetch buffer/cache the streamed response.
    cache: 'no-store',
  });

  // Pipe the upstream ReadableStream straight back to the browser, unbuffered.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
