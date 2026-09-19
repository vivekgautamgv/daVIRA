import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const coin = request.nextUrl.searchParams.get("coin") || "BTC";
  if (!/^[A-Za-z0-9._-]{1,32}$/.test(coin))
    return NextResponse.json({ error: "Invalid market" }, { status: 400 });
  if (!process.env.ENGINE_TOKEN)
    return NextResponse.json(
      { error: "Collector unavailable" },
      { status: 503 },
    );
  try {
    const res = await fetch(
      `${process.env.ENGINE_URL || "http://127.0.0.1:8787"}/reports?coin=${encodeURIComponent(coin)}`,
      {
        headers: { Authorization: `Bearer ${process.env.ENGINE_TOKEN}` },
        cache: "no-store",
        signal: AbortSignal.timeout(60000),
      },
    );
    const d = await res.json();
    if (!res.ok) return NextResponse.json(d, { status: res.status });
    const markdown = `# ${coin} market research\n\nSnapshot: ${new Date(d.updatedAt).toISOString()}\n\n${d.sections.map((s: { title: string; body: string }) => `## ${s.title}\n\n${s.body}`).join("\n\n")}\n\n## Sources\n${d.sources.map((s: { title: string; url: string }) => `- [${s.title}](${s.url})`).join("\n")}`;
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="davira-${coin}-research.md"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Report source unavailable; retry shortly." },
      { status: 503 },
    );
  }
}
