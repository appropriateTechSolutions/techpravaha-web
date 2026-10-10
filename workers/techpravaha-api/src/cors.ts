const METHODS = 'GET, POST, OPTIONS';
const HEADERS = 'Content-Type';

export function cors(origin: string | null, allowed: string[]): HeadersInit {
  const h: Record<string, string> = { Vary: 'Origin' };
  if (origin && allowed.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = METHODS;
    h['Access-Control-Allow-Headers'] = HEADERS;
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

export function preflight(req: Request, allowed: string[]): Response | null {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: cors(req.headers.get('Origin'), allowed) });
}
