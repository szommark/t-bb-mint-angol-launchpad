import { createHash, timingSafeEqual } from "crypto";

export function extractLeadToken(request: Request): string | null {
  const header = request.headers.get("x-lead-token") ?? request.headers.get("authorization");
  if (!header) return null;
  const t = header.startsWith("Bearer ") ? header.slice(7) : header;
  return t.trim() || null;
}

export function verifyLeadToken(token: string | null, storedHash: string | null): boolean {
  if (!token || !storedHash) return false;
  const computed = createHash("sha256").update(token).digest("hex");
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}