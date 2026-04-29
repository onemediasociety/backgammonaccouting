export interface SessionPayload {
  sub: string;           // user id or "__virtual_admin__"
  username: string;
  role: "super_admin" | "club_admin";
  clubSlugs: string[];   // empty for super_admin
  iat: number;
  exp: number;
}

// Module-level key cache — one import per cold start
let _keyPromise: Promise<CryptoKey> | null = null;

function getSecret(): string {
  return (
    process.env.SESSION_SECRET ??
    process.env.SITE_PASSWORD ??
    "bs-accounting-dev-secret-please-set-SESSION_SECRET"
  );
}

function getSigningKey(): Promise<CryptoKey> {
  if (!_keyPromise) {
    _keyPromise = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(getSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
  return _keyPromise;
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export async function createSession(
  payload: Omit<SessionPayload, "iat" | "exp">
): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 30 * 24 * 3600;
  const full: SessionPayload = { ...payload, iat, exp };

  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(full)).buffer as ArrayBuffer);
  const key = await getSigningKey();
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigB64 = toBase64Url(sigBuf);

  return `${payloadB64}.${sigB64}`;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const lastDot = token.lastIndexOf(".");
    if (lastDot < 0) return null;

    const payloadB64 = token.slice(0, lastDot);
    const sigB64 = token.slice(lastDot + 1);

    const key = await getSigningKey();
    const sigBytes = fromBase64Url(sigB64);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer as ArrayBuffer,
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payloadB64))
    ) as SessionPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}
