import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

const scrypt = promisify(scryptCb) as (pw: string, salt: string, len: number) => Promise<Buffer>;
const COOKIE = "mutirao_sessao";
const SESSION_DAYS = 30;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const hash = await scrypt(password, salt, 64);
  const expected = Buffer.from(hex, "hex");
  return expected.length === hash.length && timingSafeEqual(expected, hash);
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  await db.insert(schema.sessions).values({ token, userId, expiresAt });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
  jar.delete(COOKIE);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const row = await db
    .select({ user: schema.users, expiresAt: schema.sessions.expiresAt })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(eq(schema.sessions.token, token))
    .get();
  if (!row || row.expiresAt < Date.now()) return null;
  const { passwordHash: _omit, ...user } = row.user;
  void _omit;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
