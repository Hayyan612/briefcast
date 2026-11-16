import "server-only"

import { SignJWT } from "jose"
import type { Session } from "next-auth"

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000"
const secret = new TextEncoder().encode(process.env.BACKEND_JWT_SECRET ?? "")

/** Short-lived token the FastAPI backend trusts. Never sent to the browser. */
export async function backendToken(session: Session): Promise<string> {
  const email = session.user?.email
  if (!email) throw new Error("Session has no email")
  return new SignJWT({
    email,
    name: session.user?.name ?? undefined,
    picture: session.user?.image ?? undefined,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuer("briefcast-web")
    .setAudience("briefcast-api")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret)
}

export async function backendFetch(
  session: Session,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${await backendToken(session)}`)
  return fetch(`${BACKEND_URL}${path}`, { ...init, headers, cache: "no-store" })
}

export async function backendJson<T>(session: Session, path: string): Promise<T> {
  const res = await backendFetch(session, path)
  if (!res.ok) throw new Error(`Backend ${path} returned ${res.status}`)
  return res.json() as Promise<T>
}
