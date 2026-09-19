import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (!process.env.ENGINE_TOKEN)
    return NextResponse.json(
      { error: "Start the app with npm run dev to connect the collector." },
      { status: 503 },
    );
  if (request.method !== "GET") {
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
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return NextResponse.json(
        { error: "Use a JSON request." },
        { status: 415 },
      );
  }
  try {
    let requestBody: string | undefined;
    if (request.method !== "GET") {
      const reader = request.body?.getReader(),
        chunks: Uint8Array[] = [];
      let total = 0;
      if (reader)
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.length;
          if (total > 16384) {
            await reader.cancel();
            return NextResponse.json(
              { error: "Request too large." },
              { status: 413 },
            );
          }
          chunks.push(value);
        }
      requestBody = Buffer.concat(chunks).toString("utf8");
    }
    const r = await fetch(
      `${process.env.ENGINE_URL || "http://127.0.0.1:8787"}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`,
      {
        method: request.method,
        headers: {
          Authorization: `Bearer ${process.env.ENGINE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: requestBody,
        cache: "no-store",
        signal: AbortSignal.timeout(60000),
      },
    );
    return new NextResponse(await r.text(), {
      status: r.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "The local collector is unavailable. Keep npm run dev running and retry.",
      },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as DELETE, proxy as PATCH };
