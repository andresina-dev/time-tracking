import jwt from "jsonwebtoken";
import type { Role } from "./index.js";

// Getrennte Cookies für Frontend-Login (Zeiterfassung) und Accounts-Login (Nutzerverwaltung) —
// ein Login in einer Oberfläche darf keine Session für die andere erzeugen.
export const FRONTEND_SESSION_COOKIE = "frontend_session";
export const ACCOUNTS_SESSION_COOKIE = "accounts_session";

export type SessionAudience = "frontend" | "accounts";

export type SessionPayload = { sub: string; role: Role; name: string; email: string; aud: SessionAudience };

export function signSession(payload: SessionPayload, secret: string, expiresIn: jwt.SignOptions["expiresIn"]): string {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifySession(token: string | undefined, secret: string, expectedAudience: SessionAudience): SessionPayload | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, secret) as SessionPayload;
    return payload.aud === expectedAudience ? payload : null;
  } catch { return null; }
}
