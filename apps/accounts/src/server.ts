import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { createUserSchema, forgotPasswordSchema, loginSchema, setPasswordSchema, updateEntrySchema, userProfileSchema } from "../../../packages/shared/src/index.js";
import { ACCOUNTS_SESSION_COOKIE, FRONTEND_SESSION_COOKIE, signSession, verifySession } from "../../../packages/shared/src/auth.js";
import { TimeTrackingService } from "../../backend/src/timeTrackingService.js";
import { initializeAccountsDatabase } from "./db.js";
import { AuthService } from "./authService.js";
import { adminUserProfilePage, adminUsersPage, forgotPasswordPage, loginPage, setPasswordPage } from "./pages.js";

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me";
if (!process.env.AUTH_JWT_SECRET) console.warn("[accounts] AUTH_JWT_SECRET ist nicht gesetzt, verwende einen unsicheren Entwicklungsschlüssel.");
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

const app = Fastify({ logger: true });
const auth = new AuthService();
const timeTracking = new TimeTrackingService();

await app.register(cors, { origin: true, credentials: true });
await app.register(cookie);
await initializeAccountsDatabase();
await auth.bootstrapAdmin();

// Nur die Accounts-eigene Session (aud=accounts) zählt hier als angemeldet — ein Frontend-Login reicht nicht.
function currentAccountsSession(request: FastifyRequest) {
  return verifySession(request.cookies[ACCOUNTS_SESSION_COOKIE], JWT_SECRET, "accounts");
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const session = currentAccountsSession(request);
  if (!session || session.role !== "admin" || !await auth.findById(session.sub)) await reply.code(403).send({ error: "Keine Berechtigung." });
}

// Nur Server-relative Pfade oder das konfigurierte Frontend als Redirect-Ziel zulassen (kein Open Redirect).
function sanitizeReturnTo(raw: unknown): string {
  if (typeof raw !== "string" || raw.length === 0) return "/admin/dashboard";
  if (raw.startsWith("/")) return raw;
  try {
    if (new URL(raw).origin === new URL(FRONTEND_URL).origin) return raw;
  } catch { /* ungültige URL */ }
  return FRONTEND_URL;
}

app.get("/api/health", async () => ({ status: "ok" }));

app.get("/api/me", async (request, reply) => {
  const session = verifySession(request.cookies[FRONTEND_SESSION_COOKIE], JWT_SECRET, "frontend");
  const user = session ? await auth.findById(session.sub) : undefined;
  if (!session || !user) return reply.code(401).send({ error: "Nicht angemeldet." });
  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

app.post<{ Body: unknown }>("/api/auth/login", async (request, reply) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "Ungültige Eingabe" });
  try {
    const user = await auth.verifyLogin(parsed.data.email, parsed.data.password);
    const audience = parsed.data.audience;
    const cookieName = audience === "accounts" ? ACCOUNTS_SESSION_COOKIE : FRONTEND_SESSION_COOKIE;
    const token = signSession({ sub: user.id, role: user.role, name: user.name, email: user.email, aud: audience }, JWT_SECRET, "12h");
    reply.setCookie(cookieName, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 12 * 60 * 60 });
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  } catch (error) { return reply.code(401).send({ error: (error as Error).message }); }
});

app.post("/api/auth/logout", async (_request, reply) => {
  reply.clearCookie(FRONTEND_SESSION_COOKIE, { path: "/" });
  return { ok: true };
});

app.post<{ Body: unknown }>("/api/auth/forgot-password", async (request, reply) => {
  const parsed = forgotPasswordSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "Ungültige Eingabe" });
  await auth.requestPasswordReset(parsed.data.email);
  return { ok: true };
});

app.post<{ Body: unknown }>("/api/auth/set-password", async (request, reply) => {
  const parsed = setPasswordSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "Ungültige Eingabe", details: parsed.error.flatten() });
  try {
    await auth.setPassword(parsed.data.token, parsed.data.password);
    return { ok: true };
  } catch (error) { return reply.code(400).send({ error: (error as Error).message }); }
});

app.get("/api/admin/users", { preHandler: requireAdmin }, async () => ({ users: await auth.listUsers() }));
app.get<{ Querystring: { q?: string } }>("/api/admin/users/search", { preHandler: requireAdmin }, async (request) => ({ users: await auth.searchUsers(request.query.q ?? "") }));

app.post<{ Body: unknown }>("/api/admin/users", { preHandler: requireAdmin }, async (request, reply) => {
  const parsed = createUserSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "Ungültige Eingabe", details: parsed.error.flatten() });
  try {
    const { user, setupLink } = await auth.createUser(parsed.data);
    return reply.code(201).send({ user, setupLink });
  } catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
});

app.post<{ Params: { id: string } }>("/api/admin/users/:id/resend-invite", { preHandler: requireAdmin }, async (request, reply) => {
  try { return { setupLink: await auth.resendSetup(request.params.id) }; } catch (error) { return reply.code(400).send({ error: (error as Error).message }); }
});
app.patch<{ Params: { id: string }; Body: unknown }>("/api/admin/users/:id/profile", { preHandler: requireAdmin }, async (request, reply) => {
  const user = await auth.findById(request.params.id);
  if (!user) return reply.code(404).send({ error: "Account nicht gefunden." });
  const parsed = userProfileSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "Ungültige Profildaten", details: parsed.error.flatten() });
  const profile = await auth.updateProfile(user.id, parsed.data);
  return { profile, name: (await auth.findById(user.id))?.name };
});
app.get<{ Params: { id: string }; Querystring: { year?: string; month?: string } }>('/api/admin/users/:id/time-entries', { preHandler: requireAdmin }, async (request, reply) => {
  const user = await auth.findById(request.params.id);
  if (!user) return reply.code(404).send({ error: 'Account nicht gefunden.' });
  const year = Number(request.query.year ?? new Date().getFullYear());
  const month = Number(request.query.month ?? (new Date().getMonth() + 1));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return reply.code(400).send({ error: 'Jahr und Monat sind ungültig.' });
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { entries: await timeTracking.listRange(request.params.id, from, to) };
});

app.patch<{ Params: { id: string; entryId: string }; Body: unknown }>('/api/admin/users/:id/time-entries/:entryId', { preHandler: requireAdmin }, async (request, reply) => {
  const user = await auth.findById(request.params.id);
  if (!user) return reply.code(404).send({ error: 'Account nicht gefunden.' });
  const parsed = updateEntrySchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
  try {
    return await timeTracking.update(user.id, request.params.entryId, parsed.data);
  } catch (error) {
    return reply.code(409).send({ error: (error as Error).message });
  }
});

app.patch<{ Params: { id: string; date: string }; Body: { remark?: string } }>('/api/admin/users/:id/day-remark/:date', { preHandler: requireAdmin }, async (request, reply) => {
  const user = await auth.findById(request.params.id);
  if (!user) return reply.code(404).send({ error: 'Account nicht gefunden.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(request.params.date)) return reply.code(400).send({ error: 'Ein gültiges Datum ist erforderlich.' });
  if (typeof request.body?.remark !== 'string' || request.body.remark.length > 500) return reply.code(400).send({ error: 'Die Bemerkung ist ungültig.' });
  await timeTracking.updateRemark(user.id, request.params.date, request.body.remark);
  return { date: request.params.date, remark: request.body.remark };
});

app.patch<{ Params: { id: string; date: string }; Body: { dayStatus?: string } }>('/api/admin/users/:id/day-status/:date', { preHandler: requireAdmin }, async (request, reply) => {
  const user = await auth.findById(request.params.id);
  if (!user) return reply.code(404).send({ error: 'Account nicht gefunden.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(request.params.date)) return reply.code(400).send({ error: 'Ein gültiges Datum ist erforderlich.' });
  const dayStatus = request.body?.dayStatus;
  if (dayStatus !== '' && dayStatus !== 'K' && dayStatus !== 'U' && dayStatus !== 'F' && dayStatus !== 'UF') return reply.code(400).send({ error: 'Der Tagesstatus ist ungültig.' });
  await timeTracking.updateDayStatus(user.id, request.params.date, dayStatus);
  return { date: request.params.date, dayStatus };
});
// Server-seitig gerenderte Oberfläche der Nutzerverwaltung (unabhängig vom Zeiterfassungs-Frontend).
app.get<{ Querystring: { returnTo?: string; error?: string } }>("/login", async (request, reply) => {
  reply.header("Content-Type", "text/html; charset=utf-8");
  return loginPage(sanitizeReturnTo(request.query.returnTo), request.query.error);
});

app.get<{ Querystring: { message?: string; error?: string } }>("/forgot-password", async (request, reply) => {
  reply.header("Content-Type", "text/html; charset=utf-8");
  return forgotPasswordPage(request.query.message, request.query.error);
});

app.get<{ Querystring: { token?: string; done?: string; error?: string } }>("/set-password", async (request, reply) => {
  if (!request.query.token) return reply.code(400).send({ error: "Token fehlt." });
  reply.header("Content-Type", "text/html; charset=utf-8");
  return setPasswordPage(request.query.token, request.query.done === "1", request.query.error);
});

async function renderAdminView(request: FastifyRequest, reply: FastifyReply, view: "dashboard" | "users" | "userview") {
  const session = currentAccountsSession(request);
  if (!session || session.role !== "admin" || !await auth.findById(session.sub)) return reply.redirect(`/login?returnTo=${encodeURIComponent(`/admin/${view === "users" ? "users" : view}`)}`);
  reply.header("Content-Type", "text/html; charset=utf-8");
  const query = request.query as { setupLink?: string; error?: string };
  return adminUsersPage(await auth.listUsers(), query.setupLink, query.error, view);
}

app.get<{ Querystring: { setupLink?: string; error?: string } }>("/admin/dashboard", async (request, reply) => renderAdminView(request, reply, "dashboard"));

app.get("/admin", async (_request, reply) => reply.redirect("/admin/dashboard"));

app.get<{ Querystring: { setupLink?: string; error?: string } }>("/admin/users", async (request, reply) => renderAdminView(request, reply, "users"));

app.get<{ Params: { id: string }; Querystring: { returnTo?: string } }>("/admin/users/:id/profile", async (request, reply) => {
  const session = currentAccountsSession(request);
  const returnTo = request.query.returnTo === "/admin/userview" ? "/admin/userview" : "/admin/users";
  if (!session || session.role !== "admin" || !await auth.findById(session.sub)) return reply.redirect(`/login?returnTo=${encodeURIComponent(`/admin/users/${request.params.id}/profile?returnTo=${returnTo}`)}`);
  const row = await auth.findById(request.params.id);
  if (!row) return reply.code(404).send("Account nicht gefunden.");
  reply.header("Content-Type", "text/html; charset=utf-8");
  return adminUserProfilePage({ id: row.id, name: row.name, email: row.email, role: row.role, status: row.status }, await auth.getProfile(row.id), returnTo);
});

app.get<{ Querystring: { setupLink?: string; error?: string } }>("/admin/userview", async (request, reply) => renderAdminView(request, reply, "userview"));

app.post("/logout", async (_request, reply) => {
  reply.clearCookie(ACCOUNTS_SESSION_COOKIE, { path: "/" });
  return reply.redirect("/login");
});

app.get("/", async (request, reply) => {
  const session = currentAccountsSession(request);
  if (session?.role === "admin") return reply.redirect("/admin/dashboard");
  if (session) return reply.redirect(FRONTEND_URL);
  return reply.redirect("/login");
});

await app.listen({ port: Number(process.env.ACCOUNTS_PORT ?? 3001), host: "0.0.0.0" });
