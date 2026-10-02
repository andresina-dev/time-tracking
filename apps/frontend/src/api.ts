import type { Role } from "../../../packages/shared/src/index.js";

export type Me = { id: string; name: string; email: string; role: Role };

async function parseJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error ?? "Anfrage fehlgeschlagen.");
  return data;
}

export async function fetchMe(): Promise<Me | null> {
  const response = await fetch("/api/me", { credentials: "include" });
  if (response.status === 401) return null;
  return parseJson(response) as Promise<Me>;
}

export async function login(email: string, password: string): Promise<Me> {
  const response = await fetch("/api/auth/login", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, audience: "frontend" }) });
  return parseJson(response) as Promise<Me>;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export async function forgotPassword(email: string): Promise<void> {
  const response = await fetch("/api/auth/forgot-password", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
  await parseJson(response);
}

export async function setPassword(token: string, password: string): Promise<void> {
  const response = await fetch("/api/auth/set-password", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
  await parseJson(response);
}
