import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import {
  startEntrySchema,
  dayStatusSchema,
  spreadsheetQuerySchema,
  tourSchema,
  updateEntrySchema
} from "../../../packages/shared/src/index.js";
import { FRONTEND_SESSION_COOKIE, verifySession } from "../../../packages/shared/src/auth.js";
import { SpreadsheetService } from "../../backend/src/spreadsheetService.js";
import { TimeTrackingService } from "../../backend/src/timeTrackingService.js";
import { initializeTimeTrackingDatabase } from "../../backend/src/db.js";

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? "dev-only-insecure-secret-change-me";
if (!process.env.AUTH_JWT_SECRET) console.warn("[server] AUTH_JWT_SECRET ist nicht gesetzt, verwende einen unsicheren Entwicklungsschlüssel.");

const app = Fastify({ logger: true });
const timeTracking = new TimeTrackingService();
const spreadsheets = new SpreadsheetService();

await app.register(cors, { origin: true, credentials: true });
await app.register(cookie);

function currentSession(request: FastifyRequest) {
  return verifySession(request.cookies[FRONTEND_SESSION_COOKIE], JWT_SECRET, "frontend");
}

async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!currentSession(request)) await reply.code(401).send({ error: "Nicht angemeldet." });
}

app.get("/api/health", async () => ({ status: "ok" }));

app.get<{ Querystring: { date?: string } }>("/api/time-entries", { preHandler: requireAuth }, async (request) => {
  const currentUserId = currentSession(request)!.sub;
  const date = request.query.date ?? new Date().toISOString().slice(0, 10);
  return { date, entries: await timeTracking.list(currentUserId, date) };
});

app.post<{ Body: unknown }>("/api/time-entries", { preHandler: requireAuth }, async (request, reply) => {
  const currentUserId = currentSession(request)!.sub;
  const parsed = startEntrySchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "Ungültige Eingabe", details: parsed.error.flatten() });
  try { return await timeTracking.start(currentUserId, parsed.data); } catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
});

app.post<{ Params: { id: string } }>("/api/time-entries/:id/stop", { preHandler: requireAuth }, async (request, reply) => {
  const currentUserId = currentSession(request)!.sub;
  const parts = request.params.id.split(":");
  const tour = tourSchema.safeParse(parts.at(-1));
  if (parts.length !== 3 || !tour.success) return reply.code(400).send({ error: "Ungültige ID" });
  try { return await timeTracking.stop(currentUserId, parts[1], tour.data); } catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
});

app.patch<{ Params: { id: string }; Body: unknown }>("/api/time-entries/:id", { preHandler: requireAuth }, async (request, reply) => {
  const currentUserId = currentSession(request)!.sub;
  const parsed = updateEntrySchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "Ungültige Eingabe", details: parsed.error.flatten() });
  try { return await timeTracking.update(currentUserId, request.params.id, parsed.data); } catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
});

app.patch<{ Body: { date?: string; remark?: string } }>("/api/day-remark", { preHandler: requireAuth }, async (request, reply) => {
  const currentUserId = currentSession(request)!.sub;
  if (typeof request.body?.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(request.body.date)) return reply.code(400).send({ error: "Ein gültiges Datum ist erforderlich." });
  if (typeof request.body?.remark !== "string" || request.body.remark.length > 500) return reply.code(400).send({ error: "Die Bemerkung ist ungültig." });
  try {
    await timeTracking.updateRemark(currentUserId, request.body.date, request.body.remark);
    return { date: request.body.date, remark: request.body.remark };
  } catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
});

app.patch<{ Body: { date?: string; dayStatus?: string } }>("/api/day-status", { preHandler: requireAuth }, async (request, reply) => {
  const currentUserId = currentSession(request)!.sub;
  if (typeof request.body?.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(request.body.date)) return reply.code(400).send({ error: "Ein gültiges Datum ist erforderlich." });
  const parsedStatus = dayStatusSchema.safeParse(request.body?.dayStatus ?? "");
  if (!parsedStatus.success) return reply.code(400).send({ error: "Der Tagesstatus ist ungültig." });
  try {
    await timeTracking.updateDayStatus(currentUserId, request.body.date, parsedStatus.data);
    return { date: request.body.date, dayStatus: parsedStatus.data };
  } catch (error) { return reply.code(409).send({ error: (error as Error).message }); }
});

app.get("/api/spreadsheets", { preHandler: requireAuth }, async (request) => {
  const currentUserId = currentSession(request)!.sub;
  return { spreadsheets: await spreadsheets.list([currentUserId]) };
});
app.get<{ Querystring: unknown }>("/api/spreadsheets/download", { preHandler: requireAuth }, async (request, reply) => {
  const session = currentSession(request)!;
  const currentUserId = session.sub;
  const parsed = spreadsheetQuerySchema.safeParse(request.query);
  if (!parsed.success) return reply.code(400).send({ error: "userId, year und month sind erforderlich" });
  if (parsed.data.userId !== currentUserId) return reply.code(403).send({ error: "Keine Berechtigung." });
  const from = `${parsed.data.year}-${String(parsed.data.month).padStart(2, "0")}-01`;
  const daysInMonth = new Date(Date.UTC(parsed.data.year, parsed.data.month, 0)).getUTCDate();
  const to = `${parsed.data.year}-${String(parsed.data.month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  const entries = await timeTracking.listRange(currentUserId, from, to);
  const path = await spreadsheets.generate(parsed.data.userId, parsed.data.year, parsed.data.month, entries, session.name);
  return reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").header("Content-Disposition", `attachment; filename="${basename(path)}"`).send(await readFile(path));
});
app.delete<{ Querystring: unknown }>("/api/spreadsheets", { preHandler: requireAuth }, async (request, reply) => {
  const currentUserId = currentSession(request)!.sub;
  const parsed = spreadsheetQuerySchema.safeParse(request.query);
  if (!parsed.success) return reply.code(400).send({ error: "userId, year und month sind erforderlich" });
  if (parsed.data.userId !== currentUserId) return reply.code(403).send({ error: "Keine Berechtigung." });
  try { await spreadsheets.remove(parsed.data.userId, parsed.data.year, parsed.data.month); return { deleted: true }; } catch { return reply.code(404).send({ error: "Tabelle nicht gefunden" }); }
});

await initializeTimeTrackingDatabase();
await app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" });