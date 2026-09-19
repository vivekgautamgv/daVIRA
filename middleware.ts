import { NextRequest, NextResponse } from "next/server";
export async function middleware(request: NextRequest) {
  const host = new URL(`http://${request.headers.get("host") || "invalid"}`)
      .hostname,
    password = process.env.APP_PASSWORD;
  if (password) {
    let supplied = "";
    try {
      const [scheme, value] = (
        request.headers.get("authorization") || ""
      ).split(" ");
      if (scheme === "Basic") supplied = atob(value);
    } catch {}
    const hash = async (s: string) =>
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
      );
    const [a, b] = await Promise.all([
      hash(supplied),
      hash(`davira:${password}`),
    ]);
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    if (diff !== 0)
      return new NextResponse("Workspace authentication required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="daVIRA workspace", charset="UTF-8"',
        },
      });
  } else if (!["127.0.0.1", "localhost", "[::1]"].includes(host))
    return new NextResponse(
      "This workspace is local only. Configure APP_PASSWORD before remote access.",
      { status: 403 },
    );
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    let originHost = "";
    try {
      originHost = origin ? new URL(origin).host : "";
    } catch {
      originHost = "invalid";
    }
    if (origin && originHost !== request.headers.get("host"))
      return NextResponse.json(
        { error: "Invalid request origin" },
        { status: 403 },
      );
  }
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
