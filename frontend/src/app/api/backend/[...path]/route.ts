import { NextResponse, type NextRequest } from "next/server"

import { auth } from "@/auth"
import { backendFetch } from "@/lib/backend"

// Browser -> Next.js -> FastAPI. The browser only holds the Auth.js session cookie;
// this handler swaps it for a backend token, so the API is never exposed publicly.
const PASS_REQUEST_HEADERS = ["content-type", "range"]
const PASS_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
]

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ detail: "Not signed in" }, { status: 401 })
  }
  const { path } = await ctx.params
  const target = `/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`

  const headers = new Headers()
  for (const name of PASS_REQUEST_HEADERS) {
    const value = req.headers.get(name)
    if (value) headers.set(name, value)
  }
  const hasBody = !["GET", "HEAD"].includes(req.method)
  const upstream = await backendFetch(session, target, {
    method: req.method,
    headers,
    body: hasBody ? await req.text() : undefined,
  })

  const out = new Headers()
  for (const name of PASS_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) out.set(name, value)
  }
  return new Response(upstream.body, { status: upstream.status, headers: out })
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE }
