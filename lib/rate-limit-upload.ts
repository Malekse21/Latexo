export interface RateLimitEntry { timestamps: number[]; }
const store = new Map<string, RateLimitEntry>();

export function checkUploadRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const MAX_UPLOADS = 3;

  const entry = store.get(userId) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter(t => now - t < ONE_HOUR);

  if (entry.timestamps.length >= MAX_UPLOADS) {
    const oldest = entry.timestamps[0];
    return { allowed: false, retryAfter: Math.ceil((oldest + ONE_HOUR - now) / 1000) };
  }

  entry.timestamps.push(now);
  store.set(userId, entry);
  
  return { allowed: true };
}
