import { jwtVerify } from "https://deno.land/x/jose@v4.15.5/index.ts";

const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
];

const isPublic = (pathname) => PUBLIC_PATHS.some((p) => pathname.startsWith(p));

async function verifyJwt(token, secret) {
  if (!secret) return { ok: false, reason: "missing-secret" };
  const key = new TextEncoder().encode(secret);
  try {
    await jwtVerify(token, key);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

export default async function middleware(request) {
  const backendOrigin = Deno.env.get("BACKEND_ORIGIN");
  const jwtSecret = Deno.env.get("JWT_SECRET");

  if (!backendOrigin) {
    return fetch(request);
  }

  const url = new URL(request.url);
  const target = new URL(request.url);
  const backend = new URL(backendOrigin);
  target.protocol = backend.protocol;
  target.host = backend.host;

  if (!isPublic(url.pathname) && jwtSecret) {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }
    const result = await verifyJwt(token, jwtSecret);
    if (!result.ok) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", url.host);

  const forwardRequest = new Request(target.toString(), {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });

  try {
    return await fetch(forwardRequest);
  } catch (err) {
    return new Response("Upstream unavailable", { status: 502 });
  }
}
