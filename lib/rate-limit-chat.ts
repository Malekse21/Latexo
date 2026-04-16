export interface RateLimitEntry { timestamps: number[]; }
const store = new Map<string, RateLimitEntry>();

export function checkChatRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const ONE_MINUTE = 60 * 1000;
  const MAX_REQUESTS = 20;

  const entry = store.get(userId) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter(t => now - t < ONE_MINUTE);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    const oldest = entry.timestamps[0];
    return { allowed: false, retryAfter: Math.ceil((oldest + ONE_MINUTE - now) / 1000) };
  }

  entry.timestamps.push(now);
  store.set(userId, entry);
  
  return { allowed: true };
}
