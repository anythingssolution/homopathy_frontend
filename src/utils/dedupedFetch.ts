const inflightGets = new Map<string, Promise<Response>>();

function headerValue(headers: HeadersInit | undefined, name: string): string {
  if (!headers) return '';
  if (headers instanceof Headers) {
    return headers.get(name) || '';
  }
  if (Array.isArray(headers)) {
    const match = headers.find(([key]) => key.toLowerCase() === name.toLowerCase());
    return match?.[1] || '';
  }
  const record = headers as Record<string, string>;
  const key = Object.keys(record).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? record[key] : '';
}

export function dedupedFetch(input: string, init?: RequestInit): Promise<Response> {
  const method = String(init?.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return fetch(input, init);
  }

  const key = `${input}::${headerValue(init?.headers, 'Authorization')}`;
  const existing = inflightGets.get(key);
  if (existing) {
    return existing.then((response) => response.clone());
  }

  const request = fetch(input, init).then((response) => {
    inflightGets.delete(key);
    return response;
  }).catch((error) => {
    inflightGets.delete(key);
    throw error;
  });

  inflightGets.set(key, request);
  return request.then((response) => response.clone());
}
