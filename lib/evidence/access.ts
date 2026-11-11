import { NextRequest } from 'next/server';

export function assertLocal(req: NextRequest, write = false) {
  const host = req.headers.get('host') || '';
  const hostname = host.split(':')[0];
  const isLocal = ['127.0.0.1', 'localhost'].includes(hostname);
  const authenticatedByMiddleware = req.headers.get('x-bizbetter-authenticated') === '1';

  if (!isLocal && !authenticatedByMiddleware) {
    throw new Error('Authenticated private workspace access is required.');
  }

  if (write) {
    const origin = req.headers.get('origin');
    const forwardedHost = req.headers.get('x-forwarded-host') || host;
    const forwardedProto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '');
    if (origin && origin !== `${forwardedProto}://${forwardedHost}`) {
      throw new Error('Invalid request origin.');
    }
    if (!origin && !isLocal) {
      throw new Error('A same-origin request is required.');
    }
  }
}
